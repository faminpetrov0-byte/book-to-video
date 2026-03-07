import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../db';
import { NotFoundError, ValidationError } from '../utils/errors';
import { getAvailableVoices } from '../services/ttsService';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/voices - Get available TTS voices
 */
router.get('/voices', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const voices = await getAvailableVoices();
    res.json(voices);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/characters - List characters in a project
 */
router.get('/projects/:projectId/characters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const characters = await prisma.character.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { name: 'asc' },
    });
    res.json(characters);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/characters - Add a character
 */
router.post(
  '/projects/:projectId/characters',
  [
    body('name').isString().notEmpty().withMessage('Character name is required'),
    body('voiceId').optional().isString(),
    body('voiceName').optional().isString(),
    body('description').optional().isString(),
    body('color').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
      });

      if (!project) throw new NotFoundError('Project', req.params.projectId);

      const character = await prisma.character.create({
        data: {
          projectId: req.params.projectId,
          name: req.body.name,
          voiceId: req.body.voiceId || null,
          voiceName: req.body.voiceName || req.body.voiceId || 'Rachel',
          description: req.body.description || null,
          color: req.body.color || '#7c5cff',
        },
      });

      logger.info('Character added', { characterId: character.id, name: character.name });
      res.status(201).json(character);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/characters/:id - Update a character
 */
router.put(
  '/characters/:id',
  [
    body('name').optional().isString().notEmpty(),
    body('voiceId').optional().isString(),
    body('voiceName').optional().isString(),
    body('description').optional().isString(),
    body('color').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const character = await prisma.character.findUnique({
        where: { id: req.params.id },
      });

      if (!character) throw new NotFoundError('Character', req.params.id);

      const updated = await prisma.character.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name || character.name,
          voiceId: req.body.voiceId ?? character.voiceId,
          voiceName: req.body.voiceName ?? character.voiceName,
          description: req.body.description ?? character.description,
          color: req.body.color ?? character.color,
        },
      });

      logger.info('Character updated', { characterId: req.params.id });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/characters/:id - Delete a character
 */
router.delete('/characters/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
    });

    if (!character) throw new NotFoundError('Character', req.params.id);

    await prisma.character.delete({
      where: { id: req.params.id },
    });

    logger.info('Character deleted', { characterId: req.params.id });
    res.json({ message: 'Character deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/projects/:projectId/default-voice - Set default voice for project
 */
router.put(
  '/projects/:projectId/default-voice',
  [body('voice').isString().notEmpty()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
      });

      if (!project) throw new NotFoundError('Project', req.params.projectId);

      const updated = await prisma.project.update({
        where: { id: req.params.projectId },
        data: { defaultVoice: req.body.voice },
      });

      res.json({ defaultVoice: updated.defaultVoice });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/batch/generate - Batch generate for multiple scenes
 */
router.post(
  '/batch/generate',
  [
    body('sceneIds').isArray({ min: 1 }),
    body('type').isIn(['image', 'video', 'tts', 'all']),
    body('parallel').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const { sceneIds, type, parallel = false } = req.body;
      
      // Get scenes
      const scenes = await prisma.scene.findMany({
        where: { id: { in: sceneIds } },
        include: { 
          project: { include: { characters: true } },
          generatedMedia: true 
        },
      });

      if (scenes.length === 0) {
        throw new ValidationError('No scenes found');
      }

      const project = scenes[0].project;
      const results: { sceneId: string; status: string; error?: string }[] = [];

      if (parallel) {
        // Parallel processing
        const promises = scenes.map(async (scene) => {
          try {
            // This would trigger generation services
            // For now, return status
            return { sceneId: scene.id, status: 'queued', error: null };
          } catch (err) {
            return { sceneId: scene.id, status: 'error', error: (err as Error).message };
          }
        });
        
        const batchResults = await Promise.allSettled(promises);
        batchResults.forEach((r) => {
          if (r.status === 'fulfilled') {
            results.push(r.value);
          } else {
            results.push({ sceneId: 'unknown', status: 'error', error: r.reason.message });
          }
        });
      } else {
        // Sequential processing
        for (const scene of scenes) {
          try {
            // Queue generation job
            results.push({ sceneId: scene.id, status: 'queued', error: null });
          } catch (err) {
            results.push({ sceneId: scene.id, status: 'error', error: (err as Error).message });
          }
        }
      }

      logger.info('Batch generation started', { 
        projectId: project.id, 
        sceneCount: sceneIds.length, 
        type 
      });

      res.json({
        jobId: `batch-${Date.now()}`,
        projectId: project.id,
        totalScenes: sceneIds.length,
        type,
        parallel,
        results,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/batch/:jobId - Get batch job status
 */
router.get('/batch/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real implementation, we'd track job status in Redis/DB
    // For MVP, return mock status
    res.json({
      jobId: req.params.jobId,
      status: 'processing',
      progress: 0,
      completed: 0,
      total: 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/export - Export project as ZIP
 */
router.post('/projects/:projectId/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        scenes: {
          orderBy: { orderIndex: 'asc' },
          include: { generatedMedia: true },
        },
        videos: { orderBy: { createdAt: 'desc' } },
        characters: true,
      },
    });

    if (!project) throw new NotFoundError('Project', req.params.projectId);

    // Return export manifest - frontend will handle actual ZIP creation
    const exportData = {
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        createdAt: project.createdAt,
      },
      scenes: project.scenes.map((s) => ({
        id: s.id,
        orderIndex: s.orderIndex,
        title: s.title,
        textContent: s.textContent,
        imagePrompt: s.imagePrompt,
        duration: s.duration,
        mood: s.mood,
        location: s.location,
        media: s.generatedMedia.map((m) => ({
          id: m.id,
          type: m.mediaType,
          path: m.filePath,
          status: m.status,
        })),
      })),
      characters: project.characters,
      videos: project.videos.map((v) => ({
        id: v.id,
        format: v.format,
        resolution: v.duration,
        filePath: v.filePath,
        createdAt: v.createdAt,
      })),
    };

    logger.info('Project export prepared', { projectId: project.id });
    res.json(exportData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/webhooks - Register webhook for project events
 */
router.post(
  '/webhooks',
  [
    body('url').isURL(),
    body('events').isArray({ min: 1 }),
    body('projectId').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const { url, events, projectId } = req.body;
      
      // Store webhook (in real app, save to DB)
      const webhook = {
        id: `wh-${Date.now()}`,
        url,
        events,
        projectId: projectId || null,
        createdAt: new Date().toISOString(),
      };

      logger.info('Webhook registered', { webhookId: webhook.id, url, events });
      res.status(201).json(webhook);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/webhooks/:id - Delete webhook
 */
router.delete('/webhooks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Webhook deleted', { webhookId: req.params.id });
    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks - List webhooks
 */
router.get('/webhooks', async (_req: Request, res: Response) => {
  res.json([]);
});

export default router;
