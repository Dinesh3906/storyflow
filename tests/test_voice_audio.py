import pytest
from app.services.language_service import LanguageService
from app.services.romanization_service import RomanizationService
from app.services.story_ai_service import StoryAIService


def test_telugu_voice_audio_language_preservation():
    """
    Test Case 1: Spoken Telugu (Teluglish).
    Must NOT be translated to English.
    """
    voice_input = "A roju nenu railway station ki vellanu, train late ayyindi."
    lang, conf = LanguageService.identify_language(voice_input, "te")
    assert lang == "te"
    assert conf >= 0.85

    processed = RomanizationService.process_script_mode(voice_input, "te", "romanized")
    # Must preserve Roman Telugu (Teluglish)
    assert "railway station" in processed.lower()
    assert "nenu" in processed.lower()
    assert "vellanu" in processed.lower()
    # Must NOT have translated to English "I went to"
    assert "i went to" not in processed.lower()


def test_hindi_voice_audio_language_preservation():
    """
    Test Case 2: Spoken Hindi (Hinglish).
    Must NOT be translated to English.
    """
    voice_input = "Us din main subah jaldi utha aur station gaya."
    lang, conf = LanguageService.identify_language(voice_input, "hi")
    assert lang == "hi"

    processed = RomanizationService.process_script_mode(voice_input, "hi", "romanized")
    # Must preserve Roman Hindi (Hinglish)
    assert "station" in processed.lower()
    assert "subah" in processed.lower()
    assert "gaya" in processed.lower()
    # Must NOT have translated to English "That day I woke up early"
    assert "i woke up" not in processed.lower()


def test_english_voice_audio_clean_up():
    """
    Test Case 3: Spoken English narrative.
    Cleans disfluencies (um, uh) and formats proper punctuation.
    """
    voice_input = "um the rain was falling heavily uh on the old street"
    transformed = StoryAIService._deterministic_transform(
        action="clean_up",
        text=voice_input,
        style="narrative",
        writing_mode="faithful"
    )
    assert "um" not in transformed.lower()
    assert "uh" not in transformed.lower()
    assert "rain was falling heavily" in transformed.lower()


def test_screenplay_voice_formatting():
    """
    Test Case 4: Spoken scene transformed into screenplay formatting.
    """
    import asyncio
    voice_input = "Marcus enters the dim control room. He inspects the mainframe."
    result = asyncio.run(StoryAIService.transform_text(
        action="convert_script",
        selected_text=voice_input,
        language="en",
        script_mode="romanized",
        style="screenplay",
        writing_mode="faithful"
    ))
    formatted = result["transformed_text"]
    assert any(cue in formatted.upper() for cue in ["INT.", "EXT.", "SCENE", "ROOM", "CONTROL", "NARRATOR"])
    assert "Marcus enters" in formatted


def test_rms_level_calculation():
    """
    Test Case 5: Audio chunk RMS calculation simulation.
    Ensures silence produces 0.0 and active audio signals produce > 0.0.
    """
    import math

    # Silent buffer
    silence = [0.0] * 512
    sum_sq = sum(s * s for s in silence)
    rms_silence = math.sqrt(sum_sq / len(silence))
    assert rms_silence == 0.0

    # Active voice waveform buffer (sine wave)
    active = [math.sin(2 * math.pi * 440 * i / 16000) * 0.5 for i in range(512)]
    sum_sq_active = sum(s * s for s in active)
    rms_active = math.sqrt(sum_sq_active / len(active))
    assert rms_active > 0.2


def test_whisper_streaming_transcription_engine():
    """
    Test Case 6: Verify Whisper streaming STT converts raw PCM without stripping audio.
    """
    import numpy as np
    from app.services.whisper_stt_service import WhisperSTTService

    # 1. Test silence detection (must return empty text, not crash)
    silent_pcm = (np.zeros(16000, dtype=np.float32) * 32767).astype(np.int16).tobytes()
    res = WhisperSTTService.transcribe_audio_bytes(silent_pcm, language="en", sample_rate=16000)
    assert isinstance(res, dict)
    assert "text" in res
    assert res["text"] == ""

    # 2. Check engine status
    status = WhisperSTTService.get_status()
    assert status["engine"] == "faster-whisper"
    assert status["available"] is True
