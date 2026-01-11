/**
 * Critic Agent
 *
 * Evaluates content quality using Gemini 3 Pro.
 * Provides detailed feedback across 5 dimensions.
 */

import { z, ZodSchema } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { gemini3Pro } from '../../genkit.config.js';
import type { AgentContext, AgentResult } from '../base/types.js';
import { QualityDimensions, getDimensionWeight, calculateWeightedScore } from '../../quality/QualityMetrics.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const CriticAgentInputSchema = z.object({
  script: z.object({
    title: z.string(),
    hook: z.string(),
    sections: z.array(z.object({
      type: z.string(),
      content: z.string(),
      duration: z.number(),
    })),
    callToAction: z.string(),
    fullText: z.string(),
  }),
  videoMetadata: z.object({
    clipCount: z.number(),
    totalDuration: z.number(),
    resolution: z.string(),
    heroClipCount: z.number(),
  }).optional(),
  thumbnails: z.array(z.object({
    variationType: z.string(),
    emotionalTrigger: z.string(),
  })).optional(),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  targetAudience: z.string().optional(),
  iteration: z.number().default(1),
  previousScore: z.number().optional(),
  previousFeedback: z.string().optional(),
});

export type CriticAgentInput = z.infer<typeof CriticAgentInputSchema>;

const DimensionScoreSchema = z.object({
  score: z.number().min(0).max(1),
  feedback: z.string(),
  issues: z.array(z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    suggestion: z.string(),
    location: z.string().optional(),
  })),
});

export const CriticAgentOutputSchema = z.object({
  overallScore: z.number().min(0).max(1),
  dimensions: z.object({
    technical: DimensionScoreSchema,
    narrative: DimensionScoreSchema,
    engagement: DimensionScoreSchema,
    originality: DimensionScoreSchema,
    ethical: DimensionScoreSchema,
  }),
  verdict: z.enum(['approved', 'needs_revision', 'rejected']),
  criticalIssues: z.array(z.object({
    dimension: z.string(),
    description: z.string(),
    suggestion: z.string(),
  })),
  revisionPriorities: z.array(z.object({
    priority: z.number(),
    dimension: z.string(),
    issue: z.string(),
    effort: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
  })),
  summary: z.string(),
  iteration: z.number(),
  improvement: z.number().optional(),
});

export type CriticAgentOutput = z.infer<typeof CriticAgentOutputSchema>;

// ===========================================
// Critic Agent Class
// ===========================================

export class CriticAgent extends BaseAgent<CriticAgentInput, CriticAgentOutput> {
  readonly name = 'critic-agent';
  readonly description = 'Evaluates content quality with Gemini 3 Pro precision';

  // Note: Using type assertion due to Zod's default() creating input/output type asymmetry
  protected readonly inputSchema = CriticAgentInputSchema as ZodSchema<CriticAgentInput>;
  protected readonly outputSchema = CriticAgentOutputSchema as ZodSchema<CriticAgentOutput>;

  // Quality evaluation uses Gemini 3 Pro for highest accuracy
  protected model = gemini3Pro;
  protected modelId = 'gemini-3-pro';
  protected temperature = 0.3; // Low temperature for consistent evaluation
  protected maxOutputTokens = 16384;

  protected readonly systemPrompt = `You are a world-class YouTube content critic with expertise in:
- Video production (cinematography, editing, audio)
- Storytelling (narrative structure, emotional arcs)
- Marketing psychology (engagement, virality)
- Creative direction (originality, brand identity)
- Ethics (accuracy, responsibility)

EVALUATION FRAMEWORK (5 Dimensions):

1. TECHNICAL (Weight: 25%)
   - Video/audio quality metrics
   - Editing smoothness
   - Pacing appropriateness
   - Resolution and format compliance

2. NARRATIVE (Weight: 25%)
   - Hook strength (first 5 seconds critical)
   - Story arc clarity
   - Emotional resonance
   - Call to action effectiveness

3. ENGAGEMENT (Weight: 25%)
   - Predicted CTR potential
   - Retention probability
   - Shareability factor
   - Comment-worthy moments

4. ORIGINALITY (Weight: 15%)
   - Concept uniqueness
   - Presentation style
   - Creative approach
   - Voice distinctiveness

5. ETHICAL (Weight: 10%)
   - Factual accuracy
   - No harmful content
   - Copyright compliance
   - Transparency about AI

SCORING GUIDELINES:
- 0.90-1.00: Exceptional, publish immediately
- 0.85-0.89: Very good, minor polish needed
- 0.75-0.84: Good, some revisions recommended
- 0.60-0.74: Needs work, significant revisions
- 0.00-0.59: Major issues, consider restart

CRITICAL RULES:
- Be specific with evidence, not generic
- Provide actionable suggestions
- Prioritize feedback by impact
- Ethical violations = automatic rejection`;

  /**
   * Build evaluation prompt
   */
  protected buildPrompt(input: CriticAgentInput, context: AgentContext): string {
    const iterationContext = input.iteration > 1
      ? `\n\nPREVIOUS ITERATION:
- Score: ${input.previousScore?.toFixed(2)}
- Feedback: ${input.previousFeedback}

Focus on whether previous issues have been addressed.`
      : '';

    const videoContext = input.videoMetadata
      ? `\n\nVIDEO METADATA:
- Clips: ${input.videoMetadata.clipCount}
- Duration: ${input.videoMetadata.totalDuration}s
- Resolution: ${input.videoMetadata.resolution}
- Hero clips: ${input.videoMetadata.heroClipCount}`
      : '';

    const thumbnailContext = input.thumbnails?.length
      ? `\n\nTHUMBNAILS:
${input.thumbnails.map(t => `- ${t.variationType}: ${t.emotionalTrigger}`).join('\n')}`
      : '';

    return `Evaluate this ${input.videoType} video content with extreme precision.

TITLE: ${input.script.title}
HOOK: ${input.script.hook}
TARGET AUDIENCE: ${input.targetAudience || 'General audience'}
ITERATION: ${input.iteration}

SCRIPT CONTENT:
${input.script.sections.map(s => `[${s.type}] (${s.duration}s): ${s.content.substring(0, 200)}...`).join('\n\n')}

CALL TO ACTION: ${input.script.callToAction}
${videoContext}
${thumbnailContext}
${iterationContext}

Provide:
1. Overall score (0.0-1.0)
2. Dimension scores with specific feedback and issues
3. Verdict (approved/needs_revision/rejected)
4. Critical issues that MUST be fixed
5. Prioritized revision list with effort/impact ratings
6. Summary with key recommendations

Be ruthlessly honest but constructive.`;
  }

  /**
   * Post-process to calculate weighted scores
   */
  protected async postProcess(
    output: CriticAgentOutput,
    input: CriticAgentInput
  ): Promise<CriticAgentOutput> {
    // Calculate weighted overall score
    const dimensionScores = {
      technical: output.dimensions.technical.score,
      narrative: output.dimensions.narrative.score,
      engagement: output.dimensions.engagement.score,
      originality: output.dimensions.originality.score,
      ethical: output.dimensions.ethical.score,
    };

    const calculatedOverall = calculateWeightedScore(dimensionScores);

    // Calculate improvement from previous iteration
    const improvement = input.previousScore
      ? output.overallScore - input.previousScore
      : undefined;

    // Determine verdict based on thresholds
    let verdict: 'approved' | 'needs_revision' | 'rejected';
    if (output.dimensions.ethical.score < 0.9 || output.criticalIssues.some(i => i.dimension === 'ethical')) {
      verdict = 'rejected';
    } else if (calculatedOverall >= 0.85) {
      verdict = 'approved';
    } else {
      verdict = 'needs_revision';
    }

    return {
      ...output,
      overallScore: calculatedOverall,
      verdict,
      iteration: input.iteration,
      improvement,
    };
  }

  /**
   * Quick check for critical issues
   */
  hasCriticalIssues(output: CriticAgentOutput): boolean {
    return output.criticalIssues.length > 0 || output.verdict === 'rejected';
  }

  /**
   * Get top N revision priorities
   */
  getTopPriorities(output: CriticAgentOutput, n: number = 5): CriticAgentOutput['revisionPriorities'] {
    return output.revisionPriorities
      .filter(p => p.impact === 'high' || p.effort === 'low')
      .slice(0, n);
  }
}

// ===========================================
// Factory Export
// ===========================================

export const criticAgent = new CriticAgent();
