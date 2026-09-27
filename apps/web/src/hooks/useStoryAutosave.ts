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
    if (!storyId || saveStatus === 'saved') return;

    setSaveStatus('saving');

    // 1. Always backup locally first for offline resilience
    try {
      localStorage.setItem(`storyflow_offline_${storyId}`, JSON.stringify({
        title,
        processedText,
        rawTranscript,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // ignore quota errors
    }

    // 2. Persist to API
    try {
      await api.updateStory(storyId, {
        title,
        language,
        script_mode: scriptMode,
        style,
        writing_mode: writingMode,
        realtime_mode: realtimeMode,
        processed_text: processedText,
        raw_transcript: rawTranscript,
      });

      lastSavedContentRef.current = processedText;
      setSaveStatus('saved');
    } catch (err) {
      console.warn('Network autosave failed, saved locally:', err);
      setSaveStatus('offline_saved');
    }
  }, [
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
  ]);

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
