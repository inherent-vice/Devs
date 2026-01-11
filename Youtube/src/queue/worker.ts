/**
 * Video Generation Worker
 *
 * BullMQ worker that processes video generation jobs.
 * Runs as a separate process for long-running tasks.
 */

import type { Job, Worker } from 'bullmq';
import path from 'path';
import { fileURLToPath } from 'url';

import { masterFlow } from '../flows/MasterFlow.js';
import { getSessionStore } from '../state/index.js';
import type { VideoJobData, VideoJobResult } from './VideoQueue.js';

// ===========================================
// Configuration
// ===========================================

const WORKER_CONFIG = {
  queueName: 'video-generation',
  concurrency: 2, // Process 2 jobs at a time
  limiter: {
    max: 10,
    duration: 60000, // 10 jobs per minute max
  },
};

// ===========================================
// Job Processor
// ===========================================

async function processVideoJob(job: Job<VideoJobData, VideoJobResult>): Promise<VideoJobResult> {
  const data: VideoJobData = job.data;
  const startTime = Date.now();

  console.log(`[Worker] Processing job ${job.id} for session ${data.sessionId}`);

  const sessionStore = getSessionStore();

  try {
    // Update job progress
    await job.updateProgress(5);

    // Create or get session
    try {
      await sessionStore.get(data.sessionId);
    } catch {
      // Session doesn't exist, create it
      await sessionStore.create({
        sessionId: data.sessionId,
        idea: data.idea,
        videoType: data.videoType,
        targetAudience: data.options?.targetAudience,
        style: data.options?.style,
        language: data.options?.language || 'ko',
      });
    }

    await job.updateProgress(10);

    // Run the master flow
    const result = await masterFlow({
      idea: data.idea,
      videoType: data.videoType,
      targetAudience: data.options?.targetAudience,
      style: data.options?.style,
      language: data.options?.language || 'ko',
      options: {
        useFastGeneration: true,
        maxQualityIterations: 3,
        minQualityThreshold: 0.85,
        skipProduction: false,
        skipQuality: false,
        maxBudget: data.config?.maxCost || 30,
      },
    });

    await job.updateProgress(100);

    const duration = Date.now() - startTime;

    // Determine success based on status
    const success = result.status === 'completed';

    // Update session status
    if (success) {
      await sessionStore.complete(data.sessionId);
    } else {
      await sessionStore.fail(data.sessionId, 'Workflow did not complete successfully');
    }

    console.log(`[Worker] Job ${job.id} completed in ${duration}ms`);

    return {
      success,
      sessionId: data.sessionId,
      result,
      duration,
      cost: result.metadata?.totalCost || 0,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const duration = Date.now() - startTime;

    console.error(`[Worker] Job ${job.id} failed:`, err.message);

    // Update session status
    try {
      await sessionStore.fail(data.sessionId, err.message);
    } catch {
      // Ignore session update errors
    }

    return {
      success: false,
      sessionId: data.sessionId,
      error: err.message,
      duration,
      cost: 0,
    };
  }
}

// ===========================================
// Worker Factory
// ===========================================

export async function createWorker(
  redisUrl?: string
): Promise<Worker<VideoJobData, VideoJobResult>> {
  const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

  const { Worker } = await import('bullmq');
  const worker = new Worker<VideoJobData, VideoJobResult>(
    WORKER_CONFIG.queueName,
    processVideoJob,
    {
      connection: { url },
      concurrency: WORKER_CONFIG.concurrency,
      limiter: WORKER_CONFIG.limiter,
    }
  );

  // Event handlers
  worker.on('completed', (job: Job<VideoJobData, VideoJobResult>, result: VideoJobResult) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job<VideoJobData, VideoJobResult> | undefined, error: Error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error: Error) => {
    console.error('[Worker] Worker error:', error.message);
  });

  worker.on('stalled', (jobId: string) => {
    console.warn(`[Worker] Job ${jobId} stalled`);
  });

  console.log('[Worker] Worker started');

  return worker;
}

// ===========================================
// Standalone Entry Point
// ===========================================

// Run worker as standalone process if executed directly
const modulePath = fileURLToPath(import.meta.url);
const isMainModule = path.resolve(process.argv[1] || '') === path.resolve(modulePath);

if (isMainModule) {
  const worker = await createWorker();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Worker] Shutting down...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
