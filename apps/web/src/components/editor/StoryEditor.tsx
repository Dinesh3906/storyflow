'use client';

import React, { useRef, useEffect } from 'react';
import { useStoryStore } from '../../lib/store';

interface StoryEditorProps {
  onSelectText?: (text: string) => void;
}

export function StoryEditor({ onSelectText }: StoryEditorProps) {
  const {
    processedText,
    liveProvisionalText,
    style,
    updateProcessedText,
    recordingState,
  } = useStoryStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea height to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(480, textareaRef.current.scrollHeight)}px`;
    }
  }, [processedText]);

  const handleSelection = () => {
    if (textareaRef.current && onSelectText) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        const selected = textareaRef.current.value.substring(start, end);
        onSelectText(selected);
      }
    }
  };

  // Determine font and formatting style
  let styleClasses = 'font-serif text-lg leading-relaxed';
  let placeholderText = 'Start speaking into your microphone or begin typing here...';

  if (style === 'screenplay') {
    styleClasses = 'font-mono text-base leading-snug tracking-tight max-w-2xl mx-auto';
    placeholderText = 'SCENE HEADING (INT. ROOM - DAY)\n\nBegin speaking action or dialogue...';
  } else if (style === 'poetry') {
    styleClasses = 'font-serif italic text-lg leading-loose pl-8 border-l-2 border-studio-200 dark:border-studio-800';
    placeholderText = 'Speak your verses here...';
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto px-6 py-10 min-h-[70vh] flex flex-col justify-start">
      {/* Primary Editable Canvas */}
      <textarea
        ref={textareaRef}
        value={processedText}
        onChange={(e) => updateProcessedText(e.target.value)}
        onSelect={handleSelection}
        placeholder={placeholderText}
        className={`w-full bg-transparent resize-none border-none outline-none text-studio-900 dark:text-studio-100 placeholder:text-studio-400 dark:placeholder:text-studio-600 ${styleClasses}`}
        rows={12}
        spellCheck="false"
      />

      {/* Realtime Live Provisional Transcription Stream */}
      {liveProvisionalText && (
        <div className="mt-4 p-4 rounded-lg bg-studio-100/70 dark:bg-studio-900/60 border border-studio-200 dark:border-studio-800/80 transition-all duration-300">
          <div className="flex items-center gap-2 mb-1.5 text-xs font-mono font-medium text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>LIVE SPEECH STREAM</span>
          </div>
          <p className="font-serif italic text-lg text-studio-700 dark:text-studio-300 transition-opacity">
            {liveProvisionalText}
            <span className="inline-block w-1.5 h-4 ml-1 bg-amber-500 animate-pulse-recording" />
          </p>
        </div>
      )}

      {/* Subtle Bottom Spacer for Voice Control Bar */}
      <div className="h-28" />
    </div>
  );
}
