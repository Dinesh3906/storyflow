import { create } from 'zustand';

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

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'offline_saved';

export interface StoryState {
  storyId: string | null;
  projectId: string | null;
  title: string;
  language: string;
  scriptMode: string;
  style: string;
  writingMode: string;
  realtimeMode: string;
  processedText: string;
  rawTranscript: string;
  liveProvisionalText: string;
  wordCount: number;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  recordingState: RecordingState;
  micLevel: number;
  lastError: string | null;
  isVersionHistoryOpen: boolean;

  // Actions
  setStory: (partial: Partial<StoryState>) => void;
  updateProcessedText: (text: string) => void;
  appendFinalParagraph: (processed: string, raw?: string) => void;
  setLiveProvisionalText: (text: string) => void;
  setRecordingState: (state: RecordingState) => void;
  setMicLevel: (level: number) => void;
  setLastError: (error: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setVersionHistoryOpen: (open: boolean) => void;
  reset: () => void;
}

const initialState = {
  storyId: null,
  projectId: null,
  title: 'Untitled Story',
  language: 'auto',
  scriptMode: 'romanized',
  style: 'narrative',
  writingMode: 'faithful',
  realtimeMode: 'fast',
  processedText: '',
  rawTranscript: '',
  liveProvisionalText: '',
  wordCount: 0,
  saveStatus: 'saved' as SaveStatus,
  lastSavedAt: null,
  recordingState: 'idle' as RecordingState,
  micLevel: 0,
  lastError: null,
  isVersionHistoryOpen: false,
};

function calculateWordCount(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const useStoryStore = create<StoryState>((set) => ({
  ...initialState,

  setStory: (partial) => {
    set((state) => {
      const next = { ...state, ...partial };
      if (partial.processedText !== undefined && partial.wordCount === undefined) {
        next.wordCount = calculateWordCount(partial.processedText);
      }
      return next;
    });
  },

  updateProcessedText: (text) => {
    set({
      processedText: text,
      wordCount: calculateWordCount(text),
      saveStatus: 'unsaved',
    });
  },

  appendFinalParagraph: (processed, raw) => {
    set((state) => {
      const cleanProcessed = (processed || '').trim();
      if (!cleanProcessed) return state;

      const newProcessedText = state.processedText
        ? `${state.processedText}\n\n${cleanProcessed}`
        : cleanProcessed;

      const cleanRaw = (raw || processed || '').trim();
      const newRawTranscript = state.rawTranscript
        ? `${state.rawTranscript} ${cleanRaw}`
        : cleanRaw;

      return {
        processedText: newProcessedText,
        rawTranscript: newRawTranscript,
        wordCount: calculateWordCount(newProcessedText),
        saveStatus: 'unsaved',
      };
    });
  },

  setLiveProvisionalText: (text) => set({ liveProvisionalText: text }),

  setRecordingState: (state) => set({ recordingState: state }),

  setMicLevel: (level) => set({ micLevel: level }),

  setLastError: (error) => set({ lastError: error }),

  setSaveStatus: (status) =>
    set({
      saveStatus: status,
      lastSavedAt: status === 'saved' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    }),

  setVersionHistoryOpen: (open) => set({ isVersionHistoryOpen: open }),

  reset: () => set(initialState),
}));
