import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { providerManager } from '../services/providers';
import logger from '../utils/logger';

/**
 * GET /api/providers/status - Get all providers status
 */
router.get('/providers/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await providerManager.checkHealth();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/providers/models - Get available models
 */
router.get('/providers/models', async (_req: Request, res: Response) => {
  const models = providerManager.getAvailableModels();
  res.json(models);
});

/**
 * POST /api/providers/configure - Configure providers
 */
router.post(
  '/providers/configure',
  [
    body('type').isIn(['image', 'video', 'tts']),
    body('providers').isObject(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { type, providers } = req.body;
      providerManager.configure(type, providers);

      logger.info('Providers configured', { type, providers });
      res.json({ success: true, message: 'Providers configured' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/providers/generate/image - Generate image with automatic fallback
 */
router.post(
  '/providers/generate/image',
  [
    body('prompt').isString().notEmpty(),
    body('width').optional().isInt({ min: 256, max: 2048 }),
    body('height').optional().isInt({ min: 256, max: 2048 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const result = await providerManager.generate('image', {
        prompt: req.body.prompt,
        width: req.body.width,
        height: req.body.height,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/providers/generate/tts - Generate TTS with automatic fallback
 */
router.post(
  '/providers/generate/tts',
  [
    body('text').isString().notEmpty(),
    body('voice').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const result = await providerManager.generate('tts', {
        text: req.body.text,
        voiceId: req.body.voice,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
