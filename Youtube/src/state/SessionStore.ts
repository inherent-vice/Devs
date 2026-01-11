/**
 * Session Store
 *
 * Manages session state throughout the video production pipeline.
 * Provides CRUD operations and state transitions.
 */

import { z } from 'zod';
import type {
  SessionInput,
  VideoType,
  SessionStatus,
  Checkpoint,
} from '../schemas/common.schema.js';

// ===========================================
// Session State Schema
// ===========================================

export const SessionStateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    'created',
    'researching',
    'producing',
    'reviewing',
    'publishing',
    'completed',
    'failed',
  ]),
  input: z.object({
    idea: z.string(),
    videoType: z.enum(['shorts', 'medium', 'longform']),
    targetAudience: z.string().optional(),
    style: z.string().optional(),
    language: z.string().default('ko'),
  }),
  research: z.object({
    trends: z.array(z.unknown()).optional(),
    topic: z.unknown().optional(),
    script: z.unknown().optional(),
    storyboard: z.unknown().optional(),
  }).optional(),
  production: z.object({
    audio: z.unknown().optional(),
    videos: z.array(z.unknown()).optional(),
    thumbnails: z.array(z.unknown()).optional(),
    edited: z.unknown().optional(),
  }).optional(),
  quality: z.object({
    iterations: z.number().default(0),
    scores: z.array(z.unknown()).default([]),
    finalScore: z.number().optional(),
    verdict: z.string().optional(),
  }).optional(),
  publishing: z.object({
    metadata: z.unknown().optional(),
    result: z.unknown().optional(),
  }).optional(),
  metadata: z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    completedAt: z.date().optional(),
    totalCost: z.number().default(0),
    totalDuration: z.number().optional(),
    errorCount: z.number().default(0),
  }),
  checkpoints: z.array(z.object({
    id: z.string(),
    phase: z.string(),
    timestamp: z.date(),
    cost: z.number(),
  })).default([]),
  errors: z.array(z.object({
    phase: z.string(),
    message: z.string(),
    timestamp: z.date(),
  })).default([]),
});

export type SessionState = z.infer<typeof SessionStateSchema>;

// ===========================================
// Session Store Class
// ===========================================

export class SessionStore {
  private sessions = new Map<string, SessionState>();

  // ===========================================
  // CRUD Operations
  // ===========================================

  /**
   * Create a new session
   */
  async create(input: SessionInput): Promise<SessionState> {
    const session: SessionState = {
      id: crypto.randomUUID(),
      status: 'created',
      input: {
        idea: input.idea,
        videoType: input.videoType,
        targetAudience: input.targetAudience,
        style: input.style,
        language: input.language || 'ko',
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        totalCost: 0,
        errorCount: 0,
      },
      checkpoints: [],
      errors: [],
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  async get(sessionId: string): Promise<SessionState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * Get all sessions
   */
  async getAll(): Promise<SessionState[]> {
    return Array.from(this.sessions.values());
  }

  /**
   * Update session
   */
  async update(sessionId: string, updates: Partial<SessionState>): Promise<SessionState> {
    const session = await this.get(sessionId);

    const updated: SessionState = {
      ...session,
      ...updates,
      metadata: {
        ...session.metadata,
        ...updates.metadata,
        updatedAt: new Date(),
      },
    };

    this.sessions.set(sessionId, updated);
    return updated;
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  // ===========================================
  // Phase Update Methods
  // ===========================================

  /**
   * Update research phase results
   */
  async updateResearch(
    sessionId: string,
    data: Partial<NonNullable<SessionState['research']>>
  ): Promise<SessionState> {
    const session = await this.get(sessionId);

    return this.update(sessionId, {
      status: 'researching',
      research: {
        ...session.research,
        ...data,
      },
    });
  }

  /**
   * Update production phase results
   */
  async updateProduction(
    sessionId: string,
    data: Partial<NonNullable<SessionState['production']>>
  ): Promise<SessionState> {
    const session = await this.get(sessionId);

    return this.update(sessionId, {
      status: 'producing',
      production: {
        ...session.production,
        ...data,
      },
    });
  }

  /**
   * Update quality phase results
   */
  async updateQuality(
    sessionId: string,
    data: Partial<NonNullable<SessionState['quality']>>
  ): Promise<SessionState> {
    const session = await this.get(sessionId);

    return this.update(sessionId, {
      status: 'reviewing',
      quality: {
        iterations: session.quality?.iterations || 0,
        scores: session.quality?.scores || [],
        ...data,
      },
    });
  }

  /**
   * Update publishing phase results
   */
  async updatePublishing(
    sessionId: string,
    data: Partial<NonNullable<SessionState['publishing']>>
  ): Promise<SessionState> {
    const session = await this.get(sessionId);

    return this.update(sessionId, {
      status: 'publishing',
      publishing: {
        ...session.publishing,
        ...data,
      },
    });
  }

  // ===========================================
  // Status Management
  // ===========================================

  /**
   * Set session status
   */
  async setStatus(sessionId: string, status: SessionStatus): Promise<SessionState> {
    const updates: Partial<SessionState> = { status };

    if (status === 'completed' || status === 'failed') {
      updates.metadata = {
        ...((await this.get(sessionId)).metadata),
        completedAt: new Date(),
      };
    }

    return this.update(sessionId, updates);
  }

  /**
   * Mark session as completed
   */
  async complete(sessionId: string): Promise<SessionState> {
    return this.setStatus(sessionId, 'completed');
  }

  /**
   * Mark session as failed
   */
  async fail(sessionId: string, error: string): Promise<SessionState> {
    const session = await this.get(sessionId);

    return this.update(sessionId, {
      status: 'failed',
      errors: [
        ...session.errors,
        {
          phase: session.status,
          message: error,
          timestamp: new Date(),
        },
      ],
      metadata: {
        ...session.metadata,
        completedAt: new Date(),
        errorCount: session.metadata.errorCount + 1,
      },
    });
  }

  // ===========================================
  // Cost Tracking
  // ===========================================

  /**
   * Add cost to session
   */
  async addCost(sessionId: string, cost: number): Promise<SessionState> {
    const session = await this.get(sessionId);

    return this.update(sessionId, {
      metadata: {
        ...session.metadata,
        totalCost: session.metadata.totalCost + cost,
      },
    });
  }

  /**
   * Get total cost
   */
  async getTotalCost(sessionId: string): Promise<number> {
    const session = await this.get(sessionId);
    return session.metadata.totalCost;
  }

  // ===========================================
  // Checkpoint Management
  // ===========================================

  /**
   * Add checkpoint
   */
  async addCheckpoint(
    sessionId: string,
    phase: string,
    cost: number
  ): Promise<string> {
    const session = await this.get(sessionId);
    const checkpointId = `${sessionId}-${phase}-${Date.now()}`;

    await this.update(sessionId, {
      checkpoints: [
        ...session.checkpoints,
        {
          id: checkpointId,
          phase,
          timestamp: new Date(),
          cost,
        },
      ],
    });

    return checkpointId;
  }

  /**
   * Get checkpoints
   */
  async getCheckpoints(sessionId: string): Promise<SessionState['checkpoints']> {
    const session = await this.get(sessionId);
    return session.checkpoints;
  }

  // ===========================================
  // Query Methods
  // ===========================================

  /**
   * Get sessions by status
   */
  async getByStatus(status: SessionStatus): Promise<SessionState[]> {
    const all = await this.getAll();
    return all.filter(s => s.status === status);
  }

  /**
   * Get active sessions (not completed or failed)
   */
  async getActive(): Promise<SessionState[]> {
    const all = await this.getAll();
    return all.filter(s => !['completed', 'failed'].includes(s.status));
  }

  /**
   * Get sessions by video type
   */
  async getByVideoType(videoType: VideoType): Promise<SessionState[]> {
    const all = await this.getAll();
    return all.filter(s => s.input.videoType === videoType);
  }
}

// ===========================================
// Default Export
// ===========================================

export const sessionStore = new SessionStore();
