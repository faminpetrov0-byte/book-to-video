import { useState, useEffect, useCallback } from 'react';
import { api, Project, Scene } from '../api/client';

export function useProject(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateScene = async (sceneId: string, data: Partial<Scene>) => {
    const updated = await api.updateScene(sceneId, data);
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes?.map((s) => (s.id === sceneId ? { ...s, ...updated } : s)),
      };
    });
    return updated;
  };

  const deleteScene = async (sceneId: string) => {
    await api.deleteScene(sceneId);
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes?.filter((s) => s.id !== sceneId),
      };
    });
  };

  const addScene = async (data: Partial<Scene>) => {
    if (!projectId) return;
    const scene = await api.addScene(projectId, data);
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: [...(prev.scenes || []), scene],
      };
    });
    return scene;
  };

  const reorderScenes = async (sceneIds: string[]) => {
    if (!projectId) return;
    const scenes = await api.reorderScenes(projectId, sceneIds);
    setProject((prev) => {
      if (!prev) return prev;
      return { ...prev, scenes };
    });
  };

  return {
    project,
    loading,
    error,
    fetchProject,
    updateScene,
    deleteScene,
    addScene,
    reorderScenes,
  };
}
