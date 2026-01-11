/**
 * Base Types for Agent System
 *
 * Core type definitions used across all agents.
 */

import { z } from 'zod';

// ===========================================
// Agent Context & Results
// ===========================================

/**
 * Context passed to every agent execution
 */
export interface AgentContext {
  /** Unique session identifier */
  sessionId: string;

  /** Current execution phase */
  phase: 'research' | 'production' | 'quality' | 'publishing';

  /** Video type being produced */
  videoType: 'shorts' | 'medium' | 'longform';

  /** Results from previous agents in the pipeline */
  previousResults?: Record<string, unknown>;

  /** Checkpoint ID for recovery */
  lastCheckpoint?: string;

  /** Cost accumulated so far */
  accumulatedCost?: number;

  /** Maximum allowed cost */
  maxCost?: number;

  /** Retry function for error recovery */
  retry?: () => Promise<unknown>;
}

/**
 * Metrics collected from agent execution
 */
export interface AgentMetrics {
  /** Execution duration in milliseconds */
  duration: number;

  /** Total tokens used (input + output) */
  tokensUsed: number;

  /** Input tokens */
  inputTokens: number;

  /** Output tokens */
  outputTokens: number;

  /** Estimated cost in USD */
  cost: number;

  /** Number of retry attempts */
  retryCount: number;
}

/**
 * Result returned from agent execution
 */
export interface AgentResult<T> {
  /** Whether execution was successful */
  success: boolean;

  /** Output data (only if successful) */
  data?: T;

  /** Error information (only if failed) */
  error?: AgentError;

  /** Execution metrics */
  metrics: AgentMetrics;

  /** Agent name that produced this result */
  agentName: string;

  /** Timestamp of completion */
  timestamp: Date;
}

/**
 * Error information from failed execution
 */
export interface AgentError {
  /** Error type/code */
  type: 'validation' | 'api' | 'timeout' | 'cost_limit' | 'quality' | 'unknown';

  /** Error message */
  message: string;

  /** Original error */
  cause?: Error;

  /** Whether this error is retryable */
  retryable: boolean;
}

// ===========================================
// Session State
// ===========================================

export const SessionStatusSchema = z.enum([
  'created',
  'researching',
  'producing',
  'reviewing',
  'publishing',
  'completed',
  'failed',
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const VideoTypeSchema = z.enum(['shorts', 'medium', 'longform']);
export type VideoType = z.infer<typeof VideoTypeSchema>;

export interface SessionInput {
  sessionId?: string;
  idea: string;
  videoType: VideoType;
  targetAudience?: string;
  style?: string;
  language?: string;
}

export interface SessionMetadata {
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  totalCost: number;
  totalDuration?: number;
  errorCount: number;
}

export interface Checkpoint {
  id: string;
  phase: string;
  timestamp: Date;
  data: unknown;
  cost: number;
}

// ===========================================
// Quality Evaluation Types
// ===========================================

export interface QualityDimension {
  name: string;
  weight: number;
  score: number;
  feedback: string;
  issues: QualityIssue[];
}

export interface QualityIssue {
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
}

export interface QualityScore {
  overall: number;
  dimensions: {
    technical: number;
    narrative: number;
    engagement: number;
    originality: number;
    ethical: number;
  };
  issues: QualityIssue[];
  verdict: 'approved' | 'needs_revision' | 'rejected';
  iteration: number;
}

// ===========================================
// Content Types
// ===========================================

export interface TrendData {
  topic: string;
  score: number;
  growth: number;
  relatedKeywords: string[];
  competitorCount: number;
  estimatedViews: number;
}

export interface TopicSelection {
  title: string;
  hook: string;
  angle: string;
  targetKeywords: string[];
  estimatedCTR: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Script {
  title: string;
  hook: string;
  sections: ScriptSection[];
  callToAction: string;
  estimatedDuration: number;
  targetRetention: number;
}

export interface ScriptSection {
  type: 'intro' | 'main' | 'outro' | 'b-roll';
  content: string;
  duration: number;
  visualNotes: string;
  audioNotes?: string;
}

export interface Storyboard {
  scenes: StoryboardScene[];
  totalDuration: number;
  videoType: VideoType;
}

export interface StoryboardScene {
  id: string;
  description: string;
  prompt: string;
  duration: number;
  priority: 'hero' | 'standard' | 'b-roll';
  referenceImages?: string[];
  audioScript?: string;
  transitions?: {
    in: string;
    out: string;
  };
}

// ===========================================
// Media Types
// ===========================================

export interface GeneratedVideo {
  url: string;
  duration: number;
  resolution: string;
  hasAudio: boolean;
  cost: number;
}

export interface GeneratedThumbnail {
  url: string;
  resolution: string;
  variationType?: string;
  testable: boolean;
}

export interface GeneratedAudio {
  url: string;
  duration: number;
  voice: string;
  language: string;
}

export interface ProductionResult {
  video: GeneratedVideo[];
  thumbnail: GeneratedThumbnail[];
  audio: GeneratedAudio;
  totalCost: number;
  totalDuration: number;
}

// ===========================================
// Publishing Types
// ===========================================

export interface PublishMetadata {
  title: string;
  description: string;
  tags: string[];
  category: string;
  language: string;
  thumbnail: string;
  scheduledTime?: Date;
  visibility: 'public' | 'unlisted' | 'private';
}

export interface PublishResult {
  videoId: string;
  url: string;
  status: 'published' | 'scheduled' | 'processing';
  publishedAt?: Date;
}
