/**
 * Quality Flow
 *
 * Implements the quality improvement loop with convergence detection.
 * Critic + ArtEvaluator → Revision → Repeat until approved or converged.
 *
 * Updated for Genkit 1.27+ API
 */

import { z } from 'zod';
import { ai } from '../genkit.config.js';
import { criticAgent } from '../agents/quality/CriticAgent.js';
import { artEvaluator } from '../agents/quality/ArtEvaluator.js';
import { revisionAgent } from '../agents/quality/RevisionAgent.js';
import type { AgentContext } from '../agents/base/types.js';
import { EarlyTermination } from '../config/costOptimization.js';

// ===========================================
// Flow Input/Output Schemas
// ===========================================

export const QualityFlowInputSchema = z.object({
  sessionId: z.string(),
  script: z.object({
    title: z.string(),
    hook: z.string(),
    sections: z.array(z.object({
      id: z.string(),
      type: z.string(),
      content: z.string(),
      duration: z.number(),
      visualNotes: z.string().optional(),
    })),
    callToAction: z.string(),
    fullText: z.string(),
    keywords: z.array(z.string()),
  }),
  storyboard: z.object({
    scenes: z.array(z.object({
      id: z.string(),
      description: z.string(),
      prompt: z.string(),
      duration: z.number(),
      priority: z.enum(['hero', 'standard', 'b-roll']),
      visualStyle: z.string().optional(),
    })),
    style: z.string().optional(),
  }),
  thumbnails: z.array(z.object({
    id: z.string(),
    url: z.string(),
    variationType: z.string(),
    textOverlay: z.string().optional(),
    emotionalTrigger: z.string(),
  })).optional(),
  videoMetadata: z.object({
    clipCount: z.number(),
    totalDuration: z.number(),
    resolution: z.string(),
    heroClipCount: z.number(),
  }).optional(),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  targetAudience: z.string().optional(),
  minThreshold: z.number().min(0).max(1).default(0.85),
  maxIterations: z.number().min(1).max(10).default(5),
});

export type QualityFlowInput = z.infer<typeof QualityFlowInputSchema>;

export const QualityFlowOutputSchema = z.object({
  sessionId: z.string(),
  finalScript: z.any(),
  finalStoryboard: z.any(),
  finalScore: z.number(),
  verdict: z.enum(['approved', 'needs_revision', 'rejected', 'converged', 'max_iterations']),
  iterations: z.number(),
  scoreHistory: z.array(z.number()),
  evaluations: z.array(z.object({
    iteration: z.number(),
    criticScore: z.number(),
    artScore: z.number().optional(),
    verdict: z.string(),
    changes: z.number(),
  })),
  metadata: z.object({
    totalDuration: z.number(),
    totalCost: z.number(),
    convergenceReason: z.string().optional(),
  }),
});

export type QualityFlowOutput = z.infer<typeof QualityFlowOutputSchema>;

// ===========================================
// Quality Flow Configuration
// ===========================================

const DEFAULT_CONFIG = {
  minThreshold: EarlyTermination.scoreThreshold,
  convergenceThreshold: EarlyTermination.convergenceThreshold,
  maxIterations: EarlyTermination.maxIterations,
  diminishingReturnRate: EarlyTermination.diminishingReturnRate,
};

// ===========================================
// Quality Flow Definition
// ===========================================

export const qualityFlow = ai.defineFlow(
  {
    name: 'quality-improvement-loop',
    inputSchema: QualityFlowInputSchema,
    outputSchema: QualityFlowOutputSchema,
  },
  async (input: QualityFlowInput): Promise<QualityFlowOutput> => {
    console.log(`[QualityFlow] Starting for session ${input.sessionId}`);
    const startTime = Date.now();
    let totalCost = 0;

    // Create agent context
    const context: AgentContext = {
      sessionId: input.sessionId,
      phase: 'quality',
      videoType: input.videoType,
      maxCost: 20.0,
    };

    // Initialize state
    let currentScript = input.script;
    let currentStoryboard = input.storyboard;
    const scoreHistory: number[] = [];
    const evaluations: QualityFlowOutput['evaluations'] = [];
    let iteration = 0;
    let finalVerdict: QualityFlowOutput['verdict'] = 'needs_revision';
    let convergenceReason: string | undefined;

    // ===========================================
    // Quality Improvement Loop
    // ===========================================

    while (iteration < input.maxIterations) {
      iteration++;
      console.log(`[QualityFlow] Iteration ${iteration}/${input.maxIterations}`);

      // ===========================================
      // Step 1: Critic Evaluation
      // ===========================================
      const criticResult = await criticAgent.execute(
        {
          script: currentScript,
          videoMetadata: input.videoMetadata,
          thumbnails: input.thumbnails,
          videoType: input.videoType,
          targetAudience: input.targetAudience,
          iteration,
          previousScore: scoreHistory[scoreHistory.length - 1],
          previousFeedback: evaluations[evaluations.length - 1]?.verdict,
        },
        context
      );

      if (!criticResult.success || !criticResult.data) {
        throw new Error(`Critic evaluation failed: ${criticResult.error?.message}`);
      }

      const criticScore = criticResult.data.overallScore;
      scoreHistory.push(criticScore);
      totalCost += criticResult.metrics?.cost || 0;

      console.log(`[QualityFlow] Critic score: ${criticScore.toFixed(3)}`);

      // ===========================================
      // Step 2: Art Evaluation (if thumbnails provided)
      // ===========================================
      let artScore: number | undefined;
      let artResult: { success: boolean; data?: any } | undefined;

      if (input.thumbnails?.length) {
        artResult = await artEvaluator.execute(
          {
            thumbnails: input.thumbnails,
            storyboard: {
              scenes: currentStoryboard.scenes.map(s => ({
                id: s.id,
                description: s.description,
                prompt: s.prompt,
                priority: s.priority,
                visualStyle: s.visualStyle,
              })),
              style: currentStoryboard.style,
            },
            videoType: input.videoType,
          },
          context
        );

        if (artResult.success && artResult.data) {
          artScore = artResult.data.artisticScore;
          totalCost += 0.05;
          console.log(`[QualityFlow] Art score: ${artScore?.toFixed(3) ?? 'N/A'}`);
        }
      }

      // ===========================================
      // Step 3: Check Termination Conditions
      // ===========================================

      // Condition 1: Score meets threshold
      if (criticScore >= input.minThreshold) {
        finalVerdict = 'approved';
        convergenceReason = `Score ${criticScore.toFixed(3)} >= threshold ${input.minThreshold}`;
        console.log(`[QualityFlow] Approved: ${convergenceReason}`);

        evaluations.push({
          iteration,
          criticScore,
          artScore,
          verdict: 'approved',
          changes: 0,
        });
        break;
      }

      // Condition 2: Check for rejected (ethical violations)
      if (criticResult.data.verdict === 'rejected') {
        finalVerdict = 'rejected';
        convergenceReason = 'Content rejected due to critical issues';
        console.log(`[QualityFlow] Rejected: ${convergenceReason}`);

        evaluations.push({
          iteration,
          criticScore,
          artScore,
          verdict: 'rejected',
          changes: 0,
        });
        break;
      }

      // Condition 3: Convergence check (score not improving)
      if (scoreHistory.length >= 2) {
        const improvement = criticScore - scoreHistory[scoreHistory.length - 2];

        if (Math.abs(improvement) < DEFAULT_CONFIG.convergenceThreshold) {
          finalVerdict = 'converged';
          convergenceReason = `Score improvement ${improvement.toFixed(4)} < threshold ${DEFAULT_CONFIG.convergenceThreshold}`;
          console.log(`[QualityFlow] Converged: ${convergenceReason}`);

          evaluations.push({
            iteration,
            criticScore,
            artScore,
            verdict: 'converged',
            changes: 0,
          });
          break;
        }

        // Condition 4: Diminishing returns check
        if (scoreHistory.length >= 3) {
          const prevImprovement = scoreHistory[scoreHistory.length - 2] - scoreHistory[scoreHistory.length - 3];
          if (prevImprovement > 0 && improvement < prevImprovement * DEFAULT_CONFIG.diminishingReturnRate) {
            finalVerdict = 'converged';
            convergenceReason = `Diminishing returns: improvement rate dropped`;
            console.log(`[QualityFlow] Converged (diminishing returns): ${convergenceReason}`);

            evaluations.push({
              iteration,
              criticScore,
              artScore,
              verdict: 'converged',
              changes: 0,
            });
            break;
          }
        }
      }

      // ===========================================
      // Step 4: Apply Revisions
      // ===========================================
      console.log(`[QualityFlow] Applying revisions...`);

      const revisionResult = await revisionAgent.execute(
        {
          originalScript: currentScript,
          originalStoryboard: {
            scenes: currentStoryboard.scenes.map(s => ({
              id: s.id,
              description: s.description,
              prompt: s.prompt,
              duration: s.duration,
              priority: s.priority,
              visualStyle: s.visualStyle,
            })),
            style: currentStoryboard.style,
          },
          criticFeedback: {
            overallScore: criticResult.data.overallScore,
            dimensions: criticResult.data.dimensions,
            criticalIssues: criticResult.data.criticalIssues,
            revisionPriorities: criticResult.data.revisionPriorities,
          },
          artFeedback: artResult?.data ? {
            artisticScore: artResult.data.artisticScore,
            visualIdentity: artResult.data.visualIdentity,
            storyboardAnalysis: artResult.data.storyboardAnalysis,
            creativeDirections: artResult.data.creativeDirections,
          } : undefined,
          iteration,
        },
        context
      );

      if (!revisionResult.success || !revisionResult.data) {
        throw new Error(`Revision failed: ${revisionResult.error?.message}`);
      }

      totalCost += revisionResult.metrics?.cost || 0;

      // Update current content
      currentScript = {
        ...revisionResult.data.revisedScript,
        keywords: input.script.keywords,
      };
      currentStoryboard = {
        ...revisionResult.data.revisedStoryboard,
        scenes: revisionResult.data.revisedStoryboard.scenes.map(s => ({
          ...s,
          priority: s.priority as 'hero' | 'standard' | 'b-roll',
        })),
      };

      evaluations.push({
        iteration,
        criticScore,
        artScore,
        verdict: criticResult.data.verdict,
        changes: revisionResult.data.changes.length,
      });

      console.log(`[QualityFlow] Applied ${revisionResult.data.changes.length} changes`);
    }

    // Max iterations reached
    if (iteration >= input.maxIterations && finalVerdict === 'needs_revision') {
      finalVerdict = 'max_iterations';
      convergenceReason = `Maximum ${input.maxIterations} iterations reached`;
      console.log(`[QualityFlow] ${convergenceReason}`);
    }

    // ===========================================
    // Finalize Results
    // ===========================================

    const finalScore = scoreHistory[scoreHistory.length - 1];
    const totalDuration = Date.now() - startTime;

    console.log(`[QualityFlow] Complete: ${finalVerdict} after ${iteration} iterations, score: ${finalScore.toFixed(3)}`);

    return {
      sessionId: input.sessionId,
      finalScript: currentScript,
      finalStoryboard: currentStoryboard,
      finalScore,
      verdict: finalVerdict,
      iterations: iteration,
      scoreHistory,
      evaluations,
      metadata: {
        totalDuration,
        totalCost,
        convergenceReason,
      },
    };
  }
);

// ===========================================
// Helper Functions
// ===========================================

/**
 * Check if content should proceed to publishing
 */
export function canPublish(output: QualityFlowOutput): boolean {
  return output.verdict === 'approved' ||
    (output.verdict === 'converged' && output.finalScore >= 0.75);
}

/**
 * Get improvement summary
 */
export function getImprovementSummary(output: QualityFlowOutput): {
  startScore: number;
  endScore: number;
  totalImprovement: number;
  percentImprovement: number;
} {
  const startScore = output.scoreHistory[0];
  const endScore = output.finalScore;
  const totalImprovement = endScore - startScore;
  const percentImprovement = (totalImprovement / startScore) * 100;

  return {
    startScore,
    endScore,
    totalImprovement,
    percentImprovement,
  };
}

// ===========================================
// Export
// ===========================================

export default qualityFlow;
