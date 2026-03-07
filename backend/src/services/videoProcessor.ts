/**
 * Video Clip Generator
 * Creates short clips from longer videos using FFmpeg
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from '../../config';
import logger from '../../utils/logger';

export interface ClipOptions {
  startTime: number;
  endTime?: number;
  duration?: number;
  outputPath?: string;
  format?: 'mp4' | 'webm';
}

export interface ClipResult {
  success: boolean;
  filePath?: string;
  duration?: number;
  error?: string;
}

/**
 * Extract a clip from video
 */
export function extractClip(videoPath: string, options: ClipOptions): ClipResult {
  try {
    const { startTime, endTime, duration, outputPath, format = 'mp4' } = options;
    
    if (!fs.existsSync(videoPath)) {
      return { success: false, error: 'Video file not found' };
    }
    
    const outputDir = path.join(config.output.dir, 'clips');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const clipName = `clip_${Date.now()}`;
    const finalOutputPath = outputPath || path.join(outputDir, `${clipName}.${format}`);
    
    // Calculate duration
    const clipDuration = endTime ? (endTime - startTime) : duration;
    
    if (!clipDuration || clipDuration <= 0) {
      return { success: false, error: 'Invalid clip duration' };
    }
    
    // Extract clip
    execSync(
      `ffmpeg -i "${videoPath}" -ss ${startTime} -t ${clipDuration} -c copy "${finalOutputPath}" -y`,
      { timeout: 60 }
    );
    
    const clipDurationResult = getVideoDuration(finalOutputPath);
    
    return {
      success: true,
      filePath: finalOutputPath,
      duration: clipDurationResult,
    };
  } catch (error) {
    logger.error('Clip extraction failed', { error: (error as Error).message });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Auto-generate short clips from video
 */
export function generateShortClips(
  videoPath: string,
  options: {
    clipDuration?: number;
    maxClips?: number;
    sceneTimestamps?: Array<{ start: number; end: number; title: string }>;
  } = {}
): ClipResult[] {
  const { clipDuration = 30, maxClips = 10, sceneTimestamps } = options;
  
  if (!fs.existsSync(videoPath)) {
    return [{ success: false, error: 'Video file not found' }];
  }
  
  const outputDir = path.join(config.output.dir, 'clips');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const videoDuration = getVideoDuration(videoPath);
  const clips: ClipResult[] = [];
  
  if (sceneTimestamps && sceneTimestamps.length > 0) {
    // Use scene timestamps
    for (const scene of sceneTimestamps.slice(0, maxClips)) {
      const result = extractClip(videoPath, {
        startTime: scene.start,
        endTime: scene.end,
        outputPath: path.join(outputDir, `clip_${scene.title.replace(/\s+/g, '_')}.mp4`),
      });
      clips.push(result);
    }
  } else {
    // Auto-split by duration
    const clipCount = Math.min(maxClips, Math.floor(videoDuration / clipDuration));
    
    for (let i = 0; i < clipCount; i++) {
      const startTime = i * clipDuration;
      const result = extractClip(videoPath, {
        startTime,
        duration: clipDuration,
        outputPath: path.join(outputDir, `clip_${i + 1}.mp4`),
      });
      clips.push(result);
    }
  }
  
  logger.info('Short clips generated', { 
    videoPath, 
    clipCount: clips.filter(c => c.success).length 
  });
  
  return clips;
}

/**
 * Get video duration
 */
function getVideoDuration(videoPath: string): number {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: 'utf8' }
    );
    return parseFloat(output.trim()) || 0;
  } catch {
    return 0;
  }
}

/**
 * Generate slideshow from images
 */
export interface SlideshowOptions {
  images: string[];
  durationPerImage?: number;
  outputPath?: string;
  transition?: 'fade' | 'slide' | 'none';
  resolution?: { width: number; height: number };
  audioPath?: string;
  musicPath?: string;
  musicVolume?: number;
}

export function generateSlideshow(options: SlideshowOptions): ClipResult {
  const {
    images,
    durationPerImage = 5,
    outputPath,
    transition = 'fade',
    resolution = { width: 1280, height: 720 },
    audioPath,
    musicPath,
    musicVolume = 0.3,
  } = options;
  
  if (images.length === 0) {
    return { success: false, error: 'No images provided' };
  }
  
  const outputDir = path.join(config.output.dir, 'videos');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const finalOutputPath = outputPath || path.join(outputDir, `slideshow_${Date.now()}.mp4`);
  
  try {
    // Create concat file
    const concatListPath = path.join(outputDir, `concat_${Date.now()}.txt`);
    
    // Process each image to same duration
    const processedImages: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const outputImg = path.join(outputDir, `slide_${i}.mp4`);
      
      if (!fs.existsSync(img)) {
        logger.warn('Image not found, skipping', { img });
        continue;
      }
      
      // Create video from image with duration
      const transitionDuration = transition === 'fade' ? 1 : 0;
      const actualDuration = durationPerImage - transitionDuration;
      
      execSync(
        `ffmpeg -loop 1 -i "${img}" -c:v libx264 -t ${actualDuration} -vf "scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1" -pix_fmt yuv420p -y "${outputImg}"`,
        { timeout: 60 }
      );
      
      processedImages.push(outputImg);
    }
    
    if (processedImages.length === 0) {
      return { success: false, error: 'No valid images to process' };
    }
    
    // Create concat list
    const concatList = processedImages.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(concatListPath, concatList);
    
    // Build FFmpeg command
    let cmd = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${finalOutputPath}" -y`;
    
    // Add audio if provided
    if (audioPath && fs.existsSync(audioPath)) {
      // Replace audio
      cmd = `ffmpeg -i "${finalOutputPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${finalOutputPath}_with_audio.mp4" -y`;
      execSync(cmd, { timeout: 120 });
      fs.renameSync(`${finalOutputPath}_with_audio.mp4`, finalOutputPath);
    } else if (musicPath && fs.existsSync(musicPath)) {
      // Mix background music
      const tempMusic = path.join(outputDir, `music_${Date.now()}.mp3`);
      execSync(`ffmpeg -i "${musicPath}" -t ${getVideoDuration(finalOutputPath)} -c copy "${tempMusic}" -y`);
      
      cmd = `ffmpeg -i "${finalOutputPath}" -i "${tempMusic}" -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0[out]" -map 0:v -map "[out]" -c:v copy -c:a aac "${finalOutputPath}_mixed.mp4" -y`;
      execSync(cmd, { timeout: 120 });
      fs.renameSync(`${finalOutputPath}_mixed.mp4`, finalOutputPath);
      
      if (fs.existsSync(tempMusic)) fs.unlinkSync(tempMusic);
    }
    
    // Cleanup
    processedImages.forEach(f => { try { fs.unlinkSync(f); } catch {} });
    if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
    
    const duration = getVideoDuration(finalOutputPath);
    
    logger.info('Slideshow generated', { 
      imageCount: images.length, 
      duration,
      outputPath: finalOutputPath 
    });
    
    return {
      success: true,
      filePath: finalOutputPath,
      duration,
    };
  } catch (error) {
    logger.error('Slideshow generation failed', { error: (error as Error).message });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Apply cinematic filters to video
 */
export function applyCinematicFilters(
  videoPath: string,
  options: {
    preset?: 'cinematic' | 'anime' | 'documentary' | 'vintage' | 'minimal';
    quality?: 'low' | 'medium' | 'high';
    outputPath?: string;
  } = {}
): ClipResult {
  const { preset = 'cinematic', quality = 'high', outputPath } = options;
  
  if (!fs.existsSync(videoPath)) {
    return { success: false, error: 'Video file not found' };
  }
  
  const finalOutputPath = outputPath || videoPath.replace('.mp4', '_graded.mp4');
  
  // Quality settings
  const qualitySettings = {
    low: { crf: 28, preset: 'veryfast' },
    medium: { crf: 23, preset: 'medium' },
    high: { crf: 18, preset: 'slow' },
  };
  
  const { crf, preset: ffmpegPreset } = qualitySettings[quality];
  
  // Preset filters
  const filters: Record<string, string[]> = {
    cinematic: [
      'colorbalance=rs=0.1:gs=0.05:bs=-0.1',
      'eq=saturation=0.95:contrast=1.1:brightness=0.02',
      'vignette=angle=0.5',
      'noise=alls=15:allf=t',
    ],
    anime: [
      'saturation=1.2',
      'contrast=1.1',
      'unsharp=3:1.5:0.5',
    ],
    documentary: [
      'eq=brightness=0.05:contrast=1.05:saturation=0.9',
      'colorbalance=rs=0.02:gs=0.02:bs=0.02',
    ],
    vintage: [
      'colorchannelmixer=0.9:0.1:0.1:0.1:0.9:0.1:0.1:0.1:0.8',
      'noise=alls=25:allf=t',
      'eq=saturation=0.8',
    ],
    minimal: [
      'eq=saturation=0.7:contrast=1.05',
    ],
  };
  
  const filterChain = filters[preset].join(',');
  
  try {
    execSync(
      `ffmpeg -i "${videoPath}" -vf "${filterChain}" -c:v libx264 -crf ${crf} -preset ${ffmpegPreset} -c:a copy "${finalOutputPath}" -y`,
      { timeout: 300 }
    );
    
    const duration = getVideoDuration(finalOutputPath);
    
    logger.info('Cinematic filters applied', { preset, quality, outputPath: finalOutputPath });
    
    return {
      success: true,
      filePath: finalOutputPath,
      duration,
    };
  } catch (error) {
    logger.error('Cinematic filters failed', { error: (error as Error).message });
    return { success: false, error: (error as Error).message };
  }
}
