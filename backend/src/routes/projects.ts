import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../db';
import { uploadFile } from '../middleware/upload';
import { extractText, extractTextFromAudio } from '../services/textExtractor';
import { analyzeAndSplitText } from '../services/sceneAnalyzer';
import { config } from '../config';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import path from 'path';

const router = Router();

// Default user ID for MVP (no auth)
const DEFAULT_USER_ID = 'default-user';

/**
 * Ensure default user exists
 */
async function ensureDefaultUser() {
  const existing = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } });
  if (!existing) {
    await prisma.user.create({
      data: {
        id: DEFAULT_USER_ID,
        email: 'demo@book-to-video.local',
        name: 'Demo User',
        password: 'not-used-in-mvp',
      },
    });
  }
}

/**
 * POST /api/projects - Create a new project with file upload
 */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  uploadFile(req, res, async (err: any) => {
    try {
      if (err) {
        throw new ValidationError(err.message || 'File upload failed');
      }

      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      const title = (req.body.title as string) || path.parse(req.file.originalname).name;
      const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');

      const isText = config.upload.allowedTextFormats.includes(ext);
      const isAudio = config.upload.allowedAudioFormats.includes(ext);

      if (!isText && !isAudio) {
        throw new ValidationError(`Unsupported format: ${ext}`);
      }

      await ensureDefaultUser();

      // Create project
      const project = await prisma.project.create({
        data: {
          userId: DEFAULT_USER_ID,
          title,
          description: req.body.description || null,
          sourceType: isText ? 'text' : 'audio',
          sourceFormat: ext,
          sourceFilePath: req.file.path,
          status: 'analyzing',
        },
      });

      logger.info('Project created', { projectId: project.id, format: ext });

      // Extract text
      let fullText: string;
      if (isText) {
        fullText = await extractText(req.file.path, ext);
      } else {
        fullText = await extractTextFromAudio(req.file.path);
      }

      // Update with extracted text
      await prisma.project.update({
        where: { id: project.id },
        data: { extractedText: fullText },
      });

      // Analyze and create scenes
      const scenesData = await analyzeAndSplitText(fullText);

      for (let i = 0; i < scenesData.length; i++) {
        const scene = scenesData[i];
        await prisma.scene.create({
          data: {
            projectId: project.id,
            orderIndex: i,
            title: scene.title,
            textContent: scene.textContent,
            imagePrompt: scene.imagePrompt,
            duration: scene.duration,
            characters: JSON.stringify(scene.characters),
            location: scene.location,
            mood: scene.mood,
            status: 'ready',
          },
        });
      }

      // Update project status
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'scenes_ready' },
      });

      // Fetch complete project
      const result = await prisma.project.findUnique({
        where: { id: project.id },
        include: { scenes: { orderBy: { orderIndex: 'asc' } } },
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });
});

/**
 * GET /api/projects - List all projects
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { scenes: true, videos: true } },
      },
    });
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id - Get project details with scenes and characters
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        scenes: {
          orderBy: { orderIndex: 'asc' },
          include: {
            generatedMedia: true,
          },
        },
        videos: {
          orderBy: { createdAt: 'desc' },
        },
        characters: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!project) throw new NotFoundError('Project', req.params.id);
    res.json(project);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) throw new NotFoundError('Project', req.params.id);

    await prisma.project.delete({ where: { id: req.params.id } });
    logger.info('Project deleted', { projectId: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
