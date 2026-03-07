import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { initQueues } from './queue/jobQueue';
import projectRoutes from './routes/projects';
import sceneRoutes from './routes/scenes';
import generateRoutes from './routes/generate';
import characterRoutes from './routes/characters';
import aiRoutes from './routes/ai';
import renderRoutes from './routes/render';
import youtubeRoutes from './routes/youtube';
import providerRoutes from './routes/providers';
import { wsManager } from './core/WebSocketServer';

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure directories exist
[config.upload.dir, config.output.dir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Serve generated media files
app.use('/output', express.static(config.output.dir));
app.use('/uploads', express.static(config.upload.dir));

// API routes
app.use('/api/projects', projectRoutes);
app.use('/api', sceneRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api', characterRoutes); // /api/voices & /api/characters
app.use('/api', aiRoutes); // /api/ai/* - models, presets, music
app.use('/api', renderRoutes); // /api/render/:projectId
app.use('/api', youtubeRoutes); // /api/youtube/*
app.use('/api', providerRoutes); // /api/providers/*
app.use('/api', generateRoutes); // /api/jobs/:id

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      huggingface: !!config.ai.huggingface.apiKey,
      fal: !!config.ai.fal.apiKey,
      elevenlabs: !!config.tts.elevenlabs.apiKey,
      coqui: config.tts.coqui.enabled,
    },
    config: {
      maxScenes: config.limits.maxScenesPerProject,
      maxDuration: config.limits.maxTotalDuration,
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize job queues
try {
  initQueues();
} catch (err) {
  logger.warn('Queue initialization deferred (Redis may not be running)', {
    error: (err as Error).message,
  });
}

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🎬 Book-to-Video API running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`AI Services configured: HF=${!!config.ai.huggingface.apiKey} FAL=${!!config.ai.fal.apiKey} 11Labs=${!!config.tts.elevenlabs.apiKey}`);
  
  // Initialize WebSocket server
  wsManager.initialize(server as unknown as import('http').Server);
});

export default app;
