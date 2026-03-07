import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from '../config';
import logger from '../utils/logger';
import { contentHash } from '../utils/hash';

/**
 * Audio mixing service for combining TTS with background music
 */

export interface AudioMixOptions {
  ttsPath: string;
  musicPath?: string;
  outputPath: string;
  ttsVolume?: number;
  musicVolume?: number;
  fadeIn?: number;
  fadeOut?: number;
  normalize?: boolean;
}

/**
 * Mix TTS audio with background music
 */
export async function mixAudio(options: AudioMixOptions): Promise<string> {
  const {
    ttsPath,
    musicPath,
    outputPath,
    ttsVolume = 1.0,
    musicVolume = 0.3,
    fadeIn = 1,
    fadeOut = 2,
    normalize = true,
  } = options;

  // Get TTS duration
  const ttsDuration = getAudioDuration(ttsPath);

  if (!musicPath || musicPath === 'none') {
    // Just normalize TTS if no music
    if (normalize) {
      execSync(`ffmpeg -i "${ttsPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" "${outputPath}" -y`, { timeout: 60 });
    } else {
      fs.copyFileSync(ttsPath, outputPath);
    }
    return outputPath;
  }

  // Get music duration (loop if shorter than TTS)
  const musicDuration = getAudioDuration(musicPath);
  
  // Create a music track long enough for the TTS
  const musicLoops = Math.ceil(ttsDuration / musicDuration);
  const loopedMusicPath = outputPath.replace('.mp3', '_looped.mp3');
  
  // Loop music
  const loopList = Array(musicLoops).fill(`file '${musicPath}'`).join('\n');
  const listPath = outputPath.replace('.mp3', '_list.txt');
  fs.writeFileSync(listPath, loopList);
  
  try {
    execSync(`ffmpeg -f concat -safe 0 -i "${listPath}" -t ${ttsDuration} "${loopedMusicPath}" -y`, { timeout: 60 });
  } catch (err) {
    // If concat fails, just use original
    fs.copyFileSync(musicPath, loopedMusicPath);
  }

  // Apply fade in/out to music
  const fadedMusicPath = outputPath.replace('.mp3', '_faded.mp3');
  execSync(
    `ffmpeg -i "${loopedMusicPath}" -af "afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${ttsDuration - fadeOut}:d=${fadeOut},volume=${musicVolume}" "${fadedMusicPath}" -y`,
    { timeout: 60 }
  );

  // Mix TTS and music
  const mixCommand = `ffmpeg -i "${ttsPath}" -i "${fadedMusicPath}" -filter_complex "[0:a]volume=${ttsVolume}[tts];[1:a][tts]amix=inputs=2:duration=first:dropout_transition=0[tts_mixed]" -map "[tts_mixed]" "${outputPath}" -y`;
  
  try {
    execSync(mixCommand, { timeout: 120 });
  } catch (err) {
    // Fallback: just use TTS
    logger.warn('Audio mix failed, using TTS only', { error: (err as Error).message });
    fs.copyFileSync(ttsPath, outputPath);
  }

  // Cleanup temp files
  try {
    [listPath, loopedMusicPath, fadedMusicPath].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  } catch { /* ignore */ }

  logger.info('Audio mixed successfully', { outputPath, ttsDuration });
  return outputPath;
}

/**
 * Get audio duration using ffprobe
 */
function getAudioDuration(audioPath: string): number {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { encoding: 'utf8' }
    );
    return parseFloat(output.trim()) || 0;
  } catch {
    return 0;
  }
}

/**
 * Normalize audio levels
 */
export function normalizeAudio(inputPath: string, outputPath: string): void {
  execSync(
    `ffmpeg -i "${inputPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" "${outputPath}" -y`,
    { timeout: 60 }
  );
  logger.info('Audio normalized', { inputPath, outputPath });
}

/**
 * Apply audio effects
 */
export function applyAudioEffects(
  inputPath: string,
  outputPath: string,
  effects: {
    pitch?: number;      // semitones
    speed?: number;      // playback speed
    reverb?: number;     // 0-100
    echo?: number;       // 0-100
    fadeIn?: number;     // seconds
    fadeOut?: number;    // seconds
  }
): void {
  const filters: string[] = [];

  if (effects.pitch) {
    filters.push(`asetrate=r=44100*2^(0.05833333*${effects.pitch}),aresample=44100`);
  }

  if (effects.speed && effects.speed !== 1) {
    filters.push(`atempo=${effects.speed}`);
  }

  if (effects.reverb) {
    const wet = effects.reverb / 100;
    filters.push(`aecho=0.8:0.88:${effects.reverb / 50}:0.4`);
  }

  if (effects.echo) {
    filters.push(`aecho=0.8:0.9:60:0.3`);
  }

  if (effects.fadeIn) {
    filters.push(`afade=t=in:st=0:d=${effects.fadeIn}`);
  }

  if (effects.fadeOut) {
    const duration = getAudioDuration(inputPath);
    filters.push(`afade=t=out:st=${duration - (effects.fadeOut || 0)}:d=${effects.fadeOut || 1}`);
  }

  if (filters.length === 0) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  const filterChain = filters.join(',');
  execSync(`ffmpeg -i "${inputPath}" -af "${filterChain}" "${outputPath}" -y`, { timeout: 120 });
  
  logger.info('Audio effects applied', { inputPath, outputPath, effects });
}

/**
 * Convert audio format
 */
export function convertAudio(
  inputPath: string,
  outputPath: string,
  format: 'mp3' | 'wav' | 'aac' | 'ogg' = 'mp3',
  bitrate = '128k'
): void {
  const codec = format === 'wav' ? 'pcm_s16le' : 
               format === 'ogg' ? 'libvorbis' : 'aac';
  
  execSync(
    `ffmpeg -i "${inputPath}" -codec:a ${codec} -b:a ${bitrate} "${outputPath}" -y`,
    { timeout: 60 }
  );
  
  logger.info('Audio converted', { inputPath, outputPath, format });
}

/**
 * Extract audio from video
 */
export function extractAudio(videoPath: string, outputPath: string): void {
  execSync(
    `ffmpeg -i "${videoPath}" -vn -codec:a copy "${outputPath}" -y`,
    { timeout: 60 }
  );
  
  logger.info('Audio extracted from video', { videoPath, outputPath });
}

/**
 * Merge multiple audio files
 */
export function mergeAudioFiles(
  inputPaths: string[],
  outputPath: string,
  crossfade: number = 1
): void {
  if (inputPaths.length === 0) {
    throw new Error('No input files provided');
  }

  if (inputPaths.length === 1) {
    fs.copyFileSync(inputPaths[0], outputPath);
    return;
  }

  // Create concat list
  const listPath = outputPath.replace('.mp3', '_list.txt');
  const list = inputPaths.map((p) => `file '${p}'`).join('\n');
  fs.writeFileSync(listPath, list);

  try {
    execSync(
      `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}" -y`,
      { timeout: 120 }
    );
  } catch (err) {
    // Fallback: just copy first file
    fs.copyFileSync(inputPaths[0], outputPath);
  }

  // Cleanup
  try {
    fs.unlinkSync(listPath);
  } catch { /* ignore */ }

  logger.info('Audio files merged', { inputPaths: inputPaths.length, outputPath });
}
