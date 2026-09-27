/**
 * StoryFlow Configuration Constants & System Contracts
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect', nativeLabel: 'Auto' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు (Telugu)' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी (Hindi)' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ் (Tamil)' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ (Kannada)' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা (Bengali)' },
] as const;

export const SUPPORTED_SCRIPT_MODES = [
  {
    mode: 'romanized',
    label: 'Romanized Script (Default)',
    description: 'Telugu as Teluglish, Hindi as Hinglish (e.g. "A roju nenu...")',
  },
  {
    mode: 'original',
    label: 'Original Script',
    description: 'Native script (e.g. తెలుగు or हिन्दी)',
  },
  {
    mode: 'english',
    label: 'Translate to English',
    description: 'Explicitly translates spoken content to English prose',
  },
] as const;

export const SUPPORTED_STYLES = [
  {
    style: 'narrative',
    label: 'Narrative Prose',
    description: 'Classic flowing storyteller prose with dialogue and narrative balance',
  },
  {
    style: 'screenplay',
    label: 'Screenplay / Script',
    description: 'Industry standard screenplay with scene headings, character cues, dialogue',
  },
  {
    style: 'poetry',
    label: 'Poetry',
    description: 'Evocative stanzas, rhythmic cadences, and intentional line breaks',
  },
  {
    style: 'short_story',
    label: 'Short Story',
    description: 'Concise, focused arcs with sharp scene economy',
  },
  {
    style: 'novel',
    label: 'Novel Chapter',
    description: 'Rich description, character pacing, and deep perspective',
  },
  {
    style: 'journal',
    label: 'Journal / Memoir',
    description: 'Intimate first-person reflective voice',
  },
  {
    style: 'dialogue',
    label: 'Pure Dialogue',
    description: 'Rapid-fire back-and-forth conversational interchange',
  },
] as const;

export const WRITING_MODES = [
  {
    mode: 'faithful',
    label: 'Faithful Mode',
    description: 'Strict fidelity. Corrects only grammar, punctuation, and flow. Zero fact invention.',
  },
  {
    mode: 'literary',
    label: 'Literary Mode',
    description: 'Stylistic polish and evocative phrasing while strictly maintaining all user facts.',
  },
] as const;

export const REALTIME_MODES = [
  {
    mode: 'fast',
    label: 'Fast (Ultra Low Latency)',
    latencyBudgetMs: 250,
    description: 'Direct streaming STT with immediate incremental rendering.',
  },
  {
    mode: 'balanced',
    label: 'Balanced',
    latencyBudgetMs: 600,
    description: 'Low latency with incremental punctuation and transliteration alignment.',
  },
  {
    mode: 'writing',
    label: 'Writing Studio',
    latencyBudgetMs: 1200,
    description: 'Full sentence boundary detection and real-time stylistic prose layout.',
  },
] as const;

export const AUDIO_CONSTRAINTS = {
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  chunkIntervalMs: 30, // 30ms audio chunk target (20-40ms requirement)
  bytesPerSample: 2, // 16-bit
  bufferSize: 960,   // 30ms @ 16kHz = 480 samples = 960 bytes
};

export const ANTI_HALLUCINATION_SYSTEM_PROMPT = `
You are a transcription-to-writing transformation engine for StoryFlow.
You must preserve factual content.
Do not invent characters, events, locations, emotions, dialogue, actions, descriptions, dates, or facts that are not present in the source content.
CRITICAL LANGUAGE INTEGRITY:
Never automatically translate non-English speech into English unless the user explicitly requested translation.
If the input is Telugu or Roman Telugu ("A roju nenu hospital ki vellanu..."), you MUST output in Telugu or Roman Telugu according to the requested scriptMode.
If the input is Hindi or Roman Hindi ("Us din main hospital gaya tha..."), you MUST output in Hindi or Roman Hindi according to the requested scriptMode.
Preserve the exact language identity, colloquial nuances, and cadence of the speaker.
`;
