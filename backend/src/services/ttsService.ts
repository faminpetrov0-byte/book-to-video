import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { contentHash } from '../utils/hash';
import logger from '../utils/logger';
import { AIServiceError } from '../utils/errors';
import prisma from '../db';

interface TTSResult {
  filePath: string;
  contentHashValue: string;
  duration: number;
  cached: boolean;
}

interface TTSOptions {
  voice?: string;
  voiceId?: string;
  speed?: number;
  character?: string;
}

/**
 * Free voices available in ElevenLabs (with API key)
 */
export const AVAILABLE_VOICES = [
  { id: 'Rachel', name: 'Rachel (Female, Calm)', gender: 'female', style: 'calm narrator' },
  { id: 'Josh', name: 'Josh (Male, Deep)', gender: 'male', style: 'deep authoritative' },
  { id: 'Sam', name: 'Sam (Male, Young)', gender: 'male', style: 'friendly young' },
  { id: 'Nicole', name: 'Nicole (Female, Professional)', gender: 'female', style: 'professional' },
  { id: 'Arnold', name: 'Arnold (Male, Strong)', gender: 'male', style: 'strong confident' },
  { id: 'Bella', name: 'Bella (Female, Soft)', gender: 'female', style: 'soft emotional' },
  { id: 'Adam', name: 'Adam (Male, Conversational)', gender: 'male', style: 'conversational' },
  { id: 'Domi', name: 'Domi (Female, Upbeat)', gender: 'female', style: 'upbeat energetic' },
] as const;

/**
 * Fallback voices for offline/macOS using system TTS
 */
export const FALLBACK_VOICES = [
  { id: 'system_male', name: 'System Male', gender: 'male', lang: 'en-US' },
  { id: 'system_female', name: 'System Female', gender: 'female', lang: 'en-US' },
  { id: 'system_russian_male', name: 'Russian Male', gender: 'male', lang: 'ru-RU' },
  { id: 'system_russian_female', name: 'Russian Female', gender: 'female', lang: 'ru-RU' },
] as const;

/**
 * Get available voices - from ElevenLabs API or fallback list
 */
export async function getAvailableVoices(): Promise<Array<{
  id: string;
  name: string;
  gender: string;
  style?: string;
  provider: 'elevenlabs' | 'coqui' | 'system';
}>> {
  // If ElevenLabs API key is set, fetch real voices
  if (config.tts.elevenlabs.apiKey) {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': config.tts.elevenlabs.apiKey },
      });

      if (response.ok) {
        const data = await response.json() as { voices: Array<{ voice_id: string; name: string; gender: string; category: string }> };
        return data.voices.map((v) => ({
          id: v.voice_id,
          name: v.name,
          gender: v.gender,
          provider: 'elevenlabs',
        }));
      }
    } catch (err) {
      logger.warn('Failed to fetch ElevenLabs voices', { error: (err as Error).message });
    }
  }

  // If Coqui is available, use it
  if (config.tts.coqui.enabled) {
    return [
      { id: 'coqui_male', name: 'Coqui Male (Taco)', gender: 'male', provider: 'coqui' },
      { id: 'coqui_female', name: 'Coqui Female (Ana)', gender: 'female', provider: 'coqui' },
      { id: 'coqui_male_2', name: 'Coqui Male (Teddy)', gender: 'male', provider: 'coqui' },
    ];
  }

  // Fallback to built-in voices
  return [
    ...AVAILABLE_VOICES.map((v) => ({ ...v, provider: 'elevenlabs' as const })),
    ...FALLBACK_VOICES.map((v) => ({ ...v, provider: 'system' as const })),
  ];
}

/**
 * Generate text-to-speech with specific voice.
 * Supports ElevenLabs, Coqui, and system fallback.
 */
export async function generateTTS(
  sceneId: string,
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const { voiceId = 'Rachel', speed = 1.0, character } = options;
  const hashValue = await contentHash(`${text}-${voiceId}-${speed}`);
  
  // Check cache
  const cacheDir = path.join(config.output.dir, 'audio');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  const outputPath = path.join(cacheDir, `${sceneId}-${hashValue}.mp3`);
  
  if (fs.existsSync(outputPath)) {
    logger.info('Using cached TTS', { sceneId, hashValue });
    return { filePath: outputPath, contentHashValue: hashValue, duration: 0, cached: true };
  }

  let result: TTSResult;

  // Try ElevenLabs first
  if (config.tts.elevenlabs.apiKey) {
    try {
      result = await generateElevenLabs(text, voiceId, outputPath, speed);
      await saveMediaRecord(sceneId, result, character, voiceId);
      return result;
    } catch (err) {
      logger.warn('ElevenLabs failed, trying fallback', { error: (err as Error).message });
    }
  }

  // Try Coqui TTS
  if (config.tts.coqui.enabled) {
    try {
      result = await generateCoqui(text, voiceId, outputPath);
      await saveMediaRecord(sceneId, result, character, voiceId);
      return result;
    } catch (err) {
      logger.warn('Coqui failed, trying system fallback', { error: (err as Error).message });
    }
  }

  // Fallback to system TTS
  result = await generateSystemTTS(text, voiceId, outputPath, speed);
  await saveMediaRecord(sceneId, result, character, voiceId);
  return result;
}

/**
 * Generate using ElevenLabs API
 */
async function generateElevenLabs(
  text: string,
  voiceId: string,
  outputPath: string,
  speed: number
): Promise<TTSResult> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': config.tts.elevenlabs.apiKey!,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.5,
        speed: speed,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AIServiceError(`ElevenLabs error: ${response.status} - ${error}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  const hashValue = await contentHash(buffer);
  
  // Get duration using ffprobe
  let duration = 0;
  try {
    const { execSync } = await import('child_process');
    const ffoutput = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`, { encoding: 'utf8' });
    duration = parseFloat(ffoutput.trim()) || 0;
  } catch { /* ignore */ }

  logger.info('TTS generated via ElevenLabs', { outputPath, duration });
  
  return {
    filePath: outputPath,
    contentHashValue: hashValue,
    duration,
    cached: false,
  };
}

/**
 * Generate using Coqui TTS (free, open-source)
 * Requires Coqui TTS to be installed: pip install TTS
 */
async function generateCoqui(
  text: string,
  voiceId: string,
  outputPath: string
): Promise<TTSResult> {
  // Coqui model selection based on voice preference
  const model = voiceId.includes('female') || voiceId === 'Bella' || voiceId === 'Domi'
    ? 'xtts_v2'  // Female voices
    : 'xtts_v2'; // Male voices

  const { execSync } = await import('child_process');
  
  // Run Coqui TTS
  const tempWav = outputPath.replace('.mp3', '.wav');
  
  try {
    execSync(`tts --text "${text.replace(/"/g, '\\"')}" --model_name tts_models/multilingual/multi-dataset/xtts_v2 --speaker_wav /dev/null --language_idx en --out_path "${tempWav}"`, {
      timeout: 120,
    });

    // Convert to MP3
    execSync(`ffmpeg -i "${tempWav}" -codec:a libmp3lame -q:a 2 "${outputPath}" -y`, { timeout: 30 });
    
    // Clean up WAV
    if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
  } catch (err) {
    throw new AIServiceError(`Coqui TTS failed: ${(err as Error).message}`);
  }

  const buffer = fs.readFileSync(outputPath);
  const hashValue = await contentHash(buffer);
  
  let duration = 0;
  try {
    const { execSync } = await import('child_process');
    const ffoutput = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`, { encoding: 'utf8' });
    duration = parseFloat(ffoutput.trim()) || 0;
  } catch { /* ignore */ }

  logger.info('TTS generated via Coqui', { outputPath, duration });

  return {
    filePath: outputPath,
    contentHashValue: hashValue,
    duration,
    cached: false,
  };
}

/**
 * Generate using system TTS (macOS say command or Windows SAPI)
 */
async function generateSystemTTS(
  text: string,
  voiceId: string,
  outputPath: string,
  speed: number
): Promise<TTSResult> {
  const { execSync } = await import('child_process');
  const platform = process.platform;
  
  const tempFile = outputPath.replace('.mp3', `.${platform === 'win32' ? 'wav' : 'aiff'}`);
  
  try {
    if (platform === 'darwin') {
      // macOS: use say command
      const voice = voiceId.includes('female') || voiceId === 'Rachel' || voiceId === 'Bella'
        ? 'Samantha'  // Female
        : 'Alex';     // Male
      
      execSync(`say -v ${voice} -o "${tempFile}" -- "${text.replace(/"/g, '\\"')}"`, { timeout: 60 });
      
      // Convert to MP3
      execSync(`ffmpeg -i "${tempFile}" -codec:a libmp3lame -q:a 2 "${outputPath}" -y`, { timeout: 30 });
    } else if (platform === 'win32') {
      // Windows: use PowerShell SAPI
      const psScript = `
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.Rate = ${Math.round((speed - 1) * 10)}
        $synth.SelectVoiceByHints([System.Globalization.CultureInfo]::GetCultureInfo('en-US'))
        $synth.SaveToFile("${text.replace(/"/g, '`"')}", "${tempFile.replace(/\\/g, '\\\\')}")
        $synth.Dispose()
      `;
      execSync(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, { timeout: 60 });
      
      // Convert to MP3
      execSync(`ffmpeg -i "${tempFile}" -codec:a libmp3lame -q:a 2 "${outputPath}" -y`, { timeout: 30 });
    } else {
      // Linux: try espeak or festival
      execSync(`espeak "${text.replace(/"/g, '\\"')}" -w "${tempFile}"`, { timeout: 60 });
      execSync(`ffmpeg -i "${tempFile}" -codec:a libmp3lame -q:a 2 "${outputPath}" -y`, { timeout: 30 });
    }
  } catch (err) {
    throw new AIServiceError(`System TTS failed: ${(err as Error).message}`);
  }

  // Clean up temp file
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }

  const buffer = fs.readFileSync(outputPath);
  const hashValue = await contentHash(buffer);
  
  let duration = 0;
  try {
    const { execSync } = await import('child_process');
    const ffoutput = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`, { encoding: 'utf8' });
    duration = parseFloat(ffoutput.trim()) || 0;
  } catch { /* ignore */ }

  logger.info('TTS generated via system', { outputPath, duration, platform });

  return {
    filePath: outputPath,
    contentHashValue: hashValue,
    duration,
    cached: false,
  };
}

/**
 * Save media record to database
 */
async function saveMediaRecord(
  sceneId: string,
  result: TTSResult,
  character?: string,
  voiceUsed?: string
) {
  await prisma.generatedMedia.create({
    data: {
      sceneId,
      mediaType: 'audio',
      filePath: result.filePath,
      contentHash: result.contentHashValue,
      promptUsed: null,
      modelUsed: voiceUsed ? `elevenlabs:${voiceUsed}` : 'system',
      metadata: JSON.stringify({ character, voice: voiceUsed }),
      selected: true,
      status: 'completed',
    },
  });
}

/**
 * Generate TTS for multiple characters in a scene (dialogue)
 */
export async function generateSceneWithCharacters(
  sceneId: string,
  text: string,
  characters: Array<{ name: string; voiceId?: string }>
): Promise<TTSResult[]> {
  const results: TTSResult[] = [];
  
  // Split text into dialogue lines (format: "Name: text")
  const lines = text.split('\n').filter((l) => l.trim());
  
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const [, charName, charText] = match;
      const char = characters.find((c) => c.name.toLowerCase() === charName.toLowerCase());
      const voice = char?.voiceId || 'Rachel';
      
      const result = await generateTTS(sceneId, charText, { voiceId: voice, character: charName });
      results.push(result);
    } else {
      // Narrator text
      const narrator = characters.find((c) => c.name.toLowerCase() === 'narrator');
      const voice = narrator?.voiceId || 'Rachel';
      
      const result = await generateTTS(sceneId, line, { voiceId: voice, character: 'Narrator' });
      results.push(result);
    }
  }
  
  return results;
}
