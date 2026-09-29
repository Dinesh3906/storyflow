"""
WhisperSTTService — Local Speech-to-Text using faster-whisper.

Replaces Deepgram Nova-3 with a fully offline, self-hosted transcription engine.
Supports Telugu, Hindi, English, and 90+ other languages via OpenAI Whisper models.

Model sizes (VRAM / RAM requirements):
  - tiny:   ~1 GB  (fastest, lowest accuracy)
  - base:   ~1 GB  (good balance for CPU)
  - small:  ~2 GB  (recommended default)
  - medium: ~5 GB  (high accuracy)
  - large-v3: ~10 GB (best accuracy, GPU strongly recommended)
"""

import io
import logging
import tempfile
import os
import time
from typing import Optional, Tuple, Dict, Any

logger = logging.getLogger(__name__)

# Lazy-loaded model singleton to avoid import-time overhead
_whisper_model = None
_model_lock = None


def _get_model():
    """
    Lazy-load the faster-whisper model as a singleton.
    Uses environment variable WHISPER_MODEL_SIZE to select model (default: 'base').
    Uses WHISPER_DEVICE to select compute device (default: 'cpu').
    """
    global _whisper_model, _model_lock

    if _whisper_model is not None:
        return _whisper_model

    # Thread-safe lazy init
    import threading
    if _model_lock is None:
        _model_lock = threading.Lock()

    with _model_lock:
        # Double-check after acquiring lock
        if _whisper_model is not None:
            return _whisper_model

        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise RuntimeError(
                "faster-whisper is not installed. "
                "Install it with: pip install faster-whisper\n"
                "For GPU support: pip install faster-whisper[cuda]"
            )

        model_size = os.environ.get("WHISPER_MODEL_SIZE", "base")
        device = os.environ.get("WHISPER_DEVICE", "cpu")
        compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

        logger.info(
            f"Loading Whisper model: size={model_size}, device={device}, compute_type={compute_type}"
        )
        start = time.perf_counter()

        _whisper_model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

        load_time = (time.perf_counter() - start) * 1000
        logger.info(f"Whisper model loaded in {load_time:.0f}ms")

        return _whisper_model


# Whisper language code mapping for StoryFlow's language codes
STORYFLOW_TO_WHISPER_LANG = {
    "en": "en",
    "te": "te",
    "hi": "hi",
    "ta": "ta",
    "kn": "kn",
    "bn": "bn",
    "auto": None,  # Let Whisper auto-detect
}


class WhisperSTTService:
    """
    Local speech-to-text service powered by faster-whisper.
    Transcribes raw PCM audio (16kHz, 16-bit, mono) into text.
    """

    @classmethod
    def transcribe_audio_bytes(
        cls,
        audio_bytes: bytes,
        language: str = "auto",
        sample_rate: int = 16000,
    ) -> Dict[str, Any]:
        """
        Transcribe raw PCM audio bytes (16-bit signed, mono) into text.

        Args:
            audio_bytes: Raw 16-bit PCM audio data
            language: Language hint ('auto', 'en', 'te', 'hi', etc.)
            sample_rate: Audio sample rate in Hz (default 16000)

        Returns:
            Dict with keys:
              - text: Transcribed text
              - language: Detected language code
              - confidence: Language detection probability
              - segments: List of segment dicts with timing info
              - duration_ms: Processing time in milliseconds
        """
        start_time = time.perf_counter()

        if not audio_bytes or len(audio_bytes) < 100:
            return {
                "text": "",
                "language": language if language != "auto" else "en",
                "confidence": 0.0,
                "segments": [],
                "duration_ms": 0.0,
            }

        import numpy as np

        # Convert raw 16-bit PCM bytes directly to normalized float32 numpy array (no disk I/O)
        try:
            audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
            audio_float32 = audio_int16.astype(np.float32) / 32768.0

            # Automatic Software Gain Control (AGC) for quiet microphones
            peak = float(np.max(np.abs(audio_float32))) if len(audio_float32) > 0 else 0.0
            if peak > 0.003:
                # Boost into nominal Whisper sweet spot
                gain = min(15.0, 0.65 / peak)
                audio_float32 = np.clip(audio_float32 * gain, -1.0, 1.0)
            elif peak < 0.001:
                # Silence - skip processing
                return {
                    "text": "",
                    "language": language if language != "auto" else "en",
                    "confidence": 0.0,
                    "segments": [],
                    "duration_ms": 0.0,
                }
        except Exception as e:
            logger.error(f"Error converting PCM bytes to float32: {e}")
            return {
                "text": "",
                "language": language if language != "auto" else "en",
                "confidence": 0.0,
                "segments": [],
                "duration_ms": 0.0,
            }

        try:
            model = _get_model()

            whisper_lang = STORYFLOW_TO_WHISPER_LANG.get(language)

            prompt = None
            if whisper_lang == "hi":
                prompt = "नमस्ते, यह हिंदी वार्तालाप और गीत है। पारो मेरी पारो इशारों में बातें समझ लेना।"
            elif whisper_lang == "te":
                prompt = "నమస్కారం, ఇది తెలుగు సంభాషణ."

            # beam_size=1 (greedy) is 5x faster on CPU for realtime typing; vad_filter=False ensures audio is never dropped
            segments_iter, info = model.transcribe(
                audio_float32,
                language=whisper_lang,
                initial_prompt=prompt,
                beam_size=1,
                vad_filter=False,
                no_speech_threshold=None,
            )

            # Collect segments
            segments = []
            full_text_parts = []
            for segment in segments_iter:
                clean_seg = segment.text.strip()
                if clean_seg:
                    segments.append({
                        "start_ms": int(segment.start * 1000),
                        "end_ms": int(segment.end * 1000),
                        "text": clean_seg,
                    })
                    full_text_parts.append(clean_seg)

            full_text = " ".join(full_text_parts)

            # Prevent Arabic/Urdu script leakage: convert to Romanized Hindi
            from app.services.romanization_service import RomanizationService
            if any(0x0600 <= ord(c) <= 0x06FF for c in full_text):
                full_text = RomanizationService.transliterate_urdu_to_roman(full_text)
                for seg in segments:
                    if any(0x0600 <= ord(c) <= 0x06FF for c in seg["text"]):
                        seg["text"] = RomanizationService.transliterate_urdu_to_roman(seg["text"])

            # Map Whisper's detected language back to StoryFlow codes
            detected_lang = info.language if info.language else "en"
            lang_prob = info.language_probability if info.language_probability else 0.0

            duration_ms = (time.perf_counter() - start_time) * 1000

            return {
                "text": full_text,
                "language": detected_lang,
                "confidence": round(lang_prob, 3),
                "segments": segments,
                "duration_ms": round(duration_ms, 2),
            }
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            return {
                "text": "",
                "language": language if language != "auto" else "en",
                "confidence": 0.0,
                "segments": [],
                "duration_ms": round((time.perf_counter() - start_time) * 1000, 2),
            }

    @classmethod
    def transcribe_file(
        cls,
        file_path: str,
        language: str = "auto",
    ) -> Dict[str, Any]:
        """
        Transcribe an audio file (WAV, MP3, FLAC, etc.) into text.

        Args:
            file_path: Path to the audio file
            language: Language hint ('auto', 'en', 'te', 'hi', etc.)

        Returns:
            Same dict format as transcribe_audio_bytes
        """
        start_time = time.perf_counter()

        model = _get_model()
        whisper_lang = STORYFLOW_TO_WHISPER_LANG.get(language)

        prompt = None
        if whisper_lang == "hi":
            prompt = "नमस्ते, यह हिंदी वार्तालाप और गीत है। पारो मेरी पारो इशारों में बातें समझ लेना।"
        elif whisper_lang == "te":
            prompt = "నమస్కారం, ఇది తెలుగు సంభాషణ."

        segments_iter, info = model.transcribe(
            file_path,
            language=whisper_lang,
            initial_prompt=prompt,
            beam_size=5,
            vad_filter=True,
        )

        segments = []
        full_text_parts = []
        for segment in segments_iter:
            segments.append({
                "start_ms": int(segment.start * 1000),
                "end_ms": int(segment.end * 1000),
                "text": segment.text.strip(),
            })
            full_text_parts.append(segment.text.strip())

        full_text = " ".join(full_text_parts)

        # Prevent Arabic/Urdu script leakage: convert to Romanized Hindi
        from app.services.romanization_service import RomanizationService
        if any(0x0600 <= ord(c) <= 0x06FF for c in full_text):
            full_text = RomanizationService.transliterate_urdu_to_roman(full_text)
            for seg in segments:
                if any(0x0600 <= ord(c) <= 0x06FF for c in seg["text"]):
                    seg["text"] = RomanizationService.transliterate_urdu_to_roman(seg["text"])
        detected_lang = info.language if info.language else "en"
        lang_prob = info.language_probability if info.language_probability else 0.0

        duration_ms = (time.perf_counter() - start_time) * 1000

        return {
            "text": full_text,
            "language": detected_lang,
            "confidence": round(lang_prob, 3),
            "segments": segments,
            "duration_ms": round(duration_ms, 2),
        }

    @staticmethod
    def _pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 16000) -> io.BytesIO:
        """
        Wraps raw 16-bit mono PCM data in a proper WAV header.
        """
        import struct

        num_channels = 1
        bits_per_sample = 16
        byte_rate = sample_rate * num_channels * bits_per_sample // 8
        block_align = num_channels * bits_per_sample // 8
        data_size = len(pcm_bytes)

        buf = io.BytesIO()
        # RIFF header
        buf.write(b"RIFF")
        buf.write(struct.pack("<I", 36 + data_size))
        buf.write(b"WAVE")
        # fmt chunk
        buf.write(b"fmt ")
        buf.write(struct.pack("<I", 16))  # chunk size
        buf.write(struct.pack("<H", 1))   # PCM format
        buf.write(struct.pack("<H", num_channels))
        buf.write(struct.pack("<I", sample_rate))
        buf.write(struct.pack("<I", byte_rate))
        buf.write(struct.pack("<H", block_align))
        buf.write(struct.pack("<H", bits_per_sample))
        # data chunk
        buf.write(b"data")
        buf.write(struct.pack("<I", data_size))
        buf.write(pcm_bytes)

        buf.seek(0)
        return buf

    @classmethod
    def is_available(cls) -> bool:
        """Check if faster-whisper is installed and a model can be loaded."""
        try:
            from faster_whisper import WhisperModel  # noqa: F401
            return True
        except ImportError:
            return False

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Return current engine status for health checks."""
        available = cls.is_available()
        model_loaded = _whisper_model is not None
        return {
            "engine": "faster-whisper",
            "available": available,
            "model_loaded": model_loaded,
            "model_size": os.environ.get("WHISPER_MODEL_SIZE", "base"),
            "device": os.environ.get("WHISPER_DEVICE", "cpu"),
        }
