import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { config } from '../config';
import logger from '../utils/logger';
import { AIServiceError, ValidationError } from '../utils/errors';
import prisma from '../db';
import { contentHash } from '../utils/hash';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

/**
 * GET /api/ai/models - Get available free AI models
 */
router.get('/ai/models', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const models = [
      // Image Generation (Free)
      {
        id: 'sdxl-base',
        name: 'Stable Diffusion XL Base',
        type: 'image',
        provider: 'huggingface',
        status: config.ai.huggingface.apiKey ? 'available' : 'fallback',
        quality: 'high',
        cost: 'free',
      },
      {
        id: 'sdxl-lightning',
        name: 'SDXL Lightning',
        type: 'image',
        provider: 'huggingface',
        status: config.ai.huggingface.apiKey ? 'available' : 'fallback',
        quality: 'medium',
        cost: 'free',
      },
      {
        id: 'flux-schnell',
        name: 'FLUX Schnell',
        type: 'image',
        provider: 'fal',
        status: config.ai.fal.apiKey ? 'available' : 'fallback',
        quality: 'high',
        cost: 'free',
      },
      {
        id: 'dalle-3',
        name: 'DALL-E 3',
        type: 'image',
        provider: 'openai',
        status: 'requires_key',
        quality: 'high',
        cost: 'paid',
      },
      // Video Generation (Free)
      {
        id: 'svd-xt',
        name: 'Stable Video Diffusion XT',
        type: 'video',
        provider: 'huggingface',
        status: config.ai.huggingface.apiKey ? 'available' : 'fallback',
        quality: 'medium',
        cost: 'free',
      },
      {
        id: 'modelscope',
        name: 'ModelScope T2V',
        type: 'video',
        provider: 'huggingface',
        status: config.ai.huggingface.apiKey ? 'available' : 'fallback',
        quality: 'low',
        cost: 'free',
      },
      // TTS (Free)
      {
        id: 'elevenlabs-rachel',
        name: 'Rachel (ElevenLabs)',
        type: 'tts',
        provider: 'elevenlabs',
        status: config.tts.elevenlabs.apiKey ? 'available' : 'fallback',
        quality: 'high',
        cost: 'free',
      },
      {
        id: 'coqui-xtts',
        name: 'Coqui XTTS v2',
        type: 'tts',
        provider: 'coqui',
        status: 'available',
        quality: 'high',
        cost: 'free',
      },
      {
        id: 'system-tts',
        name: 'System TTS',
        type: 'tts',
        provider: 'system',
        status: 'available',
        quality: 'low',
        cost: 'free',
      },
    ];

    res.json(models);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/presets - Get cinematic presets for video generation
 */
router.get('/ai/presets', async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    const presets = [
      {
        id: 'cinematic',
        name: 'Cinematic Hollywood',
        description: 'Кинематографический стиль с цветокоррекцией',
        imagePrompt: 'cinematic, film grain, anamorphic lens, 4k, professional color grading',
        videoEffects: {
          duration: 5,
          fps: 24,
          transitions: 'fade',
          filters: ['colorbalance=rs=0.1:gs=0.05:bs=-0.1', 'eq=saturation=0.95:contrast=1.1', 'noise=alls=15'],
        },
      },
      {
        id: 'anime',
        name: 'Anime Style',
        description: 'Японская анимация',
        imagePrompt: 'anime style, manga, vibrant colors, crisp lines, studio ghibli',
        videoEffects: {
          duration: 5,
          fps: 30,
          transitions: 'slide',
          filters: ['saturation=1.2', 'contrast=1.1'],
        },
      },
      {
        id: 'documentary',
        name: 'Documentary',
        description: 'Документальный стиль',
        imagePrompt: 'documentary style, realistic, natural lighting, bokeh, shallow depth',
        videoEffects: {
          duration: 8,
          fps: 30,
          transitions: 'dissolve',
          filters: ['colorcorrect=gamma=1.1', 'eq=brightness=0.05'],
        },
      },
      {
        id: 'epic',
        name: 'Epic Fantasy',
        description: 'Эпическое фэнтези',
        imagePrompt: 'epic fantasy, dramatic lighting, moody, detailed, 8k, unreal engine render',
        videoEffects: {
          duration: 5,
          fps: 24,
          transitions: 'zoom',
          filters: ['vignette=angle=0.5', 'colorbalance=rs=0.15:gs=0.1:bs=-0.05'],
        },
      },
      {
        id: 'vintage',
        name: 'Vintage Film',
        description: 'Ретро эффект',
        imagePrompt: 'vintage photo, 1970s, film grain, warm tones, slight blur',
        videoEffects: {
          duration: 6,
          fps: 24,
          transitions: 'fade',
          filters: ['colorchannelmixer=0.9:0.1:0.1:0.1:0.9:0.1:0.1:0.1:0.8', 'noise=alls=25', 'eq=saturation=0.8'],
        },
      },
      {
        id: 'minimal',
        name: 'Minimalist',
        description: 'Минимализм',
        imagePrompt: 'minimalist, clean, simple, modern, white background, clean lines',
        videoEffects: {
          duration: 8,
          fps: 30,
          transitions: 'fade',
          filters: ['eq=saturation=0.7:contrast=1.05'],
        },
      },
    ];

    _res.json(presets);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/music - Get free background music options
 */
router.get('/ai/music', async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    // Free music sources - in production, would integrate with free music APIs
    const musicTracks = [
      {
        id: 'cinematic-ambient',
        name: 'Cinematic Ambient',
        mood: 'epic',
        duration: 180,
        source: 'local',
        url: '/assets/music/cinematic-ambient.mp3',
      },
      {
        id: 'piano-reflection',
        name: 'Piano Reflection',
        mood: 'calm',
        duration: 120,
        source: 'local',
        url: '/assets/music/piano-reflection.mp3',
      },
      {
        id: 'epic-orchestra',
        name: 'Epic Orchestra',
        mood: 'epic',
        duration: 240,
        source: 'local',
        url: '/assets/music/epic-orchestra.mp3',
      },
      {
        id: 'soft-pad',
        name: 'Soft Pad',
        mood: 'peaceful',
        duration: 180,
        source: 'local',
        url: '/assets/music/soft-pad.mp3',
      },
      {
        id: 'none',
        name: 'Без музыки',
        mood: 'none',
        duration: 0,
        source: 'none',
        url: null,
      },
    ];

    _res.json(musicTracks);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/generate/advanced - Advanced generation with preset
 */
router.post(
  '/ai/generate/advanced',
  [
    body('sceneId').isString().notEmpty(),
    body('preset').optional().isString(),
    body('model').optional().isString(),
    body('duration').optional().isInt({ min: 3, max: 30 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const { sceneId, preset, model, duration = 5 } = req.body;

      const scene = await prisma.scene.findUnique({
        where: { id: sceneId },
      });

      if (!scene) {
        throw new AIServiceError('Scene not found');
      }

      // Get preset if specified
      let imagePrompt = scene.imagePrompt || scene.textContent;
      let videoSettings = { duration, fps: 24, filters: [] };

      if (preset) {
        const presets: Record<string, any> = {
          cinematic: {
            filters: ['colorbalance=rs=0.1:gs=0.05:bs=-0.1', 'eq=saturation=0.95:contrast=1.1', 'noise=alls=15'],
            fps: 24,
          },
          anime: {
            filters: ['saturation=1.2', 'contrast=1.1'],
            fps: 30,
          },
          documentary: {
            filters: ['colorcorrect=gamma=1.1'],
            fps: 30,
          },
          epic: {
            filters: ['vignette=angle=0.5', 'colorbalance=rs=0.15'],
            fps: 24,
          },
        };

        if (presets[preset]) {
          videoSettings = { ...videoSettings, ...presets[preset] };
        }
      }

      logger.info('Advanced generation started', { sceneId, preset, model, duration });

      // Return the settings - actual generation would be triggered separately
      res.json({
        sceneId,
        settings: {
          preset,
          model,
          imagePrompt,
          video: videoSettings,
        },
        message: 'Settings applied. Use /api/generate endpoints to generate.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ai/effects/apply - Apply video effects to rendered video
 */
router.post(
  '/effects/apply',
  [
    body('videoId').isString().notEmpty(),
    body('effects').isArray(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const { videoId, effects } = req.body;

      const video = await prisma.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw new ValidationError('Video not found');
      }

      if (!fs.existsSync(video.filePath)) {
        throw new ValidationError('Video file not found');
      }

      const outputPath = video.filePath.replace('.mp4', `_effects_${Date.now()}.mp4`);

      // Build FFmpeg filter chain
      const filterParts: string[] = [];

      for (const effect of effects) {
        switch (effect.type) {
          case 'colorgrade':
            filterParts.push(`colorbalance=rs=${effect.rs || 0}:gs=${effect.gs || 0}:bs=${effect.bs || 0}`);
            break;
          case 'vignette':
            filterParts.push(`vignette=angle=${effect.angle || 0.5}`);
            break;
          case 'noise':
            filterParts.push(`noise=alls=${effect.intensity || 15}:allf=${effect.type || 't'}`);
            break;
          case 'blur':
            filterParts.push(`boxblur=${effect.radius || 2}:1`);
            break;
          case 'sharpen':
            filterParts.push(`unsharp=5:5:1.0:5:5:0.0`);
            break;
          case 'fadein':
            filterParts.push(`fade=t=in:st=0:d=${effect.duration || 1}`);
            break;
          case 'fadeout':
            const duration = video.duration || 10;
            filterParts.push(`fade=t=out:st=${duration - (effect.duration || 1)}:d=${effect.duration || 1}`);
            break;
        }
      }

      if (filterParts.length === 0) {
        throw new ValidationError('No valid effects specified');
      }

      const filterChain = filterParts.join(',');

      // Apply effects
      execSync(
        `ffmpeg -i "${video.filePath}" -vf "${filterChain}" -c:a copy "${outputPath}" -y`,
        { timeout: 120 }
      );

      // Update video record
      await prisma.video.update({
        where: { id: videoId },
        data: {
          filePath: outputPath,
          fileSize: fs.statSync(outputPath).size,
        },
      });

      logger.info('Effects applied', { videoId, effects });

      res.json({
        success: true,
        videoId,
        outputPath,
        downloadUrl: `/output/final/${path.basename(outputPath)}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ai/music/add - Add background music to video
 */
router.post(
  '/music/add',
  [
    body('videoId').isString().notEmpty(),
    body('musicTrackId').isString().notEmpty(),
    body('volume').optional().isFloat({ min: 0, max: 1 }),
    body('fadeIn').optional().isFloat({ min: 0, max: 10 }),
    body('fadeOut').optional().isFloat({ min: 0, max: 10 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const { videoId, musicTrackId, volume = 0.3, fadeIn = 2, fadeOut = 2 } = req.body;

      const video = await prisma.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw new ValidationError('Video not found');
      }

      // For now, return mock - in production would mix audio tracks
      if (musicTrackId === 'none') {
        res.json({
          success: true,
          message: 'Background music disabled',
        });
        return;
      }

      // Mock response - would implement actual audio mixing
      logger.info('Background music would be added', { videoId, musicTrackId, volume });

      res.json({
        success: true,
        message: 'Background music feature coming soon',
        note: 'This requires audio mixing implementation',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
