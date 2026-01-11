/**
 * Video Generation Queue
 *
 * BullMQ-based queue for async video generation tasks.
 * Handles long-running video generation without blocking API requests.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BullQueue = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BullJob = any;

import type { VideoType } from '../schemas/common.schema.js';
import type { MasterFlowOutput } from '../flows/MasterFlow.js';

// ===========================================
// Types
// ===========================================

export interface VideoJobData {
  sessionId: string;
  idea: string;
  videoType: VideoType;
  options?: {
    targetAudience?: string;
    style?: string;
    language?: string;
  };
  config?: {
    maxCost?: number;
    skipPublish?: boolean;
  };
}

export interface VideoJobResult {
  success: boolean;
  sessionId: string;
  result?: MasterFlowOutput;
  error?: string;
  duration: number;
  cost: number;
}

export type VideoJobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface VideoJobInfo {
  id: string;
  sessionId: string;
  status: VideoJobStatus;
  progress: number;
  data: VideoJobData;
  result?: VideoJobResult;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

// ===========================================
// Queue Configuration
// ===========================================

const QUEUE_CONFIG = {
  name: 'video-generation',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // 7 days
      count: 1000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // 30 days
    },
  },
};

// ===========================================
// Video Queue Class
// ===========================================

export class VideoQueue {
  private queue: BullQueue | null = null;
  private initialized: boolean = false;
  private redisUrl: string;

  constructor(redisUrl?: string) {
    this.redisUrl = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
  }

  // ===========================================
  // Initialization
  // ===========================================

  private async ensureQueue(): Promise<void> {
    if (this.initialized && this.queue) return;

    try {
      const { Queue } = await import('bullmq');

      this.queue = new Queue(QUEUE_CONFIG.name, {
        connection: {
          url: this.redisUrl,
        },
        defaultJobOptions: QUEUE_CONFIG.defaultJobOptions,
      });

      this.initialized = true;
      console.log('[VideoQueue] Queue initialized');
    } catch (error) {
      console.error('[VideoQueue] Failed to initialize queue. Is bullmq installed?');
      throw error;
    }
  }

  // ===========================================
  // Job Management
  // ===========================================

  /**
   * Add a new video generation job to the queue
   */
  async addJob(data: VideoJobData, options?: {
    priority?: number;
    delay?: number;
  }): Promise<string> {
    await this.ensureQueue();

    const job = await this.queue.add(
      'generate',
      data,
      {
        priority: options?.priority,
        delay: options?.delay,
      }
    );

    console.log(`[VideoQueue] Job ${job.id} added for session ${data.sessionId}`);
    return job.id;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<VideoJobInfo | null> {
    await this.ensureQueue();

    const job: BullJob = await this.queue.getJob(jobId);
    if (!job) return null;

    return this.formatJobInfo(job);
  }

  /**
   * Get job by session ID
   */
  async getJobBySessionId(sessionId: string): Promise<VideoJobInfo | null> {
    await this.ensureQueue();

    // Search through all job states
    const states = ['waiting', 'active', 'completed', 'failed', 'delayed'];

    for (const state of states) {
      const jobs = await this.queue.getJobs([state]);
      const job = jobs.find((j: BullJob) => j.data?.sessionId === sessionId);
      if (job) {
        return this.formatJobInfo(job);
      }
    }

    return null;
  }

  /**
   * Get all jobs
   */
  async getAllJobs(status?: VideoJobStatus): Promise<VideoJobInfo[]> {
    await this.ensureQueue();

    const states = status ? [status] : ['waiting', 'active', 'completed', 'failed', 'delayed'];
    const jobs = await this.queue.getJobs(states);

    return Promise.all(jobs.map((job: BullJob) => this.formatJobInfo(job)));
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    await this.ensureQueue();

    const counts = await this.queue.getJobCounts();
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    await this.ensureQueue();

    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state === 'active') {
      // Cannot cancel active job directly
      return false;
    }

    await job.remove();
    console.log(`[VideoQueue] Job ${jobId} cancelled`);
    return true;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    await this.ensureQueue();

    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state !== 'failed') return false;

    await job.retry();
    console.log(`[VideoQueue] Job ${jobId} retried`);
    return true;
  }

  /**
   * Clean old jobs
   */
  async cleanJobs(grace?: number, limit?: number): Promise<number[]> {
    await this.ensureQueue();

    const removed = await this.queue.clean(
      grace ?? 24 * 3600 * 1000, // 24 hours
      limit ?? 1000,
      'completed'
    );

    return removed;
  }

  // ===========================================
  // Helpers
  // ===========================================

  private async formatJobInfo(job: BullJob): Promise<VideoJobInfo> {
    const state = await job.getState();

    return {
      id: job.id,
      sessionId: job.data.sessionId,
      status: state as VideoJobStatus,
      progress: job.progress || 0,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }

  // ===========================================
  // Cleanup
  // ===========================================

  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
      this.initialized = false;
      console.log('[VideoQueue] Queue closed');
    }
  }
}

// ===========================================
// Default Export
// ===========================================

let defaultQueue: VideoQueue | null = null;

export function getVideoQueue(): VideoQueue {
  if (!defaultQueue) {
    defaultQueue = new VideoQueue();
  }
  return defaultQueue;
}
