/**
 * Redis Session Store
 *
 * Production-ready session storage using Redis.
 * Provides persistence, distributed access, and automatic expiration.
 *
 * Note: Requires 'ioredis' package to be installed (npm install ioredis)
 */

// Dynamic import for Redis - allows build without ioredis installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedisClient = any;

import type { ISessionStore } from './ISessionStore.js';
import type { SessionState } from './SessionStore.js';
import type { SessionInput, SessionStatus, VideoType } from '../schemas/common.schema.js';

// ===========================================
// Configuration
// ===========================================

const REDIS_CONFIG = {
  /** Key prefix for session data */
  KEY_PREFIX: 'yt:session:',
  /** Key for session index (set of all session IDs) */
  INDEX_KEY: 'yt:sessions',
  /** Session TTL in seconds (7 days) */
  SESSION_TTL: 7 * 24 * 60 * 60,
  /** Active session TTL in seconds (24 hours) */
  ACTIVE_SESSION_TTL: 24 * 60 * 60,
};

// ===========================================
// Redis Store Implementation
// ===========================================

export class RedisStore implements ISessionStore {
  private client: RedisClient;
  private connected: boolean = false;
  private initialized: boolean = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    // Lazy initialization - will be done on first use
    this.initClient(url);
  }

  private async initClient(url: string): Promise<void> {
    if (this.initialized) return;

    try {
      const redisModule = await import('ioredis');
      const Redis = (redisModule as { default?: any }).default ?? redisModule;
      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy(times: number) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on('connect', () => {
        this.connected = true;
        console.log('[RedisStore] Connected to Redis');
      });

      this.client.on('error', (err: Error) => {
        console.error('[RedisStore] Redis error:', err.message);
      });

      this.client.on('close', () => {
        this.connected = false;
        console.log('[RedisStore] Disconnected from Redis');
      });

      this.initialized = true;
    } catch (error) {
      console.error('[RedisStore] Failed to initialize Redis client. Is ioredis installed?');
      throw error;
    }
  }

  private async ensureClient(): Promise<void> {
    if (!this.initialized) {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      await this.initClient(url);
    }
  }

  // ===========================================
  // Connection Management
  // ===========================================

  async connect(): Promise<void> {
    await this.ensureClient();
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    await this.ensureClient();
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  private sessionKey(sessionId: string): string {
    return `${REDIS_CONFIG.KEY_PREFIX}${sessionId}`;
  }

  private serialize(session: SessionState): string {
    return JSON.stringify(session, (key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
  }

  private deserialize(data: string): SessionState {
    return JSON.parse(data, (key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  }

  // ===========================================
  // CRUD Operations
  // ===========================================

  async create(input: SessionInput): Promise<SessionState> {
    await this.ensureClient();

    const sessionId = input.sessionId || crypto.randomUUID();
    const session: SessionState = {
      id: sessionId,
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

    const key = this.sessionKey(session.id);
    const pipeline = this.client.pipeline();

    pipeline.set(key, this.serialize(session));
    pipeline.expire(key, REDIS_CONFIG.SESSION_TTL);
    pipeline.sadd(REDIS_CONFIG.INDEX_KEY, session.id);

    await pipeline.exec();

    return session;
  }

  async get(sessionId: string): Promise<SessionState> {
    await this.ensureClient();

    const data = await this.client.get(this.sessionKey(sessionId));
    if (!data) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return this.deserialize(data);
  }

  async getAll(): Promise<SessionState[]> {
    await this.ensureClient();

    const sessionIds: string[] = await this.client.smembers(REDIS_CONFIG.INDEX_KEY);
    if (sessionIds.length === 0) {
      return [];
    }

    const keys = sessionIds.map((id: string) => this.sessionKey(id));
    const results = await this.client.mget(...keys);

    const sessions: SessionState[] = [];
    for (let i = 0; i < results.length; i++) {
      const data = results[i];
      if (data) {
        try {
          sessions.push(this.deserialize(data));
        } catch {
          // Remove invalid session from index
          await this.client.srem(REDIS_CONFIG.INDEX_KEY, sessionIds[i]);
        }
      } else {
        // Session expired, remove from index
        await this.client.srem(REDIS_CONFIG.INDEX_KEY, sessionIds[i]);
      }
    }

    return sessions;
  }

  async update(sessionId: string, updates: Partial<SessionState>): Promise<SessionState> {
    await this.ensureClient();

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

    const key = this.sessionKey(sessionId);
    await this.client.set(key, this.serialize(updated));

    // Refresh TTL for active sessions
    if (!['completed', 'failed'].includes(updated.status)) {
      await this.client.expire(key, REDIS_CONFIG.ACTIVE_SESSION_TTL);
    }

    return updated;
  }

  async delete(sessionId: string): Promise<void> {
    await this.ensureClient();

    const pipeline = this.client.pipeline();
    pipeline.del(this.sessionKey(sessionId));
    pipeline.srem(REDIS_CONFIG.INDEX_KEY, sessionId);
    await pipeline.exec();
  }

  // ===========================================
  // Phase Update Methods
  // ===========================================

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

  async setStatus(sessionId: string, status: SessionStatus): Promise<SessionState> {
    const updates: Partial<SessionState> = { status };

    if (status === 'completed' || status === 'failed') {
      const session = await this.get(sessionId);
      updates.metadata = {
        ...session.metadata,
        completedAt: new Date(),
      };
    }

    return this.update(sessionId, updates);
  }

  async complete(sessionId: string): Promise<SessionState> {
    return this.setStatus(sessionId, 'completed');
  }

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

  async addCost(sessionId: string, cost: number): Promise<SessionState> {
    const session = await this.get(sessionId);

    return this.update(sessionId, {
      metadata: {
        ...session.metadata,
        totalCost: session.metadata.totalCost + cost,
      },
    });
  }

  async getTotalCost(sessionId: string): Promise<number> {
    const session = await this.get(sessionId);
    return session.metadata.totalCost;
  }

  // ===========================================
  // Checkpoint Management
  // ===========================================

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

  async getCheckpoints(sessionId: string): Promise<SessionState['checkpoints']> {
    const session = await this.get(sessionId);
    return session.checkpoints;
  }

  // ===========================================
  // Query Methods
  // ===========================================

  async getByStatus(status: SessionStatus): Promise<SessionState[]> {
    const all = await this.getAll();
    return all.filter(s => s.status === status);
  }

  async getActive(): Promise<SessionState[]> {
    const all = await this.getAll();
    return all.filter(s => !['completed', 'failed'].includes(s.status));
  }

  async getByVideoType(videoType: VideoType): Promise<SessionState[]> {
    const all = await this.getAll();
    return all.filter(s => s.input.videoType === videoType);
  }
}
