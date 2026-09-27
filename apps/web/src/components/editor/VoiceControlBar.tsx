'use client';

import React from 'react';
import { Mic, MicOff, Pause, Play, Square, AlertCircle, Wifi } from 'lucide-react';
import { useStoryStore, RecordingState } from '../../lib/store';

interface VoiceControlBarProps {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function VoiceControlBar({
  onStart,
  onPause,
  onResume,
  onStop,
}: VoiceControlBarProps) {
  const { recordingState, micLevel, lastError } = useStoryStore();

  const isRecording = recordingState === 'listening';
  const isPaused = recordingState === 'paused';
  const isConnecting = recordingState === 'connecting' || recordingState === 'reconnecting';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
      {/* Error Banner if any */}
      {lastError && (
        <div className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 shadow-sm animate-bounce">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{lastError}</span>
        </div>
      )}

      {/* Main Floating Capsule */}
      <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/95 dark:bg-studio-900/95 border border-studio-200 dark:border-studio-800 shadow-xl backdrop-blur-lg transition-all duration-300">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 pr-3 border-r border-studio-200 dark:border-studio-800">
          {isRecording && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-bold tracking-wider text-red-600 dark:text-red-400">
                LIVE
              </span>
            </div>
          )}
          {isPaused && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold tracking-wider text-amber-600 dark:text-amber-400">
                PAUSED
              </span>
            </div>
          )}
          {isConnecting && (
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-studio-400 animate-pulse" />
              <span className="text-xs text-studio-400">Connecting...</span>
            </div>
          )}
          {recordingState === 'idle' && (
            <span className="text-xs text-studio-500 font-medium">Ready</span>
          )}
        </div>

        {/* Audio Waveform / VU Level Visualizer */}
        <div className="flex items-center gap-1 h-6 w-16 px-1">
          {[0.2, 0.5, 0.8, 0.4, 0.7, 0.3].map((factor, idx) => {
            const height = isRecording
              ? Math.max(4, Math.min(24, micLevel * 24 * factor * 2.5))
              : 4;
            return (
              <div
                key={idx}
                className={`w-1 rounded-full transition-all duration-100 ${
                  isRecording
                    ? 'bg-red-500 dark:bg-red-400'
                    : 'bg-studio-300 dark:bg-studio-700'
                }`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2">
          {!isRecording && !isPaused ? (
            <button
              onClick={onStart}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md hover:scale-105 active:scale-95 transition-all"
              title="Start Speaking (Space)"
            >
              <Mic className="w-5 h-5" />
            </button>
          ) : (
            <>
              {isRecording ? (
                <button
                  onClick={onPause}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-studio-100 hover:bg-studio-200 dark:bg-studio-800 dark:hover:bg-studio-700 text-studio-800 dark:text-studio-200 transition-colors"
                  title="Pause (Space)"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onResume}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                  title="Resume (Space)"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onStop}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-studio-200 hover:bg-studio-300 dark:bg-studio-800 dark:hover:bg-studio-700 text-studio-900 dark:text-studio-100 transition-colors"
                title="Finish Session"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
