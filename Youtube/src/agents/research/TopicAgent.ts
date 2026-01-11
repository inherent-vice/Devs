/**
 * Topic Agent
 *
 * Selects the optimal topic from trends using Gemini 3 Flash.
 * Crafts compelling angles, hooks, and titles for maximum engagement.
 */

import { z, ZodSchema } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { gemini3Flash } from '../../genkit.config.js';
import type { AgentContext, AgentResult, VideoType, TopicSelection } from '../base/types.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const TopicAgentInputSchema = z.object({
  trends: z.array(z.object({
    topic: z.string(),
    score: z.number(),
    growth: z.number(),
    relatedKeywords: z.array(z.string()),
    competitorCount: z.number(),
    estimatedViews: z.number(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    reasoning: z.string().optional(),
  })),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  targetAudience: z.string().optional(),
  style: z.string().optional(),
  language: z.string().default('ko'),
  brandVoice: z.string().optional(),
});

export type TopicAgentInput = z.infer<typeof TopicAgentInputSchema>;

export const TopicAgentOutputSchema = z.object({
  selectedTopic: z.object({
    title: z.string().max(100),
    hook: z.string().max(200),
    angle: z.string().max(300),
    targetKeywords: z.array(z.string()),
    estimatedCTR: z.number().min(0).max(1),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    reasoning: z.string(),
  }),
  alternativeTopics: z.array(z.object({
    title: z.string(),
    hook: z.string(),
    angle: z.string(),
    score: z.number(),
  })).max(3),
  titleVariants: z.array(z.string()).min(3).max(5),
  thumbnailConcepts: z.array(z.object({
    description: z.string(),
    textOverlay: z.string().optional(),
    emotionalTrigger: z.string(),
  })).min(2).max(4),
  seoStrategy: z.object({
    primaryKeyword: z.string(),
    secondaryKeywords: z.array(z.string()),
    tags: z.array(z.string()),
    description: z.string(),
  }),
});

export type TopicAgentOutput = z.infer<typeof TopicAgentOutputSchema>;

// ===========================================
// Topic Agent Class
// ===========================================

export class TopicAgent extends BaseAgent<TopicAgentInput, TopicAgentOutput> {
  readonly name = 'topic-agent';
  readonly description = 'Selects optimal topic and crafts compelling angles';

  // Note: Using type assertion due to Zod's default() creating input/output type asymmetry
  protected readonly inputSchema = TopicAgentInputSchema as ZodSchema<TopicAgentInput>;
  protected readonly outputSchema = TopicAgentOutputSchema as ZodSchema<TopicAgentOutput>;

  protected model = gemini3Flash;
  protected temperature = 0.7; // Higher for creativity
  protected maxOutputTokens = 16384;

  protected readonly systemPrompt = `You are an elite YouTube content strategist known for creating viral content.

Your expertise includes:
- Psychological triggers that drive clicks and engagement
- Title optimization for CTR (click-through rate)
- Hook crafting that captures attention in 0.5 seconds
- Thumbnail concept design that stops the scroll
- SEO strategy for maximum discoverability

SELECTION CRITERIA (in order of priority):
1. VIRALITY POTENTIAL (40%)
   - Topic score and growth rate
   - Emotional resonance
   - Shareability factor

2. COMPETITION ANALYSIS (25%)
   - Blue ocean opportunities (low competition, high demand)
   - Unique angle possibilities
   - Differentiation potential

3. CONTENT FEASIBILITY (20%)
   - Can be produced with AI generation
   - Suitable for the video type
   - Matches brand voice and style

4. SEO OPPORTUNITY (15%)
   - Search volume potential
   - Keyword difficulty
   - Long-term evergreen value

TITLE FORMULAS THAT WORK:
- Number + Adjective + Keyword + Promise: "7 Shocking Ways AI Will Change Your Life in 2026"
- Question Hook: "Why Is Everyone Obsessed With [Topic]?"
- Curiosity Gap: "[Topic]: The Secret Nobody Tells You"
- Transformation: "From [Problem] to [Solution] in [Time]"
- Urgency: "[Topic] Before It's Too Late"

HOOK REQUIREMENTS:
- Must create immediate curiosity gap
- Address viewer's pain point or desire
- Promise clear value in first 3 seconds
- Match the title's promise`;

  /**
   * Build the selection prompt
   */
  protected buildPrompt(input: TopicAgentInput, context: AgentContext): string {
    const trendsInfo = input.trends
      .slice(0, 10)
      .map((t, i) => `${i + 1}. "${t.topic}" - Score: ${t.score.toFixed(2)}, Growth: ${t.growth}%, Competition: ${t.competitorCount}, Views: ${t.estimatedViews}`)
      .join('\n');

    return `Select the optimal topic and craft a compelling content strategy.

AVAILABLE TRENDS:
${trendsInfo}

VIDEO CONTEXT:
- Type: ${input.videoType}
- Target Audience: ${input.targetAudience || 'General audience'}
- Style: ${input.style || 'Engaging and informative'}
- Language: ${input.language}
- Brand Voice: ${input.brandVoice || 'Professional yet approachable'}

REQUIRED OUTPUT:
1. SELECT the best topic based on the criteria above
2. CRAFT a compelling title (max 100 chars) optimized for CTR
3. WRITE a powerful hook (max 200 chars) for the opening
4. DEVELOP a unique angle (max 300 chars) that differentiates from competition
5. PROVIDE 3 alternative topics as backup
6. CREATE 3-5 title variants for A/B testing
7. DESIGN 2-4 thumbnail concepts with text overlays
8. BUILD complete SEO strategy with keywords and tags

Be specific, creative, and data-driven. Every element should maximize engagement.`;
  }

  /**
   * Post-process output for optimization
   */
  protected async postProcess(
    output: TopicAgentOutput,
    input: TopicAgentInput
  ): Promise<TopicAgentOutput> {
    // Ensure title length constraints
    if (output.selectedTopic.title.length > 100) {
      output.selectedTopic.title = output.selectedTopic.title.substring(0, 97) + '...';
    }

    // Add language-specific optimizations
    if (input.language === 'ko') {
      output = this.applyKoreanOptimizations(output);
    }

    return output;
  }

  /**
   * Apply Korean language optimizations
   */
  private applyKoreanOptimizations(output: TopicAgentOutput): TopicAgentOutput {
    // Korean YouTube title best practices
    // - Use emojis sparingly at the start
    // - Include trending Korean expressions
    // - Shorter titles often work better

    return output;
  }

  /**
   * Execute with trend validation
   */
  async executeWithValidation(
    input: TopicAgentInput,
    context: AgentContext
  ): Promise<AgentResult<TopicAgentOutput>> {
    // Validate that we have enough trends to work with
    if (input.trends.length < 3) {
      throw new Error('At least 3 trends required for topic selection');
    }

    // Filter out low-quality trends
    const qualityTrends = input.trends.filter(t => t.score >= 0.5);

    if (qualityTrends.length < 2) {
      // Use original trends if not enough quality ones
      return this.execute(input, context);
    }

    return this.execute({ ...input, trends: qualityTrends }, context);
  }

  /**
   * Generate additional title variants
   */
  async generateTitleVariants(
    topic: TopicSelection,
    count: number = 5
  ): Promise<string[]> {
    // This could be a separate LLM call for more variants
    return [
      topic.title,
      `${topic.title} (2026 Edition)`,
      `${topic.hook.split(' ').slice(0, 5).join(' ')}...`,
    ];
  }
}

// ===========================================
// Factory Export
// ===========================================

export const topicAgent = new TopicAgent();
