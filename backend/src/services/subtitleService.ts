import { config } from '../config';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Generate SRT subtitles for a scene or project
 */
export interface SubtitleCue {
  startTime: number; // seconds
  endTime: number;   // seconds
  text: string;
}

/**
 * Generate SRT format subtitles from scenes
 */
export function generateSRT(
  cues: SubtitleCue[]
): string {
  let srt = '';
  
  cues.forEach((cue, index) => {
    srt += `${index + 1}\n`;
    srt += `${formatSRTTime(cue.startTime)} --> ${formatSRTTime(cue.endTime)}\n`;
    srt += `${cue.text}\n\n`;
  });
  
  return srt;
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

function pad(num: number, size = 2): string {
  return num.toString().padStart(size, '0');
}

/**
 * Extract text from scenes and create subtitle cues
 */
export function scenesToSubtitles(
  scenes: Array<{
    orderIndex: number;
    textContent: string;
    duration: number;
  }>,
  startOffset = 0
): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  let currentTime = startOffset;
  
  for (const scene of scenes) {
    if (!scene.textContent?.trim()) continue;
    
    // Split long text into multiple cues
    const maxCharsPerCue = 80;
    const sentences = scene.textContent.split(/(?<=[.!?])\s+/);
    
    let currentText = '';
    let cueStartTime = currentTime;
    
    for (const sentence of sentences) {
      if (currentText.length + sentence.length > maxCharsPerCue && currentText.length > 0) {
        // Save current cue
        const duration = scene.duration * (currentText.length / scene.textContent.length);
        cues.push({
          startTime: cueStartTime,
          endTime: cueStartTime + Math.max(2, duration),
          text: currentText.trim(),
        });
        
        cueStartTime = cueStartTime + Math.max(2, duration);
        currentText = '';
      }
      currentText += sentence + ' ';
    }
    
    // Save final cue for this scene
    if (currentText.trim()) {
      const duration = scene.duration * (currentText.length / scene.textContent.length);
      cues.push({
        startTime: cueStartTime,
        endTime: cueStartTime + Math.max(2, duration),
        text: currentText.trim(),
      });
    }
    
    currentTime += scene.duration;
  }
  
  return cues;
}

/**
 * Embed subtitles into video using FFmpeg
 */
export async function burnSubtitles(
  videoPath: string,
  subtitlePath: string,
  outputPath: string,
  style?: {
    fontSize?: number;
    fontColor?: string;
    position?: 'top' | 'bottom' | 'center';
    margin?: number;
  }
): Promise<void> {
  const opts = {
    fontSize: style?.fontSize || 24,
    fontColor: style?.fontColor || 'white',
    position: style?.position || 'bottom',
    margin: style?.margin || 20,
  };
  
  const forcePosition = opts.position === 'bottom' 
    ? `force_style='Fontsize=${opts.fontSize},PrimaryColour=&H${colorToHex(opts.fontColor)},Margin=${opts.margin},Alignment=2'`
    : opts.position === 'top'
      ? `force_style='Fontsize=${opts.fontSize},PrimaryColour=&H${colorToHex(opts.fontColor)},Margin=${opts.margin},Alignment=8'`
      : `force_style='Fontsize=${opts.fontSize},PrimaryColour=&H${colorToHex(opts.fontColor)},Margin=${opts.margin},Alignment=5'`;
  
  const { execSync } = await import('child_process');
  
  try {
    execSync(
      `ffmpeg -i "${videoPath}" -vf "subtitles='${subtitlePath.replace(/'/g, "\\'")}':${forcePosition}" -c:a copy "${outputPath}" -y`,
      { timeout: 300 }
    );
    logger.info('Subtitles burned into video', { outputPath });
  } catch (err) {
    throw new Error(`Failed to burn subtitles: ${(err as Error).message}`);
  }
}

function colorToHex(color: string): string {
  // Convert named colors or hex to ASS format
  const colors: Record<string, string> = {
    white: 'FFFFFF',
    black: '000000',
    yellow: 'FFFF00',
    red: 'FF0000',
    green: '00FF00',
    blue: '0000FF',
  };
  
  if (color.startsWith('#')) {
    return color.slice(1).toUpperCase();
  }
  
  return colors[color.toLowerCase()] || 'FFFFFF';
}

/**
 * Save subtitles to file
 */
export function saveSubtitles(
  cues: SubtitleCue[],
  outputPath: string
): void {
  const srt = generateSRT(cues);
  fs.writeFileSync(outputPath, srt, 'utf-8');
  logger.info('Subtitles saved', { outputPath, cueCount: cues.length });
}
