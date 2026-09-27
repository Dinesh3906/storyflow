'use client';

import React from 'react';
import {
  BookOpen,
  Download,
  History,
  Languages,
  Save,
  Sliders,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useStoryStore } from '../../lib/store';
import {
  SUPPORTED_LANGUAGES,
  SCRIPT_MODES,
  STORY_STYLES,
  WRITING_MODES,
  REALTIME_MODES,
} from '../../lib/constants';

interface EditorToolbarProps {
  onExport: () => void;
  onSaveManual: () => void;
}

export function EditorToolbar({ onExport, onSaveManual }: EditorToolbarProps) {
  const {
    title,
    language,
    scriptMode,
    style,
    writingMode,
    realtimeMode,
    wordCount,
    saveStatus,
    lastSavedAt,
    isVersionHistoryOpen,
    setStory,
    setVersionHistoryOpen,
  } = useStoryStore();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-studio-200 dark:border-studio-800 bg-white/90 dark:bg-studio-950/90 backdrop-blur-md px-6 py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Title & Save Status */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <input
            type="text"
            value={title}
            onChange={(e) => setStory({ title: e.target.value, saveStatus: 'unsaved' })}
            placeholder="Untitled Story..."
            className="font-serif font-bold text-lg text-studio-900 dark:text-studio-50 bg-transparent border-b border-transparent hover:border-studio-300 dark:hover:border-studio-700 focus:border-studio-500 outline-none transition-colors px-1 py-0.5"
          />

          <div className="flex items-center text-xs text-studio-500 gap-1.5 ml-2">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lastSavedAt ? `Saved ${lastSavedAt}` : 'Saved'}
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-accent-amber animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                Saving...
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-studio-400">Unsaved edits</span>
            )}
            {saveStatus === 'offline_saved' && (
              <span className="text-accent-amber">Saved locally</span>
            )}
          </div>
        </div>

        {/* Center / Right: Language, Script, Style & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Language Selector */}
          <div className="relative flex items-center">
            <Languages className="w-3.5 h-3.5 text-studio-400 absolute left-2.5 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setStory({ language: e.target.value, saveStatus: 'unsaved' })}
              className="text-xs font-medium pl-8 pr-3 py-1.5 rounded-md border border-studio-200 dark:border-studio-800 bg-studio-50 dark:bg-studio-900 text-studio-800 dark:text-studio-200 outline-none focus:ring-1 focus:ring-studio-400 cursor-pointer"
              title="Select spoken language"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Script Mode Selector (Crucial: Romanized / Teluglish / Hinglish vs Original) */}
          <select
            value={scriptMode}
            onChange={(e) => setStory({ scriptMode: e.target.value, saveStatus: 'unsaved' })}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-studio-200 dark:border-studio-800 bg-studio-50 dark:bg-studio-900 text-studio-800 dark:text-studio-200 outline-none focus:ring-1 focus:ring-studio-400 cursor-pointer"
            title="Script Representation (e.g. Teluglish/Hinglish vs Original Script)"
          >
            {SCRIPT_MODES.map((sm) => (
              <option key={sm.mode} value={sm.mode}>
                {sm.label} ({sm.tag})
              </option>
            ))}
          </select>

          {/* Style Selector */}
          <div className="relative flex items-center">
            <BookOpen className="w-3.5 h-3.5 text-studio-400 absolute left-2.5 pointer-events-none" />
            <select
              value={style}
              onChange={(e) => setStory({ style: e.target.value, saveStatus: 'unsaved' })}
              className="text-xs font-medium pl-8 pr-3 py-1.5 rounded-md border border-studio-200 dark:border-studio-800 bg-studio-50 dark:bg-studio-900 text-studio-800 dark:text-studio-200 outline-none focus:ring-1 focus:ring-studio-400 cursor-pointer"
              title="Story Style (Narrative, Screenplay, Poetry, etc.)"
            >
              {STORY_STYLES.map((s) => (
                <option key={s.style} value={s.style}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Writing Mode (Faithful vs Literary) */}
          <select
            value={writingMode}
            onChange={(e) => setStory({ writingMode: e.target.value, saveStatus: 'unsaved' })}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-studio-200 dark:border-studio-800 bg-studio-50 dark:bg-studio-900 text-studio-800 dark:text-studio-200 outline-none focus:ring-1 focus:ring-studio-400 cursor-pointer"
            title="Writing Engine Mode (Faithful vs Literary)"
          >
            {WRITING_MODES.map((wm) => (
              <option key={wm.mode} value={wm.mode}>
                {wm.label}
              </option>
            ))}
          </select>

          {/* Word Count */}
          <div className="text-xs text-studio-500 font-mono px-2 py-1 bg-studio-100 dark:bg-studio-900 rounded">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>

          {/* Manual Save */}
          <button
            onClick={onSaveManual}
            className="p-1.5 text-studio-600 dark:text-studio-400 hover:text-studio-900 dark:hover:text-studio-100 hover:bg-studio-100 dark:hover:bg-studio-800 rounded transition-colors"
            title="Save Story (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Version History */}
          <button
            onClick={() => setVersionHistoryOpen(!isVersionHistoryOpen)}
            className={`p-1.5 rounded transition-colors ${
              isVersionHistoryOpen
                ? 'bg-studio-200 dark:bg-studio-800 text-studio-900 dark:text-studio-50'
                : 'text-studio-600 dark:text-studio-400 hover:bg-studio-100 dark:hover:bg-studio-800'
            }`}
            title="Version History & Recovery"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Export PDF Button */}
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-studio-900 hover:bg-studio-800 text-white dark:bg-studio-100 dark:hover:bg-white dark:text-studio-950 transition-all shadow-sm"
            title="Export professionally typeset document (Ctrl+Shift+E)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
}
