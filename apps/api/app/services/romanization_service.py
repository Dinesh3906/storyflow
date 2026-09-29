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

# Urdu (Perso-Arabic script) to Romanized Hindi (Hinglish) mapping
URDU_WORD_MAP = {
    'تو': 'tu', 'مجھ': 'mujh', 'مجھکو': 'mujhko', 'کو': 'ko', 'پیلاتے': 'pilati', 'پیلاتی': 'pilati',
    'گئی': 'gayi', 'کیا': 'kya', 'میں': 'main', 'پی': 'pee', 'کر': 'kar', 'جو': 'jo', 'ہی': 'hi',
    'کہوں': 'kahoon', 'گا': 'ga', 'گی': 'gi', 'گے': 'ge', 'سب': 'sab', 'باہوں': 'baahon', 'رکھ': 'rakh',
    'لے': 'le', 'دو': 'do', 'پہ': 'pal', 'پل': 'pal', 'پھر': 'phir', 'چاہی': 'chahe', 'چاہے': 'chahe',
    'دور': 'door', 'ہٹا': 'hata', 'دے': 'de', 'سلاتے': 'sulati', 'سلاتی': 'sulati', 'تیری': 'teri',
    'تیرا': 'tera', 'یات': 'yaad', 'یاد': 'yaad', 'سمجھ': 'samajh', 'در': 'dil', 'سولات': 'sawalaat',
    'سنم': 'sanam', 'مہرہ': 'mehra', 'ایک': 'ek', 'بارو': 'paaro', 'پاروں': 'paaro', 'پارو': 'paaro',
    'جاروں': 'isharon', 'اشاروں': 'isharon', 'باتیں': 'baatein', 'لینا': 'lena', 'ہوش': 'hosh',
    'نہیں': 'nahin', 'ہے': 'hai', 'ہیں': 'hain', 'وہ': 'woh', 'یہ': 'yeh', 'شرم': 'sharam',
    'شرام': 'sharam', 'ہاتھ': 'haath', 'کہا': 'kaha', 'تھا': 'tha', 'تھی': 'thi', 'تھے': 'the',
    'خاموش': 'khamosh', 'محبت': 'mohabbat', 'عشق': 'ishq', 'دل': 'dil', 'بات': 'baat',
    'رات': 'raat', 'صبح': 'subah', 'شام': 'shaam', 'گھر': 'ghar', 'ساتھ': 'saath', 'جان': 'jaan',
    'انا': 'apna', 'کامنا': 'saamna', 'جسی': 'jise', 'پاہنا': 'paana', 'اور': 'aur', 'سکھوں': 'seekhoon',
    'بیٹھے': 'baithe', 'ہب': 'bhool', 'لاتے': 'laate', 'گولوں': 'ghoonton', 'رکھوں': 'rakhoon',
    'جاتتی': 'jaati', 'کا': 'ka', 'ورام': 'bharam', 'بکو': 'tumko', 'جانا': 'jaana', 'دھا': 'tha',
    'کہتھ': 'haath', 'پیو': 'piyo', 'شراء': 'sharabein', 'شرا': 'sharab', 'ختم': 'khatam',
    'دیستہ': 'diye', 'زخم': 'zakham', 'تے': 'te', 'سونے': 'sohne', 'سونےآ': 'sohneya',
    'ہون': 'ho na', 'راتے': 'raatein', 'مجب': 'mujhe', 'آن': 'aur', 'اسے': 'sitam',
    'خو': 'kho', 'کافی': 'kaafi', 'پیلا': 'pila', 'بلا': 'bhula', 'گولزوں': 'god',
    'رکھلوں': 'rakh loon', 'ہر': 'agar', 'تیڑی': 'teri', 'یا': 'yaad', 'تیمت': 'thi mat',
    'پیوں': 'piyo', 'جام': 'jaan', 'ازہر': 'zeher', 'گیر': 'gair', 'چھوے': 'chhuye',
    'دیکھتا': 'dekhta', 'ہوں': 'hoon', 'کچھ': 'kuch', 'باکی': 'baaki', 'جانہ': 'jaana',
    'ہرام': 'dharam'
}

# Urdu (Perso-Arabic script) to Devanagari Hindi mapping
URDU_TO_DEVANAGARI_WORD_MAP = {
    'تو': 'तू', 'مجھ': 'मुझ', 'مجھکو': 'मुझको', 'کو': 'को', 'پیلاتے': 'पिलाती', 'پیلاتی': 'पिलाती',
    'گئی': 'गई', 'کیا': 'क्या', 'میں': 'मैं', 'پی': 'पी', 'کر': 'कर', 'جو': 'जो', 'ہی': 'ही',
    'کہوں': 'कहूँगा', 'گا': 'गा', 'گی': 'गी', 'گے': 'गे', 'سب': 'सब', 'باہوں': 'बाहों', 'رکھ': 'रख',
    'لے': 'ले', 'دو': 'दो', 'پہ': 'पल', 'پل': 'पल', 'پھر': 'फिर', 'چاہی': 'चाहे', 'چاہے': 'चाहे',
    'دور': 'दूर', 'ہٹا': 'हटा', 'دے': 'दे', 'سلاتے': 'सुलाती', 'سلاتی': 'सुलाती', 'تیری': 'तेरी',
    'تیرا': 'तेरा', 'یات': 'याद', 'یاد': 'याद', 'سمجھ': 'समझ', 'در': 'दिल', 'سولات': 'सवालात',
    'سنم': 'सनम', 'مہرہ': 'मेरा', 'ایک': 'एक', 'بارو': 'पारो', 'پاروں': 'पारो', 'پارو': 'पारो',
    'جاروں': 'इशारों', 'اشاروں': 'इशारों', 'باتیں': 'बातें', 'لینا': 'लेना', 'ہوش': 'होश',
    'نہیں': 'नहीं', 'ہے': 'है', 'ہیں': 'हैं', 'وہ': 'वह', 'یہ': 'यह', 'شرم': 'शर्म',
    'شرام': 'शर्म', 'ہاتھ': 'हाथ', 'کہا': 'कहा', 'تھا': 'था', 'تھی': 'थी', 'تھے': 'थे',
    'خاموش': 'ख़ामोश', 'محبت': 'मोहब्बत', 'عشق': 'इश्क़', 'دل': 'दिल', 'بات': 'बात',
    'رات': 'रात', 'صبح': 'सुबह', 'شام': 'शाम', 'گھر': 'घर', 'ساتھ': 'साथ', 'جان': 'जान',
    'انا': 'अपना', 'کامنا': 'सामना', 'جسی': 'जिसे', 'پاہنا': 'पाना', 'اور': 'और', 'سکھوں': 'सीखूँ',
    'بیٹھے': 'बैठे', 'ہب': 'भूल', 'لاتے': 'लाते', 'گولوں': 'घूँटों', 'رکھوں': 'रखूँ',
    'جاتتی': 'जाती', 'کا': 'का', 'ورام': 'भरम', 'بکو': 'तुमको', 'جانا': 'जाना', 'دھا': 'था',
    'کہتھ': 'हाथ', 'پیو': 'पियो', 'شراء': 'शराबें', 'شرا': 'शराब', 'ختم': 'ख़त्म',
    'دیستہ': 'दिए', 'زخم': 'ज़ख़्म', 'تے': 'तेरे', 'سونے': 'सोहणे', 'سونےآ': 'सोहणया',
    'ہون': 'हो ना', 'راتے': 'रातें', 'مجب': 'मुझे', 'آن': 'और', 'اسے': 'सितम',
    'خو': 'खो', 'کافی': 'काफ़ी', 'پیلا': 'पिला', 'بلا': 'भुला', 'گولزوں': 'गोद',
    'رکھلوں': 'रख लूँ', 'ہر': 'अगर', 'تیڑی': 'तेरी', 'یا': 'याद', 'تیمت': 'थी मत',
    'پیوں': 'पियूँ', 'جام': 'जान', 'ازہر': 'ज़हर', 'گیر': 'ग़ैर', 'چھوے': 'छुए',
    'دیکھتا': 'देखता', 'ہوں': 'हूँ', 'کچھ': 'कुछ', 'باکی': 'बाक़ी', 'جانہ': 'जाना',
    'ہرام': 'धरम'
}

URDU_CHAR_MAP = {
    'ا': 'a', 'آ': 'aa', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's',
    'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ڈ': 'd', 'ذ': 'z',
    'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's',
    'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
    'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n', 'و': 'o',
    'ہ': 'h', 'ھ': 'h', 'ء': '', 'ی': 'i', 'ے': 'e', 'ئ': 'i',
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
    def transliterate_urdu_to_roman(cls, text: str) -> str:
        """
        Converts Urdu/Arabic script into clean Romanized Hindi (Hinglish).
        Prevents Whisper's Urdu phonetic slips from exposing Arabic characters to the user.
        """
        words = text.split()
        res = []
        for w in words:
            clean_w = re.sub(r'[^\u0600-\u06FF]', '', w)
            if clean_w in URDU_WORD_MAP:
                res.append(URDU_WORD_MAP[clean_w])
            elif clean_w:
                out = []
                for c in clean_w:
                    out.append(URDU_CHAR_MAP.get(c, ''))
                res.append(''.join(out) or w)
            else:
                res.append(w)
        return cls.clean_casing_and_punctuation(' '.join(res))

    @classmethod
    def transliterate_urdu_to_devanagari(cls, text: str) -> str:
        """
        Converts Urdu/Arabic script into Devanagari Hindi.
        Used when script_mode is 'original' so Indian users receive native Hindi script.
        """
        words = text.split()
        res = []
        for w in words:
            clean_w = re.sub(r'[^\u0600-\u06FF]', '', w)
            if clean_w in URDU_TO_DEVANAGARI_WORD_MAP:
                res.append(URDU_TO_DEVANAGARI_WORD_MAP[clean_w])
            elif clean_w in URDU_WORD_MAP:
                # Fallback to Roman then transliterate
                rom = URDU_WORD_MAP[clean_w]
                res.append(rom)
            else:
                # Transliterate characters
                out = []
                for c in clean_w:
                    out.append(URDU_CHAR_MAP.get(c, ''))
                res.append(''.join(out) or w)
        return ' '.join(res).strip()

    @classmethod
    def process_script_mode(cls, text: str, detected_language: str, script_mode: str) -> str:
        """
        Applies script transformation according to user configuration:
        - 'romanized': Converts native script to Latin (Teluglish/Hinglish). If already Latin, normalizes.
        - 'original': Retains native script (Hindi Devanagari or Telugu).
        - 'english': Only translates if explicitly invoked.
        """
        if not text:
            return ""

        # CRITICAL: Always intercept Perso-Arabic/Urdu script and convert to Hindi/Hinglish
        if any(0x0600 <= ord(c) <= 0x06FF for c in text):
            if script_mode == "original":
                return cls.transliterate_urdu_to_devanagari(text)
            return cls.transliterate_urdu_to_roman(text)

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
