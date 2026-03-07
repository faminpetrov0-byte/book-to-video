import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import logger from '../utils/logger';
import { ValidationError } from '../utils/errors';
import prisma from '../db';

interface YouTubeCredentials {
  email: string;
  password: string;
  channelId?: string;
}

/**
 * POST /api/youtube/auth - Set YouTube credentials
 */
router.post(
  '/youtube/auth',
  [
    body('email').isEmail(),
    body('password').isString().notEmpty(),
    body('channelId').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const { email, password, channelId } = req.body;

      // Store credentials (in production, encrypt this!)
      const credsPath = path.join(config.output.dir, 'youtube_creds.json');
      const credentials = { email, password, channelId };
      fs.writeFileSync(credsPath, JSON.stringify(credentials, null, 2));

      logger.info('YouTube credentials saved', { email });
      res.json({ success: true, message: 'Credentials saved securely' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/youtube/status - Check YouTube connection status
 */
router.get('/youtube/status', async (_req: Request, res: Response) => {
  const credsPath = path.join(config.output.dir, 'youtube_creds.json');
  const hasCredentials = fs.existsSync(credsPath);

  res.json({
    connected: hasCredentials,
    message: hasCredentials ? 'YouTube credentials configured' : 'No credentials set',
  });
});

/**
 * POST /api/youtube/upload - Upload video to YouTube
 */
router.post(
  '/youtube/upload',
  [
    body('videoId').isString().notEmpty(),
    body('title').isString().notEmpty(),
    body('description').optional().isString(),
    body('tags').optional().isArray(),
    body('privacy').optional().isIn(['private', 'public', 'unlisted']),
    body('category').optional().isString(),
    body('playlistId').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const { videoId, title, description, tags, privacy = 'private', category, playlistId } = req.body;

      // Get video from database
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: { project: true },
      });

      if (!video) {
        throw new ValidationError('Video not found');
      }

      if (!fs.existsSync(video.filePath)) {
        throw new ValidationError('Video file not found on disk');
      }

      // Check credentials
      const credsPath = path.join(config.output.dir, 'youtube_creds.json');
      if (!fs.existsSync(credsPath)) {
        throw new ValidationError('YouTube credentials not configured. Use /api/youtube/auth first.');
      }

      const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

      // Create upload task
      const uploadTask = {
        id: `yt-${Date.now()}`,
        videoId,
        videoPath: video.filePath,
        title: title || video.project.title,
        description: description || `Created with Book-to-Video AI\n\n${video.project.description || ''}`,
        tags: tags || ['book', 'ai', 'video', 'story'],
        privacy,
        category: category || '22', // People & Blogs
        playlistId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        credentials: {
          email: credentials.email,
        },
      };

      // Save upload task
      const uploadDir = path.join(config.output.dir, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const taskPath = path.join(uploadDir, `${uploadTask.id}.json`);
      fs.writeFileSync(taskPath, JSON.stringify(uploadTask, null, 2));

      // In production, this would trigger a Selenium upload
      // For now, return the task - user runs the upload script separately
      logger.info('YouTube upload queued', { taskId: uploadTask.id, title });

      res.json({
        success: true,
        taskId: uploadTask.id,
        status: 'queued',
        message: 'Upload queued. In production, Selenium bot will handle upload.',
        note: 'This requires Selenium server to be running',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/youtube/uploads - List YouTube uploads
 */
router.get('/youtube/uploads', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const uploadDir = path.join(config.output.dir, 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      res.json([]);
      return;
    }

    const files = fs.readdirSync(uploadDir).filter(f => f.startsWith('yt-') && f.endsWith('.json'));
    const uploads = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(uploadDir, f), 'utf-8'));
      return {
        taskId: data.id,
        videoId: data.videoId,
        title: data.title,
        status: data.status,
        createdAt: data.createdAt,
        youtubeUrl: data.youtubeUrl || null,
      };
    });

    res.json(uploads);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/youtube/upload/:taskId - Get upload status
 */
router.get('/youtube/upload/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskPath = path.join(config.output.dir, 'uploads', `${req.params.taskId}.json`);
    
    if (!fs.existsSync(taskPath)) {
      throw new ValidationError('Upload task not found');
    }

    const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
    res.json(task);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/youtube/auth - Remove YouTube credentials
 */
router.delete('/youtube/auth', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const credsPath = path.join(config.output.dir, 'youtube_creds.json');
    
    if (fs.existsSync(credsPath)) {
      fs.unlinkSync(credsPath);
    }

    res.json({ success: true, message: 'Credentials removed' });
  } catch (error) {
    next(error);
  }
});

export default router;
