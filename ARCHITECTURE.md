# 🎬 Book-to-Video AI - ИМБА v3.0
## Архитектурный план (Объединённый)

---

## 📦 Архитектура системы

```
book-to-video/
├── backend/
│   ├── src/
│   │   ├── core/                    # Ядро системы
│   │   │   ├── Engine.ts            # Hollywood Engine
│   │   │   ├── QueueManager.ts      # BullMQ менеджер
│   │   │   └── WebSocketServer.ts   # Real-time updates
│   │   │
│   │   ├── services/                # AI Сервисы (плагины)
│   │   │   ├── base/                 # Базовые классы
│   │   │   │   ├── ImageProvider.ts
│   │   │   │   ├── VideoProvider.ts
│   │   │   │   └── TTSProvider.ts
│   │   │   │
│   │   │   ├── image/               # Провайдеры изображений
│   │   │   │   ├── StabilityAI.ts
│   │   │   │   ├── HuggingFace.ts
│   │   │   │   ├── FalAI.ts
│   │   │   │   └── LocalDiffusion.ts  # Fallback
│   │   │   │
│   │   │   ├── video/               # Провайдеры видео
│   │   │   │   ├── StabilityVideo.ts
│   │   │   │   ├── ModelScope.ts
│   │   │   │   └── KenBurns.ts       # Fallback
│   │   │   │
│   │   │   ├── tts/                 # TTS провайдеры
│   │   │   │   ├── ElevenLabs.ts
│   │   │   │   ├── CoquiTTS.ts      # FREE!
│   │   │   │   ├── SystemTTS.ts      # FREE!
│   │   │   │   └── OpenAITTS.ts
│   │   │   │
│   │   │   └── prompts/              # Prompt сервисы
│   │   │       ├── GeminiService.ts
│   │   │       ├── DeepSeekService.ts
│   │   │       └── PromptExpander.ts  # Fallback
│   │   │
│   │   ├── processors/              # Обработчики
│   │   │   ├── SceneProcessor.ts
│   │   │   ├── VideoRenderer.ts
│   │   │   └── AudioMixer.ts
│   │   │
│   │   ├── routes/                  # API
│   │   └── services/                 # Утилиты
│   │
│   └── scripts/                     # Утилиты
│       └── youtube_uploader.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SceneEditor/
│   │   │   ├── PreviewPlayer/
│   │   │   ├── EffectsPanel/
│   │   │   └── Providers/
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useGeneration.ts
│   │   └── stores/
│   └── public/
│
└── docs/
    └── ARCHITECTURE.md
```

---

## 🔌 Система плагинов (Provider Interface)

### Базовый интерфейс провайдера:

```typescript
// src/services/base/Provider.ts
interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
}

interface GenerationOptions {
  prompt?: string;
  width?: number;
  height?: number;
  duration?: number;
  seed?: number;
  // ... provider-specific
}

interface GenerationResult {
  success: boolean;
  filePath?: string;
  url?: string;
  metadata?: Record<string, any>;
  error?: string;
  cost?: number;
  processingTime?: number;
}

abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly type: 'image' | 'video' | 'tts';
  abstract readonly isFree: boolean;
  abstract readonly requiresApiKey: boolean;
  
  config: ProviderConfig;
  
  abstract initialize(config: ProviderConfig): Promise<void>;
  abstract generate(options: GenerationOptions): Promise<GenerationResult>;
  abstract validate(): Promise<boolean>;
  
  // Fallback chain support
  fallbackProvider?: BaseProvider;
  
  async generateWithFallback(options: GenerationOptions): Promise<GenerationResult> {
    try {
      return await this.generate(options);
    } catch (error) {
      if (this.fallbackProvider) {
        return this.fallbackProvider.generateWithFallback(options);
      }
      throw error;
    }
  }
}
```

---

## 🎬 Hollywood Engine

### Prompt Expander:

```typescript
// src/services/prompts/PromptExpander.ts
interface PromptContext {
  sceneText: string;
  mood?: string;
  location?: string;
  characters?: string[];
  style?: string;
}

class HollywoodPromptEngine {
  private llmProvider: LLMProvider;
  
  async expandPrompt(context: PromptContext): Promise<{
    imagePrompt: string;
    videoPrompt: string;
    style: string;
  }> {
    // Use LLM to expand simple text into cinematic prompts
    const systemPrompt = `Ты - профессиональный кинематографический промпт-инженер.
Превращай простые описания в детальные голливудские промпты для AI генерации.

Стиль: ARRI Alexa, 4K, anamorphic lens, shallow DOF, film grain, cinematic color grading

Примеры:
"Кот на коврике" → "Cinematic close-up, fluffy orange cat on vintage rug, soft natural window light, dust particles floating, shallow depth of field, warm color palette, 35mm film grain, professional color grading"
"Грустная девушка" → "Emotional portrait, young woman with tear, moody lighting, soft blue tones, rain outside window, shallow focus, cinematic 4K, dramatic color grading, film grain overlay"`;

    const response = await this.llmProvider.complete({
      system: systemPrompt,
      user: `Сцена: ${context.sceneText}
Настроение: ${context.mood || 'нейтральное'}
Локация: ${context.location || 'не указана'}
Персонажи: ${context.characters?.join(', ') || 'нет'}`,
    });
    
    return this.parseLLMResponse(response);
  }
  
  // Fallback without LLM
  expandPromptLocally(context: PromptContext): PromptExpander {
    // Использует шаблоны и ключевые слова
    return new LocalPromptExpander();
  }
}
```

---

## 🔄 Queue System (BullMQ)

```typescript
// src/core/QueueManager.ts
interface JobData {
  type: 'image' | 'video' | 'tts' | 'render';
  sceneId: string;
  projectId: string;
  provider: string;
  options: GenerationOptions;
  priority?: number;
}

interface JobResult {
  success: boolean;
  mediaId?: string;
  filePath?: string;
  error?: string;
}

class QueueManager {
  private imageQueue: Queue<JobData>;
  private videoQueue: Queue<JobData>;
  private ttsQueue: Queue<JobData>;
  private renderQueue: Queue<JobData>;
  
  async addJob(data: JobData, priority = 5): Promise<Job> {
    const queue = this.getQueueForType(data.type);
    
    return queue.add(data.type, data, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
  
  // Real-time progress via WebSocket
  onProgress(jobId: string, callback: (progress: number) => void): void {
    // Forward BullMQ events to WebSocket
  }
}
```

---

## 🌐 WebSocket Real-Time Updates

```typescript
// src/core/WebSocketServer.ts
interface WSEvents {
  'job:started': { jobId: string; type: string };
  'job:progress': { jobId: string; progress: number };
  'job:completed': { jobId: string; result: JobResult };
  'job:failed': { jobId: string; error: string };
  'project:updated': { projectId: string };
}

class WebSocketServer {
  private wss: WebSocketServer;
  
  broadcast<K extends keyof WSEvents>(
    event: K, 
    data: WSEvents[K]
  ): void {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event, data }));
      }
    });
  }
  
  // Room-based: subscribe to specific project
  joinRoom(client: WebSocket, projectId: string): void {
    // Redis Pub/Sub for scaling
  }
}
```

---

## 🎨 FFmpeg Post-Processing Pipeline

```typescript
// src/processors/VideoRenderer.ts
interface RenderOptions {
  resolution: '720p' | '1080p' | '4k' | 'vertical_720' | 'vertical_1080';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  format: 'mp4' | 'webm';
  preset: CinematicPreset;
}

interface CinematicPreset {
  name: string;
  filters: FFmpegFilter[];
  crf: number;
  preset: 'ultrafast' | 'fast' | 'slow' | 'veryslow';
}

const PRESETS = {
  cinematic: {
    name: 'Hollywood Cinema',
    filters: [
      // Color grading
      'colorbalance=rs=0.1:gs=0.05:bs=-0.1',
      // Contrast & saturation
      'eq=saturation=0.95:contrast=1.1:brightness=0.02',
      // Vignette
      'vignette=angle=0.5',
      // Film grain
      'noise=alls=15:allf=t',
    ],
    crf: 18,
    preset: 'slow',
  },
  anime: {
    name: 'Anime Style',
    filters: [
      'saturation=1.2',
      'contrast=1.1',
      'unsharp=3:1.5:0.5',
    ],
    crf: 20,
    preset: 'medium',
  },
  documentary: {
    name: 'Documentary',
    filters: [
      'eq=brightness=0.05:contrast=1.05:saturation=0.9',
      'colorbalance=rs=0.02:gs=0.02:bs=0.02',
    ],
    crf: 22,
    preset: 'fast',
  },
};
```

---

## 📊 Provider Priority System

```typescript
// src/core/ProviderRegistry.ts
interface ProviderRegistry {
  // Register providers
  register(provider: BaseProvider): void;
  
  // Get best available provider
  getBestProvider(type: ProviderType): BaseProvider;
  
  // Get fallback chain
  getFallbackChain(type: ProviderType): BaseProvider[];
  
  // Health check all providers
  async checkHealth(): Promise<ProviderStatus[]>;
}

const DEFAULT_CHAINS = {
  image: [
    { provider: 'stability-sdxl', priority: 1 },
    { provider: 'huggingface-sdxl', priority: 2 },
    { provider: 'fal-flux', priority: 3 },
    { provider: 'local-diffusion', priority: 99, fallback: true },
  ],
  video: [
    { provider: 'stability-svd', priority: 1 },
    { provider: 'huggingface-modelscope', priority: 2 },
    { provider: 'ken-burns', priority: 99, fallback: true },
  ],
  tts: [
    { provider: 'coqui-xtts', priority: 1, free: true },
    { provider: 'elevenlabs', priority: 2 },
    { provider: 'system-tts', priority: 99, free: true },
  ],
  prompts: [
    { provider: 'gemini', priority: 1 },
    { provider: 'deepseek', priority: 2 },
    { provider: 'local-expander', priority: 99, fallback: true },
  ],
};
```

---

## 🔄 Middleware Pipeline

```typescript
// src/core/Pipeline.ts
interface PipelineStage {
  name: string;
  processor: (context: PipelineContext) => Promise<void>;
  onError?: (error: Error) => void;
}

class GenerationPipeline {
  private stages: PipelineStage[] = [
    { name: 'validate', processor: this.validate.bind(this) },
    { name: 'expand-prompt', processor: this.expandPrompt.bind(this) },
    { name: 'generate-image', processor: this.generateImage.bind(this) },
    { name: 'generate-video', processor: this.generateVideo.bind(this) },
    { name: 'generate-tts', processor: this.generateTTS.bind(this) },
    { name: 'mix-audio', processor: this.mixAudio.bind(this) },
    { name: 'apply-filters', processor: this.applyFilters.bind(this) },
    { name: 'render-final', processor: this.renderFinal.bind(this) },
  ];
  
  async execute(context: PipelineContext): Promise<PipelineResult> {
    for (const stage of this.stages) {
      try {
        await stage.processor(context);
        // Emit progress via WebSocket
        wsServer.emit('job:progress', { 
          jobId: context.jobId, 
          stage: stage.name,
          progress: this.calculateProgress() 
        });
      } catch (error) {
        if (stage.onError) {
          await stage.onError(error);
        } else {
          throw error;
        }
      }
    }
  }
}
```
