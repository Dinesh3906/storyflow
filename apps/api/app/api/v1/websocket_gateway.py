import asyncio
import base64
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.config import settings
from app.services.language_service import LanguageService
from app.services.romanization_service import RomanizationService
from app.services.story_ai_service import StoryAIService

logger = logging.getLogger(__name__)
ws_router = APIRouter(tags=["Realtime WebSocket Gateway"])


def get_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@ws_router.websocket("/ws/story/{story_id}")
async def story_realtime_websocket(websocket: WebSocket, story_id: str):
    """
    Realtime WebSocket Gateway.
    Handles continuous audio streaming, speech-to-text, script romanization,
    and live editor text delivery.
    """
    await websocket.accept()
    session_id = f"sess_{int(time.time()*1000)}"
    sequence = 0
    is_paused = False

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
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send websocket event: {e}")

    # 1. Emit connection.ready
    await send_event("connection.ready", {
        "connectionId": session_id,
        "serverTimestamp": get_utc_iso(),
        "heartbeatIntervalMs": 15000,
        "deepgramConfigured": bool(settings.DEEPGRAM_API_KEY)
    })

    session_config = {
        "language": "auto",
        "script_mode": "romanized",
        "style": "narrative",
        "writing_mode": "faithful",
        "realtime_mode": "balanced",
    }

    try:
        while True:
            raw_data = await websocket.receive()
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
                    await send_event("session.started", {
                        "storyId": story_id,
                        "status": "listening",
                        "config": session_config
                    })

                elif msg_type == "session.pause":
                    is_paused = True
                    await send_event("session.paused", {"storyId": story_id})

                elif msg_type == "session.resume":
                    is_paused = False
                    await send_event("session.resumed", {"storyId": story_id})

                elif msg_type == "client.heartbeat":
                    await send_event("server.heartbeat", {"ack": payload.get("timestamp")})

                elif msg_type == "audio.start":
                    await send_event("audio.started", {"sampleRate": 16000, "channels": 1})

                elif msg_type == "audio.stop":
                    await send_event("audio.stopped", {"storyId": story_id})

                elif msg_type == "audio.chunk":
                    if is_paused:
                        continue
                    # Process audio chunk
                    rms_level = payload.get("rmsLevel", 0.0)
                    # Audio chunk received; if client sends transcript test or deepgram streaming
                    text_input = payload.get("text")
                    if text_input:
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

                        is_final = payload.get("isFinal", False)
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
                            await send_event("transcript.final", {
                                "segmentId": f"seg_{sequence}",
                                "rawText": text_input,
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

                            await send_event("story.paragraph.final", {
                                "paragraphId": f"para_{sequence}",
                                "rawTranscript": text_input,
                                "processedText": story_transformed["transformed_text"],
                                "language": detected_lang,
                                "scriptMode": session_config["script_mode"],
                                "style": session_config["style"],
                                "orderIndex": sequence,
                                "wordCount": len(story_transformed["transformed_text"].split())
                            })

            elif "bytes" in raw_data:
                # Binary audio chunk
                if not is_paused:
                    # Binary 16-bit PCM chunk received
                    pass

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
