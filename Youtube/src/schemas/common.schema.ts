/**
 * Common Zod Schemas
 *
 * Shared schemas used across multiple agents and flows.
 */

import { z } from 'zod';

// ===========================================
// Basic Types
// ===========================================

export const VideoTypeSchema = z.enum(['shorts', 'medium', 'longform']);
export type VideoType = z.infer<typeof VideoTypeSchema>;

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

export const PhaseSchema = z.enum(['research', 'production', 'quality', 'publishing']);
export type Phase = z.infer<typeof PhaseSchema>;

export const PrioritySchema = z.enum(['hero', 'standard', 'b-roll']);
export type Priority = z.infer<typeof PrioritySchema>;

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type Severity = z.infer<typeof SeveritySchema>;

// ===========================================
// Session & Input Schemas
// ===========================================

export const SessionInputSchema = z.object({
  idea: z.string().min(10).max(500).describe('Video idea or topic'),
  videoType: VideoTypeSchema.describe('Type of video to produce'),
  targetAudience: z.string().max(200).optional().describe('Target audience'),
  style: z.string().max(100).optional().describe('Desired style or tone'),
  language: z.string().default('ko').describe('Content language code'),
});
export type SessionInput = z.infer<typeof SessionInputSchema>;

export const SessionMetadataSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  totalCost: z.number().default(0),
  totalDuration: z.number().optional(),
  errorCount: z.number().default(0),
});
export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

// ===========================================
// Research Phase Schemas
// ===========================================

export const TrendDataSchema = z.object({
  topic: z.string(),
  score: z.number().min(0).max(1),
  growth: z.number().describe('Growth rate percentage'),
  relatedKeywords: z.array(z.string()),
  competitorCount: z.number(),
  estimatedViews: z.number(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});
export type TrendData = z.infer<typeof TrendDataSchema>;

export const TopicSelectionSchema = z.object({
  title: z.string().max(100),
  hook: z.string().max(200),
  angle: z.string().max(300),
  targetKeywords: z.array(z.string()),
  estimatedCTR: z.number().min(0).max(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  reasoning: z.string().optional(),
});
export type TopicSelection = z.infer<typeof TopicSelectionSchema>;

export const ScriptSectionSchema = z.object({
  type: z.enum(['hook', 'intro', 'main', 'outro', 'b-roll', 'transition']),
  content: z.string(),
  duration: z.number().min(1),
  visualNotes: z.string(),
  audioNotes: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});
export type ScriptSection = z.infer<typeof ScriptSectionSchema>;

export const ScriptSchema = z.object({
  title: z.string().max(100),
  hook: z.string().max(200),
  sections: z.array(ScriptSectionSchema),
  callToAction: z.string(),
  estimatedDuration: z.number(),
  targetRetention: z.number().min(0).max(1),
  keywords: z.array(z.string()),
});
export type Script = z.infer<typeof ScriptSchema>;

// ===========================================
// Storyboard Schemas
// ===========================================

export const StoryboardSceneSchema = z.object({
  id: z.string(),
  description: z.string().max(500),
  prompt: z.string().max(1000).describe('Veo generation prompt'),
  duration: z.number().min(4).max(8),
  priority: PrioritySchema,
  referenceImages: z.array(z.string()).max(3).optional(),
  audioScript: z.string().optional(),
  transitions: z.object({
    in: z.string(),
    out: z.string(),
  }).optional(),
});
export type StoryboardScene = z.infer<typeof StoryboardSceneSchema>;

export const StoryboardSchema = z.object({
  scenes: z.array(StoryboardSceneSchema),
  totalDuration: z.number(),
  videoType: VideoTypeSchema,
  style: z.string().optional(),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;

// ===========================================
// Production Phase Schemas
// ===========================================

export const GeneratedVideoSchema = z.object({
  url: z.string().url(),
  duration: z.number(),
  resolution: z.string(),
  hasAudio: z.boolean(),
  cost: z.number(),
  sceneId: z.string().optional(),
});
export type GeneratedVideo = z.infer<typeof GeneratedVideoSchema>;

export const GeneratedThumbnailSchema = z.object({
  url: z.string().url(),
  resolution: z.string(),
  variationType: z.string().optional(),
  testable: z.boolean(),
});
export type GeneratedThumbnail = z.infer<typeof GeneratedThumbnailSchema>;

export const GeneratedAudioSchema = z.object({
  url: z.string().url(),
  duration: z.number(),
  voice: z.string(),
  language: z.string(),
});
export type GeneratedAudio = z.infer<typeof GeneratedAudioSchema>;

export const ProductionResultSchema = z.object({
  videos: z.array(GeneratedVideoSchema),
  thumbnails: z.array(GeneratedThumbnailSchema),
  audio: GeneratedAudioSchema,
  totalCost: z.number(),
  totalDuration: z.number(),
});
export type ProductionResult = z.infer<typeof ProductionResultSchema>;

// ===========================================
// Quality Phase Schemas
// ===========================================

export const QualityIssueSchema = z.object({
  dimension: z.string(),
  severity: SeveritySchema,
  description: z.string(),
  suggestion: z.string(),
  location: z.string().optional(),
});
export type QualityIssue = z.infer<typeof QualityIssueSchema>;

export const QualityDimensionSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(1),
  score: z.number().min(0).max(1),
  feedback: z.string(),
  issues: z.array(QualityIssueSchema),
});
export type QualityDimension = z.infer<typeof QualityDimensionSchema>;

export const QualityScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  dimensions: z.object({
    technical: z.number().min(0).max(1),
    narrative: z.number().min(0).max(1),
    engagement: z.number().min(0).max(1),
    originality: z.number().min(0).max(1),
    ethical: z.number().min(0).max(1),
  }),
  issues: z.array(QualityIssueSchema),
  verdict: z.enum(['approved', 'needs_revision', 'rejected']),
  iteration: z.number(),
  feedback: z.string(),
});
export type QualityScore = z.infer<typeof QualityScoreSchema>;

// ===========================================
// Publishing Phase Schemas
// ===========================================

export const PublishMetadataSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(5000),
  tags: z.array(z.string()).max(30),
  category: z.string(),
  language: z.string(),
  thumbnail: z.string().url(),
  scheduledTime: z.date().optional(),
  visibility: z.enum(['public', 'unlisted', 'private']),
});
export type PublishMetadata = z.infer<typeof PublishMetadataSchema>;

export const PublishResultSchema = z.object({
  videoId: z.string(),
  url: z.string().url(),
  status: z.enum(['published', 'scheduled', 'processing']),
  publishedAt: z.date().optional(),
});
export type PublishResult = z.infer<typeof PublishResultSchema>;

// ===========================================
// Checkpoint Schema
// ===========================================

export const CheckpointSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  phase: PhaseSchema,
  timestamp: z.date(),
  data: z.unknown(),
  cost: z.number(),
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

// ===========================================
// Agent Result Schema
// ===========================================

export const AgentMetricsSchema = z.object({
  duration: z.number(),
  tokensUsed: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cost: z.number(),
  retryCount: z.number(),
});
export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;

export const AgentErrorSchema = z.object({
  type: z.enum(['validation', 'api', 'timeout', 'cost_limit', 'quality', 'unknown']),
  message: z.string(),
  retryable: z.boolean(),
});
export type AgentError = z.infer<typeof AgentErrorSchema>;
