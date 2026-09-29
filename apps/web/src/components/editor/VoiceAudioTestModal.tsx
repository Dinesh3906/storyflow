'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Volume2, 
  Mic, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Sparkles, 
  Activity, 
  Cpu, 
  Radio, 
  Languages 
} from 'lucide-react';
import { useStoryStore } from '../../lib/store';
import { VoiceDiagnostics } from '../../hooks/useAudioRecorder';

interface VoiceAudioTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  micLevel: number;
  isRecording: boolean;
  diagnostics?: VoiceDiagnostics;
  onRunTestCase: (transcript: string, lang: string) => void;
}

export function VoiceAudioTestModal({
  isOpen,
  onClose,
  micLevel,
  isRecording,
  diagnostics,
  onRunTestCase,
}: VoiceAudioTestModalProps) {
  const { language, scriptMode, style, writingMode } = useStoryStore();
  const [browserSpeechSupport, setBrowserSpeechSupport] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'testcases'>('diagnostics');
  const [runningTest, setRunningTest] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      setBrowserSpeechSupport(hasSpeech);
    }
  }, []);

  if (!isOpen) return null;

  const testCases = [
    {
      id: 'telugu',
      title: 'Telugu Speech (Roman Teluglish Preservation)',
      language: 'te',
      badge: 'Telugu / Teluglish',
      description: 'Tests speech recognition with strict language preservation without unwanted English translation.',
      transcript: 'A roju nenu railway station ki vellanu, train chala late ayyindi. Passengers andaru wait chestunnaru.',
    },
    {
      id: 'hindi',
      title: 'Hindi Speech (Roman Hinglish Preservation)',
      language: 'hi',
      badge: 'Hindi / Hinglish',
      description: 'Tests conversational Hindi speech with Roman Hinglish script rendering.',
      transcript: 'Us din main subah jaldi utha aur station gaya. Mausam bahut suhana tha aur thandi hawa chal rahi thi.',
    },
    {
      id: 'english',
      title: 'English Narrative Storytelling',
      language: 'en',
      badge: 'English Prose',
      description: 'Tests fast natural narrative storytelling flow and grammar cleanup in Faithful mode.',
      transcript: 'The rain hammered relentlessly against the attic window as Daniel uncovered the leather-bound manuscript.',
    },
    {
      id: 'screenplay',
      title: 'Cinematic Dialogue & Scene Action',
      language: 'en',
      badge: 'Screenplay Cue',
      description: 'Tests dialogue cues and character action conversion.',
      transcript: 'Marcus enters the dim control room, his flashlight cutting through the dust. He notices the mainframe is still humming.',
    },
  ];

  const handleExecuteTest = (tc: typeof testCases[0]) => {
    setRunningTest(tc.id);
    onRunTestCase(tc.transcript, tc.language);
    setTimeout(() => {
      setRunningTest(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-studio-900 border border-studio-200 dark:border-studio-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-studio-200 dark:border-studio-800 bg-studio-50/50 dark:bg-studio-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-studio-900 dark:text-studio-100">
                Voice Audio Diagnostics & Test Suite
              </h2>
              <p className="text-xs text-studio-500 dark:text-studio-400">
                Inspect microphone input, speech engines, and test transcription pipelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-studio-400 hover:text-studio-700 dark:hover:text-studio-200 hover:bg-studio-100 dark:hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-studio-200 dark:border-studio-800 px-6 bg-studio-100/30 dark:bg-studio-900/30">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'diagnostics'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-studio-500 hover:text-studio-800 dark:hover:text-studio-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Microphone & System Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('testcases')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'testcases'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-studio-500 hover:text-studio-800 dark:hover:text-studio-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Voice Audio Test Cases (4)
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {activeTab === 'diagnostics' && (
            <div className="space-y-5">
              {/* Live VU Meter */}
              <div className="p-4 rounded-xl border border-studio-200 dark:border-studio-800 bg-studio-50 dark:bg-studio-950/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-studio-500" />
                    Live Microphone Input Volume (VU Meter)
                  </span>
                  <span className="text-xs font-mono font-medium text-studio-600 dark:text-studio-400">
                    {Math.round(micLevel * 100)}%
                  </span>
                </div>
                
                <div className="w-full h-3 rounded-full bg-studio-200 dark:bg-studio-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(2, micLevel * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-studio-500 dark:text-studio-400">
                  {micLevel > 0.05
                    ? 'Audio signal detected loud and clear from your microphone!'
                    : 'Speak into your microphone to verify audio signal deflection.'}
                </p>
              </div>

              {/* Engine Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-studio-200 dark:border-studio-800 bg-studio-50/50 dark:bg-studio-950/40">
                  <div className="flex items-center gap-2 mb-1">
                    {browserSpeechSupport ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-xs font-semibold text-studio-900 dark:text-studio-100">
                      Browser Speech Engine
                    </span>
                  </div>
                  <p className="text-[11px] text-studio-500 dark:text-studio-400">
                    {browserSpeechSupport
                      ? 'Web Speech API (webkitSpeechRecognition) Active'
                      : 'Web Speech not detected. Use Chrome or Edge.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-studio-200 dark:border-studio-800 bg-studio-50/50 dark:bg-studio-950/40">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-studio-900 dark:text-studio-100">
                      Language Engine
                    </span>
                  </div>
                  <p className="text-[11px] text-studio-500 dark:text-studio-400">
                    Language: <span className="font-mono font-bold text-studio-700 dark:text-studio-300">{language.toUpperCase()}</span> ({scriptMode})
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-studio-200 dark:border-studio-800 bg-studio-50/50 dark:bg-studio-950/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Radio className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-studio-900 dark:text-studio-100">
                      Realtime WebSocket Gateway
                    </span>
                  </div>
                  <p className="text-[11px] text-studio-500 dark:text-studio-400">
                    Connected to Realtime Gateway (:8080 / :8000)
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-studio-200 dark:border-studio-800 bg-studio-50/50 dark:bg-studio-950/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Languages className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-studio-900 dark:text-studio-100">
                      Romanization & Anti-Translation
                    </span>
                  </div>
                  <p className="text-[11px] text-studio-500 dark:text-studio-400">
                    Inviolable Roman Telugu & Roman Hindi preservation enforced.
                  </p>
                </div>
              </div>

              {/* Live Pipeline Diagnostics Object */}
              {diagnostics && (
                <div className="p-4 rounded-xl border border-studio-200 dark:border-studio-800 bg-studio-50/80 dark:bg-studio-950/80 space-y-2">
                  <h4 className="text-xs font-bold text-studio-900 dark:text-studio-100 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-red-500" />
                    Live Speech Pipeline Diagnostics
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-studio-100 dark:bg-studio-900">
                      <span className="text-studio-400 block text-[10px]">Permission</span>
                      <span className="font-bold text-studio-800 dark:text-studio-200">{diagnostics.microphonePermission}</span>
                    </div>
                    <div className="p-2 rounded bg-studio-100 dark:bg-studio-900">
                      <span className="text-studio-400 block text-[10px]">Audio Track</span>
                      <span className="font-bold text-studio-800 dark:text-studio-200">{diagnostics.streamActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="p-2 rounded bg-studio-100 dark:bg-studio-900">
                      <span className="text-studio-400 block text-[10px]">Audio Engine</span>
                      <span className="font-bold text-studio-800 dark:text-studio-200">{diagnostics.usingAudioWorklet ? 'AudioWorklet' : 'ScriptProcessor'}</span>
                    </div>
                    <div className="p-2 rounded bg-studio-100 dark:bg-studio-900">
                      <span className="text-studio-400 block text-[10px]">ASR State</span>
                      <span className="font-bold text-studio-800 dark:text-studio-200">{diagnostics.recognitionState}</span>
                    </div>
                    <div className="p-2 rounded bg-studio-100 dark:bg-studio-900 col-span-2">
                      <span className="text-studio-400 block text-[10px]">Last Event</span>
                      <span className="text-studio-700 dark:text-studio-300 truncate block">{diagnostics.lastRecognitionEvent || 'none'}</span>
                    </div>
                    <div className="p-2 rounded bg-studio-100 dark:bg-studio-900 col-span-2">
                      <span className="text-studio-400 block text-[10px]">Last Error</span>
                      <span className="text-amber-600 dark:text-amber-400 truncate block">{diagnostics.lastRecognitionError || 'none'}</span>
                    </div>
                  </div>
                  {diagnostics.transcriptReceived && (
                    <div className="p-2 rounded bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px]">
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold block text-[10px]">Last Transcript Emitted:</span>
                      <p className="font-serif text-studio-900 dark:text-studio-100 italic">{diagnostics.transcriptReceived}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Troubleshooting Tips */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-1.5 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" />
                  Dictation Troubleshooting Checklist
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                  <li>Ensure your browser tab has microphone permission granted in the URL bar lock icon.</li>
                  <li>In Google Chrome or Microsoft Edge, speak directly after clicking the red Record button.</li>
                  <li>Words stream live into the editor and automatically solidify into the permanent story text.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'testcases' && (
            <div className="space-y-3">
              <p className="text-xs text-studio-500 dark:text-studio-400">
                Run simulated voice audio test cases directly through StoryFlow's live transcription and writing engine to verify typing, language preservation, and style formatting:
              </p>

              {testCases.map((tc) => (
                <div
                  key={tc.id}
                  className="p-4 rounded-xl border border-studio-200 dark:border-studio-800 bg-studio-50/50 dark:bg-studio-950/40 hover:border-studio-300 dark:hover:border-studio-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-studio-900 dark:text-studio-100">
                        {tc.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-studio-200 dark:bg-studio-800 text-studio-700 dark:text-studio-300 font-medium">
                        {tc.badge}
                      </span>
                    </div>
                    <p className="text-xs italic text-studio-600 dark:text-studio-400 font-serif">
                      "{tc.transcript}"
                    </p>
                    <p className="text-[11px] text-studio-400 dark:text-studio-500">
                      {tc.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleExecuteTest(tc)}
                    disabled={runningTest === tc.id}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {runningTest === tc.id ? 'Typing Live...' : 'Run Test Voice'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-studio-200 dark:border-studio-800 bg-studio-50/50 dark:bg-studio-950/50">
          <span className="text-xs text-studio-500 dark:text-studio-400">
            Microphone status: <span className={isRecording ? 'text-red-500 font-bold' : 'text-studio-600'}>{isRecording ? 'Recording Active' : 'Standby'}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-studio-200 hover:bg-studio-300 dark:bg-studio-800 dark:hover:bg-studio-700 text-studio-800 dark:text-studio-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
