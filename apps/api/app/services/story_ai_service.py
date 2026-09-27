import time
import logging
import re
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.services.language_service import LanguageService
from app.services.romanization_service import RomanizationService

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a transcription-to-writing transformation engine for StoryFlow.
You must preserve factual content.
Do not invent characters, events, locations, emotions, dialogue, actions, descriptions, dates, or facts that are not present in the source content.

CRITICAL LANGUAGE INTEGRITY:
Never automatically translate non-English speech into English unless the user explicitly requested translation.
If the input is Telugu or Roman Telugu ("A roju nenu hospital ki vellanu..."), you MUST output in Telugu or Roman Telugu according to the requested scriptMode.
If the input is Hindi or Roman Hindi ("Us din main hospital gaya tha..."), you MUST output in Hindi or Roman Hindi according to the requested scriptMode.
Preserve the exact language identity, colloquial nuances, and cadence of the speaker.
"""


class StoryAIService:
    @classmethod
    async def transform_text(
        cls,
        action: str,
        selected_text: str,
        language: str = "auto",
        script_mode: str = "romanized",
        style: str = "narrative",
        writing_mode: str = "faithful",
        full_story_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes text transformation across styles and writing modes.
        Preserves language identity and enforces anti-hallucination contracts.
        """
        start_time = time.perf_counter()

        detected_lang, _ = LanguageService.identify_language(selected_text, language)

        # First apply phonetic normalization / script handling
        normalized_text = RomanizationService.process_script_mode(
            selected_text, detected_lang, script_mode
        )

        # If Gemini API key is configured, use Gemini API
        if settings.GEMINI_API_KEY:
            try:
                transformed = await cls._call_gemini_api(
                    action=action,
                    text=normalized_text,
                    language=detected_lang,
                    script_mode=script_mode,
                    style=style,
                    writing_mode=writing_mode,
                    context=full_story_context,
                )
                duration_ms = (time.perf_counter() - start_time) * 1000
                return {
                    "transformed_text": transformed,
                    "preserved_language": detected_lang,
                    "execution_time_ms": round(duration_ms, 2),
                    "engine": "gemini"
                }
            except Exception as e:
                logger.warning(f"Gemini API call failed, falling back to local deterministic engine: {e}")

        # Deterministic Rule-Based Fallback Pipeline
        transformed = cls._deterministic_transform(
            action=action,
            text=normalized_text,
            style=style,
            writing_mode=writing_mode
        )

        duration_ms = (time.perf_counter() - start_time) * 1000
        return {
            "transformed_text": transformed,
            "preserved_language": detected_lang,
            "execution_time_ms": round(duration_ms, 2),
            "engine": "rule-based-deterministic"
        }

    @classmethod
    async def _call_gemini_api(
        cls,
        action: str,
        text: str,
        language: str,
        script_mode: str,
        style: str,
        writing_mode: str,
        context: Optional[str]
    ) -> str:
        prompt = f"""Task: {action.upper()}
Target Style: {style.upper()}
Writing Mode: {writing_mode.upper()}
Language: {language}
Script Mode: {script_mode}

Context:
{context or 'No prior context'}

Input Text:
{text}

Instructions:
1. Preserve all factual meaning. Never invent facts.
2. In {writing_mode.upper()} mode, {'only clean punctuation and flow' if writing_mode == 'faithful' else 'enhance stylistic tone while keeping all facts identical'}.
3. Apply {style.upper()} formatting rules (e.g. screenplay sluglines/cues, poetic stanzas, prose paragraphs).
4. Strictly retain the original language ({language}) and representation ({script_mode}).
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": SYSTEM_PROMPT + "\n\n" + prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.2 if writing_mode == "faithful" else 0.6,
                "maxOutputTokens": 2048,
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    @classmethod
    def _deterministic_transform(
        cls,
        action: str,
        text: str,
        style: str,
        writing_mode: str
    ) -> str:
        """
        High-grade deterministic transformation adhering strictly to factual preservation.
        """
        # Clean disfluencies (um, uh, repeats)
        cleaned = re.sub(r'\b(um|uh|er|ah|like)\b\s*', '', text, flags=re.IGNORECASE)
        cleaned = RomanizationService.clean_casing_and_punctuation(cleaned)

        if style == "screenplay" or action == "convert_script":
            # Format as screenplay
            lines = [s.strip() for s in re.split(r'[.!?]+', cleaned) if s.strip()]
            formatted_lines = ["INT. ROOM - SCENE\n"]
            for i, line in enumerate(lines):
                if i % 2 == 0:
                    formatted_lines.append(f"\nNARRATOR\n    {line}.")
                else:
                    formatted_lines.append(f"\n{line}.")
            return "\n".join(formatted_lines).strip()

        elif style == "poetry" or action == "convert_poetry":
            # Break sentences into rhythmic poetic lines
            words = cleaned.split()
            chunks = []
            chunk_size = 5
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i:i + chunk_size])
                chunks.append(chunk)
            stanzas = []
            for i in range(0, len(chunks), 4):
                stanza = "\n".join(chunks[i:i + 4])
                stanzas.append(stanza)
            return "\n\n".join(stanzas)

        elif style == "dialogue" or action == "convert_dialogue":
            sentences = [s.strip() for s in re.split(r'[.!?]+', cleaned) if s.strip()]
            dialogues = []
            for s in sentences:
                dialogues.append(f'"{s}."')
            return "\n\n".join(dialogues)

        elif action == "shorten":
            # Retain essential clauses
            sentences = [s.strip() for s in re.split(r'[.!?]+', cleaned) if s.strip()]
            return ". ".join(sentences[:max(1, len(sentences)//2)]) + "."

        elif action == "clean_up" or writing_mode == "faithful":
            # Ensure sentence termination
            if not cleaned.endswith((".", "!", "?")):
                cleaned += "."
            return cleaned

        else:
            if not cleaned.endswith((".", "!", "?")):
                cleaned += "."
            return cleaned
