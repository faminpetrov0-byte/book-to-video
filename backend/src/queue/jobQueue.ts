import Bull from 'bull';
import { config } from '../config';
import logger from '../utils/logger';
import { generateImage } from '../services/imageGenerator';
import { generateVideoFromImage } from '../services/videoGenerator';
import { generateTTS } from '../services/ttsService';
import { renderFinalVideo } from '../services/videoRenderer';
import prisma from '../db';

// Job types
export interface ImageJobData {
  sceneId: string;
  prompt: string;
  width?: number;
  height?: number;
}

export interface VideoJobData {
  sceneId: string;
  imagePath: string;
  duration: number;
}

export interface TTSJobData {
  sceneId: string;
  text: string;
  voice?: string;
}

export interface RenderJobData {
  projectId: string;
  resolution?: '480p' | '720p' | '1080p';
}

// Create queues
let imageQueue: Bull.Queue<ImageJobData>;
let videoQueue: Bull.Queue<VideoJobData>;
let ttsQueue: Bull.Queue<TTSJobData>;
let renderQueue: Bull.Queue<RenderJobData>;

let queuesInitialized = false;

/**
 * Initialize Bull queues. Falls back to in-memory processing if Redis is unavailable.
 */
export function initQueues() {
  if (queuesInitialized) return;

  const redisOpts = { redis: config.redis.url };

  try {
    imageQueue = new Bull('image-generation', config.redis.url);
    videoQueue = new Bull('video-generation', config.redis.url);
    ttsQueue = new Bull('tts-generation', config.redis.url);
    renderQueue = new Bull('final-render', config.redis.url);

    // Process jobs
    imageQueue.process(2, async (job) => {
      logger.info('Processing image job', { jobId: job.id, sceneId: job.data.sceneId });
      const result = await generateImage(job.data.sceneId, job.data.prompt, {
        width: job.data.width,
        height: job.data.height,
      });
      return result;
    });

    videoQueue.process(1, async (job) => {
      logger.info('Processing video job', { jobId: job.id, sceneId: job.data.sceneId });
      const result = await generateVideoFromImage(
        job.data.sceneId,
        job.data.imagePath,
        job.data.duration
      );
      return result;
    });

    ttsQueue.process(2, async (job) => {
      logger.info('Processing TTS job', { jobId: job.id, sceneId: job.data.sceneId });
      const result = await generateTTS(job.data.sceneId, job.data.text, {
        voice: job.data.voice,
      });
      return result;
    });

    renderQueue.process(1, async (job) => {
      logger.info('Processing render job', { jobId: job.id, projectId: job.data.projectId });
      await prisma.project.update({
        where: { id: job.data.projectId },
        data: { status: 'rendering' },
      });
      const result = await renderFinalVideo(job.data.projectId, {
        resolution: job.data.resolution,
      });
      return result;
    });

    // Event handlers for all queues
    const setupEvents = (queue: Bull.Queue, name: string) => {
      queue.on('completed', (job, result) => {
        logger.info(`${name} job completed`, { jobId: job.id });
      });
      queue.on('failed', (job, err) => {
        logger.error(`${name} job failed`, { jobId: job.id, error: err.message });
      });
      queue.on('error', (err) => {
        logger.error(`${name} queue error`, { error: err.message });
      });
    };

    setupEvents(imageQueue, 'Image');
    setupEvents(videoQueue, 'Video');
    setupEvents(ttsQueue, 'TTS');
    setupEvents(renderQueue, 'Render');

    queuesInitialized = true;
    logger.info('Job queues initialized with Redis');
  } catch (err) {
    logger.warn('Redis unavailable, using direct processing', {
      error: (err as Error).message,
    });
    queuesInitialized = true;
  }
}

/**
 * Add a job — uses Bull queue if available, otherwise processes directly.
 */
export async function addImageJob(data: ImageJobData): Promise<{ jobId: string }> {
  if (imageQueue) {
    const job = await imageQueue.add(data, { attempts: 2, backoff: 5000 });
    return { jobId: String(job.id) };
  }
  // Direct processing fallback
  const result = await generateImage(data.sceneId, data.prompt, { width: data.width, height: data.height });
  return { jobId: `direct-${Date.now()}` };
}

export async function addVideoJob(data: VideoJobData): Promise<{ jobId: string }> {
  if (videoQueue) {
    const job = await videoQueue.add(data, { attempts: 2, backoff: 10000 });
    return { jobId: String(job.id) };
  }
  const result = await generateVideoFromImage(data.sceneId, data.imagePath, data.duration);
  return { jobId: `direct-${Date.now()}` };
}

export async function addTTSJob(data: TTSJobData): Promise<{ jobId: string }> {
  if (ttsQueue) {
    const job = await ttsQueue.add(data, { attempts: 2, backoff: 5000 });
    return { jobId: String(job.id) };
  }
  const result = await generateTTS(data.sceneId, data.text, { voice: data.voice });
  return { jobId: `direct-${Date.now()}` };
}

export async function addRenderJob(data: RenderJobData): Promise<{ jobId: string }> {
  if (renderQueue) {
    const job = await renderQueue.add(data, { attempts: 1, timeout: 600000 });
    return { jobId: String(job.id) };
  }
  const result = await renderFinalVideo(data.projectId, { resolution: data.resolution });
  return { jobId: `direct-${Date.now()}` };
}

/**
 * Get job status from any queue.
 */
export async function getJobStatus(jobId: string): Promise<{
  id: string;
  status: string;
  progress: number;
  result?: unknown;
  error?: string;
} | null> {
  const queues = [imageQueue, videoQueue, ttsQueue, renderQueue].filter(Boolean);

  for (const queue of queues) {
    const job = await queue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      return {
        id: String(job.id),
        status: state,
        progress: job.progress() as number,
        result: state === 'completed' ? job.returnvalue : undefined,
        error: state === 'failed' ? job.failedReason : undefined,
      };
    }
  }

  return null;
}
