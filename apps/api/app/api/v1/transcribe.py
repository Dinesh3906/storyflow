"""
REST endpoint for transcribing uploaded audio files using the local Whisper engine.
This provides a non-WebSocket path for batch transcription.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import Optional

from app.api.v1.auth import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transcribe", tags=["Speech-to-Text (Whisper)"])


@router.post("/audio")
async def transcribe_audio_file(
    file: UploadFile = File(..., description="Audio file (WAV, MP3, FLAC, etc.)"),
    language: Optional[str] = Form(default="auto", description="Language hint: auto, en, te, hi"),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe an uploaded audio file using the local faster-whisper engine.
    Supports WAV, MP3, FLAC, OGG, and other formats.
    Returns transcribed text with language detection and timing segments.
    """
    try:
        from app.services.whisper_stt_service import WhisperSTTService
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="faster-whisper is not installed. Run: pip install faster-whisper"
        )

    if not WhisperSTTService.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Whisper STT engine is not available"
        )

    # Read uploaded file
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio file"
        )

    # Determine if this is raw PCM or an encoded file
    content_type = file.content_type or ""
    filename = file.filename or ""

    if filename.endswith((".pcm", ".raw")) or "pcm" in content_type:
        # Raw 16-bit PCM
        result = WhisperSTTService.transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            language=language or "auto",
            sample_rate=16000,
        )
    else:
        # Encoded audio file — write to temp and transcribe
        import tempfile
        import os

        suffix = os.path.splitext(filename)[1] if filename else ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            result = WhisperSTTService.transcribe_file(
                file_path=tmp_path,
                language=language or "auto",
            )
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return {
        "text": result["text"],
        "language": result["language"],
        "confidence": result["confidence"],
        "segments": result["segments"],
        "duration_ms": result["duration_ms"],
        "engine": "faster-whisper",
    }


@router.get("/status")
async def transcription_engine_status():
    """
    Returns the current status of all available STT engines.
    """
    from app.core.config import settings

    engines = {}

    # Whisper status
    try:
        from app.services.whisper_stt_service import WhisperSTTService
        engines["whisper"] = WhisperSTTService.get_status()
    except ImportError:
        engines["whisper"] = {"available": False, "reason": "faster-whisper not installed"}

    # Deepgram status
    engines["deepgram"] = {
        "configured": bool(settings.DEEPGRAM_API_KEY),
    }

    # Groq status
    try:
        from app.services.groq_ai_service import GroqAIService
        engines["groq"] = GroqAIService.get_status()
    except ImportError:
        engines["groq"] = {"configured": False}

    # Gemini status
    engines["gemini"] = {
        "configured": bool(settings.GEMINI_API_KEY),
    }

    # Determine active engines
    active_stt = "deepgram" if engines["deepgram"]["configured"] else (
        "whisper" if engines["whisper"].get("available") else "none"
    )
    active_ai = "groq" if engines.get("groq", {}).get("configured") else (
        "gemini" if engines["gemini"]["configured"] else "rule-based-deterministic"
    )

    return {
        "engines": engines,
        "active_stt_engine": active_stt,
        "active_ai_engine": active_ai,
    }
