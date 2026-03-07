import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../db';
import { config } from '../config';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

/**
 * GET /api/projects/:projectId/scenes - List scenes for a project
 */
router.get('/projects/:projectId/scenes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scenes = await prisma.scene.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { orderIndex: 'asc' },
      include: { generatedMedia: true },
    });
    res.json(scenes);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/scenes - Add a new scene
 */
router.post(
  '/projects/:projectId/scenes',
  [
    body('textContent').isString().isLength({ min: 1, max: 2000 }),
    body('imagePrompt').optional().isString(),
    body('duration').optional().isFloat({ min: 5, max: 30 }),
    body('title').optional().isString(),
    body('mood').optional().isString(),
    body('location').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
        include: { _count: { select: { scenes: true } } },
      });

      if (!project) throw new NotFoundError('Project', req.params.projectId);

      if (project._count.scenes >= config.limits.maxScenesPerProject) {
        throw new ValidationError(`Maximum ${config.limits.maxScenesPerProject} scenes per project`);
      }

      // Get next order index
      const maxOrder = await prisma.scene.findFirst({
        where: { projectId: req.params.projectId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });

      const scene = await prisma.scene.create({
        data: {
          projectId: req.params.projectId,
          orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
          title: req.body.title || `Scene ${(maxOrder?.orderIndex ?? 0) + 2}`,
          textContent: req.body.textContent,
          imagePrompt: req.body.imagePrompt || req.body.textContent,
          duration: req.body.duration || 10,
          mood: req.body.mood || 'neutral',
          location: req.body.location || 'Unspecified',
          characters: JSON.stringify(req.body.characters || []),
          status: 'ready',
        },
      });

      logger.info('Scene added', { sceneId: scene.id, projectId: req.params.projectId });
      res.status(201).json(scene);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/scenes/:id - Update a scene
 */
router.put(
  '/scenes/:id',
  [
    body('textContent').optional().isString().isLength({ min: 1, max: 2000 }),
    body('imagePrompt').optional().isString(),
    body('duration').optional().isFloat({ min: 5, max: 30 }),
    body('title').optional().isString(),
    body('mood').optional().isString(),
    body('location').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const scene = await prisma.scene.findUnique({ where: { id: req.params.id } });
      if (!scene) throw new NotFoundError('Scene', req.params.id);

      const updated = await prisma.scene.update({
        where: { id: req.params.id },
        data: {
          textContent: req.body.textContent ?? scene.textContent,
          imagePrompt: req.body.imagePrompt ?? scene.imagePrompt,
          duration: req.body.duration ?? scene.duration,
          title: req.body.title ?? scene.title,
          mood: req.body.mood ?? scene.mood,
          location: req.body.location ?? scene.location,
          characters: req.body.characters ? JSON.stringify(req.body.characters) : scene.characters,
        },
        include: { generatedMedia: true },
      });

      logger.info('Scene updated', { sceneId: req.params.id });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/scenes/:id
 */
router.delete('/scenes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scene = await prisma.scene.findUnique({ where: { id: req.params.id } });
    if (!scene) throw new NotFoundError('Scene', req.params.id);

    await prisma.scene.delete({ where: { id: req.params.id } });
    logger.info('Scene deleted', { sceneId: req.params.id });
    res.json({ message: 'Scene deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/projects/:projectId/scenes/reorder - Reorder scenes
 */
router.put(
  '/projects/:projectId/scenes/reorder',
  [body('sceneIds').isArray({ min: 1 })],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('sceneIds must be a non-empty array');
      }

      const sceneIds: string[] = req.body.sceneIds;

      // Update order in a transaction
      await prisma.$transaction(
        sceneIds.map((id, index) =>
          prisma.scene.update({
            where: { id },
            data: { orderIndex: index },
          })
        )
      );

      const scenes = await prisma.scene.findMany({
        where: { projectId: req.params.projectId },
        orderBy: { orderIndex: 'asc' },
        include: { generatedMedia: true },
      });

      logger.info('Scenes reordered', { projectId: req.params.projectId });
      res.json(scenes);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
