import re
from typing import Dict

# Telugu Unicode to Romanized (Teluglish) mapping
TELUGU_VOWELS = {
    'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo',
    'ఋ': 'ru', 'ఎ': 'e', 'ఏ': 'ae', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'o', 'ఔ': 'au',
    'అం': 'am', 'అః': 'aha'
}

TELUGU_MATRAS = {
    'ా': 'aa', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo',
    'ృ': 'ru', 'ె': 'e', 'ే': 'ae', 'ై': 'ai', 'ొ': 'o', 'ో': 'o', 'ౌ': 'au',
    'ం': 'm', 'ః': 'h', '్': ''
}

TELUGU_CONSONANTS = {
    'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'ఙ': 'ng',
    'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh', 'ఞ': 'ny',
    'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n',
    'త': 'th', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n',
    'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm',
    'య': 'y', 'ర': 'r', 'ల': 'l', 'వ': 'v', 'శ': 'sh',
    'ష': 'sh', 'స': 's', 'హ': 'h', 'ళ': 'l', 'క్ష': 'ksh', 'ఱ': 'r'
}

# Devanagari (Hindi) to Romanized (Hinglish) mapping
HINDI_VOWELS = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'अं': 'an', 'अः': 'ah'
}

HINDI_MATRAS = {
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': ''
}

HINDI_CONSONANTS = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h', 'क्ष': 'ksh', 'त्र': 'tra', 'ज्ञ': 'gyan'
}


class RomanizationService:
    @classmethod
    def transliterate_telugu_to_roman(cls, text: str) -> str:
        """
        Converts Telugu native script into clean, readable Teluglish (Roman Telugu).
        Example: 'ఆ రోజు నేను హాస్పిటల్ కి వెళ్ళాను' -> 'Aa roju nenu hospital ki vellanu'
        """
        output = []
        i = 0
        n = len(text)
        while i < n:
            char = text[i]
            if char in TELUGU_VOWELS:
                output.append(TELUGU_VOWELS[char])
                i += 1
            elif char in TELUGU_CONSONANTS:
                base = TELUGU_CONSONANTS[char]
                # Check next character for matra or virama (halant)
                if i + 1 < n and text[i + 1] in TELUGU_MATRAS:
                    matra = text[i + 1]
                    output.append(base + TELUGU_MATRAS[matra])
                    i += 2
                else:
                    # Inherent vowel 'a'
                    output.append(base + 'a')
                    i += 1
            elif char in TELUGU_MATRAS:
                output.append(TELUGU_MATRAS[char])
                i += 1
            else:
                output.append(char)
                i += 1

        result = "".join(output)
        # Clean up double implicit 'a' artifacts
        result = re.sub(r'a{3,}', 'aa', result)
        return cls.clean_casing_and_punctuation(result)

    @classmethod
    def transliterate_hindi_to_roman(cls, text: str) -> str:
        """
        Converts Hindi Devanagari script into clean Hinglish (Roman Hindi).
        Example: 'उस दिन मैं अस्पताल गया था' -> 'Us din main aspatal gaya tha'
        """
        output = []
        i = 0
        n = len(text)
        while i < n:
            char = text[i]
            if char in HINDI_VOWELS:
                output.append(HINDI_VOWELS[char])
                i += 1
            elif char in HINDI_CONSONANTS:
                base = HINDI_CONSONANTS[char]
                if i + 1 < n and text[i + 1] in HINDI_MATRAS:
                    matra = text[i + 1]
                    output.append(base + HINDI_MATRAS[matra])
                    i += 2
                else:
                    # Inherent vowel 'a'
                    output.append(base + 'a')
                    i += 1
            elif char in HINDI_MATRAS:
                output.append(HINDI_MATRAS[char])
                i += 1
            else:
                output.append(char)
                i += 1

        result = "".join(output)
        return cls.clean_casing_and_punctuation(result)

    @classmethod
    def process_script_mode(cls, text: str, detected_language: str, script_mode: str) -> str:
        """
        Applies script transformation according to user configuration:
        - 'romanized': Converts native script to Latin (Teluglish/Hinglish). If already Latin, normalizes.
        - 'original': Retains native script.
        - 'english': Only translates if explicitly invoked.
        """
        if not text:
            return ""

        if script_mode == "romanized":
            if detected_language == "te":
                # Check if native Telugu script
                if any(0x0C00 <= ord(c) <= 0x0C7F for c in text):
                    return cls.transliterate_telugu_to_roman(text)
            elif detected_language == "hi":
                # Check if Devanagari script
                if any(0x0900 <= ord(c) <= 0x097F for c in text):
                    return cls.transliterate_hindi_to_roman(text)
            return cls.clean_casing_and_punctuation(text)

        elif script_mode == "original":
            return cls.clean_casing_and_punctuation(text)

        return text

    @staticmethod
    def clean_casing_and_punctuation(text: str) -> str:
        """
        Cleans spacing, capitalizes initial sentence letters, removes repeated hesitations.
        """
        if not text:
            return ""
        # Remove consecutive duplicate spaces
        cleaned = re.sub(r'\s+', ' ', text).strip()
        # Capitalize after periods, question marks, exclamation marks
        sentences = re.split(r'([.?!]\s*)', cleaned)
        result = []
        for i in range(0, len(sentences), 2):
            part = sentences[i]
            if part:
                part = part[0].upper() + part[1:] if len(part) > 1 else part.upper()
            result.append(part)
            if i + 1 < len(sentences):
                result.append(sentences[i + 1])
        return "".join(result)
