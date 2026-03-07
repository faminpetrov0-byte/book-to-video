import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  ai: {
    huggingface: {
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      imageModel: 'stabilityai/stable-diffusion-xl-base-1.0',
      svdModel: 'stabilityai/stable-video-diffusion-img2vid-xt',
    },
    fal: {
      apiKey: process.env.FAL_API_KEY || '',
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      defaultVoice: 'Rachel',
    },
  },

  // TTS Configuration
  tts: {
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      defaultVoice: 'Rachel',
    },
    coqui: {
      enabled: process.env.COQUI_ENABLED === 'true',
      model: process.env.COQUI_MODEL || 'xtts_v2',
    },
  },

  upload: {
    maxSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10),
    allowedTextFormats: ['txt', 'epub', 'pdf', 'docx'],
    allowedAudioFormats: ['mp3', 'wav'],
    dir: path.resolve(__dirname, '..', 'uploads'),
  },

  output: {
    dir: path.resolve(__dirname, '..', 'output'),
  },

  limits: {
    maxScenesPerProject: parseInt(process.env.MAX_SCENES_PER_PROJECT || '30', 10),
    minSceneDuration: 5,
    maxSceneDuration: 30,
    maxTotalDuration: 180, // 3 minutes
  },

  ffmpeg: {
    path: process.env.FFMPEG_PATH || 'ffmpeg',
  },
} as const;
