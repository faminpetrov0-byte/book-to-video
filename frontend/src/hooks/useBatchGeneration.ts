import { useState, useCallback } from 'react';
import { api, Scene } from '../api/client';

interface BatchGenerationOptions {
  sceneIds: string[];
  type: 'image' | 'video' | 'tts' | 'all';
  parallel?: boolean;
}

interface BatchJob {
  jobId: string;
  projectId: string;
  totalScenes: number;
  type: string;
  parallel: boolean;
  results: { sceneId: string; status: string; error?: string }[];
}

export function useBatchGeneration(onRefresh: () => void) {
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startBatchGeneration = useCallback(async (options: BatchGenerationOptions) => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.startBatchGeneration(options.sceneIds, options.type, options.parallel);
      setBatchJob(result);
      
      // Start polling for status
      pollJobStatus(result.jobId);
      
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    const checkStatus = async () => {
      try {
        const status = await api.getBatchJobStatus(jobId);
        
        if (status.status === 'completed') {
          setBatchJob(prev => prev ? { ...prev, status: 'completed' } : null);
          onRefresh();
          return;
        }
        
        if (status.status === 'error') {
          setError('Batch generation failed');
          return;
        }

        // Continue polling
        setTimeout(checkStatus, 2000);
      } catch (err) {
        console.error('Failed to poll job status:', err);
      }
    };

    checkStatus();
  }, [onRefresh]);

  const generateAllImages = useCallback(async (sceneIds: string[], parallel = false) => {
    return startBatchGeneration({ sceneIds, type: 'image', parallel });
  }, [startBatchGeneration]);

  const generateAllVideos = useCallback(async (sceneIds: string[], parallel = false) => {
    return startBatchGeneration({ sceneIds, type: 'video', parallel });
  }, [startBatchGeneration]);

  const generateAllTTS = useCallback(async (sceneIds: string[], parallel = false) => {
    return startBatchGeneration({ sceneIds, type: 'tts', parallel });
  }, [startBatchGeneration]);

  const generateAll = useCallback(async (sceneIds: string[], parallel = false) => {
    return startBatchGeneration({ sceneIds, type: 'all', parallel });
  }, [startBatchGeneration]);

  const clearJob = useCallback(() => {
    setBatchJob(null);
    setError(null);
  }, []);

  return {
    batchJob,
    loading,
    error,
    generateAllImages,
    generateAllVideos,
    generateAllTTS,
    generateAll,
    clearJob,
  };
}

export function useExport(projectId: string) {
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const prepareExport = useCallback(async () => {
    setExporting(true);
    setError(null);

    try {
      const data = await api.prepareExport(projectId);
      setExportData(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setExporting(false);
    }
  }, [projectId]);

  const downloadZip = useCallback(async () => {
    if (!exportData) {
      await prepareExport();
    }

    // Create a downloadable ZIP on the frontend
    // This would need JSZip library - for now return the data
    return exportData;
  }, [exportData, prepareExport]);

  return {
    exporting,
    exportData,
    error,
    prepareExport,
    downloadZip,
  };
}
