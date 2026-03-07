/**
 * TTS Providers
 * ElevenLabs, Coqui TTS, System TTS
 */

import { BaseProvider, GenerationOptions, GenerationResult, ProviderConfig, ProviderHealth } from './base/BaseProvider';
import { config } from '../../config';
import fs from 'fs';
import path from 'path';
import { contentHash } from '../../utils/hash';
import logger from '../../utils/logger';
import { execSync } from 'child_process';

// ============== ELEVENLABS ==============
export class ElevenLabsProvider extends BaseProvider {
  readonly name = 'ElevenLabs';
  readonly type = 'tts' = 'tts';
  readonly isFree = false;
  readonly requiresApiKey = true;
  
  private apiKey: string;
  private defaultVoice = 'Rachel';
  
  // Free tier voices
  static readonly FREE_VOICES = [
    { id: 'Rachel', name: 'Rachel', gender: 'female' },
    { id: 'Josh', name: 'Josh', gender: 'male' },
    { id: 'Sam', name: 'Sam', gender: 'male' },
    { id: 'Nicole', name: 'Nicole', gender: 'female' },
    { id: 'Arnold', name: 'Arnold', gender: 'male' },
    { id: 'Bella', name: 'Bella', gender: 'female' },
    { id: 'Adam', name: 'Adam', gender: 'male' },
    { id: 'Domi', name: 'Domi', gender: 'female' },
  ];
  
  constructor(config?: ProviderConfig) {
    super(config);
    this.apiKey = config?.apiKey || process.env.ELEVENLABS_API_KEY || '';
  }
  
  async initialize(cfg: ProviderConfig): Promise<void> {
    await super.initialize(cfg);
    this.apiKey = cfg.apiKey || process.env.ELEVENLABS_API_KEY || '';
  }
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const text = options.text || 'Hello world';
    const voiceId = options.voiceId || options.voice || this.defaultVoice;
    const speed = options.speed || 1.0;
    
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key required');
    }
    
    try {
      const response = await this.fetchWithTimeout(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.5,
              speed,
            },
          }),
        },
        60000
      );
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs error: ${response.status} - ${error}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Save audio
      const outputDir = path.join(config.output.dir, 'audio');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const hash = await contentHash(text + voiceId + Date.now());
      const outputPath = path.join(outputDir, `${hash}.mp3`);
      
      fs.writeFileSync(outputPath, buffer);
      
      // Get duration
      const duration = await this.getAudioDuration(outputPath);
      
      return {
        success: true,
        filePath: outputPath,
        mediaType: 'audio',
        metadata: {
          voiceId,
          text: text.slice(0, 100),
          duration,
          model: 'eleven_multilingual_v2',
        },
        cost: this.estimateCost(text),
        processingTime: Date.now() - startTime,
        provider: this.name,
      };
    } catch (error) {
      logger.error('ElevenLabs TTS failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  async getVoices(): Promise<Array<{ id: string; name: string; gender: string }>> {
    if (!this.apiKey) {
      return ElevenLabsProvider.FREE_VOICES;
    }
    
    try {
      const response = await this.fetchWithTimeout(
        'https://api.elevenlabs.io/v1/voices',
        { headers: { 'xi-api-key': this.apiKey } },
        10000
      );
      
      if (!response.ok) {
        return ElevenLabsProvider.FREE_VOICES;
      }
      
      const data = await response.json() as any;
      return data.voices.map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        gender: v.gender,
      }));
    } catch {
      return ElevenLabsProvider.FREE_VOICES;
    }
  }
  
  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const output = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
        { encoding: 'utf8' }
      );
      return parseFloat(output.trim()) || 0;
    } catch {
      return 0;
    }
  }
  
  private estimateCost(text: string): number {
    // ~$0.30 per 1000 characters for multilingual v2
    return (text.length / 1000) * 0.30;
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { name: this.name, status: 'down', isFree: this.isFree, error: 'No API key' };
    }
    
    try {
      const start = Date.now();
      const response = await this.fetchWithTimeout(
        'https://api.elevenlabs.io/v1/voices',
        { headers: { 'xi-api-key': this.apiKey } },
        5000
      );
      
      return {
        name: this.name,
        status: response.ok ? 'healthy' : 'degraded',
        latency: Date.now() - start,
        isFree: this.isFree,
      };
    } catch (error) {
      return {
        name: this.name,
        status: 'degraded',
        isFree: this.isFree,
        error: (error as Error).message,
      };
    }
  }
}

// ============== COQUI TTS (FREE!) ==============
export class CoquiTTSProvider extends BaseProvider {
  readonly name = 'Coqui TTS (XTTS)';
  readonly type = 'tts' = 'tts';
  readonly isFree = true;
  readonly requiresApiKey = false;
  readonly defaultModel = 'xtts_v2';
  
  private model: string;
  
  constructor(config?: ProviderConfig) {
    super(config);
    this.model = this.defaultModel;
  }
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const text = options.text || 'Hello world';
    
    const outputDir = path.join(config.output.dir, 'audio');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const hash = await contentHash(text + Date.now());
    const outputPath = path.join(outputDir, `${hash}.wav`);
    const mp3Path = outputPath.replace('.wav', '.mp3');
    
    try {
      // Try Coqui TTS CLI if available
      logger.info('Attempting Coqui TTS generation...');
      
      // Use Coqui TTS
      execSync(
        `tts --text "${text.replace(/"/g, '\\"')}" --model_name tts_models/multilingual/multi-dataset/xtts_v2 --language_idx en --out_path "${outputPath}"`,
        { timeout: 180, stdio: 'pipe' }
      );
      
      // Convert to MP3
      if (fs.existsSync(outputPath)) {
        execSync(`ffmpeg -i "${outputPath}" -codec:a libmp3lame -q:a 2 "${mp3Path}" -y`, { timeout: 30 });
        fs.unlinkSync(outputPath); // Remove WAV
      }
      
      const finalPath = fs.existsSync(mp3Path) ? mp3Path : outputPath;
      const duration = await this.getAudioDuration(finalPath);
      
      return {
        success: true,
        filePath: finalPath,
        mediaType: 'audio',
        metadata: {
          model: this.model,
          text: text.slice(0, 100),
          duration,
        },
        cost: 0,
        processingTime: Date.now() - startTime,
        provider: this.name,
      };
    } catch (error) {
      logger.warn('Coqui TTS not available, will use fallback', { error: (error as Error).message });
      throw new Error('Coqui TTS not installed. Run: pip install TTS');
    }
  }
  
  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const output = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
        { encoding: 'utf8' }
      );
      return parseFloat(output.trim()) || 0;
    } catch {
      return 0;
    }
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    try {
      execSync('tts --help', { timeout: 5000 });
      return {
        name: this.name,
        status: 'healthy',
        isFree: this.isFree,
      };
    } catch {
      return {
        name: this.name,
        status: 'down',
        isFree: this.isFree,
        error: 'Coqui TTS not installed',
      };
    }
  }
}

// ============== SYSTEM TTS (FREE!) ==============
export class SystemTTSProvider extends BaseProvider {
  readonly name = 'System TTS';
  readonly type = 'tts' = 'tts';
  readonly isFree = true;
  readonly requiresApiKey = false;
  
  constructor(config?: ProviderConfig) {
    super(config);
  }
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const text = options.text || 'Hello world';
    const platform = process.platform;
    
    const outputDir = path.join(config.output.dir, 'audio');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const hash = await contentHash(text + Date.now());
    const tempPath = path.join(outputDir, `${hash}.aiff`);
    const outputPath = path.join(outputDir, `${hash}.mp3`);
    
    try {
      if (platform === 'darwin') {
        // macOS - use say command
        const voice = this.getVoiceForGender(options.voice);
        execSync(`say -v ${voice} -o "${tempPath}" -- "${text.replace(/"/g, '\\"')}"`, { timeout: 60 });
      } else if (platform === 'win32') {
        // Windows - use PowerShell SAPI
        const tempWav = path.join(outputDir, `${hash}.wav`);
        const psScript = `
          Add-Type -AssemblyName System.Speech
          $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
          $synth.SpeakToFile("${text.replace(/"/g, '`"')}", "${tempWav.replace(/\\/g, '\\\\')}")
          $synth.Dispose()
        `;
        execSync(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, { timeout: 60 });
        fs.renameSync(tempWav, tempPath);
      } else {
        // Linux - use espeak
        execSync(`espeak "${text.replace(/"/g, '\\"')}" -w "${tempPath}"`, { timeout: 60 });
      }
      
      // Convert to MP3
      if (fs.existsSync(tempPath)) {
        execSync(`ffmpeg -i "${tempPath}" -codec:a libmp3lame -q:a 2 "${outputPath}" -y`, { timeout: 30 });
        fs.unlinkSync(tempPath);
      }
      
      const finalPath = fs.existsSync(outputPath) ? outputPath : tempPath;
      const duration = await this.getAudioDuration(finalPath);
      
      return {
        success: true,
        filePath: finalPath,
        mediaType: 'audio',
        metadata: {
          platform,
          text: text.slice(0, 100),
          duration,
          voice: options.voice || 'default',
        },
        cost: 0,
        processingTime: Date.now() - startTime,
        provider: this.name,
      };
    } catch (error) {
      logger.error('System TTS failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  private getVoiceForGender(voice?: string): string {
    if (!voice) return 'Samantha'; // Default female
    
    const femaleVoices = ['rachel', 'bella', 'nicole', 'domi', 'samantha', 'victoria'];
    const maleVoices = ['josh', 'sam', 'arnold', 'adam', 'alex', 'daniel'];
    
    const lower = voice.toLowerCase();
    
    if (femaleVoices.some(v => lower.includes(v))) return 'Samantha';
    if (maleVoices.some(v => lower.includes(v))) return 'Alex';
    
    return 'Samantha'; // Default
  }
  
  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const output = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
        { encoding: 'utf8' }
      );
      return parseFloat(output.trim()) || 0;
    } catch {
      return 0;
    }
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    const platform = process.platform;
    
    return {
      name: this.name,
      status: 'healthy',
      isFree: this.isFree,
      latency: 0,
    };
  }
}

// ============== PROVIDER REGISTRY ==============
export class TTSProviderRegistry {
  private providers: BaseProvider[] = [];
  
  constructor() {
    this.register(new CoquiTTSProvider());     // Free - try first
    this.register(new ElevenLabsProvider());    // Premium
    this.register(new SystemTTSProvider());     // Free fallback
  }
  
  register(provider: BaseProvider): void {
    this.providers.push(provider);
    logger.info(`Registered TTS provider: ${provider.name} (free: ${provider.isFree})`);
  }
  
  getBestProvider(): BaseProvider {
    // Try free providers first
    const free = this.providers.find(p => p.config.enabled && p.isFree);
    if (free) return free;
    
    // Try enabled provider
    const enabled = this.providers.find(p => p.config.enabled);
    if (enabled) return enabled;
    
    // Fallback to system
    return this.providers[this.providers.length - 1];
  }
  
  getAllProviders(): BaseProvider[] {
    return [...this.providers];
  }
  
  async checkAllHealth(): Promise<ProviderHealth[]> {
    const results = await Promise.all(
      this.providers.map(p => p.healthCheck().catch(e => ({
        name: p.name,
        status: 'down' as const,
        isFree: p.isFree,
        error: (e as Error).message,
      })))
    );
    return results;
  }
}

export const ttsProviders = new TTSProviderRegistry();
