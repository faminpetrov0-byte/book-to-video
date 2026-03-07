/**
 * WebSocket Server for Real-Time Updates
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import logger from '../utils/logger';

export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface JobProgress {
  jobId: string;
  type: 'image' | 'video' | 'tts' | 'render';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  sceneId?: string;
  projectId?: string;
  result?: Record<string, unknown>;
  error?: string;
  provider?: string;
}

export interface ProjectUpdate {
  projectId: string;
  type: 'created' | 'updated' | 'deleted' | 'scene_added' | 'scene_updated';
  data: Record<string, unknown>;
}

export class WebSocketManager extends EventEmitter {
  private static instance: WebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocket>> = new Map();
  
  private constructor() {
    super();
  }
  
  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    if (this.wss) {
      logger.warn('WebSocket server already initialized');
      return;
    }
    
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
    });
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });
    
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });
    
    logger.info('WebSocket server initialized at /ws');
  }
  
  /**
   * Handle new connection
   */
  private handleConnection(ws: WebSocket, req: { url?: string }): void {
    const url = new URL(req.url || '', 'ws://localhost');
    const projectId = url.searchParams.get('projectId');
    
    // Join project room if specified
    if (projectId) {
      this.joinRoom(ws, projectId);
      logger.info(`Client joined project room: ${projectId}`);
    }
    
    // Send welcome message
    this.send(ws, {
      type: 'connected',
      data: {
        message: 'Connected to Book-to-Video WebSocket server',
        projectId,
      },
      timestamp: Date.now(),
    });
    
    // Handle messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message', { error });
      }
    });
    
    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket client error', { error: error.message });
    });
  }
  
  /**
   * Handle incoming message
   */
  private handleMessage(ws: WebSocket, message: { type: string; data?: Record<string, unknown> }): void {
    switch (message.type) {
      case 'subscribe':
        if (message.data?.projectId) {
          this.joinRoom(ws, message.data.projectId as string);
        }
        break;
        
      case 'unsubscribe':
        if (message.data?.projectId) {
          this.leaveRoom(ws, message.data.projectId as string);
        }
        break;
        
      case 'ping':
        this.send(ws, { type: 'pong', data: {}, timestamp: Date.now() });
        break;
        
      default:
        logger.debug('Unknown WebSocket message type', { type: message.type });
    }
  }
  
  /**
   * Handle disconnect
   */
  private handleDisconnect(ws: WebSocket): void {
    // Remove from all rooms
    for (const [projectId, clients] of this.clients.entries()) {
      if (clients.has(ws)) {
        clients.delete(ws);
        if (clients.size === 0) {
          this.clients.delete(projectId);
        }
      }
    }
  }
  
  /**
   * Join a project room
   */
  joinRoom(ws: WebSocket, projectId: string): void {
    if (!this.clients.has(projectId)) {
      this.clients.set(projectId, new Set());
    }
    this.clients.get(projectId)!.add(ws);
  }
  
  /**
   * Leave a project room
   */
  leaveRoom(ws: WebSocket, projectId: string): void {
    const clients = this.clients.get(projectId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(projectId);
      }
    }
  }
  
  /**
   * Send message to specific client
   */
  send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Broadcast to all connected clients
   */
  broadcast(message: WSMessage): void {
    if (!this.wss) return;
    
    const data = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
  
  /**
   * Broadcast to specific project room
   */
  broadcastToProject(projectId: string, message: WSMessage): void {
    const clients = this.clients.get(projectId);
    if (!clients) return;
    
    const data = JSON.stringify(message);
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
  
  /**
   * Emit job progress (convenience method)
   */
  emitJobProgress(progress: JobProgress): void {
    this.broadcast({
      type: 'job:progress',
      data: progress,
      timestamp: Date.now(),
    });
    
    if (progress.projectId) {
      this.broadcastToProject(progress.projectId, {
        type: 'job:progress',
        data: progress,
        timestamp: Date.now(),
      });
    }
  }
  
  /**
   * Emit project update (convenience method)
   */
  emitProjectUpdate(update: ProjectUpdate): void {
    this.broadcast({
      type: 'project:update',
      data: update,
      timestamp: Date.now(),
    });
    
    this.broadcastToProject(update.projectId, {
      type: 'project:update',
      data: update,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.wss?.clients.size || 0;
  }
  
  /**
   * Get clients in a project
   */
  getProjectClients(projectId: string): number {
    return this.clients.get(projectId)?.size || 0;
  }
  
  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.clients.clear();
      logger.info('WebSocket server shut down');
    }
  }
}

export const wsManager = WebSocketManager.getInstance();

// Export types for use in other modules
export type { WebSocketServer, WebSocket };
