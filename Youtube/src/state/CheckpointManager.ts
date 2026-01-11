/**
 * Checkpoint Manager
 *
 * Manages checkpoints for session recovery and state persistence.
 * Allows resuming from any phase in case of failure.
 */

import type { SessionState } from './SessionStore.js';

// ===========================================
// Checkpoint Data Types
// ===========================================

export interface CheckpointData {
  id: string;
  sessionId: string;
  phase: string;
  state: SessionState;
  createdAt: Date;
  metadata: {
    cost: number;
    duration: number;
    agentResults: Record<string, unknown>;
  };
}

export interface CheckpointInfo {
  id: string;
  phase: string;
  createdAt: Date;
  cost: number;
}

// ===========================================
// Checkpoint Manager Class
// ===========================================

export class CheckpointManager {
  private checkpoints = new Map<string, CheckpointData>();
  private sessionCheckpoints = new Map<string, string[]>();

  // ===========================================
  // Checkpoint Creation
  // ===========================================

  /**
   * Save a checkpoint for a session
   */
  async saveCheckpoint(
    session: SessionState,
    phase: string,
    agentResults: Record<string, unknown> = {}
  ): Promise<string> {
    const checkpointId = `${session.id}/${phase}/${Date.now()}`;

    const checkpoint: CheckpointData = {
      id: checkpointId,
      sessionId: session.id,
      phase,
      state: this.cloneState(session),
      createdAt: new Date(),
      metadata: {
        cost: session.metadata.totalCost,
        duration: Date.now() - session.metadata.createdAt.getTime(),
        agentResults,
      },
    };

    // Save checkpoint
    this.checkpoints.set(checkpointId, checkpoint);

    // Update session's checkpoint list
    const sessionCps = this.sessionCheckpoints.get(session.id) || [];
    sessionCps.push(checkpointId);
    this.sessionCheckpoints.set(session.id, sessionCps);

    console.log(`[Checkpoint] Saved: ${checkpointId}`);
    return checkpointId;
  }

  /**
   * Save checkpoint after research phase
   */
  async saveResearchCheckpoint(
    session: SessionState,
    results: { trends?: unknown; topic?: unknown; script?: unknown }
  ): Promise<string> {
    return this.saveCheckpoint(session, 'research', results);
  }

  /**
   * Save checkpoint after production phase
   */
  async saveProductionCheckpoint(
    session: SessionState,
    results: { audio?: unknown; videos?: unknown; thumbnails?: unknown }
  ): Promise<string> {
    return this.saveCheckpoint(session, 'production', results);
  }

  /**
   * Save checkpoint after quality iteration
   */
  async saveQualityCheckpoint(
    session: SessionState,
    iteration: number,
    score: number
  ): Promise<string> {
    return this.saveCheckpoint(session, `quality-${iteration}`, {
      iteration,
      score,
    });
  }

  // ===========================================
  // Checkpoint Retrieval
  // ===========================================

  /**
   * Get a checkpoint by ID
   */
  async getCheckpoint(checkpointId: string): Promise<CheckpointData> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }
    return checkpoint;
  }

  /**
   * Restore session state from checkpoint
   */
  async restore(checkpointId: string): Promise<SessionState> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    console.log(`[Checkpoint] Restoring from: ${checkpointId}`);
    return this.cloneState(checkpoint.state);
  }

  /**
   * List all checkpoints for a session
   */
  async listCheckpoints(sessionId: string): Promise<CheckpointInfo[]> {
    const checkpointIds = this.sessionCheckpoints.get(sessionId) || [];

    return checkpointIds.map(id => {
      const cp = this.checkpoints.get(id)!;
      return {
        id: cp.id,
        phase: cp.phase,
        createdAt: cp.createdAt,
        cost: cp.metadata.cost,
      };
    });
  }

  /**
   * Get the latest checkpoint for a session
   */
  async getLatestCheckpoint(sessionId: string): Promise<CheckpointData | null> {
    const checkpointIds = this.sessionCheckpoints.get(sessionId) || [];
    if (checkpointIds.length === 0) return null;

    const latestId = checkpointIds[checkpointIds.length - 1];
    return this.checkpoints.get(latestId) || null;
  }

  /**
   * Get checkpoint for specific phase
   */
  async getPhaseCheckpoint(
    sessionId: string,
    phase: string
  ): Promise<CheckpointData | null> {
    const checkpointIds = this.sessionCheckpoints.get(sessionId) || [];

    // Find checkpoints for this phase (may have multiple for quality iterations)
    const phaseCheckpoints = checkpointIds.filter(id => {
      const cp = this.checkpoints.get(id);
      return cp?.phase.startsWith(phase);
    });

    if (phaseCheckpoints.length === 0) return null;

    // Return the latest one for this phase
    const latestId = phaseCheckpoints[phaseCheckpoints.length - 1];
    return this.checkpoints.get(latestId) || null;
  }

  // ===========================================
  // Checkpoint Cleanup
  // ===========================================

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) return;

    // Remove from session list
    const sessionCps = this.sessionCheckpoints.get(checkpoint.sessionId) || [];
    const index = sessionCps.indexOf(checkpointId);
    if (index > -1) {
      sessionCps.splice(index, 1);
      this.sessionCheckpoints.set(checkpoint.sessionId, sessionCps);
    }

    // Delete checkpoint
    this.checkpoints.delete(checkpointId);
    console.log(`[Checkpoint] Deleted: ${checkpointId}`);
  }

  /**
   * Delete all checkpoints for a session
   */
  async deleteSessionCheckpoints(sessionId: string): Promise<void> {
    const checkpointIds = this.sessionCheckpoints.get(sessionId) || [];

    for (const id of checkpointIds) {
      this.checkpoints.delete(id);
    }

    this.sessionCheckpoints.delete(sessionId);
    console.log(`[Checkpoint] Deleted all checkpoints for session: ${sessionId}`);
  }

  /**
   * Cleanup old checkpoints (older than specified days)
   */
  async cleanupOldCheckpoints(maxAgeDays: number = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);

    let deletedCount = 0;

    for (const [id, checkpoint] of this.checkpoints) {
      if (checkpoint.createdAt < cutoff) {
        await this.deleteCheckpoint(id);
        deletedCount++;
      }
    }

    console.log(`[Checkpoint] Cleaned up ${deletedCount} old checkpoints`);
    return deletedCount;
  }

  // ===========================================
  // Recovery Helpers
  // ===========================================

  /**
   * Get the best checkpoint to resume from after failure
   */
  async getRecoveryCheckpoint(sessionId: string): Promise<CheckpointData | null> {
    // Get the latest successful checkpoint
    return this.getLatestCheckpoint(sessionId);
  }

  /**
   * Check if a phase can be skipped (has valid checkpoint)
   */
  async canSkipPhase(sessionId: string, phase: string): Promise<boolean> {
    const checkpoint = await this.getPhaseCheckpoint(sessionId, phase);
    return checkpoint !== null;
  }

  /**
   * Get phase to resume from
   */
  async getResumePhase(sessionId: string): Promise<string | null> {
    const latest = await this.getLatestCheckpoint(sessionId);
    if (!latest) return null;

    // Determine next phase
    const phaseOrder = ['research', 'production', 'quality', 'publishing'];
    const basePhase = latest.phase.split('-')[0]; // Handle quality-1, quality-2, etc.
    const currentIndex = phaseOrder.indexOf(basePhase);

    if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
      return null; // No next phase or already at publishing
    }

    return phaseOrder[currentIndex + 1];
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Deep clone session state
   */
  private cloneState(state: SessionState): SessionState {
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Get checkpoint statistics
   */
  async getStats(): Promise<{
    totalCheckpoints: number;
    sessionsWithCheckpoints: number;
    oldestCheckpoint: Date | null;
    newestCheckpoint: Date | null;
  }> {
    const checkpoints = Array.from(this.checkpoints.values());

    if (checkpoints.length === 0) {
      return {
        totalCheckpoints: 0,
        sessionsWithCheckpoints: 0,
        oldestCheckpoint: null,
        newestCheckpoint: null,
      };
    }

    const dates = checkpoints.map(cp => cp.createdAt);
    dates.sort((a, b) => a.getTime() - b.getTime());

    return {
      totalCheckpoints: checkpoints.length,
      sessionsWithCheckpoints: this.sessionCheckpoints.size,
      oldestCheckpoint: dates[0],
      newestCheckpoint: dates[dates.length - 1],
    };
  }
}

// ===========================================
// Default Export
// ===========================================

export const checkpointManager = new CheckpointManager();
