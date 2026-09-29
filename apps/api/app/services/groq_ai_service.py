"""
GroqAIService — Ultra-fast AI text transformation via Groq.

Replaces Google Gemini as the Story AI Transformation Engine.
Groq provides millisecond-latency inference using LPU hardware,
supporting Llama 3, Mixtral, and Gemma models.

Free tier: ~30 requests/minute, 14,400 requests/day (as of 2026).
"""

import logging
import time
from typing import Dict, Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Groq API endpoint
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Available Groq models (ordered by recommendation)
GROQ_MODELS = {
    "default": "openai/gpt-oss-20b",
    "fast": "openai/gpt-oss-20b",
    "gpt-oss-20b": "openai/gpt-oss-20b",
    "large": "openai/gpt-oss-120b",
    "llama": "llama-3.3-70b-versatile",
    "llama-3.3-70b-versatile": "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant": "llama-3.1-8b-instant",
    "mixtral": "mixtral-8x7b-32768",
}

SYSTEM_PROMPT = """You are a transcription-to-writing transformation engine for StoryFlow.
You must preserve factual content.
Do not invent characters, events, locations, emotions, dialogue, actions, descriptions, dates, or facts that are not present in the source content.

CRITICAL LANGUAGE INTEGRITY:
Never automatically translate non-English speech into English unless the user explicitly requested translation.
If the input is Telugu or Roman Telugu ("A roju nenu hospital ki vellanu..."), you MUST output in Telugu or Roman Telugu according to the requested scriptMode.
If the input is Hindi or Roman Hindi ("Us din main hospital gaya tha..."), you MUST output in Hindi or Roman Hindi according to the requested scriptMode.
NEVER OUTPUT ARABIC OR URDU SCRIPT. If phonetic Urdu or Arabic script characters are present in the input, convert them to clean Romanized Hindi (Hinglish) or Devanagari Hindi according to the requested scriptMode.
Preserve the exact language identity, colloquial nuances, and cadence of the speaker.

OUTPUT RULES:
- Return ONLY the transformed text
- Do NOT add explanations, notes, or metadata
- Do NOT wrap in quotes or markdown formatting
"""


class GroqAIService:
    """
    AI text transformation engine powered by Groq's ultra-fast LPU inference.
    Drop-in replacement for the Gemini integration in StoryAIService.
    """

    @classmethod
    async def transform_text(
        cls,
        action: str,
        text: str,
        language: str,
        script_mode: str,
        style: str,
        writing_mode: str,
        context: Optional[str] = None,
    ) -> str:
        """
        Transform text using Groq API.

        Args:
            action: Transformation action (clean_up, rewrite, shorten, expand, convert_script, convert_poetry, etc.)
            text: Input text to transform
            language: Detected language code (en, te, hi)
            script_mode: Script representation (romanized, original)
            style: Target writing style (narrative, screenplay, poetry, dialogue, etc.)
            writing_mode: faithful or literary
            context: Optional surrounding story context

        Returns:
            Transformed text string

        Raises:
            RuntimeError: If GROQ_API_KEY is not configured
            httpx.HTTPStatusError: If the Groq API returns an error
        """
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not configured")

        user_prompt = cls._build_prompt(
            action=action,
            text=text,
            language=language,
            script_mode=script_mode,
            style=style,
            writing_mode=writing_mode,
            context=context,
        )

        # Select model based on config or default
        model_key = getattr(settings, "GROQ_MODEL", "default")
        model_name = GROQ_MODELS.get(model_key, model_key if ("/" in model_key or "llama" in model_key) else GROQ_MODELS["default"])

        # Temperature: low for faithful mode (minimal changes), moderate for literary
        temperature = 0.15 if writing_mode == "faithful" else 0.55

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": 2048,
            "top_p": 0.9,
            "stream": False,
        }

        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(GROQ_API_URL, json=payload, headers=headers)
            if resp.status_code in (403, 404) and model_name != GROQ_MODELS["default"]:
                logger.warning(f"Groq model {model_name} returned {resp.status_code}, falling back to {GROQ_MODELS['default']}")
                payload["model"] = GROQ_MODELS["default"]
                model_name = GROQ_MODELS["default"]
                resp = await client.post(GROQ_API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        result = data["choices"][0]["message"]["content"].strip()

        # Log usage for observability
        usage = data.get("usage", {})
        logger.info(
            f"Groq transform: model={model_name}, action={action}, "
            f"prompt_tokens={usage.get('prompt_tokens', '?')}, "
            f"completion_tokens={usage.get('completion_tokens', '?')}, "
            f"total_tokens={usage.get('total_tokens', '?')}"
        )

        return result

    @classmethod
    def _build_prompt(
        cls,
        action: str,
        text: str,
        language: str,
        script_mode: str,
        style: str,
        writing_mode: str,
        context: Optional[str],
    ) -> str:
        """Build the user prompt for the Groq API call."""

        mode_instruction = (
            "Only clean punctuation, spacing, and flow. Do NOT change meaning or add any new words."
            if writing_mode == "faithful"
            else "Enhance stylistic tone, rhythm, and prose cadence while keeping ALL facts identical."
        )

        return f"""Task: {action.upper()}
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
2. {mode_instruction}
3. Apply {style.upper()} formatting rules (e.g. screenplay sluglines/cues, poetic stanzas, prose paragraphs).
4. Strictly retain the original language ({language}) and representation ({script_mode}).
5. Return ONLY the transformed text with no additional commentary."""

    @classmethod
    async def is_available(cls) -> bool:
        """Check if the Groq API key is configured and the API is reachable."""
        if not settings.GROQ_API_KEY:
            return False

        try:
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers=headers,
                )
                return resp.status_code == 200
        except Exception:
            return False

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Return current engine status for health checks."""
        model_key = getattr(settings, "GROQ_MODEL", "default")
        return {
            "engine": "groq",
            "configured": bool(settings.GROQ_API_KEY),
            "model": GROQ_MODELS.get(model_key, GROQ_MODELS["default"]),
        }
