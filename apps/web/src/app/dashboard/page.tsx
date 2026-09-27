'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  BookOpen,
  Mic,
  Clock,
  Search,
  Filter,
  ArrowRight,
  FolderPlus,
  Sparkles,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewStoryModalOpen, setIsNewStoryModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // New Story Form
  const [newTitle, setNewTitle] = useState('');
  const [newLanguage, setNewLanguage] = useState('auto');
  const [newScriptMode, setNewScriptMode] = useState('romanized');
  const [newStyle, setNewStyle] = useState('narrative');

  // New Project Form
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  const [loading, setLoading] = useState(true);

  // Ensure user is authenticated or bootstrap a default user session
  useEffect(() => {
    async function loadData() {
      try {
        let me;
        try {
          me = await api.getMe();
        } catch {
          // Auto bootstrap local dev account if needed
          try {
            await api.register('writer@storyflow.ai', 'password123', 'Story Writer');
          } catch {
            // Already exists, proceed to login
          }
          await api.login('writer@storyflow.ai', 'password123');
        }

        // Fetch projects
        let projs = await api.getProjects();
        if (!projs || projs.length === 0) {
          const defaultProj = await api.createProject('My Stories & Manuscripts', 'Primary workspace');
          projs = [defaultProj];
        }
        setProjects(projs);
        setSelectedProjectId(projs[0].id);

        // Fetch stories
        const storyList = await api.getStories();
        setStories(storyList || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedProjectId) return;

    try {
      const created = await api.createStory({
        projectId: selectedProjectId,
        title: newTitle.trim(),
        language: newLanguage,
        scriptMode: newScriptMode,
        style: newStyle,
      });

      setIsNewStoryModalOpen(false);
      setNewTitle('');
      router.push(`/story/${created.id}`);
    } catch (err) {
      console.error('Failed to create story:', err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim()) return;

    try {
      const proj = await api.createProject(newProjTitle.trim(), newProjDesc.trim());
      setProjects([proj, ...projects]);
      setSelectedProjectId(proj.id);
      setIsNewProjectModalOpen(false);
      setNewProjTitle('');
      setNewProjDesc('');
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const filteredStories = stories.filter((s) => {
    const matchesProj = selectedProjectId ? s.project_id === selectedProjectId : true;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProj && matchesSearch;
  });

  return (
    <div className="flex-1 min-h-screen bg-studio-950 text-studio-50 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-studio-800 bg-studio-900/60 backdrop-blur-md px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-serif font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center text-white">
              <Mic className="w-4 h-4" />
            </div>
            <span>StoryFlow</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-studio-700 text-xs font-medium text-studio-300 hover:text-white hover:bg-studio-800 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>

            <button
              onClick={() => setIsNewStoryModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Story</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-8 py-8 flex-1">
        {/* Project Selector & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          {/* Projects Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedProjectId === p.id
                    ? 'bg-studio-100 text-studio-950 font-semibold'
                    : 'bg-studio-900 text-studio-400 hover:text-white'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-studio-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories..."
              className="pl-9 pr-4 py-1.5 rounded-lg border border-studio-800 bg-studio-900/80 text-xs text-white placeholder:text-studio-500 outline-none focus:border-studio-600 w-56"
            />
          </div>
        </div>

        {/* Story Grid */}
        {loading ? (
          <div className="py-20 text-center text-studio-500 text-sm">Loading manuscripts...</div>
        ) : filteredStories.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-studio-700 mb-4" />
            <h3 className="font-serif text-lg text-studio-200 mb-1">No stories in this project yet</h3>
            <p className="text-sm text-studio-400 max-w-sm mb-6">
              Press the button below to create your first speech-to-story canvas.
            </p>
            <button
              onClick={() => setIsNewStoryModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg transition-all hover:scale-105"
            >
              <Mic className="w-4 h-4" />
              <span>Create First Story</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStories.map((story) => {
              const updatedAt = new Date(story.updated_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <Link
                  key={story.id}
                  href={`/story/${story.id}`}
                  className="group p-5 rounded-xl bg-studio-900/60 border border-studio-800/80 hover:border-studio-700 hover:bg-studio-900 transition-all flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-studio-500 font-mono mb-2">
                      <span className="uppercase">{story.style}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {updatedAt}
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-white group-hover:text-amber-400 transition-colors mb-2 line-clamp-1">
                      {story.title}
                    </h3>

                    <p className="text-xs text-studio-400 font-serif line-clamp-3 mb-4 leading-relaxed">
                      {story.processed_text || story.raw_transcript || 'Empty draft. Click to start recording.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-studio-800/60 flex items-center justify-between text-xs text-studio-400">
                    <span className="font-mono">{story.word_count || 0} words</span>
                    <span className="text-xs font-medium text-studio-300 group-hover:text-white flex items-center gap-1">
                      <span>Open Studio</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* New Story Modal */}
      {isNewStoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-studio-900 border border-studio-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-white mb-4">Create New Story</h3>
            <form onSubmit={handleCreateStory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-studio-300 uppercase mb-1">
                  Story Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. The Night at the Hospital"
                  className="w-full px-3 py-2 rounded-lg bg-studio-950 border border-studio-700 text-sm text-white placeholder:text-studio-500 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-studio-300 uppercase mb-1">
                  Primary Spoken Language
                </label>
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-studio-950 border border-studio-700 text-sm text-white outline-none focus:border-amber-500"
                >
                  <option value="auto">Auto Detect Language</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="en">English</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-studio-300 uppercase mb-1">
                  Script Representation
                </label>
                <select
                  value={newScriptMode}
                  onChange={(e) => setNewScriptMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-studio-950 border border-studio-700 text-sm text-white outline-none focus:border-amber-500"
                >
                  <option value="romanized">Romanized Script (Teluglish / Hinglish)</option>
                  <option value="original">Original Script (తెలుగు / हिन्दी)</option>
                  <option value="english">Translate to English</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-studio-300 uppercase mb-1">
                  Story Style
                </label>
                <select
                  value={newStyle}
                  onChange={(e) => setNewStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-studio-950 border border-studio-700 text-sm text-white outline-none focus:border-amber-500"
                >
                  <option value="narrative">Narrative Prose</option>
                  <option value="screenplay">Screenplay / Script</option>
                  <option value="poetry">Poetry</option>
                  <option value="short_story">Short Story</option>
                  <option value="novel">Novel Chapter</option>
                  <option value="journal">Journal / Memoir</option>
                  <option value="dialogue">Dialogue Script</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewStoryModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-studio-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md"
                >
                  Create &amp; Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-studio-900 border border-studio-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-white mb-4">Create Project Workspace</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-studio-300 uppercase mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={newProjTitle}
                  onChange={(e) => setNewProjTitle(e.target.value)}
                  placeholder="e.g. Sci-Fi Screenplay 2026"
                  className="w-full px-3 py-2 rounded-lg bg-studio-950 border border-studio-700 text-sm text-white placeholder:text-studio-500 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-studio-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Optional brief description..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-studio-950 border border-studio-700 text-sm text-white placeholder:text-studio-500 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-studio-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-white text-studio-950 hover:bg-studio-100 text-xs font-semibold shadow-md"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
