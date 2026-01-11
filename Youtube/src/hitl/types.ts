/**
 * Human-in-the-Loop Types
 *
 * Type definitions for human review and approval workflows.
 */

import { z } from 'zod';

// ===========================================
// Review Point Schema
// ===========================================

export const ReviewPointSchema = z.enum([
  'research_complete',      // After trend/topic research
  'script_ready',           // After script generation (REQUIRED)
  'storyboard_ready',       // After storyboard creation
  'production_complete',    // After video/audio/thumbnail generation
  'quality_approved',       // After quality evaluation loop
  'pre_publish',            // Before YouTube upload (REQUIRED)
]);

export type ReviewPoint = z.infer<typeof ReviewPointSchema>;

// ===========================================
// Review Request Schema
// ===========================================

export const ReviewRequestSchema = z.object({
  /** Unique request ID */
  id: z.string(),

  /** Session ID this review belongs to */
  sessionId: z.string(),

  /** Review point in the pipeline */
  reviewPoint: ReviewPointSchema,

  /** Content to review */
  content: z.object({
    type: z.string(),
    data: z.any(),
    summary: z.string().optional(),
  }),

  /** Request status */
  status: z.enum(['pending', 'approved', 'rejected', 'modified', 'timeout', 'auto_approved']),

  /** Priority level */
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),

  /** Whether this review point is required */
  required: z.boolean().default(false),

  /** Request creation time */
  createdAt: z.string().datetime(),

  /** Review deadline */
  deadline: z.string().datetime().optional(),

  /** Who should review (user ID or role) */
  assignedTo: z.string().optional(),

  /** Metadata */
  metadata: z.record(z.any()).optional(),
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

// ===========================================
// Review Decision Schema
// ===========================================

export const ReviewDecisionSchema = z.object({
  /** Request ID this decision is for */
  requestId: z.string(),

  /** Decision outcome */
  decision: z.enum(['approved', 'rejected', 'modified']),

  /** Modified content (if decision is 'modified') */
  modifiedContent: z.any().optional(),

  /** Feedback/comments from reviewer */
  feedback: z.string().optional(),

  /** Reviewer ID */
  reviewerId: z.string().optional(),

  /** Decision timestamp */
  decidedAt: z.string().datetime(),
});

export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

// ===========================================
// Review Configuration
// ===========================================

export interface ReviewPointConfig {
  /** Review point name */
  point: ReviewPoint;

  /** Is this review point required? */
  required: boolean;

  /** Description of what to review */
  description: string;

  /** Timeout in milliseconds (0 = no timeout) */
  timeout: number;

  /** Action on timeout */
  timeoutAction: 'auto_approve' | 'auto_reject' | 'wait';

  /** Priority level */
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export const DefaultReviewConfig: Record<ReviewPoint, ReviewPointConfig> = {
  'research_complete': {
    point: 'research_complete',
    required: false,
    description: 'Review trend analysis and topic selection',
    timeout: 0, // No timeout
    timeoutAction: 'auto_approve',
    priority: 'normal',
  },
  'script_ready': {
    point: 'script_ready',
    required: true, // REQUIRED
    description: 'Review and approve the video script',
    timeout: 24 * 60 * 60 * 1000, // 24 hours
    timeoutAction: 'wait',
    priority: 'high',
  },
  'storyboard_ready': {
    point: 'storyboard_ready',
    required: false,
    description: 'Review scene descriptions and visual plans',
    timeout: 0,
    timeoutAction: 'auto_approve',
    priority: 'normal',
  },
  'production_complete': {
    point: 'production_complete',
    required: false,
    description: 'Review generated media assets',
    timeout: 0,
    timeoutAction: 'auto_approve',
    priority: 'normal',
  },
  'quality_approved': {
    point: 'quality_approved',
    required: false,
    description: 'Review quality evaluation results',
    timeout: 0,
    timeoutAction: 'auto_approve',
    priority: 'normal',
  },
  'pre_publish': {
    point: 'pre_publish',
    required: true, // REQUIRED
    description: 'Final approval before YouTube upload',
    timeout: 24 * 60 * 60 * 1000, // 24 hours
    timeoutAction: 'wait',
    priority: 'urgent',
  },
};

// ===========================================
// Event Types
// ===========================================

export type HITLEventType =
  | 'review_requested'
  | 'review_approved'
  | 'review_rejected'
  | 'review_modified'
  | 'review_timeout'
  | 'review_cancelled';

export interface HITLEvent {
  type: HITLEventType;
  requestId: string;
  sessionId: string;
  reviewPoint: ReviewPoint;
  timestamp: Date;
  data?: unknown;
}
