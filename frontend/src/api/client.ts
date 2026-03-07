const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

// --- Types ---

export interface Project {
  id: string;
  title: string;
  description: string | null;
  sourceType: string;
  sourceFormat: string;
  status: string;
  totalDuration: number | null;
  defaultVoice: string;
  createdAt: string;
  updatedAt: string;
  scenes?: Scene[];
  videos?: Video[];
  characters?: Character[];
  _count?: { scenes: number; videos: number };
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  voiceId: string | null;
  voiceName: string | null;
  description: string | null;
  color: string | null;
}

export interface Scene {
  id: string;
  projectId: string;
  orderIndex: number;
  title: string | null;
  textContent: string;
  imagePrompt: string | null;
  duration: number;
  characters: string | null;
  location: string | null;
  mood: string | null;
  narratorText: string | null;
  status: string;
  createdAt: string;
  generatedMedia?: GeneratedMedia[];
}

export interface GeneratedMedia {
  id: string;
  sceneId: string;
  mediaType: string;
  filePath: string;
  contentHash: string;
  promptUsed: string | null;
  modelUsed: string | null;
  metadata: string | null;
  selected: boolean;
  status: string;
}

export interface Video {
  id: string;
  projectId: string;
  filePath: string;
  format: string;
  resolution: string;
  duration: number | null;
  fileSize: number | null;
  status: string;
  createdAt: string;
}

export interface JobStatus {
  id: string;
  status: string;
  progress: number;
  result?: unknown;
  error?: string;
  jobId?: string;
}

export interface Voice {
  id: string;
  name: string;
  gender: string;
}

export interface BatchJob {
  jobId: string;
  projectId: string;
  totalScenes: number;
  type: string;
  parallel: boolean;
  results: { sceneId: string; status: string; error?: string }[];
}

export interface ExportData {
  project: {
    id: string;
    title: string;
    description: string | null;
    createdAt: string;
  };
  scenes: Array<{
    id: string;
    orderIndex: number;
    title: string | null;
    textContent: string;
    imagePrompt: string | null;
    duration: number;
    mood: string | null;
    location: string | null;
    media: Array<{
      id: string;
      type: string;
      path: string;
      status: string;
    }>;
  }>;
  characters: Character[];
  videos: Video[];
}

// --- API Methods ---

export const api = {
  // Voices
  async getVoices(): Promise<Voice[]> {
    return request('/voices');
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    return request('/projects');
  },

  async getProject(id: string): Promise<Project> {
    return request(`/projects/${id}`);
  },

  async createProject(file: File, title?: string): Promise<Project> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    return request('/projects', { method: 'POST', body: formData });
  },

  async deleteProject(id: string): Promise<void> {
    return request(`/projects/${id}`, { method: 'DELETE' });
  },

  async setDefaultVoice(projectId: string, voice: string): Promise<{ defaultVoice: string }> {
    return request(`/projects/${projectId}/default-voice`, {
      method: 'PUT',
      body: JSON.stringify({ voice }),
    });
  },

  // Characters
  async getCharacters(projectId: string): Promise<Character[]> {
    return request(`/projects/${projectId}/characters`);
  },

  async addCharacter(projectId: string, data: { name: string; voiceId?: string; voiceName?: string; description?: string; color?: string }): Promise<Character> {
    return request(`/projects/${projectId}/characters`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCharacter(characterId: string, data: Partial<Character>): Promise<Character> {
    return request(`/characters/${characterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCharacter(characterId: string): Promise<void> {
    return request(`/characters/${characterId}`, { method: 'DELETE' });
  },

  // Scenes
  async getScenes(projectId: string): Promise<Scene[]> {
    return request(`/projects/${projectId}/scenes`);
  },

  async addScene(projectId: string, data: Partial<Scene>): Promise<Scene> {
    return request(`/projects/${projectId}/scenes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateScene(sceneId: string, data: Partial<Scene>): Promise<Scene> {
    return request(`/scenes/${sceneId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteScene(sceneId: string): Promise<void> {
    return request(`/scenes/${sceneId}`, { method: 'DELETE' });
  },

  async reorderScenes(projectId: string, sceneIds: string[]): Promise<Scene[]> {
    return request(`/projects/${projectId}/scenes/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ sceneIds }),
    });
  },

  // Generation
  async generateImage(sceneId: string, prompt?: string, async_mode = false): Promise<JobStatus & { filePath?: string; mediaUrl?: string }> {
    return request('/generate/image', {
      method: 'POST',
      body: JSON.stringify({ sceneId, prompt, async: async_mode }),
    });
  },

  async generateVideo(sceneId: string, async_mode = false): Promise<JobStatus & { filePath?: string; mediaUrl?: string }> {
    return request('/generate/video', {
      method: 'POST',
      body: JSON.stringify({ sceneId, async: async_mode }),
    });
  },

  async generateTTS(sceneId: string, text?: string, voice?: string, character?: string): Promise<JobStatus & { filePath?: string; mediaUrl?: string }> {
    return request('/generate/tts', {
      method: 'POST',
      body: JSON.stringify({ sceneId, text, voice, character }),
    });
  },

  async renderProject(projectId: string, resolution = '720p', format = 'mp4', quality = 'high'): Promise<JobStatus> {
    return request(`/render/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ resolution, format, quality }),
    });
  },

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return request(`/jobs/${jobId}`);
  },

  // Health
  async getHealth(): Promise<{ status: string; services: Record<string, boolean> }> {
    return request('/health');
  },

  // Batch Generation
  async startBatchGeneration(sceneIds: string[], type: string, parallel = false): Promise<BatchJob> {
    return request('/batch/generate', {
      method: 'POST',
      body: JSON.stringify({ sceneIds, type, parallel }),
    });
  },

  async getBatchJobStatus(jobId: string): Promise<{ status: string; progress: number; completed: number; total: number }> {
    return request(`/batch/${jobId}`);
  },

  // Export
  async prepareExport(projectId: string): Promise<ExportData> {
    return request(`/projects/${projectId}/export`, {
      method: 'POST',
    });
  },
};
