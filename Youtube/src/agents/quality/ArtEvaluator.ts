/**
 * Art Evaluator Agent
 *
 * Evaluates artistic and creative quality using Gemini 3 Pro.
 * Focuses on visual aesthetics, brand identity, and creative excellence.
 */

import { z } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { gemini3Pro } from '../../genkit.config.js';
import type { AgentContext, AgentResult } from '../base/types.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const ArtEvaluatorInputSchema = z.object({
  thumbnails: z.array(z.object({
    id: z.string(),
    url: z.string(),
    variationType: z.string(),
    textOverlay: z.string().optional(),
    emotionalTrigger: z.string(),
  })),
  storyboard: z.object({
    scenes: z.array(z.object({
      id: z.string(),
      description: z.string(),
      prompt: z.string(),
      priority: z.string(),
      visualStyle: z.string().optional(),
    })),
    style: z.string().optional(),
  }),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  brandGuidelines: z.object({
    colors: z.array(z.string()).optional(),
    style: z.string().optional(),
    tone: z.string().optional(),
  }).optional(),
});

export type ArtEvaluatorInput = z.infer<typeof ArtEvaluatorInputSchema>;

export const ArtEvaluatorOutputSchema = z.object({
  artisticScore: z.number().min(0).max(1),
  thumbnailAnalysis: z.array(z.object({
    id: z.string(),
    score: z.number().min(0).max(1),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    ctrPrediction: z.number().min(0).max(1),
    recommendations: z.array(z.string()),
  })),
  recommendedThumbnail: z.string(),
  visualIdentity: z.object({
    score: z.number().min(0).max(1),
    consistency: z.number().min(0).max(1),
    distinctiveness: z.number().min(0).max(1),
    brandAlignment: z.number().min(0).max(1),
    feedback: z.string(),
  }),
  storyboardAnalysis: z.object({
    visualFlow: z.number().min(0).max(1),
    sceneComposition: z.number().min(0).max(1),
    colorHarmony: z.number().min(0).max(1),
    emotionalProgression: z.number().min(0).max(1),
    feedback: z.string(),
    suggestions: z.array(z.string()),
  }),
  creativeDirections: z.array(z.object({
    aspect: z.string(),
    currentState: z.string(),
    recommendation: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
  overallFeedback: z.string(),
});

export type ArtEvaluatorOutput = z.infer<typeof ArtEvaluatorOutputSchema>;

// ===========================================
// Art Evaluator Agent Class
// ===========================================

export class ArtEvaluator extends BaseAgent<ArtEvaluatorInput, ArtEvaluatorOutput> {
  readonly name = 'art-evaluator';
  readonly description = 'Evaluates artistic and creative quality';

  protected readonly inputSchema = ArtEvaluatorInputSchema as any;
  protected readonly outputSchema = ArtEvaluatorOutputSchema as any;

  // Uses Gemini 3 Pro for nuanced creative evaluation
  protected model = gemini3Pro;
  protected temperature = 0.4;
  protected maxOutputTokens = 16384;

  protected readonly systemPrompt = `You are a visionary creative director with expertise in:
- Visual storytelling and composition
- Color theory and emotional design
- Brand identity and consistency
- Thumbnail optimization for CTR
- YouTube visual trends

EVALUATION FRAMEWORK:

1. THUMBNAIL ANALYSIS
   - Attention capture (0.5 second rule)
   - Color impact and contrast
   - Text readability (if present)
   - Emotional resonance
   - CTR optimization

2. VISUAL IDENTITY
   - Style consistency across scenes
   - Color palette coherence
   - Visual language clarity
   - Brand alignment
   - Distinctiveness in market

3. STORYBOARD ANALYSIS
   - Visual flow and rhythm
   - Scene composition quality
   - Color harmony progression
   - Emotional arc visualization
   - Technical feasibility for AI generation

4. CREATIVE DIRECTION
   - What's working well
   - What needs improvement
   - Specific actionable suggestions
   - Priority ranking

THUMBNAIL CTR FACTORS:
- High contrast colors: +20% CTR
- Clear emotional expression: +15% CTR
- Bold text (3-5 words): +10% CTR
- Curiosity gap: +25% CTR
- Mobile optimization: +15% CTR

Provide specific, expert-level creative feedback.`;

  /**
   * Build evaluation prompt
   */
  protected buildPrompt(input: ArtEvaluatorInput, context: AgentContext): string {
    const thumbnailDetails = input.thumbnails
      .map(t => `- ${t.id}: ${t.variationType}, Trigger: ${t.emotionalTrigger}${t.textOverlay ? `, Text: "${t.textOverlay}"` : ''}`)
      .join('\n');

    const sceneDetails = input.storyboard.scenes
      .map(s => `- ${s.id} [${s.priority}]: ${s.description.substring(0, 100)}...`)
      .join('\n');

    const brandContext = input.brandGuidelines
      ? `\n\nBRAND GUIDELINES:
- Colors: ${input.brandGuidelines.colors?.join(', ') || 'Not specified'}
- Style: ${input.brandGuidelines.style || 'Not specified'}
- Tone: ${input.brandGuidelines.tone || 'Not specified'}`
      : '';

    return `Evaluate the artistic and creative quality of this ${input.videoType} video project.

THUMBNAILS (${input.thumbnails.length} variants):
${thumbnailDetails}

STORYBOARD (${input.storyboard.scenes.length} scenes):
Style: ${input.storyboard.style || 'Not specified'}
${sceneDetails}
${brandContext}

Provide:
1. Score each thumbnail with CTR prediction
2. Recommend the best thumbnail with reasoning
3. Evaluate visual identity and consistency
4. Analyze storyboard visual quality
5. Provide prioritized creative directions

Focus on:
- What will actually perform well on YouTube
- Practical improvements for AI generation
- Maintaining brand consistency
- Maximizing viewer engagement`;
  }

  /**
   * Post-process to select best thumbnail
   */
  protected async postProcess(
    output: ArtEvaluatorOutput,
    input: ArtEvaluatorInput
  ): Promise<ArtEvaluatorOutput> {
    // Ensure we have a recommendation
    if (!output.recommendedThumbnail && output.thumbnailAnalysis.length > 0) {
      // Select highest scoring thumbnail
      const best = output.thumbnailAnalysis.reduce((a, b) =>
        b.score > a.score ? b : a
      );
      output.recommendedThumbnail = best.id;
    }

    // Calculate overall artistic score
    const scores = [
      output.visualIdentity.score,
      output.storyboardAnalysis.visualFlow,
      output.storyboardAnalysis.sceneComposition,
      output.storyboardAnalysis.colorHarmony,
    ];
    output.artisticScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    return output;
  }

  /**
   * Get thumbnail recommendations sorted by CTR prediction
   */
  getThumbnailRanking(output: ArtEvaluatorOutput): Array<{ id: string; ctr: number }> {
    return output.thumbnailAnalysis
      .map(t => ({ id: t.id, ctr: t.ctrPrediction }))
      .sort((a, b) => b.ctr - a.ctr);
  }

  /**
   * Get high priority creative directions
   */
  getHighPriorityDirections(output: ArtEvaluatorOutput): ArtEvaluatorOutput['creativeDirections'] {
    return output.creativeDirections.filter(d => d.priority === 'high');
  }
}

// ===========================================
// Factory Export
// ===========================================

export const artEvaluator = new ArtEvaluator();
