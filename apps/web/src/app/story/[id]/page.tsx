'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Download, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { useStoryStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import { useAudioRecorder } from '../../../hooks/useAudioRecorder';
import { useRealtimeSocket } from '../../../hooks/useRealtimeSocket';
import { useStoryAutosave } from '../../../hooks/useStoryAutosave';

import { EditorToolbar } from '../../../components/editor/EditorToolbar';
import { StoryEditor } from '../../../components/editor/StoryEditor';
import { VoiceControlBar } from '../../../components/editor/VoiceControlBar';
import { AIToolbar } from '../../../components/editor/AIToolbar';
import { VersionHistoryDrawer } from '../../../components/editor/VersionHistoryDrawer';

export default function StoryWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<string>('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);

  const {
    setStory,
    updateProcessedText,
    recordingState,
    processedText,
    setRecordingState,
  } = useStoryStore();

  const { saveNow } = useStoryAutosave();

  // Realtime WebSocket integration
  const {
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendAudioChunk,
    pauseSession: wsPause,
    resumeSession: wsResume,
  } = useRealtimeSocket({
    storyId,
    onPartialTranscript: (text) => {
      // Streamed live into store
    },
    onFinalParagraph: (processed, raw) => {
      // Automatically triggers autosave
    },
  });

  // Audio Recorder integration
  const {
    startRecording: audioStart,
    pauseRecording: audioPause,
    resumeRecording: audioResume,
    stopRecording: audioStop,
    micLevel,
  } = useAudioRecorder({
    onAudioChunk: (pcmBase64, rms) => {
      sendAudioChunk(pcmBase64, rms);
    },
  });

  // Voice Control Actions
  const handleStartRecording = useCallback(async () => {
    wsConnect();
    await audioStart();
  }, [wsConnect, audioStart]);

  const handlePauseRecording = useCallback(() => {
    audioPause();
    wsPause();
  }, [audioPause, wsPause]);

  const handleResumeRecording = useCallback(() => {
    audioResume();
    wsResume();
  }, [audioResume, wsResume]);

  const handleStopRecording = useCallback(() => {
    audioStop();
    wsDisconnect();
    saveNow();
  }, [audioStop, wsDisconnect, saveNow]);

  // Load story data on mount
  useEffect(() => {
    async function loadStory() {
      try {
        const data = await api.getStory(storyId);
        setStory({
          storyId: data.id,
          projectId: data.project_id,
          title: data.title,
          language: data.language,
          scriptMode: data.script_mode,
          style: data.style,
          writingMode: data.writing_mode,
          realtimeMode: data.realtime_mode,
          processedText: data.processed_text || '',
          rawTranscript: data.raw_transcript || '',
          wordCount: data.word_count || 0,
          saveStatus: 'saved',
        });
      } catch (err) {
        console.error('Failed to load story:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStory();

    return () => {
      handleStopRecording();
    };
  }, [storyId, setStory, handleStopRecording]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S -> Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNow();
      }
      // Ctrl/Cmd + Shift + E -> Export
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setExportModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveNow]);

  const handleTriggerExport = async () => {
    setIsExporting(true);
    setExportDownloadUrl(null);
    try {
      const job = await api.exportStory(storyId, 'pdf', {
        include_title_page: true,
        font_family: 'serif',
      });
      if (job && job.id) {
        setExportDownloadUrl(api.getExportDownloadUrl(storyId, job.id));
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-studio-950 text-studio-400">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-3" />
        <span>Loading Story Workspace...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground relative selection:bg-amber-500/20">
      {/* Top Bar with Navigation Link */}
      <div className="flex items-center px-4 py-1.5 border-b border-studio-200 dark:border-studio-800/80 bg-studio-50/50 dark:bg-studio-950/50 text-xs text-studio-500">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 hover:text-studio-900 dark:hover:text-studio-100 transition-colors mr-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
        <span className="font-mono text-studio-400">StoryFlow Studio &bull; Realtime Voice Writing</span>
      </div>

      {/* Editor Controls Topbar */}
      <EditorToolbar
        onExport={() => setExportModalOpen(true)}
        onSaveManual={saveNow}
      />

      {/* AI Refinement Toolbar */}
      <AIToolbar
        selectedText={selectedText}
        onApplyTransformation={(transformed) => {
          if (selectedText && processedText.includes(selectedText)) {
            updateProcessedText(processedText.replace(selectedText, transformed));
          } else {
            updateProcessedText(transformed);
          }
          saveNow();
        }}
      />

      {/* Primary Writing Canvas */}
      <main className="flex-1 flex flex-col justify-start">
        <StoryEditor onSelectText={(text) => setSelectedText(text)} />
      </main>

      {/* Floating Bottom Voice Control */}
      <VoiceControlBar
        onStart={handleStartRecording}
        onPause={handlePauseRecording}
        onResume={handleResumeRecording}
        onStop={handleStopRecording}
      />

      {/* Slide-out Version History Drawer */}
      <VersionHistoryDrawer />

      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-studio-900 border border-studio-800 rounded-2xl p-6 shadow-2xl text-studio-100">
            <h3 className="font-serif text-xl font-bold text-white mb-2">Export Typeset Manuscript</h3>
            <p className="text-xs text-studio-400 mb-6 leading-relaxed">
              Generates a publication-grade manuscript typeset according to professional editorial standards.
            </p>

            <div className="p-4 rounded-lg bg-studio-950 border border-studio-800 mb-6 space-y-2 text-xs">
              <div className="flex justify-between text-studio-300">
                <span>Format:</span>
                <span className="font-mono text-white">Print-Ready HTML / PDF</span>
              </div>
              <div className="flex justify-between text-studio-300">
                <span>Layout:</span>
                <span className="font-mono text-white">Title Page + Book Serif Margins</span>
              </div>
              <div className="flex justify-between text-studio-300">
                <span>Word Count:</span>
                <span className="font-mono text-white">{useStoryStore.getState().wordCount} words</span>
              </div>
            </div>

            {exportDownloadUrl ? (
              <div className="space-y-4">
                <a
                  href={exportDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Typeset Document</span>
                </a>
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="w-full py-2 text-xs text-studio-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-studio-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTriggerExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Typesetting Manuscript...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Generate Document</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
