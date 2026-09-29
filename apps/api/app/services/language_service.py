import re
from typing import Tuple, Dict

# Unicode Script Ranges
UNICODE_RANGES = {
    "te": (0x0C00, 0x0C7F),  # Telugu
    "hi": (0x0900, 0x097F),  # Devanagari (Hindi)
    "ur": (0x0600, 0x06FF),  # Perso-Arabic / Urdu (treated as Hindi speech)
    "ta": (0x0B80, 0x0BFF),  # Tamil
    "kn": (0x0C80, 0x0CFF),  # Kannada
    "bn": (0x0980, 0x09FF),  # Bengali
}

# High-frequency Romanized vocabulary markers
ROMAN_TELUGU_MARKERS = {
    "nenu", "vellanu", "undhi", "undi", "chala", "enduku", "cheppanu", "roju",
    "cheyali", "ikkada", "akkada", "chesanu", "vachanu", "unna", "unnadu",
    "lekapothe", "chusi", "bayapadindi", "ardham", "kaaledu", "kaledu", "kuda",
    "ippudu", "taruvatha", "manishi", "pillalu", "intiki", "bavundi"
}

ROMAN_HINDI_MARKERS = {
    "main", "tha", "thi", "gaya", "gayi", "kuch", "kyun", "hona", "karna",
    "baat", "wahan", "yahan", "uske", "meri", "mera", "hoga", "raha", "rahi",
    "aaya", "dekh", "dekha", "samajh", "nahi", "nahin", "bohot", "bahut"
}


class LanguageService:
    @staticmethod
    def detect_script(text: str) -> str:
        """
        Determines whether text is written in a native Indic script or Latin (Roman) script.
        """
        for char in text:
            code = ord(char)
            for lang, (start, end) in UNICODE_RANGES.items():
                if start <= code <= end:
                    return lang
        return "latin"

    @classmethod
    def identify_language(cls, text: str, user_preference: str = "auto") -> Tuple[str, float]:
        """
        Identifies spoken language and script.
        If user_preference is set (not 'auto'), respects user preference.
        Returns: (language_code, confidence)
        """
        if user_preference and user_preference != "auto":
            return user_preference, 1.0

        cleaned = text.lower().strip()
        if not cleaned:
            return "en", 0.5

        # 1. Check for native Indic scripts first
        script = cls.detect_script(cleaned)
        if script in UNICODE_RANGES:
            return ("hi" if script == "ur" else script), 0.98

        # 2. Check for Romanized vocabulary markers (Teluglish / Hinglish)
        words = set(re.findall(r"\b[a-z']+\b", cleaned))
        if not words:
            return "en", 0.8

        telugu_matches = words.intersection(ROMAN_TELUGU_MARKERS)
        hindi_matches = words.intersection(ROMAN_HINDI_MARKERS)

        if len(telugu_matches) > 0 and len(telugu_matches) >= len(hindi_matches):
            confidence = min(0.95, 0.6 + len(telugu_matches) * 0.1)
            return "te", confidence

        if len(hindi_matches) > 0:
            confidence = min(0.95, 0.6 + len(hindi_matches) * 0.1)
            return "hi", confidence

        # Default fallback to English if mostly Latin characters
        return "en", 0.85
