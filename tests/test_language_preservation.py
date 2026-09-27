import pytest
import sys
import os

# Add apps/api to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from app.services.language_service import LanguageService
from app.services.romanization_service import RomanizationService
from app.services.story_ai_service import StoryAIService


def test_telugu_language_detection():
    # Spoken Roman Telugu text from the user specification
    telugu_text = "A roju nenu morning hospital ki vellanu. Akkada oka nurse nannu chusi chala bayapadindi. Naaku enduku ala chustundo ardham kaaledu."
    lang, conf = LanguageService.identify_language(telugu_text, "auto")

    assert lang == "te", f"Expected language 'te' for Telugu speech, got '{lang}'"
    assert conf > 0.6, "Expected high confidence for Telugu vocabulary markers"


def test_telugu_language_preservation_not_english():
    # Non-negotiable requirement: Telugu speech must NEVER be silently translated into English
    telugu_text = "A roju nenu hospital ki vellanu. Akkada oka nurse undi."
    processed = RomanizationService.process_script_mode(telugu_text, "te", "romanized")

    # Output must retain the original Telugu words in Roman script
    assert "hospital ki vellanu" in processed
    assert "nurse undi" in processed

    # Must NOT have been translated into English words
    assert "That day I went to the hospital" not in processed
    assert "There was a nurse there" not in processed


def test_hindi_language_detection():
    hindi_text = "Us din main hospital gaya tha. Wahan ek nurse khadi thi jo mujhe dekhkar darr gayi."
    lang, conf = LanguageService.identify_language(hindi_text, "auto")

    assert lang == "hi", f"Expected language 'hi' for Hindi speech, got '{lang}'"
    assert conf > 0.6


def test_hindi_language_preservation_not_english():
    hindi_text = "Us din main hospital gaya tha. Wahan ek nurse khadi thi."
    processed = RomanizationService.process_script_mode(hindi_text, "hi", "romanized")

    assert "main hospital gaya tha" in processed
    assert "nurse khadi thi" in processed
    assert "That day I went to the hospital" not in processed


def test_english_language_preservation():
    english_text = "That day I went to the hospital. There was a nurse there."
    lang, conf = LanguageService.identify_language(english_text, "auto")

    assert lang == "en"
    processed = RomanizationService.process_script_mode(english_text, "en", "romanized")
    assert "That day I went to the hospital" in processed


@pytest.mark.asyncio
async def test_faithful_mode_preserves_facts():
    text = "There was a nurse and she looked afraid."
    result = await StoryAIService.transform_text(
        action="clean_up",
        selected_text=text,
        language="en",
        script_mode="romanized",
        style="narrative",
        writing_mode="faithful"
    )

    transformed = result["transformed_text"]
    assert "nurse" in transformed
    assert "afraid" in transformed
    # Anti-hallucination guarantee: must not invent facts
    assert "trembling in fear" not in transformed


@pytest.mark.asyncio
async def test_screenplay_style_transformation():
    text = "The door opens. A nurse looks up. She freezes."
    result = await StoryAIService.transform_text(
        action="convert_script",
        selected_text=text,
        language="en",
        script_mode="romanized",
        style="screenplay",
        writing_mode="faithful"
    )

    transformed = result["transformed_text"]
    assert "INT. ROOM" in transformed or "NARRATOR" in transformed
    assert "The door opens" in transformed


@pytest.mark.asyncio
async def test_poetry_style_transformation():
    text = "I walked into the hospital under the cold white lights while the silence followed me."
    result = await StoryAIService.transform_text(
        action="convert_poetry",
        selected_text=text,
        language="en",
        script_mode="romanized",
        style="poetry",
        writing_mode="faithful"
    )

    transformed = result["transformed_text"]
    assert "\n" in transformed, "Poetry transformation must introduce verse line breaks"
