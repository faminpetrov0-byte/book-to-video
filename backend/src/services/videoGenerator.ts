import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { contentHash } from '../utils/hash';
import logger from '../utils/logger';
import { AIServiceError } from '../utils/errors';
import prisma from '../db';

interface GenerateVideoResult {
  filePath: string;
  contentHashValue: string;
  duration: number;
  cached: boolean;
}

/**
 * Generate a short video clip from a static image using Stable Video Diffusion.
 * Each clip is 5-30 seconds. Results are cached.
 */
export async function generateVideoFromImage(
  sceneId: string,
  imagePath: string,
  duration: number = 10
): Promise<GenerateVideoResult> {
  const hash = contentHash({ imagePath, duration, model: 'svd' });

  // Check cache
  const cached = await prisma.generatedMedia.findFirst({
    where: { contentHash: hash, mediaType: 'video', status: 'completed' },
  });

  if (cached && fs.existsSync(cached.filePath)) {
    logger.info('Video cache hit', { hash, sceneId });
    return { filePath: cached.filePath, contentHashValue: hash, duration, cached: true };
  }

  logger.info('Generating video from image', { sceneId, imagePath, duration });

  const outputDir = path.join(config.output.dir, 'videos');
  fs.mkdirSync(outputDir, { recursive: true });

  // Try Fal.ai first (better for video generation)
  if (config.ai.fal.apiKey) {
    try {
      return await generateViaFal(sceneId, imagePath, duration, hash, outputDir);
    } catch (err) {
      logger.warn('Fal.ai generation failed, trying HuggingFace', {
        error: (err as Error).message,
      });
    }
  }

  // Try HuggingFace SVD
  if (config.ai.huggingface.apiKey) {
    try {
      return await generateViaHuggingFace(sceneId, imagePath, duration, hash, outputDir);
    } catch (err) {
      logger.warn('HuggingFace SVD failed, using FFmpeg fallback', {
        error: (err as Error).message,
      });
    }
  }

  // Fallback: Ken Burns effect with FFmpeg
  return await generateViaFFmpeg(sceneId, imagePath, duration, hash, outputDir);
}

async function generateViaFal(
  sceneId: string,
  imagePath: string,
  duration: number,
  hash: string,
  outputDir: string
): Promise<GenerateVideoResult> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const response = await fetch('https://fal.run/fal-ai/stable-video-diffusion', {
    method: 'POST',
    headers: {
      Authorization: `Key ${config.ai.fal.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: `data:${mimeType};base64,${base64Image}`,
      motion_bucket_id: 127,
      fps: 24,
      num_frames: Math.min(25, Math.round(duration * 2.5)),
    }),
  });

  if (!response.ok) {
    throw new AIServiceError('Fal.ai', `${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { video: { url: string } };
  const videoUrl = data.video?.url;
  if (!videoUrl) throw new AIServiceError('Fal.ai', 'No video URL in response');

  const videoResponse = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

  const filePath = path.join(outputDir, `${hash}.mp4`);
  fs.writeFileSync(filePath, videoBuffer);

  await prisma.generatedMedia.create({
    data: {
      sceneId,
      mediaType: 'video',
      filePath,
      contentHash: hash,
      modelUsed: 'fal-ai/svd',
      status: 'completed',
      selected: true,
    },
  });

  return { filePath, contentHashValue: hash, duration, cached: false };
}

async function generateViaHuggingFace(
  sceneId: string,
  imagePath: string,
  duration: number,
  hash: string,
  outputDir: string
): Promise<GenerateVideoResult> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${config.ai.huggingface.svdModel}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ai.huggingface.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          image: base64Image,
        },
        parameters: {
          num_frames: 25,
          fps: 7,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new AIServiceError('HuggingFace SVD', `${response.status}: ${await response.text()}`);
  }

  const videoBuffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(outputDir, `${hash}.mp4`);
  fs.writeFileSync(filePath, videoBuffer);

  await prisma.generatedMedia.create({
    data: {
      sceneId,
      mediaType: 'video',
      filePath,
      contentHash: hash,
      modelUsed: config.ai.huggingface.svdModel,
      status: 'completed',
      selected: true,
    },
  });

  return { filePath, contentHashValue: hash, duration, cached: false };
}

/**
 * Fallback: Create a Ken Burns effect video from a static image using FFmpeg.
 * This always works without any API keys.
 */
async function generateViaFFmpeg(
  sceneId: string,
  imagePath: string,
  duration: number,
  hash: string,
  outputDir: string
): Promise<GenerateVideoResult> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const filePath = path.join(outputDir, `${hash}.mp4`);

  // Ken Burns effect: slow zoom in with slight pan
  const ffmpegCmd = [
    config.ffmpeg.path,
    '-loop', '1',
    '-i', `"${imagePath}"`,
    '-vf', `"zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=1280x720:fps=25"`,
    '-c:v', 'libx264',
    '-t', String(duration),
    '-pix_fmt', 'yuv420p',
    '-y',
    `"${filePath}"`,
  ].join(' ');

  logger.info('Generating Ken Burns video via FFmpeg', { sceneId, duration });

  try {
    await execAsync(ffmpegCmd, { timeout: 120000 });
  } catch (err) {
    logger.error('FFmpeg video generation failed', { error: (err as Error).message });
    throw new AIServiceError('FFmpeg', (err as Error).message);
  }

  await prisma.generatedMedia.create({
    data: {
      sceneId,
      mediaType: 'video',
      filePath,
      contentHash: hash,
      modelUsed: 'ffmpeg-kenburns',
      status: 'completed',
      selected: true,
    },
  });

  return { filePath, contentHashValue: hash, duration, cached: false };
}
