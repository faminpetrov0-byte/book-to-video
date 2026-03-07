import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import { body, validationResult } from 'express-validator';
import { addImageJob, addVideoJob, addTTSJob, addRenderJob, getJobStatus } from '../queue/jobQueue';
import { generateImage } from '../services/imageGenerator';
import { generateVideoFromImage } from '../services/videoGenerator';
import { generateTTS } from '../services/ttsService';
import prisma from '../db';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

/**
 * POST /api/generate/image - Generate an image for a scene
 */
router.post(
  '/image',
  [
    body('sceneId').isString().notEmpty(),
    body('prompt').optional().isString(),
    body('width').optional().isInt({ min: 256, max: 1920 }),
    body('height').optional().isInt({ min: 256, max: 1080 }),
    body('async').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const scene = await prisma.scene.findUnique({ where: { id: req.body.sceneId } });
      if (!scene) throw new NotFoundError('Scene', req.body.sceneId);

      const prompt = req.body.prompt || scene.imagePrompt || scene.textContent;

      if (req.body.async) {
        const { jobId } = await addImageJob({
          sceneId: scene.id,
          prompt,
          width: req.body.width,
          height: req.body.height,
        });
        res.json({ jobId, status: 'queued' });
      } else {
        // Synchronous generation
        const result = await generateImage(scene.id, prompt, {
          width: req.body.width,
          height: req.body.height,
        });

        await prisma.scene.update({
          where: { id: scene.id },
          data: { status: 'image_ready' },
        });

        res.json({
          ...result,
          status: 'completed',
          mediaUrl: `/output/images/${path.basename(result.filePath)}`,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/generate/video - Generate video from scene image
 */
router.post(
  '/video',
  [
    body('sceneId').isString().notEmpty(),
    body('imagePath').optional().isString(),
    body('duration').optional().isFloat({ min: 5, max: 30 }),
    body('async').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const scene = await prisma.scene.findUnique({
        where: { id: req.body.sceneId },
        include: { generatedMedia: { where: { mediaType: 'image', selected: true } } },
      });

      if (!scene) throw new NotFoundError('Scene', req.body.sceneId);

      const imagePath = req.body.imagePath || scene.generatedMedia[0]?.filePath;
      if (!imagePath) {
        throw new ValidationError('No image found for this scene. Generate an image first.');
      }

      const duration = req.body.duration || scene.duration;

      if (req.body.async) {
        const { jobId } = await addVideoJob({ sceneId: scene.id, imagePath, duration });
        res.json({ jobId, status: 'queued' });
      } else {
        const result = await generateVideoFromImage(scene.id, imagePath, duration);

        await prisma.scene.update({
          where: { id: scene.id },
          data: { status: 'video_ready' },
        });

        res.json({
          ...result,
          status: 'completed',
          mediaUrl: `/output/videos/${require('path').basename(result.filePath)}`,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/generate/tts - Generate TTS audio for a scene
 */
router.post(
  '/tts',
  [
    body('sceneId').isString().notEmpty(),
    body('text').optional().isString(),
    body('voice').optional().isString(),
    body('async').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const scene = await prisma.scene.findUnique({ where: { id: req.body.sceneId } });
      if (!scene) throw new NotFoundError('Scene', req.body.sceneId);

      const text = req.body.text || scene.textContent;

      if (req.body.async) {
        const { jobId } = await addTTSJob({ sceneId: scene.id, text, voice: req.body.voice });
        res.json({ jobId, status: 'queued' });
      } else {
        const result = await generateTTS(scene.id, text, { voice: req.body.voice });
        res.json({
          ...result,
          status: 'completed',
          mediaUrl: `/output/audio/${require('path').basename(result.filePath)}`,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/render/:projectId - Start final render
 */
router.post('/render/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: { scenes: { include: { generatedMedia: true } } },
    });

    if (!project) throw new NotFoundError('Project', req.params.projectId);

    const hasVideos = project.scenes.some((s) =>
      s.generatedMedia.some((m) => m.mediaType === 'video' && m.status === 'completed')
    );

    if (!hasVideos) {
      throw new ValidationError('No video segments found. Generate videos for scenes first.');
    }

    const { jobId } = await addRenderJob({
      projectId: project.id,
      resolution: req.body.resolution || '720p',
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'rendering' },
    });

    res.json({ jobId, status: 'queued', message: 'Rendering started' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/jobs/:id - Get job status
 */
router.get('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getJobStatus(req.params.id);
    if (!status) {
      // Could be a direct-processed job
      res.json({ id: req.params.id, status: 'completed', progress: 100 });
      return;
    }
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subtitles/:projectId - Generate SRT subtitles for project
 */
router.get('/subtitles/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        scenes: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!project) {
      throw new NotFoundError('Project', req.params.projectId);
    }

    const cues = scenesToSubtitles(project.scenes);
    const srt = require('../services/subtitleService').generateSRT(cues);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${project.title}.srt"`);
    res.send(srt);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subtitles/:projectId/burn - Burn subtitles into rendered video
 */
router.post(
  '/subtitles/:projectId/burn',
  [
    body('videoId').isString().notEmpty(),
    body('style').optional().isObject(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const { videoId, style } = req.body;

      const video = await prisma.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw new NotFoundError('Video', videoId);
      }

      // Get project scenes for subtitles
      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
        include: {
          scenes: { orderBy: { orderIndex: 'asc' } },
        },
      });

      if (!project) {
        throw new NotFoundError('Project', req.params.projectId);
      }

      // Generate subtitles
      const cues = scenesToSubtitles(project.scenes);
      const subtitlePath = path.join(config.output.dir, `subtitles_${Date.now()}.srt`);
      saveSubtitles(cues, subtitlePath);

      // Burn into video
      const outputPath = video.filePath.replace('.mp4', '_subtitled.mp4');
      await burnSubtitles(video.filePath, subtitlePath, outputPath, style);

      // Update video record
      await prisma.video.update({
        where: { id: videoId },
        data: { filePath: outputPath },
      });

      // Cleanup
      try {
        fs.unlinkSync(subtitlePath);
      } catch { /* ignore */ }

      res.json({
        success: true,
        videoPath: outputPath,
        downloadUrl: `/output/final/${path.basename(outputPath)}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
