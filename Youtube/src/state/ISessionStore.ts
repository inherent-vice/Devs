/**
 * Session Store Interface
 *
 * Abstract interface for session storage implementations.
 * Allows switching between InMemory, Redis, or other backends.
 */

import type { SessionState, SessionStateSchema } from './SessionStore.js';
import type { SessionInput, SessionStatus, VideoType } from '../schemas/common.schema.js';

// ===========================================
// Interface Definition
// ===========================================

export interface ISessionStore {
  // CRUD Operations
  create(input: SessionInput): Promise<SessionState>;
  get(sessionId: string): Promise<SessionState>;
  getAll(): Promise<SessionState[]>;
  update(sessionId: string, updates: Partial<SessionState>): Promise<SessionState>;
  delete(sessionId: string): Promise<void>;

  // Phase Update Methods
  updateResearch(
    sessionId: string,
    data: Partial<NonNullable<SessionState['research']>>
  ): Promise<SessionState>;
  updateProduction(
    sessionId: string,
    data: Partial<NonNullable<SessionState['production']>>
  ): Promise<SessionState>;
  updateQuality(
    sessionId: string,
    data: Partial<NonNullable<SessionState['quality']>>
  ): Promise<SessionState>;
  updatePublishing(
    sessionId: string,
    data: Partial<NonNullable<SessionState['publishing']>>
  ): Promise<SessionState>;

  // Status Management
  setStatus(sessionId: string, status: SessionStatus): Promise<SessionState>;
  complete(sessionId: string): Promise<SessionState>;
  fail(sessionId: string, error: string): Promise<SessionState>;

  // Cost Tracking
  addCost(sessionId: string, cost: number): Promise<SessionState>;
  getTotalCost(sessionId: string): Promise<number>;

  // Checkpoint Management
  addCheckpoint(sessionId: string, phase: string, cost: number): Promise<string>;
  getCheckpoints(sessionId: string): Promise<SessionState['checkpoints']>;

  // Query Methods
  getByStatus(status: SessionStatus): Promise<SessionState[]>;
  getActive(): Promise<SessionState[]>;
  getByVideoType(videoType: VideoType): Promise<SessionState[]>;

  // Connection Management (for Redis)
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  isConnected?(): boolean;
}

// ===========================================
// Session Not Found Error
// ===========================================

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`);
    this.name = 'SessionNotFoundError';
  }
}
