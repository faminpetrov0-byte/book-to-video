/**
 * LiveKit Routes
 * API endpoints for LiveKit integration
 */

import { Router, Request, Response } from 'express';
import { livekitProviders } from '../services/providers';
import { config } from '../config';
import logger from '../utils/logger';

const router = Router();

// ============== GET ROOM TOKEN ==============
router.post('/room', async (req: Request, res: Response) => {
  try {
    const { roomName, participantName, isAgent } = req.body;
    
    // In production, would generate JWT token using livekit-server-sdk
    // import { AccessToken, VideoGrant } from 'livekit-server-sdk';
    
    const mockToken = {
      token: `mock-jwt-token-${Date.now()}`,
      roomName: roomName || `book-room-${Date.now()}`,
      participantName: participantName || 'user',
      serverUrl: process.env.LIVEKIT_URL || 'wss://your-server.livekit.io',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    
    logger.info('Generated LiveKit room token', { roomName: mockToken.roomName });
    
    res.json({
      success: true,
      data: mockToken,
    });
  } catch (error) {
    logger.error('Failed to create room token', { error });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============== START AI NARRATOR ==============
router.post('/agent/start', async (req: Request, res: Response) => {
  try {
    const { 
      roomName, 
      text, 
      voice = 'en-US-Neural',
      stt = 'deepgram/nova-3',
      llm = 'openai/gpt-4',
      tts = 'cartesia/sonic',
    } = req.body;
    
    const agentConfig = {
      roomName,
      agentType: 'narrator',
      instructions: text || 'You are a professional storyteller. Read the provided text with emotion and expression.',
      voice,
      providers: { stt, llm, tts },
    };
    
    logger.info('Starting AI Narrator agent', { roomName, agentType: 'narrator' });
    
    res.json({
      success: true,
      data: {
        agentId: `agent_${Date.now()}`,
        status: 'starting',
        config: agentConfig,
        // Would connect to LiveKit Agents in production
      },
    });
  } catch (error) {
    logger.error('Failed to start AI agent', { error });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============== STOP AI NARRATOR ==============
router.post('/agent/stop', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.body;
    
    logger.info('Stopping AI Narrator agent', { agentId });
    
    res.json({
      success: true,
      data: { agentId, status: 'stopped' },
    });
  } catch (error) {
    logger.error('Failed to stop AI agent', { error });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============== START EGRESS (RECORDING) ==============
router.post('/egress/start', async (req: Request, res: Response) => {
  try {
    const { 
      roomName, 
      layout = 'speaker',
      quality = 'high',
      format = 'mp4',
    } = req.body;
    
    const egressConfig = {
      roomName,
      layout,
      quality,
      format,
    };
    
    logger.info('Starting LiveKit egress', egressConfig);
    
    res.json({
      success: true,
      data: {
        egressId: `egress_${Date.now()}`,
        status: 'starting',
        config: egressConfig,
        // Would connect to LiveKit Egress in production
      },
    });
  } catch (error) {
    logger.error('Failed to start egress', { error });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============== STOP EGRESS ==============
router.post('/egress/stop', async (req: Request, res: Response) => {
  try {
    const { egressId } = req.body;
    
    logger.info('Stopping LiveKit egress', { egressId });
    
    res.json({
      success: true,
      data: { egressId, status: 'stopped' },
    });
  } catch (error) {
    logger.error('Failed to stop egress', { error });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============== CREATE INGRESS ==============
router.post('/ingress', async (req: Request, res: Response) => {
  try {
    const { protocol = 'rtmp' } = req.body;
    
    const streamKey = `stream_${Date.now()}`;
    const ingressConfig = {
      ingressId: `ingress_${Date.now()}`,
      streamKey,
      protocol,
      rtmpUrl: `rtmp://live.livekit.io/live/${streamKey}`,
      whipUrl: `https://live.livekit.io/whip/${streamKey}`,
    };
    
    logger.info('Created LiveKit ingress', ingressConfig);
    
    res.json({
      success: true,
      data: ingressConfig,
    });
  } catch (error) {
    logger.error('Failed to create ingress', { error });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============== GET PROVIDER STATUS ==============
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const health = await livekitProviders.checkHealth();
    
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error('Failed to get LiveKit status', { error });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
