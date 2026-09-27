'use client';

import React, { useEffect, useState } from 'react';
import { History, X, RotateCcw, Clock, FileText, Check } from 'lucide-react';
import { useStoryStore } from '../../lib/store';
import { api } from '../../lib/api';

export function VersionHistoryDrawer() {
  const { storyId, isVersionHistoryOpen, setVersionHistoryOpen, setStory } = useStoryStore();
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVersionHistoryOpen && storyId) {
      setLoading(true);
      api
        .getStoryVersions(storyId)
        .then((data) => {
          setVersions(data || []);
          if (data && data.length > 0) {
            setSelectedVersion(data[0]);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isVersionHistoryOpen, storyId]);

  if (!isVersionHistoryOpen) return null;

  const handleRestore = async (versionNumber: number) => {
    if (!storyId) return;
    try {
      const restored = await api.restoreStoryVersion(storyId, versionNumber);
      setStory({
        processedText: restored.processed_text,
        rawTranscript: restored.raw_transcript,
        wordCount: restored.word_count,
        saveStatus: 'saved',
      });
      setVersionHistoryOpen(false);
    } catch (e) {
      console.error('Failed to restore version:', e);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-studio-950 border-l border-studio-200 dark:border-studio-800 shadow-2xl flex flex-col transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-studio-200 dark:border-studio-800">
        <div className="flex items-center gap-2 font-semibold text-studio-900 dark:text-studio-100">
          <History className="w-4 h-4 text-studio-500" />
          <span>Version History</span>
        </div>
        <button
          onClick={() => setVersionHistoryOpen(false)}
          className="p-1 rounded-md text-studio-400 hover:text-studio-900 dark:hover:text-studio-100 hover:bg-studio-100 dark:hover:bg-studio-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body: List of versions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-sm text-studio-400">Loading version timeline...</p>}
        {!loading && versions.length === 0 && (
          <p className="text-sm text-studio-400">No versions recorded yet.</p>
        )}

        {versions.map((ver) => {
          const isSelected = selectedVersion?.id === ver.id;
          const date = new Date(ver.created_at);

          return (
            <div
              key={ver.id}
              onClick={() => setSelectedVersion(ver)}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-studio-400 bg-studio-50 dark:bg-studio-900 dark:border-studio-700 shadow-sm'
                  : 'border-studio-200 dark:border-studio-800/80 hover:bg-studio-50 dark:hover:bg-studio-900/50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-studio-900 dark:text-studio-100">
                  Version {ver.version_number}
                </span>
                <span className="text-studio-400 font-mono">
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-xs text-studio-500 dark:text-studio-400 mb-2">
                {ver.change_summary || 'Auto snapshot'}
              </p>

              <div className="flex items-center justify-between text-xs text-studio-400 font-mono">
                <span>{ver.word_count} words</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore(ver.version_number);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-sans font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Footer */}
      {selectedVersion && (
        <div className="p-4 border-t border-studio-200 dark:border-studio-800 bg-studio-50 dark:bg-studio-900/50">
          <div className="text-xs font-semibold text-studio-500 uppercase tracking-wider mb-2">
            Preview (Version {selectedVersion.version_number})
          </div>
          <div className="max-h-36 overflow-y-auto p-2 bg-white dark:bg-studio-950 rounded border border-studio-200 dark:border-studio-800 text-xs text-studio-700 dark:text-studio-300 font-serif whitespace-pre-wrap">
            {selectedVersion.content || '(Empty content)'}
          </div>
        </div>
      )}
    </div>
  );
}
