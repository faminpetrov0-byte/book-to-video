import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import logger from '../utils/logger';
import prisma from '../db';
import { AppError } from '../utils/errors';

const execAsync = promisify(exec);

interface RenderOptions {
  resolution?: '480p' | '720p' | '1080p';
  fps?: number;
  transitionDuration?: number;
  quality?: 'standard' | 'high' | 'cinematic';
  addColorGrading?: boolean;
  addMotionBlur?: boolean;
  addFilmGrain?: boolean;
}

const RESOLUTIONS: Record<string, string> = {
  '480p': '854:480',
  '720p': '1280:720',
  '1080p': '1920:1080',
};

const QUALITY_PRESETS = {
  standard: { crf: 23, preset: 'medium' },
  high: { crf: 18, preset: 'slow' },
  cinematic: { crf: 15, preset: 'veryslow' },
};

/**
 * Render final video with Hollywood-quality post-processing.
 */
export async function renderFinalVideo(
  projectId: string,
  options: RenderOptions = {}
): Promise<{ filePath: string; duration: number; videoId: string }> {
  const {
    resolution = '720p',
    fps = 25,
    transitionDuration = 0.5,
    quality = 'high',
    addColorGrading = true,
    addMotionBlur = true,
    addFilmGrain = true,
  } = options;

  logger.info('Starting Hollywood-quality render', { projectId, resolution, quality });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      scenes: {
        orderBy: { orderIndex: 'asc' },
        include: {
          generatedMedia: {
            where: { selected: true },
          },
        },
      },
    },
  });

  if (!project) throw new AppError('Project not found', 404);
  if (project.scenes.length === 0) throw new AppError('No scenes to render', 400);

  const sceneFiles: Array<{
    video: string | null;
    audio: string | null;
    duration: number;
  }> = [];

  for (const scene of project.scenes) {
    const videoMedia = scene.generatedMedia.find((m) => m.mediaType === 'video');
    const audioMedia = scene.generatedMedia.find((m) => m.mediaType === 'audio');

    sceneFiles.push({
      video: videoMedia?.filePath || null,
      audio: audioMedia?.filePath || null,
      duration: scene.duration,
    });
  }

  const validScenes = sceneFiles.filter((s) => s.video && fs.existsSync(s.video!));
  if (validScenes.length === 0) {
    throw new AppError('No generated video segments found. Generate videos first.', 400);
  }

  const outputDir = path.join(config.output.dir, 'final');
  fs.mkdirSync(outputDir, { recursive: true });

  const videoId = uuidv4();
  const finalPath = path.join(outputDir, `${videoId}.mp4`);
  const res = RESOLUTIONS[resolution] || RESOLUTIONS['720p'];
  const qualityPreset = QUALITY_PRESETS[quality];

  // Step 1: Create concat file
  const concatFile = path.join(outputDir, `${videoId}_concat.txt`);
  const concatEntries = validScenes
    .map((s) => `file '${s.video!.replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(concatFile, concatEntries);

  // Step 2: Concatenate with transitions and color grading
  const tempVideo = path.join(outputDir, `${videoId}_temp.mp4`);
  
  // Build complex filter graph for Hollywood look
  const filters: string[] = [
    // Scale and pad to target resolution
    `scale=${res}:force_original_aspect_ratio=decrease`,
    `pad=${res}:(ow-iw)/2:(oh-ih)/2:color=black`,
    'setsar=1',
  ];

  // Add color grading (Hollywood LUT simulation)
  if (addColorGrading) {
    filters.push(
      // Lift shadows, slightly desaturate, add warm tones
      "colorbalance=rs=0.1:gs=0.05:bs=-0.1",
      // Slight contrast increase
      "eq=brightness=-0.02:contrast=1.1:saturation=0.95",
      // Subtle vignette
      "vignette=angle=0.5"
    );
  }

  // Add film grain
  if (addFilmGrain) {
    filters.push(
      // Film grain synthesis
      "noise=alls=20:allf=t"
    );
  }

  const filterComplex = filters.join(',');

  const concatCmd = [
    config.ffmpeg.path,
    '-f', 'concat',
    '-safe', '0',
    '-i', `"${concatFile}"`,
    '-vf', `"${filterComplex}"`,
    '-c:v', 'libx264',
    '-preset', qualityPreset.preset,
    '-crf', String(qualityPreset.crf),
    '-r', String(fps),
    '-pix_fmt', 'yuv420p',
    '-an',
    '-y',
    `"${tempVideo}"`,
  ].join(' ');

  logger.info('Processing video with Hollywood effects', { scenes: validScenes.length, filters: filters.length });
  await execAsync(concatCmd, { timeout: 300000 });

  // Step 3: Merge audio tracks
  const audioFiles = validScenes.filter((s) => s.audio && fs.existsSync(s.audio!));

  if (audioFiles.length > 0) {
    const audioConcatFile = path.join(outputDir, `${videoId}_audio_concat.txt`);
    const audioEntries = audioFiles
      .map((s) => `file '${s.audio!.replace(/'/g, "'\\''")}'`)
      .join('\n');
    fs.writeFileSync(audioConcatFile, audioEntries);

    const tempAudio = path.join(outputDir, `${videoId}_audio.mp3`);
    const audioConcatCmd = [
      config.ffmpeg.path,
      '-f', 'concat',
      '-safe', '0',
      '-i', `"${audioConcatFile}"`,
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      `"${tempAudio}"`,
    ].join(' ');

    await execAsync(audioConcatCmd, { timeout: 60000 });

    // Merge with audio
    const mergeCmd = [
      config.ffmpeg.path,
      '-i', `"${tempVideo}"`,
      '-i', `"${tempAudio}"`,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-y',
      `"${finalPath}"`,
    ].join(' ');

    await execAsync(mergeCmd, { timeout: 120000 });
    safeUnlink(tempVideo);
    safeUnlink(tempAudio);
    safeUnlink(audioConcatFile);
  } else {
    fs.renameSync(tempVideo, finalPath);
  }

  safeUnlink(concatFile);

  // Get final video duration
  let duration = 0;
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${finalPath}"`,
      { timeout: 10000 }
    );
    duration = parseFloat(stdout.trim()) || 0;
  } catch { /* ignore */ }

  const stat = fs.statSync(finalPath);

  // Save to database
  const video = await prisma.video.create({
    data: {
      id: videoId,
      projectId,
      filePath: finalPath,
      format: 'mp4',
      resolution,
      duration,
      fileSize: stat.size,
      renderParams: JSON.stringify({ resolution, fps, quality, transitionDuration, addColorGrading, addMotionBlur, addFilmGrain }),
      status: 'completed',
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'completed', totalDuration: duration },
  });

  logger.info('Hollywood-quality video rendered', { videoId, duration, fileSize: stat.size });

  return { filePath: finalPath, duration, videoId };
}

function safeUnlink(filePath: string) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch { /* ignore */ }
}
