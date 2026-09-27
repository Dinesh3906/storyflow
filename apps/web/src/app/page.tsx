'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mic,
  ArrowRight,
  BookOpen,
  Feather,
  Film,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe2,
  FileDown,
  Volume2,
} from 'lucide-react';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'telugu' | 'hindi' | 'english'>('telugu');

  const demoExamples = {
    telugu: {
      spoken: 'A roju nenu morning hospital ki vellanu. Akkada oka nurse nannu chusi chala bayapadindi. Naaku enduku ala chustundo ardham kaaledu.',
      transcription: 'A roju nenu morning hospital ki vellanu. Akkada oka nurse nannu chusi chala bayapadindi. Naaku enduku ala chustundo ardham kaaledu.',
      formatted: 'A roju nenu morning hospital ki vellanu.\n\nAkkada oka nurse nannu chusi chala bayapadindi. Naaku enduku ala chustundo ardham kaaledu...',
      note: 'Language preserved as Roman Telugu (Teluglish). Not converted into English!',
    },
    hindi: {
      spoken: 'Us din main morning hospital gaya tha. Wahan ek nurse khadi thi jo mujhe dekhkar darr gayi. Mujhe samajh nahi aaya ki wo aisa kyun dekh rahi thi.',
      transcription: 'Us din main morning hospital gaya tha. Wahan ek nurse khadi thi jo mujhe dekhkar darr gayi. Mujhe samajh nahi aaya ki wo aisa kyun dekh rahi thi.',
      formatted: 'Us din main morning hospital gaya tha.\n\nWahan ek nurse khadi thi jo mujhe dekhkar darr gayi. Mujhe samajh nahi aaya ki wo aisa kyun dekh rahi thi...',
      note: 'Language preserved as Roman Hindi (Hinglish). Meaning and vernacular cadence preserved.',
    },
    english: {
      spoken: 'That morning I walked into the hospital. A nurse looked at me with sudden fear in her eyes. I had no idea why she was staring like that.',
      transcription: 'That morning I walked into the hospital. A nurse looked at me with sudden fear in her eyes. I had no idea why she was staring like that.',
      formatted: 'That morning, I walked into the hospital.\n\nA nurse looked up, her eyes wide with sudden apprehension. I had no idea why she was staring at me like that.',
      note: 'Polished prose narrative with natural pacing and dialogue cadence.',
    },
  };

  const currentDemo = demoExamples[activeTab];

  return (
    <div className="flex-1 flex flex-col bg-studio-950 text-studio-50 selection:bg-amber-500 selection:text-black">
      {/* Navigation */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-serif font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center text-white shadow-lg">
            <Mic className="w-4 h-4" />
          </div>
          <span>StoryFlow</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-studio-300 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-white text-studio-950 hover:bg-studio-100 transition-all shadow-md hover:scale-105"
          >
            <span>Start Writing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-900 border border-studio-800 text-xs text-amber-400 font-medium mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Realtime Voice-to-Prose AI Writing Studio</span>
        </div>

        <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Speak Your Story. <br />
          <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-red-400 bg-clip-text text-transparent">
            Watch It Become a Story.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-studio-400 max-w-2xl font-light mb-10 leading-relaxed">
          Turn your voice into beautifully structured stories, scripts, poems, and narratives — in real time. Designed for novelists, screenwriters, poets, and storytellers who prefer speaking to typing.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-base font-semibold px-8 py-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-900/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Mic className="w-5 h-5" />
            <span>Start Writing Free</span>
          </Link>

          <a
            href="#demo"
            className="flex items-center gap-2 text-base font-medium px-7 py-3.5 rounded-full border border-studio-800 hover:border-studio-700 bg-studio-900/60 hover:bg-studio-900 text-studio-300 hover:text-white transition-all"
          >
            <span>See How It Works</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Interactive Visual Pipeline Section */}
      <section id="demo" className="max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="text-center mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-studio-400 mb-2">
            Streaming Speech-to-Story Architecture
          </h2>
          <p className="font-serif text-2xl font-bold text-white">
            Live Multilingual Speech Preservation
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['telugu', 'hindi', 'english'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveTab(lang)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                activeTab === lang
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-studio-900 text-studio-400 hover:text-white'
              }`}
            >
              {lang === 'telugu' ? 'Telugu (Teluglish)' : lang === 'hindi' ? 'Hindi (Hinglish)' : 'English'}
            </button>
          ))}
        </div>

        {/* Pipeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Microphone */}
          <div className="p-6 rounded-2xl bg-studio-900/70 border border-studio-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-studio-500">STAGE 01</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <Mic className="w-4 h-4 text-red-400" />
                <span>Spoken Audio</span>
              </div>
              <p className="text-sm font-serif italic text-studio-300 leading-relaxed">
                "{currentDemo.spoken}"
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-studio-800/60 text-xs text-studio-500 font-mono">
              20–40ms PCM Streaming &bull; 16kHz
            </div>
          </div>

          {/* Step 2: Live Transcription */}
          <div className="p-6 rounded-2xl bg-studio-900/70 border border-studio-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-studio-500">STAGE 02</span>
                <Globe2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Live Romanized STT</span>
              </div>
              <p className="text-sm font-serif text-studio-300 leading-relaxed">
                {currentDemo.transcription}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-studio-800/60 text-xs text-amber-400 font-sans">
              {currentDemo.note}
            </div>
          </div>

          {/* Step 3: AI Story Formatting */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-studio-900 to-studio-950 border border-amber-500/30 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-amber-400">STAGE 03</span>
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <Feather className="w-4 h-4 text-amber-400" />
                <span>Formatted Prose</span>
              </div>
              <p className="text-sm font-serif text-white whitespace-pre-wrap leading-relaxed">
                {currentDemo.formatted}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-studio-800/60 flex items-center justify-between text-xs text-studio-400 font-mono">
              <span>Faithful Mode</span>
              <span className="text-emerald-400 font-semibold">Autosaved ✓</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-studio-900/40 border border-studio-800/60">
          <Globe2 className="w-6 h-6 text-amber-400 mb-3" />
          <h3 className="font-semibold text-base text-white mb-1.5">No Automatic Translation</h3>
          <p className="text-sm text-studio-400 leading-relaxed">
            Telugu stays Roman Telugu (Teluglish). Hindi stays Roman Hindi (Hinglish). Your voice and language identity remain sacred.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-studio-900/40 border border-studio-800/60">
          <BookOpen className="w-6 h-6 text-amber-400 mb-3" />
          <h3 className="font-semibold text-base text-white mb-1.5">Multiple Story Styles</h3>
          <p className="text-sm text-studio-400 leading-relaxed">
            Switch effortlessly between Narrative Prose, Screenplay formatting, Poetry stanzas, and Dialogue without re-recording.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-studio-900/40 border border-studio-800/60">
          <FileDown className="w-6 h-6 text-amber-400 mb-3" />
          <h3 className="font-semibold text-base text-white mb-1.5">Typeset PDF Publishing</h3>
          <p className="text-sm text-studio-400 leading-relaxed">
            Export publication-ready manuscripts with title pages, running headers, chapter numbering, and book-grade serif typography.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-studio-900 py-8 px-6 text-center text-xs text-studio-500 font-mono">
        StoryFlow Realtime AI Studio &bull; Industrial-Grade Voice Writing Platform
      </footer>
    </div>
  );
}
