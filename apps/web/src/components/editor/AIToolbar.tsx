'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Minimize2,
  Maximize2,
  Feather,
  Film,
  AlignLeft,
  Loader2,
  Check,
} from 'lucide-react';
import { useStoryStore } from '../../lib/store';
import { api } from '../../lib/api';

interface AIToolbarProps {
  selectedText?: string;
  onApplyTransformation: (newText: string) => void;
}

export function AIToolbar({ selectedText, onApplyTransformation }: AIToolbarProps) {
  const { storyId, processedText, language, scriptMode, style, writingMode } = useStoryStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    if (!storyId) return;

    const targetText = selectedText && selectedText.trim() ? selectedText : processedText;
    if (!targetText.trim()) return;

    setIsLoading(true);
    setActiveAction(action);

    try {
      const response = await api.transformText(storyId, {
        action,
        selected_text: targetText,
        language,
        script_mode: scriptMode,
        style,
        writing_mode: writingMode,
        full_story_context: processedText,
      });

      if (response && response.transformed_text) {
        onApplyTransformation(response.transformed_text);
      }
    } catch (err) {
      console.error('AI transformation error:', err);
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const tools = [
    { id: 'clean_up', label: 'Clean Up', icon: AlignLeft, desc: 'Grammar & punctuation' },
    { id: 'rewrite', label: 'Rewrite', icon: Wand2, desc: 'Polish prose flow' },
    { id: 'shorten', label: 'Shorten', icon: Minimize2, desc: 'Tighten prose' },
    { id: 'expand', label: 'Expand', icon: Maximize2, desc: 'Add sensory depth' },
    { id: 'make_literary', label: 'Literary', icon: Feather, desc: 'Evocative tone' },
    { id: 'convert_script', label: 'Screenplay', icon: Film, desc: 'Format as script' },
    { id: 'convert_poetry', label: 'Poetry', icon: Sparkles, desc: 'Format as verse' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-2 border-b border-studio-100 dark:border-studio-800/60 flex items-center justify-between gap-2 overflow-x-auto text-xs">
      <div className="flex items-center gap-1.5 text-studio-400 font-medium">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span>AI Studio:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {tools.map((t) => {
          const Icon = t.icon;
          const isThisLoading = isLoading && activeAction === t.id;

          return (
            <button
              key={t.id}
              onClick={() => handleAction(t.id)}
              disabled={isLoading}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border border-studio-200 dark:border-studio-800 text-studio-700 dark:text-studio-300 hover:bg-studio-100 dark:hover:bg-studio-800 transition-colors disabled:opacity-50 ${
                isThisLoading ? 'bg-studio-200 dark:bg-studio-800' : ''
              }`}
              title={t.desc}
            >
              {isThisLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
