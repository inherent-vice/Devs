/**
 * State Machine
 *
 * Enhanced state management with:
 * - Strict state transitions
 * - Transition validation
 * - Recovery/rollback support
 * - Event-driven state changes
 * - HITL integration points
 */

import { EventEmitter } from 'events';
import { SessionStore, SessionState, sessionStore } from './SessionStore.js';
import { CheckpointManager, checkpointManager, CheckpointData } from './CheckpointManager.js';
import type { SessionStatus, SessionInput } from '../agents/base/types.js';

// ===========================================
// State Machine Types
// ===========================================

/**
 * Valid state transitions
 */
const ValidTransitions: Record<SessionStatus, SessionStatus[]> = {
  'created': ['researching', 'failed'],
  'researching': ['producing', 'failed'],
  'producing': ['reviewing', 'failed'],
  'reviewing': ['publishing', 'producing', 'failed'], // Can go back to producing
  'publishing': ['completed', 'failed'],
  'completed': [], // Terminal state
  'failed': ['created', 'researching', 'producing', 'reviewing'], // Can recover to any state
};

/**
 * Phase order for recovery
 */
const PhaseOrder: SessionStatus[] = [
  'created',
  'researching',
  'producing',
  'reviewing',
  'publishing',
  'completed',
];

/**
 * HITL required states
 */
const HITLRequiredStates: SessionStatus[] = ['researching', 'publishing'];

/**
 * State transition event
 */
export interface StateTransitionEvent {
  sessionId: string;
  fromState: SessionStatus;
  toState: SessionStatus;
  timestamp: Date;
  checkpoint?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Recovery options
 */
export interface RecoveryOptions {
  /** Resume from latest checkpoint */
  resumeFromCheckpoint?: boolean;
  /** Specific checkpoint ID to resume from */
  checkpointId?: string;
  /** Force resume even if state doesn't support it */
  force?: boolean;
  /** Skip HITL approval for recovery */
  skipHITL?: boolean;
}

// ===========================================
// State Machine Class
// ===========================================

export class StateMachine extends EventEmitter {
  private store: SessionStore;
  private checkpointMgr: CheckpointManager;
  private transitionHistory = new Map<string, StateTransitionEvent[]>();

  constructor(store?: SessionStore, checkpointMgr?: CheckpointManager) {
    super();
    this.store = store || sessionStore;
    this.checkpointMgr = checkpointMgr || checkpointManager;
  }

  // ===========================================
  // State Transitions
  // ===========================================

  /**
   * Transition session to a new state
   */
  async transition(
    sessionId: string,
    toState: SessionStatus,
    metadata?: Record<string, unknown>
  ): Promise<SessionState> {
    const session = await this.store.get(sessionId);
    const fromState = session.status;

    // Validate transition
    if (!this.isValidTransition(fromState, toState)) {
      throw new Error(
        `Invalid state transition: ${fromState} -> ${toState}. ` +
        `Valid transitions: ${ValidTransitions[fromState].join(', ')}`
      );
    }

    // Create checkpoint before transition (except for terminal states)
    let checkpointId: string | undefined;
    if (toState !== 'completed' && toState !== 'failed') {
      checkpointId = await this.checkpointMgr.saveCheckpoint(session, fromState);
    }

    // Perform transition
    const updated = await this.store.setStatus(sessionId, toState);

    // Record transition
    const event: StateTransitionEvent = {
      sessionId,
      fromState,
      toState,
      timestamp: new Date(),
      checkpoint: checkpointId,
      metadata,
    };

    this.recordTransition(sessionId, event);
    this.emit('transition', event);

    console.log(`[StateMachine] ${sessionId}: ${fromState} -> ${toState}`);
    return updated;
  }

  /**
   * Check if a transition is valid
   */
  isValidTransition(fromState: SessionStatus, toState: SessionStatus): boolean {
    return ValidTransitions[fromState]?.includes(toState) ?? false;
  }

  /**
   * Get valid next states
   */
  getValidNextStates(currentState: SessionStatus): SessionStatus[] {
    return ValidTransitions[currentState] || [];
  }

  // ===========================================
  // Recovery Operations
  // ===========================================

  /**
   * Recover a failed session
   */
  async recover(sessionId: string, options: RecoveryOptions = {}): Promise<SessionState> {
    const session = await this.store.get(sessionId);

    if (session.status !== 'failed') {
      throw new Error(`Cannot recover session in state: ${session.status}`);
    }

    // Determine recovery point
    let recoveryState: SessionState;
    let targetState: SessionStatus;

    if (options.checkpointId) {
      // Recover from specific checkpoint
      recoveryState = await this.checkpointMgr.restore(options.checkpointId);
      targetState = recoveryState.status;
    } else if (options.resumeFromCheckpoint) {
      // Recover from latest checkpoint
      const checkpoint = await this.checkpointMgr.getLatestCheckpoint(sessionId);
      if (!checkpoint) {
        throw new Error('No checkpoint available for recovery');
      }
      recoveryState = checkpoint.state;
      targetState = recoveryState.status;
    } else {
      // Default: restart from beginning
      recoveryState = session;
      targetState = 'created';
    }

    // Validate recovery transition
    if (!options.force && !this.isValidTransition('failed', targetState)) {
      throw new Error(`Cannot recover to state: ${targetState}`);
    }

    // Restore state
    const recovered = await this.store.update(sessionId, {
      ...recoveryState,
      status: targetState,
      metadata: {
        ...recoveryState.metadata,
        updatedAt: new Date(),
      },
    });

    // Emit recovery event
    this.emit('recovery', {
      sessionId,
      fromState: 'failed',
      toState: targetState,
      timestamp: new Date(),
      checkpoint: options.checkpointId,
    });

    console.log(`[StateMachine] Recovered ${sessionId}: failed -> ${targetState}`);
    return recovered;
  }

  /**
   * Rollback to a previous checkpoint
   */
  async rollback(sessionId: string, checkpointId: string): Promise<SessionState> {
    const checkpoint = await this.checkpointMgr.getCheckpoint(checkpointId);

    if (checkpoint.sessionId !== sessionId) {
      throw new Error('Checkpoint does not belong to this session');
    }

    // Restore state
    const restored = await this.store.update(sessionId, {
      ...checkpoint.state,
      metadata: {
        ...checkpoint.state.metadata,
        updatedAt: new Date(),
      },
    });

    this.emit('rollback', {
      sessionId,
      toCheckpoint: checkpointId,
      toState: checkpoint.state.status,
      timestamp: new Date(),
    });

    console.log(`[StateMachine] Rolled back ${sessionId} to checkpoint ${checkpointId}`);
    return restored;
  }

  /**
   * Resume session from where it left off
   */
  async resume(sessionId: string): Promise<{
    session: SessionState;
    nextPhase: SessionStatus | null;
    canResume: boolean;
  }> {
    const session = await this.store.get(sessionId);
    const nextPhase = await this.getNextPhase(session.status);
    const canResume = session.status !== 'completed' && session.status !== 'failed';

    return {
      session,
      nextPhase,
      canResume,
    };
  }

  // ===========================================
  // Phase Management
  // ===========================================

  /**
   * Get the next phase in the pipeline
   */
  async getNextPhase(currentStatus: SessionStatus): Promise<SessionStatus | null> {
    const currentIndex = PhaseOrder.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= PhaseOrder.length - 1) {
      return null;
    }
    return PhaseOrder[currentIndex + 1];
  }

  /**
   * Get the previous phase in the pipeline
   */
  async getPreviousPhase(currentStatus: SessionStatus): Promise<SessionStatus | null> {
    const currentIndex = PhaseOrder.indexOf(currentStatus);
    if (currentIndex <= 0) {
      return null;
    }
    return PhaseOrder[currentIndex - 1];
  }

  /**
   * Check if HITL is required for a state
   */
  requiresHITL(state: SessionStatus): boolean {
    return HITLRequiredStates.includes(state);
  }

  // ===========================================
  // Transition History
  // ===========================================

  /**
   * Record a state transition
   */
  private recordTransition(sessionId: string, event: StateTransitionEvent): void {
    const history = this.transitionHistory.get(sessionId) || [];
    history.push(event);
    this.transitionHistory.set(sessionId, history);
  }

  /**
   * Get transition history for a session
   */
  getTransitionHistory(sessionId: string): StateTransitionEvent[] {
    return this.transitionHistory.get(sessionId) || [];
  }

  /**
   * Clear transition history for a session
   */
  clearTransitionHistory(sessionId: string): void {
    this.transitionHistory.delete(sessionId);
  }

  // ===========================================
  // Convenience Methods
  // ===========================================

  /**
   * Start a new session
   */
  async start(input: SessionInput & { language?: string }): Promise<SessionState> {
    const sessionInput = {
      ...input,
      language: input.language || 'ko',
    };
    const session = await this.store.create(sessionInput);
    this.emit('session_created', { sessionId: session.id, timestamp: new Date() });
    return session;
  }

  /**
   * Complete a session
   */
  async complete(sessionId: string): Promise<SessionState> {
    return this.transition(sessionId, 'completed');
  }

  /**
   * Fail a session
   */
  async fail(sessionId: string, error: string): Promise<SessionState> {
    const session = await this.store.fail(sessionId, error);
    this.emit('session_failed', { sessionId, error, timestamp: new Date() });
    return session;
  }

  /**
   * Move to next phase
   */
  async advance(sessionId: string): Promise<SessionState> {
    const session = await this.store.get(sessionId);
    const nextPhase = await this.getNextPhase(session.status);

    if (!nextPhase) {
      throw new Error(`No next phase available from: ${session.status}`);
    }

    return this.transition(sessionId, nextPhase);
  }

  // ===========================================
  // Status Queries
  // ===========================================

  /**
   * Get session status
   */
  async getStatus(sessionId: string): Promise<SessionStatus> {
    const session = await this.store.get(sessionId);
    return session.status;
  }

  /**
   * Check if session is in a terminal state
   */
  async isTerminal(sessionId: string): Promise<boolean> {
    const status = await this.getStatus(sessionId);
    return status === 'completed' || status === 'failed';
  }

  /**
   * Check if session can be resumed
   */
  async canResume(sessionId: string): Promise<boolean> {
    const status = await this.getStatus(sessionId);
    return status !== 'completed';
  }

  // ===========================================
  // Statistics
  // ===========================================

  /**
   * Get state machine statistics
   */
  async getStats(): Promise<{
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    sessionsByState: Record<string, number>;
  }> {
    const sessions = await this.store.getAll();

    const sessionsByState: Record<string, number> = {};
    let active = 0;
    let completed = 0;
    let failed = 0;

    for (const session of sessions) {
      sessionsByState[session.status] = (sessionsByState[session.status] || 0) + 1;

      if (session.status === 'completed') {
        completed++;
      } else if (session.status === 'failed') {
        failed++;
      } else {
        active++;
      }
    }

    return {
      activeSessions: active,
      completedSessions: completed,
      failedSessions: failed,
      sessionsByState,
    };
  }
}

// ===========================================
// Singleton Export
// ===========================================

export const stateMachine = new StateMachine();

// ===========================================
// Convenience Exports
// ===========================================

export {
  ValidTransitions,
  PhaseOrder,
  HITLRequiredStates,
};
