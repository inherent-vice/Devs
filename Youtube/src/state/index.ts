/**
 * State Management Module
 *
 * Provides session state management, checkpoints, and state machine functionality.
 * Supports both in-memory (development) and Redis (production) backends.
 */

export * from './SessionStore.js';
export * from './ISessionStore.js';
export * from './RedisStore.js';
export * from './CheckpointManager.js';
export * from './StateMachine.js';

import { SessionStore } from './SessionStore.js';
import { RedisStore } from './RedisStore.js';
import type { ISessionStore } from './ISessionStore.js';

// ===========================================
// Store Factory
// ===========================================

let defaultStore: ISessionStore | null = null;

/**
 * Get or create the default session store based on environment
 *
 * - If REDIS_URL is set: use RedisStore
 * - Otherwise: use in-memory SessionStore
 */
export function getSessionStore(): ISessionStore {
  if (defaultStore) {
    return defaultStore;
  }

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    console.log('[SessionStore] Using Redis backend');
    defaultStore = new RedisStore(redisUrl);
  } else {
    console.log('[SessionStore] Using in-memory backend');
    defaultStore = new SessionStore();
  }

  return defaultStore;
}

/**
 * Create a specific store type
 */
export function createSessionStore(type: 'memory' | 'redis', options?: { redisUrl?: string }): ISessionStore {
  switch (type) {
    case 'redis':
      return new RedisStore(options?.redisUrl);
    case 'memory':
    default:
      return new SessionStore();
  }
}

/**
 * Reset the default store (for testing)
 */
export function resetDefaultStore(): void {
  defaultStore = null;
}
