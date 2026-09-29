import asyncio
import base64
import json
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.config import settings
from app.services.language_service import LanguageService
from app.services.romanization_service import RomanizationService
from app.services.story_ai_service import StoryAIService

logger = logging.getLogger(__name__)
ws_router = APIRouter(tags=["Realtime WebSocket Gateway"])

# Global map of active websocket connections per story
story_connections: Dict[str, Set[WebSocket]] = defaultdict(set)


def get_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def broadcast_to_story(story_id: str, message: Dict[str, Any]):
    """Broadcast an event to all open websockets viewing this story."""
    dead_sockets = set()
    for ws in list(story_connections.get(story_id, set())):
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            dead_sockets.add(ws)
    for ws in dead_sockets:
        story_connections[story_id].discard(ws)


@ws_router.websocket("/ws/story/{story_id}")
async def story_realtime_websocket(websocket: WebSocket, story_id: str):
    """
    Realtime WebSocket Gateway.
    Handles continuous audio streaming, server-side Whisper transcription,
    browser speech text integration, script romanization, and live editor delivery.
    """
    await websocket.accept()
    story_connections[story_id].add(websocket)
    session_id = f"sess_{int(time.time()*1000)}"
    sequence = 0
    is_paused = False

    # Audio buffering & speech detection state for local Whisper
    pcm_buffer = bytearray()
    is_transcribing = False
    last_transcribe_time = 0.0
    has_spoken = False
    last_speech_time = 0.0

    async def send_event(event_type: str, payload: Dict[str, Any]):
        nonlocal sequence
        sequence += 1
        message = {
            "type": event_type,
            "sessionId": session_id,
            "sequence": sequence,
            "timestamp": get_utc_iso(),
            "payload": payload,
        }
        await broadcast_to_story(story_id, message)

    # Determine STT engine availability
    deepgram_available = bool(settings.DEEPGRAM_API_KEY)
    whisper_available = False
    try:
        from app.services.whisper_stt_service import WhisperSTTService
        whisper_available = WhisperSTTService.is_available()
    except Exception:
        pass

    stt_engine = "deepgram" if deepgram_available else ("whisper" if whisper_available else "none")

    # 1. Emit connection.ready
    await send_event("connection.ready", {
        "connectionId": session_id,
        "serverTimestamp": get_utc_iso(),
        "heartbeatIntervalMs": 15000,
        "deepgramConfigured": deepgram_available,
        "whisperAvailable": whisper_available,
        "sttEngine": stt_engine,
    })

    session_config = {
        "language": "auto",
        "script_mode": "romanized",
        "style": "narrative",
        "writing_mode": "faithful",
        "realtime_mode": "balanced",
    }

    async def process_text_segment(text_input: str, is_final: bool):
        """Process incoming speech text (from browser STT or server Whisper)."""
        nonlocal sequence
        if not text_input or not text_input.strip():
            return

        text_input = text_input.strip()
        detected_lang, conf = LanguageService.identify_language(
            text_input, session_config["language"]
        )
        await send_event("language.detected", {
            "detectedLanguage": detected_lang,
            "confidence": conf,
            "isFallback": False
        })

        # Apply script processing (Teluglish / Hinglish / Romanization)
        processed = RomanizationService.process_script_mode(
            text_input, detected_lang, session_config["script_mode"]
        )

        if not is_final:
            await send_event("transcript.partial", {
                "segmentId": f"seg_{sequence}",
                "text": processed,
                "language": detected_lang,
                "confidence": conf,
                "isFinal": False,
                "startMs": 0,
                "endMs": 1000
            })
        else:
            # Send transcript.final immediately so UI displays final words with zero delay
            await send_event("transcript.final", {
                "segmentId": f"seg_{sequence}",
                "rawText": text_input,
                "processedText": processed,
                "language": detected_lang,
                "confidence": conf,
                "isFinal": True,
                "startMs": 0,
                "endMs": 2000
            })

            # Run story AI transformation
            story_transformed = await StoryAIService.transform_text(
                action="clean_up",
                selected_text=processed,
                language=detected_lang,
                script_mode=session_config["script_mode"],
                style=session_config["style"],
                writing_mode=session_config["writing_mode"]
            )
            final_content = (story_transformed.get("transformed_text") or "").strip() or processed

            await send_event("story.paragraph.final", {
                "paragraphId": f"para_{sequence}",
                "rawTranscript": text_input,
                "processedText": final_content,
                "language": detected_lang,
                "scriptMode": session_config["script_mode"],
                "style": session_config["style"],
                "orderIndex": sequence,
                "wordCount": len(final_content.split())
            })

    async def transcribe_pcm_buffer(buf_bytes: bytes, is_final: bool):
        """Run local Whisper STT in a thread pool on accumulated PCM audio."""
        nonlocal is_transcribing
        if not buf_bytes or len(buf_bytes) < 8000:
            return

        is_transcribing = True
        try:
            from app.services.whisper_stt_service import WhisperSTTService
            res = await asyncio.to_thread(
                WhisperSTTService.transcribe_audio_bytes,
                buf_bytes,
                language=session_config["language"],
                sample_rate=16000
            )
            raw_text = res.get("text", "").strip()
            logger.info(f"[Whisper STT] buffer={len(buf_bytes)}B, final={is_final} -> text: '{raw_text}'")
            if raw_text:
                await process_text_segment(raw_text, is_final)
        except Exception as e:
            logger.error(f"Whisper streaming transcription failed: {e}")
        finally:
            is_transcribing = False

    # Background silence detector: finalizes utterance after pause in speech even if client pauses audio frames
    async def silence_checker():
        nonlocal has_spoken, last_speech_time, is_transcribing, last_transcribe_time
        while True:
            await asyncio.sleep(0.25)
            if is_paused or is_transcribing or not whisper_available:
                continue
            now = time.time()
            buf_len = len(pcm_buffer)
            # If user spoke and paused for >= 0.75s, finalize utterance
            if has_spoken and buf_len >= 12000 and (now - last_speech_time >= 0.75):
                has_spoken = False
                buf = bytes(pcm_buffer)
                pcm_buffer.clear()
                last_transcribe_time = now
                asyncio.create_task(transcribe_pcm_buffer(buf, True))

    silence_task = asyncio.create_task(silence_checker())

    try:
        while True:
            try:
                raw_data = await websocket.receive()
            except WebSocketDisconnect:
                logger.info(f"WebSocket client disconnected: session {session_id}")
                break
            except Exception as e:
                logger.info(f"WebSocket receive ended: {e}")
                break

            if raw_data.get("type") == "websocket.disconnect":
                logger.info(f"WebSocket disconnect message received: session {session_id}")
                break

            if "text" in raw_data:
                msg = json.loads(raw_data["text"])
                msg_type = msg.get("type")
                payload = msg.get("payload", {})

                if msg_type == "session.start":
                    session_config.update({
                        "language": payload.get("language", "auto"),
                        "script_mode": payload.get("scriptMode", "romanized"),
                        "style": payload.get("style", "narrative"),
                        "writing_mode": payload.get("writingMode", "faithful"),
                        "realtime_mode": payload.get("realtimeMode", "balanced"),
                    })
                    is_paused = False
                    pcm_buffer.clear()
                    has_spoken = False
                    last_speech_time = 0.0
                    last_transcribe_time = time.time()
                    await send_event("session.started", {
                        "storyId": story_id,
                        "status": "listening",
                        "config": session_config
                    })

                elif msg_type == "session.pause":
                    is_paused = True
                    if pcm_buffer and whisper_available and has_spoken:
                        buf = bytes(pcm_buffer)
                        pcm_buffer.clear()
                        has_spoken = False
                        asyncio.create_task(transcribe_pcm_buffer(buf, True))
                    await send_event("session.paused", {"storyId": story_id})

                elif msg_type == "session.resume":
                    is_paused = False
                    pcm_buffer.clear()
                    has_spoken = False
                    last_speech_time = 0.0
                    last_transcribe_time = time.time()
                    await send_event("session.resumed", {"storyId": story_id})

                elif msg_type == "client.heartbeat":
                    await send_event("server.heartbeat", {"ack": payload.get("timestamp")})

                elif msg_type == "audio.start":
                    is_paused = False
                    pcm_buffer.clear()
                    has_spoken = False
                    last_speech_time = 0.0
                    last_transcribe_time = time.time()
                    await send_event("audio.started", {"sampleRate": 16000, "channels": 1})

                elif msg_type == "audio.stop":
                    await send_event("audio.stopped", {"storyId": story_id})
                    if pcm_buffer and whisper_available and (has_spoken or len(pcm_buffer) >= 16000):
                        buf = bytes(pcm_buffer)
                        pcm_buffer.clear()
                        has_spoken = False
                        await transcribe_pcm_buffer(buf, True)

                elif msg_type == "audio.chunk":
                    if is_paused:
                        continue

                    # 1. Direct text from browser SpeechRecognition (instant preview path)
                    text_input = payload.get("text")
                    if text_input:
                        is_final = payload.get("isFinal", False)
                        await process_text_segment(text_input, is_final)

                    # 2. Raw PCM audio chunk from microphone
                    audio_b64 = payload.get("data")
                    if audio_b64 and whisper_available:
                        raw_chunk = b""
                        try:
                            raw_chunk = base64.b64decode(audio_b64)
                            pcm_buffer.extend(raw_chunk)
                        except Exception as e:
                            logger.error(f"Error decoding audio chunk: {e}")

                        now = time.time()
                        rms_level = payload.get("rmsLevel", 0.0)
                        if rms_level == 0.0 and len(raw_chunk) >= 4:
                            import numpy as np
                            chunk_arr = np.frombuffer(raw_chunk, dtype=np.int16).astype(np.float32) / 32768.0
                            rms_level = float(np.sqrt(np.mean(chunk_arr ** 2)))

                        # Active speech detection
                        if rms_level > 0.012:
                            has_spoken = True
                            last_speech_time = now

                        # If user hasn't spoken yet, keep a small 0.5s pre-roll buffer to prevent memory bloat and false triggers
                        if not has_spoken and len(pcm_buffer) > 32000:
                            pcm_buffer = pcm_buffer[-16000:]

                        buf_len = len(pcm_buffer)

                        # Finalize utterance if silence after speech (>= 0.75s silence) or max chunk (>= 3.0s = 96000 bytes)
                        if has_spoken and buf_len >= 16000 and ((now - last_speech_time) >= 0.75 or buf_len >= 96000):
                            if not is_transcribing:
                                has_spoken = False
                                last_transcribe_time = now
                                buf_to_process = bytes(pcm_buffer)
                                pcm_buffer.clear()
                                asyncio.create_task(transcribe_pcm_buffer(buf_to_process, True))
                        # Interim streaming partial transcription every ~1.2s while speaking
                        elif has_spoken and buf_len >= 24000 and (now - last_transcribe_time) >= 1.2 and not is_transcribing:
                            last_transcribe_time = now
                            buf_to_process = bytes(pcm_buffer)
                            asyncio.create_task(transcribe_pcm_buffer(buf_to_process, False))

                elif msg_type == "story.stream_segment":
                    # Direct programmatic segment streaming
                    segment_text = payload.get("text", "")
                    is_final = payload.get("isFinal", False)
                    await process_text_segment(segment_text, is_final)

            elif "bytes" in raw_data:
                # Binary 16-bit PCM chunk received
                if not is_paused and whisper_available:
                    raw_chunk = raw_data["bytes"]
                    pcm_buffer.extend(raw_chunk)
                    now = time.time()
                    import numpy as np
                    chunk_arr = np.frombuffer(raw_chunk, dtype=np.int16).astype(np.float32) / 32768.0
                    rms_level = float(np.sqrt(np.mean(chunk_arr ** 2)))
                    if rms_level > 0.012:
                        has_spoken = True
                        last_speech_time = now

                    if not has_spoken and len(pcm_buffer) > 32000:
                        pcm_buffer = pcm_buffer[-16000:]

                    buf_len = len(pcm_buffer)

                    if has_spoken and buf_len >= 16000 and ((now - last_speech_time) >= 0.75 or buf_len >= 96000):
                        if not is_transcribing:
                            has_spoken = False
                            last_transcribe_time = now
                            buf_to_process = bytes(pcm_buffer)
                            pcm_buffer.clear()
                            asyncio.create_task(transcribe_pcm_buffer(buf_to_process, True))
                    elif has_spoken and buf_len >= 24000 and (now - last_transcribe_time) >= 1.2 and not is_transcribing:
                        last_transcribe_time = now
                        buf_to_process = bytes(pcm_buffer)
                        asyncio.create_task(transcribe_pcm_buffer(buf_to_process, False))

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await send_event("story.error", {
                "code": "SERVER_ERROR",
                "message": str(e),
                "recoverable": True
            })
        except Exception:
            pass
    finally:
        silence_task.cancel()
        story_connections[story_id].discard(websocket)
