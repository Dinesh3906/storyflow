/**
 * StoryFlow Shared TypeScript Types & Realtime Protocol Definitions
 */

// ==========================================
// 1. Language & Script Configuration
// ==========================================

export type LanguageCode =
  | 'auto'
  | 'en'   // English
  | 'te'   // Telugu
  | 'hi'   // Hindi
  | 'ta'   // Tamil
  | 'kn'   // Kannada
  | 'bn'   // Bengali
  | 'mixed'
  | 'unknown';

export type ScriptMode =
  | 'romanized' // E.g., Teluglish (A roju nenu...), Hinglish (Us din main...)
  | 'original'  // E.g., Telugu script (ఆ రోజు నేను...), Devanagari (उस दिन मैं...)
  | 'english';   // Translated to English (Only when explicitly requested by user)

export type StoryStyle =
  | 'narrative'
  | 'screenplay'
  | 'poetry'
  | 'short_story'
  | 'novel'
  | 'journal'
  | 'script'
  | 'dialogue'
  | 'custom';

export type WritingMode =
  | 'faithful' // Only improve punctuation, grammar, formatting; never invent facts
  | 'literary'; // Stylistic enrichment while preserving all underlying facts

export type RealtimeMode =
  | 'fast'     // Lowest latency (minimal processing)
  | 'balanced' // Moderate cleanup and punctuation
  | 'writing';  // Full stylistic structural formatting

export type RecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'connecting'
  | 'listening'
  | 'paused'
  | 'processing'
  | 'reconnecting'
  | 'error'
  | 'saved';

// ==========================================
// 2. Realtime WebSocket Event Protocol
// ==========================================

export type WebSocketEventType =
  // Lifecycle
  | 'connection.ready'
  | 'session.start'
  | 'session.started'
  | 'session.pause'
  | 'session.paused'
  | 'session.resume'
  | 'session.resumed'
  | 'session.reconnecting'
  | 'session.completed'
  // Audio
  | 'audio.start'
  | 'audio.started'
  | 'audio.chunk'
  | 'audio.stop'
  | 'audio.stopped'
  // STT & Transcription
  | 'transcript.partial'
  | 'transcript.final'
  | 'language.detected'
  // Story Transformation
  | 'story.processing'
  | 'story.delta'
  | 'story.paragraph.final'
  | 'story.saved'
  | 'story.error'
  // Client Actions & Control
  | 'client.ack'
  | 'client.heartbeat'
  | 'server.heartbeat';

export interface BaseRealtimeMessage<T = unknown> {
  type: WebSocketEventType;
  sessionId: string;
  sequence: number;
  timestamp: string; // ISO 8601
  payload: T;
}

// Client -> Server Payload Types
export interface SessionStartPayload {
  storyId: string;
  userId: string;
  language: LanguageCode;
  scriptMode: ScriptMode;
  style: StoryStyle;
  writingMode: WritingMode;
  realtimeMode: RealtimeMode;
  sampleRate?: number;
}

export interface AudioChunkPayload {
  // Base64 encoded 16kHz 16-bit mono PCM, or binary frame
  data: string;
  durationMs: number;
  rmsLevel?: number; // 0.0 - 1.0 mic meter
}

// Server -> Client Payload Types
export interface ConnectionReadyPayload {
  connectionId: string;
  serverTimestamp: string;
  heartbeatIntervalMs: number;
}

export interface TranscriptPartialPayload {
  segmentId: string;
  text: string;
  language: LanguageCode;
  confidence: number;
  isFinal: false;
  startMs: number;
  endMs: number;
}

export interface TranscriptFinalPayload {
  segmentId: string;
  rawText: string;
  language: LanguageCode;
  confidence: number;
  isFinal: true;
  startMs: number;
  endMs: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface LanguageDetectedPayload {
  detectedLanguage: LanguageCode;
  confidence: number;
  isFallback: boolean;
}

export interface StoryDeltaPayload {
  segmentId: string;
  deltaText: string;
  cursorPosition?: number;
}

export interface StoryParagraphFinalPayload {
  paragraphId: string;
  rawTranscript: string;
  processedText: string;
  language: LanguageCode;
  scriptMode: ScriptMode;
  style: StoryStyle;
  orderIndex: number;
  wordCount: number;
}

export interface StorySavedPayload {
  storyId: string;
  versionId: string;
  updatedAt: string;
  wordCount: number;
}

export interface StoryErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

// ==========================================
// 3. Domain Entity Models
// ==========================================

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  storyCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StorySettings {
  autoPunctuate: boolean;
  preserveRepetitions: boolean;
  colloquialVocabulary: string[];
  customNames: string[];
  theme: 'dark' | 'light' | 'system';
}

export interface Story {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  language: LanguageCode;
  scriptMode: ScriptMode;
  style: StoryStyle;
  writingMode: WritingMode;
  realtimeMode: RealtimeMode;
  rawTranscript: string;
  processedText: string;
  wordCount: number;
  settings: StorySettings;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  storyId: string;
  contentJson: Record<string, unknown>; // TipTap ProseMirror schema JSON
  plainText: string;
  version: number;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
}

export interface Paragraph {
  id: string;
  storyId: string;
  chapterId?: string;
  rawText: string;
  processedText: string;
  orderIndex: number;
  isFinal: boolean;
  createdAt: string;
}

export interface StoryVersion {
  id: string;
  storyId: string;
  versionNumber: number;
  content: string;
  rawTranscript: string;
  wordCount: number;
  changeSummary: string;
  createdAt: string;
}

export interface StorySession {
  id: string;
  storyId: string;
  userId: string;
  status: 'active' | 'paused' | 'ended' | 'error';
  languageDetected?: LanguageCode;
  audioSeconds: number;
  startedAt: string;
  endedAt?: string;
}

export interface StoryCharacter {
  id: string;
  storyId: string;
  name: string;
  role?: string;
  attributes: Record<string, string>;
}

export interface StoryLocation {
  id: string;
  storyId: string;
  name: string;
  description?: string;
}

export interface StoryMemory {
  characters: StoryCharacter[];
  locations: StoryLocation[];
  summary: string;
  timeline: Array<{
    timestamp: string;
    event: string;
  }>;
}

export interface ExportJob {
  id: string;
  storyId: string;
  userId: string;
  format: 'pdf' | 'docx' | 'markdown' | 'txt';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// AI Transformation Request / Response
export interface AITransformRequest {
  action:
    | 'clean_up'
    | 'rewrite'
    | 'continue'
    | 'shorten'
    | 'expand'
    | 'make_literary'
    | 'make_simple'
    | 'convert_dialogue'
    | 'convert_script'
    | 'convert_poetry';
  selectedText: string;
  fullStoryContext?: string;
  language: LanguageCode;
  scriptMode: ScriptMode;
  style: StoryStyle;
  writingMode: WritingMode;
}

export interface AITransformResponse {
  transformedText: string;
  explanation?: string;
  preservedLanguage: LanguageCode;
  executionTimeMs: number;
}
