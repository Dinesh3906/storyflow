/**
 * StoryFlow Web Constants & Config
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

export const SCRIPT_MODES = [
  {
    mode: 'romanized',
    label: 'Romanized Script (Default)',
    tag: 'Teluglish / Hinglish',
    description: 'Telugu as Teluglish, Hindi as Hinglish (e.g. "A roju nenu...")',
  },
  {
    mode: 'original',
    label: 'Original Script',
    tag: 'తెలుగు / हिन्दी',
    description: 'Native script (e.g. తెలుగు or हिन्दी)',
  },
  {
    mode: 'english',
    label: 'Translate to English',
    tag: 'English',
    description: 'Explicitly translates spoken content to English prose',
  },
] as const;

export const STORY_STYLES = [
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
    description: 'Full stylistic structural formatting.',
  },
] as const;
