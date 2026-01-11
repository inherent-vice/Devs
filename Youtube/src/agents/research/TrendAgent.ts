/**
 * Trend Agent
 *
 * Analyzes YouTube trends using Gemini 3 Flash.
 * Identifies viral patterns, emerging topics, and content opportunities.
 */

import { z, ZodSchema } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { gemini3Flash } from '../../genkit.config.js';
import type { AgentContext, AgentResult, VideoType } from '../base/types.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const TrendAgentInputSchema = z.object({
  idea: z.string().min(5).describe('Base idea or topic area'),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  targetAudience: z.string().optional(),
  language: z.string().default('ko'),
  maxTrends: z.number().min(3).max(20).default(10),
});

export type TrendAgentInput = z.infer<typeof TrendAgentInputSchema>;

export const TrendAgentOutputSchema = z.object({
  trends: z.array(z.object({
    topic: z.string(),
    score: z.number().min(0).max(1),
    growth: z.number().describe('Growth rate percentage'),
    relatedKeywords: z.array(z.string()),
    competitorCount: z.number(),
    estimatedViews: z.number(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    reasoning: z.string(),
  })),
  analysis: z.object({
    marketSaturation: z.number().min(0).max(1),
    bestTimeToPost: z.string(),
    audienceInsights: z.string(),
    contentGaps: z.array(z.string()),
  }),
  recommendations: z.array(z.string()),
  analyzedAt: z.string(),
});

export type TrendAgentOutput = z.infer<typeof TrendAgentOutputSchema>;

// ===========================================
// Trend Agent Class
// ===========================================

export class TrendAgent extends BaseAgent<TrendAgentInput, TrendAgentOutput> {
  readonly name = 'trend-agent';
  readonly description = 'Analyzes YouTube trends and identifies content opportunities';

  // Note: Using type assertion due to Zod's default() creating input/output type asymmetry
  protected readonly inputSchema = TrendAgentInputSchema as ZodSchema<TrendAgentInput>;
  protected readonly outputSchema = TrendAgentOutputSchema as ZodSchema<TrendAgentOutput>;

  protected model = gemini3Flash;
  protected temperature = 0.6;
  protected maxOutputTokens = 16384;

  protected readonly systemPrompt = `You are an expert YouTube trend analyst with deep knowledge of:
- Viral content patterns across different niches
- Algorithm optimization strategies
- Audience behavior and engagement metrics
- Competitive landscape analysis
- Content timing and seasonality

Your task is to analyze trends related to the given topic and provide actionable insights.

ANALYSIS FRAMEWORK:
1. TREND IDENTIFICATION
   - Identify 10-15 trending topics related to the input
   - Score each trend from 0.0 to 1.0 based on viral potential
   - Estimate growth rate as percentage (e.g., 150 = 150% growth)
   - Assess competition level and estimated view potential

2. MARKET ANALYSIS
   - Calculate market saturation (0.0 = untapped, 1.0 = oversaturated)
   - Identify best posting times for the target audience
   - Find content gaps that competitors haven't covered

3. RECOMMENDATIONS
   - Provide specific, actionable recommendations
   - Consider the video type (shorts/medium/longform)
   - Factor in the target audience and language

OUTPUT REQUIREMENTS:
- Be data-driven and specific, not generic
- Provide reasoning for each trend score
- Include related keywords for SEO optimization
- Consider both short-term virality and long-term sustainability`;

  /**
   * Build the analysis prompt
   */
  protected buildPrompt(input: TrendAgentInput, context: AgentContext): string {
    const videoTypeContext = this.getVideoTypeContext(input.videoType);

    return `Analyze YouTube trends for the following request:

TOPIC/IDEA: ${input.idea}
VIDEO TYPE: ${input.videoType} (${videoTypeContext})
TARGET AUDIENCE: ${input.targetAudience || 'General audience'}
LANGUAGE/REGION: ${input.language}
REQUESTED TRENDS: ${input.maxTrends}

Provide a comprehensive trend analysis with:
1. ${input.maxTrends} trending topics with scores, growth rates, and insights
2. Market analysis including saturation and content gaps
3. Specific recommendations for content creation

Focus on trends that are:
- Relevant to the topic area
- Suitable for ${input.videoType} format
- Achievable with AI-generated content
- Likely to perform well in ${input.language} market`;
  }

  /**
   * Get context description for video type
   */
  private getVideoTypeContext(videoType: VideoType): string {
    const contexts: Record<VideoType, string> = {
      shorts: 'Under 60 seconds, vertical format, high engagement, quick hooks',
      medium: '5-10 minutes, balanced depth, good for tutorials and explainers',
      longform: '15+ minutes, deep dives, comprehensive coverage, high watch time',
    };
    return contexts[videoType];
  }

  /**
   * Post-process the output
   */
  protected async postProcess(
    output: TrendAgentOutput,
    input: TrendAgentInput
  ): Promise<TrendAgentOutput> {
    // Sort trends by score (descending)
    const sortedTrends = [...output.trends].sort((a, b) => b.score - a.score);

    // Limit to requested count
    const limitedTrends = sortedTrends.slice(0, input.maxTrends);

    return {
      ...output,
      trends: limitedTrends,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Execute with additional YouTube data context
   */
  async executeWithYouTubeData(
    input: TrendAgentInput,
    context: AgentContext,
    youtubeData?: YouTubeContextData
  ): Promise<AgentResult<TrendAgentOutput>> {
    // Enhance input with YouTube data if available
    if (youtubeData) {
      const enhancedPrompt = this.enhanceWithYouTubeData(input, youtubeData);
      return this.execute({ ...input, idea: enhancedPrompt }, context);
    }

    return this.execute(input, context);
  }

  /**
   * Enhance prompt with real YouTube data
   */
  private enhanceWithYouTubeData(
    input: TrendAgentInput,
    data: YouTubeContextData
  ): string {
    const parts = [input.idea];

    if (data.topVideos?.length) {
      parts.push(`\n\nTop performing videos in this niche:`);
      data.topVideos.slice(0, 5).forEach((video, i) => {
        parts.push(`${i + 1}. "${video.title}" - ${video.views} views, ${video.engagement}% engagement`);
      });
    }

    if (data.searchVolume) {
      parts.push(`\nSearch volume data: ${data.searchVolume} monthly searches`);
    }

    if (data.competitors?.length) {
      parts.push(`\nTop competitors: ${data.competitors.join(', ')}`);
    }

    return parts.join('\n');
  }
}

// ===========================================
// Types
// ===========================================

export interface YouTubeContextData {
  topVideos?: Array<{
    title: string;
    views: number;
    engagement: number;
  }>;
  searchVolume?: number;
  competitors?: string[];
}

// ===========================================
// Factory Export
// ===========================================

export const trendAgent = new TrendAgent();
