/**
 * Image Generation Providers
 * Stable Diffusion XL, HuggingFace, FLUX, Local Fallback
 */

import { BaseProvider, GenerationOptions, GenerationResult, ProviderConfig, ProviderHealth } from './base/BaseProvider';
import { config } from '../../config';
import fs from 'fs';
import path from 'path';
import { contentHash } from '../../utils/hash';
import logger from '../../utils/logger';

// ============== STABILITY AI ==============
export class StabilityAIProvider extends BaseProvider {
  readonly name = 'Stability AI (SDXL)';
  readonly type = 'image' = 'image';
  readonly isFree = false;
  readonly requiresApiKey = true;
  readonly defaultModel = 'stable-diffusion-xl-1024-v1-0';
  
  private apiKey: string;
  private engineId: string;
  
  constructor(config?: ProviderConfig) {
    super(config);
    this.apiKey = config?.apiKey || config.ai?.huggingface?.apiKey || '';
    this.engineId = this.defaultModel;
  }
  
  async initialize(cfg: ProviderConfig): Promise<void> {
    await super.initialize(cfg);
    this.apiKey = cfg.apiKey || process.env.STABILITY_API_KEY || '';
  }
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    
    // Check API key
    if (!this.apiKey) {
      throw new Error('Stability AI API key required');
    }
    
    const width = options.width || 1024;
    const height = options.height || 1024;
    const prompt = options.prompt || 'a beautiful landscape';
    
    try {
      // Using Stability AI's REST API
      const response = await this.fetchWithTimeout(
        `https://api.stability.ai/v1/generation/${this.engineId}/text-to-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            text_prompts: [
              {
                text: prompt,
                weight: 1,
              },
            ],
            cfg_scale: 7,
            height,
            width,
            steps: 30,
            samples: 1,
          }),
        },
        120000
      );
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stability AI error: ${response.status} - ${error}`);
      }
      
      const data = await response.json() as any;
      
      if (!data.artifacts || !data.artifacts[0]) {
        throw new Error('No image generated');
      }
      
      // Save image
      const outputDir = path.join(config.output.dir, 'images');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const hash = await contentHash(prompt + Date.now());
      const outputPath = path.join(outputDir, `${hash}.png`);
      
      const base64Data = data.artifacts[0].base64;
      fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
      
      return {
        success: true,
        filePath: outputPath,
        mediaType: 'image',
        metadata: {
          model: this.engineId,
          width,
          height,
          prompt,
          seed: data.artifacts[0].seed,
        },
        cost: 0.01, // Approximate cost
        processingTime: Date.now() - startTime,
        provider: this.name,
      };
    } catch (error) {
      logger.error('Stability AI generation failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { name: this.name, status: 'down', isFree: this.isFree, error: 'No API key' };
    }
    
    try {
      const start = Date.now();
      await this.fetchWithTimeout(
        'https://api.stability.ai/v1/user/balance',
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
        5000
      );
      
      return {
        name: this.name,
        status: 'healthy',
        latency: Date.now() - start,
        isFree: this.isFree,
      };
    } catch (error) {
      return {
        name: this.name,
        status: 'down',
        isFree: this.isFree,
        error: (error as Error).message,
      };
    }
  }
}

// ============== HUGGINGFACE ==============
export class HuggingFaceProvider extends BaseProvider {
  readonly name = 'HuggingFace (SDXL)';
  readonly type = 'image' = 'image';
  readonly isFree = true;
  readonly requiresApiKey = true;
  readonly defaultModel = 'stabilityai/stable-diffusion-xl-base-1.0';
  
  private apiKey: string;
  private model: string;
  
  constructor(config?: ProviderConfig) {
    super(config);
    this.apiKey = config?.apiKey || process.env.HUGGINGFACE_API_KEY || '';
    this.model = this.defaultModel;
  }
  
  async initialize(cfg: ProviderConfig): Promise<void> {
    await super.initialize(cfg);
    this.apiKey = cfg.apiKey || process.env.HUGGINGFACE_API_KEY || '';
    this.model = cfg.baseUrl || this.defaultModel;
  }
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const prompt = options.prompt || 'a beautiful image';
    const width = options.width || 1024;
    const height = options.height || 1024;
    
    // Check API key - can work without for limited use
    const hasKey = !!this.apiKey;
    
    try {
      // Use HuggingFace Inference API
      const response = await this.fetchWithTimeout(
        `https://api-inference.huggingface.co/models/${this.model}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(hasKey && { Authorization: `Bearer ${this.apiKey}` }),
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              width,
              height,
              num_inference_steps: 30,
              guidance_scale: 7.5,
            },
          }),
        },
        180000
      );
      
      if (!response.ok) {
        const error = await response.text();
        // Fallback to local generation if API fails
        throw new Error(`HuggingFace error: ${response.status}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Save image
      const outputDir = path.join(config.output.dir, 'images');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const hash = await contentHash(prompt + Date.now());
      const outputPath = path.join(outputDir, `${hash}.png`);
      
      fs.writeFileSync(outputPath, buffer);
      
      return {
        success: true,
        filePath: outputPath,
        mediaType: 'image',
        metadata: {
          model: this.model,
          width,
          height,
          prompt,
        },
        cost: 0,
        processingTime: Date.now() - startTime,
        provider: this.name,
      };
    } catch (error) {
      logger.error('HuggingFace generation failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { name: this.name, status: 'degraded', isFree: this.isFree, error: 'No API key (limited rate)' };
    }
    
    try {
      const start = Date.now();
      await this.fetchWithTimeout(
        `https://api-inference.huggingface.co/models/${this.model}`,
        { method: 'HEAD' },
        5000
      );
      
      return {
        name: this.name,
        status: 'healthy',
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

// ============== LOCAL FALLBACK (SVG) ==============
export class LocalImageProvider extends BaseProvider {
  readonly name = 'Local (SVG Placeholder)';
  readonly type = 'image' = 'image';
  readonly isFree = true;
  readonly requiresApiKey = false;
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const prompt = options.prompt || 'Placeholder image';
    const width = options.width || 1024;
    const height = options.height || 1024;
    
    // Generate SVG placeholder
    const svg = this.generatePlaceholderSVG(prompt, width, height);
    
    // Save SVG
    const outputDir = path.join(config.output.dir, 'images');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const hash = await contentHash(prompt + Date.now());
    const outputPath = path.join(outputDir, `${hash}.svg`);
    
    fs.writeFileSync(outputPath, svg);
    
    logger.info('Local placeholder image generated', { prompt, outputPath });
    
    return {
      success: true,
      filePath: outputPath,
      mediaType: 'image',
      metadata: {
        width,
        height,
        prompt,
        format: 'svg',
      },
      cost: 0,
      processingTime: Date.now() - startTime,
      provider: this.name,
      cached: false,
    };
  }
  
  private generatePlaceholderSVG(prompt: string, width: number, height: number): string {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <rect width="100%" height="100%" fill="url(#grad)"/>
  
  <text x="50%" y="45%" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-size="32" font-weight="bold" filter="url(#glow)">
    Book-to-Video AI
  </text>
  
  <text x="50%" y="55%" text-anchor="middle" fill="rgba(255,255,255,0.7)" 
        font-family="Arial, sans-serif" font-size="18">
    ${this.escapeXml(prompt.slice(0, 50))}${prompt.length > 50 ? '...' : ''}
  </text>
  
  <text x="50%" y="85%" text-anchor="middle" fill="rgba(255,255,255,0.5)" 
        font-family="Arial, sans-serif" font-size="14">
    ${width}x${height} • Generated with AI
  </text>
</svg>`;
  }
  
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    return {
      name: this.name,
      status: 'healthy',
      isFree: this.isFree,
    };
  }
}

// ============== PROVIDER REGISTRY ==============
export class ImageProviderRegistry {
  private providers: BaseProvider[] = [];
  
  constructor() {
    // Register default providers in priority order
    this.register(new HuggingFaceProvider());
    this.register(new StabilityAIProvider());
    this.register(new LocalImageProvider());
  }
  
  register(provider: BaseProvider): void {
    this.providers.push(provider);
    // Sort by priority (will be set via config)
    logger.info(`Registered image provider: ${provider.name}`);
  }
  
  getBestProvider(): BaseProvider {
    // Return first available (non-local) provider
    const available = this.providers.find(p => p.config.enabled || (!p.requiresApiKey && p.isFree));
    return available || this.providers[this.providers.length - 1];
  }
  
  getProvider(name: string): BaseProvider | undefined {
    return this.providers.find(p => p.name.includes(name));
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

export const imageProviders = new ImageProviderRegistry();
