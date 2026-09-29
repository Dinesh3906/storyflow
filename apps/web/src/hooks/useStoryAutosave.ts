import { useEffect, useRef, useCallback } from 'react';
import { useStoryStore } from '../lib/store';
import { api } from '../lib/api';

export function useStoryAutosave() {
  const {
    storyId,
    title,
    language,
    scriptMode,
    style,
    writingMode,
    realtimeMode,
    processedText,
    rawTranscript,
    saveStatus,
    setSaveStatus,
  } = useStoryStore();

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  const performSave = useCallback(async () => {
    const state = useStoryStore.getState();
    if (!state.storyId || state.saveStatus === 'saved') return;

    state.setSaveStatus('saving');

    // 1. Always backup locally first for offline resilience
    try {
      localStorage.setItem(`storyflow_offline_${state.storyId}`, JSON.stringify({
        title: state.title,
        processedText: state.processedText,
        rawTranscript: state.rawTranscript,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // ignore quota errors
    }

    // 2. Persist to API
    try {
      await api.updateStory(state.storyId, {
        title: state.title,
        language: state.language,
        script_mode: state.scriptMode,
        style: state.style,
        writing_mode: state.writingMode,
        realtime_mode: state.realtimeMode,
        processed_text: state.processedText,
        raw_transcript: state.rawTranscript,
      });

      lastSavedContentRef.current = state.processedText;
      state.setSaveStatus('saved');
    } catch (err) {
      console.warn('Network autosave failed, saved locally:', err);
      state.setSaveStatus('offline_saved');
    }
  }, []);

  useEffect(() => {
    if (!storyId) return;

    // If content changed from last saved content, schedule debounce save
    if (processedText !== lastSavedContentRef.current && saveStatus === 'unsaved') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        performSave();
      }, 2000);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [processedText, storyId, saveStatus, performSave]);

  return {
    saveNow: performSave,
  };
}
