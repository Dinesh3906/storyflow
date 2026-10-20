/**
 * StoryFlow HTTP API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('storyflow_token');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('storyflow_token', token);
  }

  private async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `HTTP error! status: ${res.status}`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorData.message || errorMsg;
      } catch {
        // use fallback
      }
      throw new Error(errorMsg);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // --- Auth ---
  async getMe() {
    return this.request('/api/v1/auth/me');
  }

  async register(email: string, password: string, fullName: string) {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
    });
  }

  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data && data.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('storyflow_token');
    }
  }

  // --- Projects ---
  async getProjects() {
    return this.request('/api/v1/projects');
  }

  async createProject(title: string, description?: string) {
    return this.request('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ title, description: description || '' }),
    });
  }

  // --- Stories ---
  async getStories(projectId?: string) {
    const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
    return this.request(`/api/v1/stories${query}`);
  }

  async createStory(payload: {
    project_id: string;
    title: string;
    language?: string;
    script_mode?: string;
    style?: string;
    writing_mode?: string;
    realtime_mode?: string;
    settings?: Record<string, any>;
  }) {
    return this.request('/api/v1/stories', {
      method: 'POST',
      body: JSON.stringify({
        project_id: payload.project_id,
        title: payload.title,
        language: payload.language || 'auto',
        script_mode: payload.script_mode || 'romanized',
        style: payload.style || 'narrative',
        writing_mode: payload.writing_mode || 'faithful',
        realtime_mode: payload.realtime_mode || 'fast',
        settings: payload.settings || {},
      }),
    });
  }

  async getStory(storyId: string) {
    return this.request(`/api/v1/stories/${storyId}`);
  }

  async updateStory(storyId: string, data: Record<string, any>) {
    return this.request(`/api/v1/stories/${storyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // --- Version History ---
  async getStoryVersions(storyId: string) {
    return this.request(`/api/v1/stories/${storyId}/versions`);
  }

  async restoreStoryVersion(storyId: string, versionNumber: number) {
    return this.request(`/api/v1/stories/${storyId}/versions/${versionNumber}/restore`, {
      method: 'POST',
    });
  }

  // --- AI Studio Transformation ---
  async transformText(
    storyId: string,
    payload: {
      action: string;
      selected_text: string;
      language?: string;
      script_mode?: string;
      style?: string;
      writing_mode?: string;
      full_story_context?: string;
    }
  ) {
    return this.request(`/api/v1/stories/${storyId}/ai/transform`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Exports ---
  async exportStory(storyId: string, format: string = 'pdf', options: Record<string, any> = {}) {
    return this.request(`/api/v1/stories/${storyId}/export`, {
      method: 'POST',
      body: JSON.stringify({
        format,
        options,
      }),
    });
  }

  getExportDownloadUrl(storyId: string, exportId: string): string {
    return `${this.baseUrl}/api/v1/stories/${storyId}/export/${exportId}/download`;
  }

  // --- Audio File Transcription (Whisper) ---
  async transcribeAudioFile(file: File, language: string = 'auto') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    return this.request('/api/v1/transcribe/audio', {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiClient();
