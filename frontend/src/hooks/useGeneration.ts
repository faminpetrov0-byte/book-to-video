import { useState, useCallback } from 'react';
import { api } from '../api/client';

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error';

interface GenerationState {
  [sceneId: string]: {
    image: GenerationStatus;
    video: GenerationStatus;
    tts: GenerationStatus;
    error?: string;
  };
}

export function useGeneration(onRefresh: () => void) {
  const [state, setState] = useState<GenerationState>({});
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'completed' | 'error'>('idle');
  const [renderError, setRenderError] = useState<string | null>(null);

  const setSceneStatus = (sceneId: string, type: 'image' | 'video' | 'tts', status: GenerationStatus, error?: string) => {
    setState((prev) => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId] || { image: 'idle', video: 'idle', tts: 'idle' },
        [type]: status,
        ...(error ? { error } : {}),
      },
    }));
  };

  const generateImage = useCallback(async (sceneId: string, prompt?: string) => {
    setSceneStatus(sceneId, 'image', 'generating');
    try {
      await api.generateImage(sceneId, prompt);
      setSceneStatus(sceneId, 'image', 'completed');
      onRefresh();
    } catch (err) {
      setSceneStatus(sceneId, 'image', 'error', (err as Error).message);
    }
  }, [onRefresh]);

  const generateVideo = useCallback(async (sceneId: string) => {
    setSceneStatus(sceneId, 'video', 'generating');
    try {
      await api.generateVideo(sceneId);
      setSceneStatus(sceneId, 'video', 'completed');
      onRefresh();
    } catch (err) {
      setSceneStatus(sceneId, 'video', 'error', (err as Error).message);
    }
  }, [onRefresh]);

  const generateTTS = useCallback(async (sceneId: string, text?: string, voice?: string, character?: string) => {
    setSceneStatus(sceneId, 'tts', 'generating');
    try {
      await api.generateTTS(sceneId, text, voice, character);
      setSceneStatus(sceneId, 'tts', 'completed');
      onRefresh();
    } catch (err) {
      setSceneStatus(sceneId, 'tts', 'error', (err as Error).message);
    }
  }, [onRefresh]);

  const generateAllForScene = useCallback(async (sceneId: string, prompt?: string, text?: string) => {
    await generateImage(sceneId, prompt);
    await generateVideo(sceneId);
    await generateTTS(sceneId, text);
  }, [generateImage, generateVideo, generateTTS]);

  const renderProject = useCallback(async (projectId: string, resolution = '720p') => {
    setRenderStatus('rendering');
    setRenderError(null);
    try {
      await api.renderProject(projectId, resolution);
      // Poll for completion
      setRenderStatus('completed');
      onRefresh();
    } catch (err) {
      setRenderStatus('error');
      setRenderError((err as Error).message);
    }
  }, [onRefresh]);

  const getSceneStatus = (sceneId: string) => {
    return state[sceneId] || { image: 'idle', video: 'idle', tts: 'idle' };
  };

  return {
    state,
    renderStatus,
    renderError,
    generateImage,
    generateVideo,
    generateTTS,
    generateAllForScene,
    renderProject,
    getSceneStatus,
  };
}
