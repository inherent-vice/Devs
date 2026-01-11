/**
 * SessionStore Unit Tests
 *
 * Tests for in-memory session storage functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStore } from '../../src/state/SessionStore.js';
import type { SessionInput } from '../../src/schemas/common.schema.js';

describe('SessionStore', () => {
  let store: SessionStore;

  const testInput: SessionInput = {
    idea: 'Test video idea',
    videoType: 'shorts',
    targetAudience: 'developers',
    style: 'educational',
    language: 'ko',
  };

  beforeEach(() => {
    store = new SessionStore();
  });

  describe('create', () => {
    it('should create a new session with generated ID', async () => {
      const session = await store.create(testInput);

      expect(session.id).toBeDefined();
      expect(session.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should create a session with correct initial status', async () => {
      const session = await store.create(testInput);

      expect(session.status).toBe('created');
    });

    it('should store input data correctly', async () => {
      const session = await store.create(testInput);

      expect(session.input.idea).toBe(testInput.idea);
      expect(session.input.videoType).toBe(testInput.videoType);
      expect(session.input.targetAudience).toBe(testInput.targetAudience);
      expect(session.input.style).toBe(testInput.style);
      expect(session.input.language).toBe(testInput.language);
    });

    it('should initialize metadata with default values', async () => {
      const session = await store.create(testInput);

      expect(session.metadata.createdAt).toBeInstanceOf(Date);
      expect(session.metadata.updatedAt).toBeInstanceOf(Date);
      expect(session.metadata.totalCost).toBe(0);
      expect(session.metadata.errorCount).toBe(0);
    });

    it('should default language to "ko" when not provided', async () => {
      const inputWithoutLanguage: SessionInput = {
        idea: 'Test idea',
        videoType: 'medium',
      };

      const session = await store.create(inputWithoutLanguage);

      expect(session.input.language).toBe('ko');
    });
  });

  describe('get', () => {
    it('should retrieve an existing session', async () => {
      const created = await store.create(testInput);
      const retrieved = await store.get(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw error for non-existent session', async () => {
      await expect(store.get('non-existent-id')).rejects.toThrow(
        'Session non-existent-id not found'
      );
    });
  });

  describe('getAll', () => {
    it('should return empty array when no sessions exist', async () => {
      const sessions = await store.getAll();

      expect(sessions).toEqual([]);
    });

    it('should return all created sessions', async () => {
      await store.create(testInput);
      await store.create({ ...testInput, idea: 'Second idea' });
      await store.create({ ...testInput, idea: 'Third idea' });

      const sessions = await store.getAll();

      expect(sessions.length).toBe(3);
    });
  });

  describe('update', () => {
    it('should update session status', async () => {
      const session = await store.create(testInput);
      const updated = await store.update(session.id, { status: 'researching' });

      expect(updated.status).toBe('researching');
    });

    it('should update metadata.updatedAt on every update', async () => {
      const session = await store.create(testInput);
      const originalUpdatedAt = session.metadata.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      const updated = await store.update(session.id, { status: 'researching' });

      expect(updated.metadata.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('delete', () => {
    it('should remove session from store', async () => {
      const session = await store.create(testInput);
      await store.delete(session.id);

      await expect(store.get(session.id)).rejects.toThrow();
    });
  });

  describe('phase updates', () => {
    it('should update research phase and set status', async () => {
      const session = await store.create(testInput);
      const updated = await store.updateResearch(session.id, {
        trends: ['trend1', 'trend2'],
      });

      expect(updated.status).toBe('researching');
      expect(updated.research?.trends).toEqual(['trend1', 'trend2']);
    });

    it('should update production phase and set status', async () => {
      const session = await store.create(testInput);
      const updated = await store.updateProduction(session.id, {
        audio: { path: '/audio.mp3' },
      });

      expect(updated.status).toBe('producing');
      expect(updated.production?.audio).toEqual({ path: '/audio.mp3' });
    });

    it('should update quality phase and preserve iterations', async () => {
      const session = await store.create(testInput);
      await store.updateQuality(session.id, { iterations: 1 });
      const updated = await store.updateQuality(session.id, {
        finalScore: 0.9,
      });

      expect(updated.status).toBe('reviewing');
      expect(updated.quality?.iterations).toBe(1);
      expect(updated.quality?.finalScore).toBe(0.9);
    });

    it('should update publishing phase and set status', async () => {
      const session = await store.create(testInput);
      const updated = await store.updatePublishing(session.id, {
        result: { videoId: 'abc123' },
      });

      expect(updated.status).toBe('publishing');
      expect(updated.publishing?.result).toEqual({ videoId: 'abc123' });
    });
  });

  describe('status management', () => {
    it('should set status correctly', async () => {
      const session = await store.create(testInput);
      const updated = await store.setStatus(session.id, 'producing');

      expect(updated.status).toBe('producing');
    });

    it('should set completedAt when marking as completed', async () => {
      const session = await store.create(testInput);
      const completed = await store.complete(session.id);

      expect(completed.status).toBe('completed');
      expect(completed.metadata.completedAt).toBeInstanceOf(Date);
    });

    it('should record error when marking as failed', async () => {
      const session = await store.create(testInput);
      const failed = await store.fail(session.id, 'Test error message');

      expect(failed.status).toBe('failed');
      expect(failed.errors.length).toBe(1);
      expect(failed.errors[0].message).toBe('Test error message');
      expect(failed.metadata.errorCount).toBe(1);
    });
  });

  describe('cost tracking', () => {
    it('should add cost to session', async () => {
      const session = await store.create(testInput);
      await store.addCost(session.id, 1.5);
      const updated = await store.addCost(session.id, 2.5);

      expect(updated.metadata.totalCost).toBe(4.0);
    });

    it('should get total cost', async () => {
      const session = await store.create(testInput);
      await store.addCost(session.id, 3.0);

      const cost = await store.getTotalCost(session.id);

      expect(cost).toBe(3.0);
    });
  });

  describe('checkpoint management', () => {
    it('should add checkpoint with generated ID', async () => {
      const session = await store.create(testInput);
      const checkpointId = await store.addCheckpoint(
        session.id,
        'research',
        0.5
      );

      expect(checkpointId).toContain(session.id);
      expect(checkpointId).toContain('research');
    });

    it('should get checkpoints', async () => {
      const session = await store.create(testInput);
      await store.addCheckpoint(session.id, 'research', 0.5);
      await store.addCheckpoint(session.id, 'production', 1.0);

      const checkpoints = await store.getCheckpoints(session.id);

      expect(checkpoints.length).toBe(2);
      expect(checkpoints[0].phase).toBe('research');
      expect(checkpoints[1].phase).toBe('production');
    });
  });

  describe('query methods', () => {
    it('should get sessions by status', async () => {
      const s1 = await store.create(testInput);
      const s2 = await store.create({ ...testInput, idea: 'Second' });
      await store.create({ ...testInput, idea: 'Third' });

      await store.setStatus(s1.id, 'researching');
      await store.setStatus(s2.id, 'researching');

      const researching = await store.getByStatus('researching');

      expect(researching.length).toBe(2);
    });

    it('should get active sessions', async () => {
      const s1 = await store.create(testInput);
      const s2 = await store.create({ ...testInput, idea: 'Second' });
      const s3 = await store.create({ ...testInput, idea: 'Third' });

      await store.complete(s1.id);
      await store.fail(s2.id, 'Error');

      const active = await store.getActive();

      expect(active.length).toBe(1);
      expect(active[0].id).toBe(s3.id);
    });

    it('should get sessions by video type', async () => {
      await store.create({ ...testInput, videoType: 'shorts' });
      await store.create({ ...testInput, videoType: 'medium' });
      await store.create({ ...testInput, videoType: 'shorts' });

      const shorts = await store.getByVideoType('shorts');

      expect(shorts.length).toBe(2);
    });
  });
});
