/**
 * Human Review Gateway
 *
 * Manages human-in-the-loop review workflows:
 * - Request submission and tracking
 * - Timeout handling
 * - Notification integration
 * - Decision processing
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ReviewPoint,
  ReviewRequest,
  ReviewDecision,
  ReviewPointConfig,
  DefaultReviewConfig,
  HITLEvent,
  HITLEventType,
} from './types.js';

// ===========================================
// Gateway Options
// ===========================================

interface GatewayOptions {
  /** Custom review point configurations */
  reviewConfigs?: Partial<Record<ReviewPoint, Partial<ReviewPointConfig>>>;

  /** Default timeout for reviews (ms) */
  defaultTimeout?: number;

  /** Enable auto-approval for non-required reviews */
  autoApproveNonRequired?: boolean;

  /** Notification callback */
  onNotify?: (request: ReviewRequest) => Promise<void>;
}

// ===========================================
// Human Review Gateway
// ===========================================

export class HumanReviewGateway extends EventEmitter {
  private pendingReviews = new Map<string, ReviewRequest>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  private configs: Record<ReviewPoint, ReviewPointConfig>;
  private options: GatewayOptions;

  constructor(options: GatewayOptions = {}) {
    super();
    this.options = options;

    // Merge custom configs with defaults
    this.configs = { ...DefaultReviewConfig };
    if (options.reviewConfigs) {
      for (const [point, config] of Object.entries(options.reviewConfigs)) {
        this.configs[point as ReviewPoint] = {
          ...this.configs[point as ReviewPoint],
          ...config,
        };
      }
    }
  }

  // ===========================================
  // Review Request Management
  // ===========================================

  /**
   * Request human review
   */
  async requestReview(params: {
    sessionId: string;
    reviewPoint: ReviewPoint;
    content: ReviewRequest['content'];
    assignedTo?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ReviewDecision> {
    const config = this.configs[params.reviewPoint];

    // Check if auto-approve for non-required
    if (this.options.autoApproveNonRequired && !config.required) {
      console.log(`[HITL] Auto-approving non-required review: ${params.reviewPoint}`);
      return {
        requestId: uuidv4(),
        decision: 'approved',
        decidedAt: new Date().toISOString(),
        feedback: 'Auto-approved (non-required review point)',
      };
    }

    // Create review request
    const request: ReviewRequest = {
      id: uuidv4(),
      sessionId: params.sessionId,
      reviewPoint: params.reviewPoint,
      content: params.content,
      status: 'pending',
      priority: config.priority,
      required: config.required,
      createdAt: new Date().toISOString(),
      deadline: config.timeout > 0
        ? new Date(Date.now() + config.timeout).toISOString()
        : undefined,
      assignedTo: params.assignedTo,
      metadata: params.metadata,
    };

    // Store pending review
    this.pendingReviews.set(request.id, request);

    // Emit event
    this.emitEvent('review_requested', request);
    console.log(`[HITL] Review requested: ${request.id} (${params.reviewPoint})`);

    // Send notification
    if (this.options.onNotify) {
      try {
        await this.options.onNotify(request);
      } catch (error) {
        console.warn('[HITL] Notification failed:', error);
      }
    }

    // Set timeout if configured
    if (config.timeout > 0) {
      const timer = setTimeout(() => {
        this.handleTimeout(request.id, config.timeoutAction);
      }, config.timeout);
      this.timeouts.set(request.id, timer);
    }

    // Wait for decision
    return this.waitForDecision(request.id, config.timeout);
  }

  /**
   * Submit a review decision
   */
  submitDecision(decision: ReviewDecision): void {
    const request = this.pendingReviews.get(decision.requestId);
    if (!request) {
      throw new Error(`Review request not found: ${decision.requestId}`);
    }

    // Clear timeout
    const timer = this.timeouts.get(decision.requestId);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(decision.requestId);
    }

    // Update request status
    request.status = decision.decision;
    this.pendingReviews.delete(decision.requestId);

    // Emit event
    const eventType: HITLEventType =
      decision.decision === 'approved' ? 'review_approved' :
      decision.decision === 'rejected' ? 'review_rejected' : 'review_modified';

    this.emitEvent(eventType, request, decision);
    console.log(`[HITL] Decision submitted: ${decision.requestId} -> ${decision.decision}`);

    // Emit for waiters
    this.emit(`decision:${decision.requestId}`, decision);
  }

  /**
   * Cancel a pending review
   */
  cancelReview(requestId: string): boolean {
    const request = this.pendingReviews.get(requestId);
    if (!request) return false;

    // Clear timeout
    const timer = this.timeouts.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(requestId);
    }

    // Update status
    request.status = 'rejected';
    this.pendingReviews.delete(requestId);

    // Emit event
    this.emitEvent('review_cancelled', request);

    // Reject waiters
    this.emit(`decision:${requestId}`, {
      requestId,
      decision: 'rejected',
      feedback: 'Review cancelled',
      decidedAt: new Date().toISOString(),
    } as ReviewDecision);

    return true;
  }

  // ===========================================
  // Review Status
  // ===========================================

  /**
   * Get pending reviews for a session
   */
  getPendingReviews(sessionId?: string): ReviewRequest[] {
    const reviews = Array.from(this.pendingReviews.values());
    if (sessionId) {
      return reviews.filter(r => r.sessionId === sessionId);
    }
    return reviews;
  }

  /**
   * Get a specific review request
   */
  getReview(requestId: string): ReviewRequest | undefined {
    return this.pendingReviews.get(requestId);
  }

  /**
   * Check if a review is required
   */
  isRequired(reviewPoint: ReviewPoint): boolean {
    return this.configs[reviewPoint].required;
  }

  /**
   * Get review point configuration
   */
  getConfig(reviewPoint: ReviewPoint): ReviewPointConfig {
    return this.configs[reviewPoint];
  }

  // ===========================================
  // Internal Methods
  // ===========================================

  /**
   * Wait for a decision on a review
   */
  private waitForDecision(requestId: string, timeout: number): Promise<ReviewDecision> {
    return new Promise((resolve, reject) => {
      // Set up decision listener
      const onDecision = (decision: ReviewDecision) => {
        resolve(decision);
      };

      this.once(`decision:${requestId}`, onDecision);

      // Handle case where timeout is 0 (wait indefinitely)
      // The timeout is already set in requestReview, this is just for cleanup
    });
  }

  /**
   * Handle review timeout
   */
  private handleTimeout(requestId: string, action: ReviewPointConfig['timeoutAction']): void {
    const request = this.pendingReviews.get(requestId);
    if (!request) return;

    console.log(`[HITL] Review timeout: ${requestId} -> ${action}`);

    switch (action) {
      case 'auto_approve':
        request.status = 'auto_approved';
        this.pendingReviews.delete(requestId);
        this.emitEvent('review_timeout', request);
        this.emit(`decision:${requestId}`, {
          requestId,
          decision: 'approved',
          feedback: 'Auto-approved due to timeout',
          decidedAt: new Date().toISOString(),
        } as ReviewDecision);
        break;

      case 'auto_reject':
        request.status = 'timeout';
        this.pendingReviews.delete(requestId);
        this.emitEvent('review_timeout', request);
        this.emit(`decision:${requestId}`, {
          requestId,
          decision: 'rejected',
          feedback: 'Rejected due to timeout',
          decidedAt: new Date().toISOString(),
        } as ReviewDecision);
        break;

      case 'wait':
        // Continue waiting, just emit event
        request.status = 'timeout';
        this.emitEvent('review_timeout', request);
        // Don't resolve, keep waiting
        break;
    }
  }

  /**
   * Emit a HITL event
   */
  private emitEvent(
    type: HITLEventType,
    request: ReviewRequest,
    decision?: ReviewDecision
  ): void {
    const event: HITLEvent = {
      type,
      requestId: request.id,
      sessionId: request.sessionId,
      reviewPoint: request.reviewPoint,
      timestamp: new Date(),
      data: decision,
    };
    this.emit('hitl_event', event);
  }

  // ===========================================
  // Cleanup
  // ===========================================

  /**
   * Clear all pending reviews
   */
  clearAll(): void {
    // Clear all timeouts
    for (const timer of this.timeouts.values()) {
      clearTimeout(timer);
    }
    this.timeouts.clear();
    this.pendingReviews.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    pendingCount: number;
    byReviewPoint: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const reviews = Array.from(this.pendingReviews.values());

    const byReviewPoint: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const review of reviews) {
      byReviewPoint[review.reviewPoint] = (byReviewPoint[review.reviewPoint] || 0) + 1;
      byPriority[review.priority] = (byPriority[review.priority] || 0) + 1;
    }

    return {
      pendingCount: reviews.length,
      byReviewPoint,
      byPriority,
    };
  }
}

// ===========================================
// Singleton Export
// ===========================================

let gatewayInstance: HumanReviewGateway | null = null;

export function getHumanReviewGateway(options?: GatewayOptions): HumanReviewGateway {
  if (!gatewayInstance) {
    gatewayInstance = new HumanReviewGateway(options);
    console.log('[HITL] Gateway initialized');
  }
  return gatewayInstance;
}

// ===========================================
// Convenience Functions
// ===========================================

/**
 * Request script approval
 */
export async function requestScriptApproval(
  sessionId: string,
  script: { title: string; fullText: string; sections: unknown[] },
  assignedTo?: string
): Promise<ReviewDecision> {
  const gateway = getHumanReviewGateway();
  return gateway.requestReview({
    sessionId,
    reviewPoint: 'script_ready',
    content: {
      type: 'script',
      data: script,
      summary: `Script: "${script.title}" (${script.sections.length} sections)`,
    },
    assignedTo,
  });
}

/**
 * Request publish approval
 */
export async function requestPublishApproval(
  sessionId: string,
  publishData: {
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl?: string;
  },
  assignedTo?: string
): Promise<ReviewDecision> {
  const gateway = getHumanReviewGateway();
  return gateway.requestReview({
    sessionId,
    reviewPoint: 'pre_publish',
    content: {
      type: 'publish',
      data: publishData,
      summary: `Ready to publish: "${publishData.title}"`,
    },
    assignedTo,
  });
}

/**
 * Approve a review (for CLI/testing)
 */
export function approveReview(requestId: string, feedback?: string): void {
  const gateway = getHumanReviewGateway();
  gateway.submitDecision({
    requestId,
    decision: 'approved',
    feedback,
    decidedAt: new Date().toISOString(),
  });
}

/**
 * Reject a review (for CLI/testing)
 */
export function rejectReview(requestId: string, feedback?: string): void {
  const gateway = getHumanReviewGateway();
  gateway.submitDecision({
    requestId,
    decision: 'rejected',
    feedback,
    decidedAt: new Date().toISOString(),
  });
}
