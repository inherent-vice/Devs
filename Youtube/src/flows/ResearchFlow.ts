/**
 * Research Flow
 *
 * Orchestrates the research phase: Trend → Topic → Script
 * Sequential execution with Genkit 1.27+ API.
 */

import { z } from 'zod';
import { ai } from '../genkit.config.js';
import { trendAgent } from '../agents/research/TrendAgent.js';
import { topicAgent } from '../agents/research/TopicAgent.js';
import { scriptAgent } from '../agents/research/ScriptAgent.js';
import type { AgentContext, VideoType } from '../agents/base/types.js';

// ===========================================
// Flow Input/Output Schemas
// ===========================================

export const ResearchFlowInputSchema = z.object({
  sessionId: z.string(),
  idea: z.string().min(10),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  targetAudience: z.string().optional(),
  style: z.string().optional(),
  language: z.string().default('ko'),
});

export type ResearchFlowInput = z.infer<typeof ResearchFlowInputSchema>;

export const ResearchFlowOutputSchema = z.object({
  sessionId: z.string(),
  trends: z.any(),
  topic: z.any(),
  script: z.any(),
  storyboard: z.any(),
  metadata: z.object({
    totalDuration: z.number(),
    totalCost: z.number(),
    phases: z.array(z.object({
      name: z.string(),
      duration: z.number(),
      cost: z.number(),
    })),
  }),
});

export type ResearchFlowOutput = z.infer<typeof ResearchFlowOutputSchema>;

// ===========================================
// Research Flow Definition
// ===========================================

export const researchFlow = ai.defineFlow(
  {
    name: 'research-flow',
    inputSchema: ResearchFlowInputSchema,
    outputSchema: ResearchFlowOutputSchema,
  },
  async (input: ResearchFlowInput): Promise<ResearchFlowOutput> => {
    console.log(`[ResearchFlow] Starting for session ${input.sessionId}`);
    const startTime = Date.now();
    const phases: { name: string; duration: number; cost: number }[] = [];
    let totalCost = 0;

    // Create agent context
    const context: AgentContext = {
      sessionId: input.sessionId,
      phase: 'research',
      videoType: input.videoType,
      maxCost: 10.0, // Max $10 for research phase
    };

    // ===========================================
    // Phase 1: Trend Analysis
    // ===========================================
    console.log('[ResearchFlow] Phase 1: Trend Analysis');
    const trendStart = Date.now();

    const trendResult = await trendAgent.execute(
      {
        idea: input.idea,
        videoType: input.videoType,
        targetAudience: input.targetAudience,
        language: input.language || 'ko',
        maxTrends: 10,
      },
      context
    );

    if (!trendResult.success || !trendResult.data) {
      throw new Error(`Trend analysis failed: ${trendResult.error?.message}`);
    }

    const trendDuration = Date.now() - trendStart;
    const trendCost = trendResult.metrics?.cost || 0;
    phases.push({ name: 'trend-analysis', duration: trendDuration, cost: trendCost });
    totalCost += trendCost;

    console.log(`[ResearchFlow] Trend analysis complete: ${trendResult.data.trends.length} trends found`);

    // ===========================================
    // Phase 2: Topic Selection
    // ===========================================
    console.log('[ResearchFlow] Phase 2: Topic Selection');
    const topicStart = Date.now();

    const topicResult = await topicAgent.execute(
      {
        trends: trendResult.data.trends,
        videoType: input.videoType,
        targetAudience: input.targetAudience,
        style: input.style,
        language: input.language || 'ko',
      },
      context
    );

    if (!topicResult.success || !topicResult.data) {
      throw new Error(`Topic selection failed: ${topicResult.error?.message}`);
    }

    const topicDuration = Date.now() - topicStart;
    const topicCost = topicResult.metrics?.cost || 0;
    phases.push({ name: 'topic-selection', duration: topicDuration, cost: topicCost });
    totalCost += topicCost;

    console.log(`[ResearchFlow] Topic selected: "${topicResult.data.selectedTopic.title}"`);

    // ===========================================
    // Phase 3: Script Generation
    // ===========================================
    console.log('[ResearchFlow] Phase 3: Script Generation');
    const scriptStart = Date.now();

    const scriptResult = await scriptAgent.execute(
      {
        topic: topicResult.data.selectedTopic,
        videoType: input.videoType,
        targetAudience: input.targetAudience,
        style: input.style,
        language: input.language || 'ko',
        toneOfVoice: 'energetic',
        includeCallToAction: true,
      },
      context
    );

    if (!scriptResult.success || !scriptResult.data) {
      throw new Error(`Script generation failed: ${scriptResult.error?.message}`);
    }

    const scriptDuration = Date.now() - scriptStart;
    const scriptCost = scriptResult.metrics?.cost || 0;
    phases.push({ name: 'script-generation', duration: scriptDuration, cost: scriptCost });
    totalCost += scriptCost;

    console.log(`[ResearchFlow] Script complete: ${scriptResult.data.script.sections.length} sections, ${scriptResult.data.storyboard.scenes.length} scenes`);

    const totalDuration = Date.now() - startTime;
    console.log(`[ResearchFlow] Complete in ${totalDuration}ms, cost: $${totalCost.toFixed(4)}`);

    return {
      sessionId: input.sessionId,
      trends: trendResult.data,
      topic: topicResult.data,
      script: scriptResult.data.script,
      storyboard: scriptResult.data.storyboard,
      metadata: {
        totalDuration,
        totalCost,
        phases,
      },
    };
  }
);

// ===========================================
// Export
// ===========================================

export default researchFlow;
