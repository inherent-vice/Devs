/**
 * Master Flow
 *
 * Orchestrates the complete YouTube video production pipeline:
 * Research → Production → Quality → Publishing
 *
 * Updated for Genkit 1.27+ API
 */

import { z } from 'zod';
import { ai } from '../genkit.config.js';
import { researchFlow, ResearchFlowOutput } from './ResearchFlow.js';
import { productionFlow, ProductionFlowOutput } from './ProductionFlow.js';
import { qualityFlow, QualityFlowOutput, canPublish } from './QualityFlow.js';
import { publisherAgent, type PublisherOutput } from '../agents/publisher/index.js';
import type { VideoType } from '../agents/base/types.js';
import { VideoTypeConfigs } from '../config/videoTypes.js';
import { quickEstimate } from '../config/costOptimization.js';
import { getLocalStorage } from '../storage/LocalStorageManager.js';

// ===========================================
// Flow Input/Output Schemas
// ===========================================

export const MasterFlowInputSchema = z.object({
  idea: z.string().min(10).max(500),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  targetAudience: z.string().optional(),
  script: z.string().optional(), // User-provided script (optional)
  // Extended style configuration
  style: z.union([
    z.string(),
    z.object({
      preset: z.string(),
      colorTone: z.string(),
      pacing: z.string(),
    }),
  ]).optional(),
  // Voice configuration
  voice: z.object({
    name: z.string(),
    speed: z.number().min(0.5).max(2.0),
    stylePrompt: z.string().optional(),
  }).optional(),
  // Model selection
  models: z.object({
    text: z.string(),
    image: z.string(),
    tts: z.string(),
  }).optional(),
  // Output configuration
  output: z.object({
    resolution: z.string(),
    subtitles: z.boolean(),
    thumbnailVariants: z.number().min(1).max(5),
  }).optional(),
  language: z.string().default('ko'),
  options: z.object({
    useFastGeneration: z.boolean().default(true),
    maxQualityIterations: z.number().min(1).max(10).default(5),
    minQualityThreshold: z.number().min(0).max(1).default(0.85),
    skipProduction: z.boolean().default(false),
    skipQuality: z.boolean().default(false),
    maxBudget: z.number().optional(),
  }).optional(),
  // Publishing options
  publishOptions: z.object({
    autoPublish: z.boolean().default(false),
    visibility: z.enum(['public', 'unlisted', 'private']).default('private'),
    scheduledTime: z.string().datetime().optional(),
    categoryId: z.string().default('22'),
    playlistId: z.string().optional(),
    notifySubscribers: z.boolean().default(true),
  }).optional(),
});

export type MasterFlowInput = z.infer<typeof MasterFlowInputSchema>;

export const MasterFlowOutputSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['completed', 'failed', 'partial']),
  phases: z.object({
    research: z.object({
      completed: z.boolean(),
      duration: z.number(),
      cost: z.number(),
      output: z.any().optional(),
    }),
    production: z.object({
      completed: z.boolean(),
      duration: z.number(),
      cost: z.number(),
      output: z.any().optional(),
    }),
    quality: z.object({
      completed: z.boolean(),
      duration: z.number(),
      cost: z.number(),
      finalScore: z.number().optional(),
      iterations: z.number().optional(),
      output: z.any().optional(),
    }),
    publishing: z.object({
      completed: z.boolean(),
      duration: z.number(),
      cost: z.number(),
      videoId: z.string().optional(),
      url: z.string().optional(),
      status: z.enum(['published', 'scheduled', 'skipped', 'failed']).optional(),
      output: z.any().optional(),
    }).optional(),
  }),
  finalContent: z.object({
    script: z.any(),
    storyboard: z.any(),
    videoClips: z.any().optional(),
    thumbnails: z.any().optional(),
    audio: z.any().optional(),
  }).optional(),
  metadata: z.object({
    totalDuration: z.number(),
    totalCost: z.number(),
    estimatedCost: z.number(),
    videoType: z.string(),
    qualityVerdict: z.string().optional(),
    publishedUrl: z.string().optional(),
  }),
  readyToPublish: z.boolean(),
});

export type MasterFlowOutput = z.infer<typeof MasterFlowOutputSchema>;

// ===========================================
// Master Flow Definition
// ===========================================

export const masterFlow = ai.defineFlow(
  {
    name: 'master-orchestration-flow',
    inputSchema: MasterFlowInputSchema,
    outputSchema: MasterFlowOutputSchema,
  },
  async (input: MasterFlowInput): Promise<MasterFlowOutput> => {
    console.log('='.repeat(60));
    console.log('[MasterFlow] Starting YouTube Video Production Pipeline');
    console.log('='.repeat(60));
    console.log(`Idea: ${input.idea.substring(0, 50)}...`);
    console.log(`Type: ${input.videoType}`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    const options = input.options ?? {
      useFastGeneration: true,
      maxQualityIterations: 5,
      minQualityThreshold: 0.85,
      skipProduction: false,
      skipQuality: false,
      maxBudget: undefined,
    };
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create session in storage with the same sessionId
    const storage = getLocalStorage();
    storage.createSession({
      customId: sessionId,
      topic: input.idea.slice(0, 50),
      videoType: input.videoType,
    });

    // Estimate cost before starting
    const estimatedCost = quickEstimate(input.videoType, options.useFastGeneration ?? true);
    console.log(`[MasterFlow] Estimated cost: $${estimatedCost.toFixed(2)}`);

    // Check budget
    if (options.maxBudget && estimatedCost > options.maxBudget) {
      console.warn(`[MasterFlow] Estimated cost $${estimatedCost.toFixed(2)} exceeds budget $${options.maxBudget}`);
    }

    console.log(`[MasterFlow] Created session: ${sessionId}`);

    // Initialize phase results
    const phases: MasterFlowOutput['phases'] = {
      research: { completed: false, duration: 0, cost: 0 },
      production: { completed: false, duration: 0, cost: 0 },
      quality: { completed: false, duration: 0, cost: 0 },
      publishing: { completed: false, duration: 0, cost: 0 },
    };

    let researchOutput: ResearchFlowOutput | undefined;
    let productionOutput: ProductionFlowOutput | undefined;
    let qualityOutput: QualityFlowOutput | undefined;
    let publisherOutput: PublisherOutput | undefined;

    try {
      // ===========================================
      // Phase 1: Research (Sequential)
      // ===========================================
      console.log('\n' + '─'.repeat(60));
      console.log('[MasterFlow] PHASE 1: Research');
      console.log('─'.repeat(60));

      const researchStart = Date.now();

      // Extract style string (input.style can be string or object)
      const styleString = typeof input.style === 'string'
        ? input.style
        : input.style?.preset;

      researchOutput = await researchFlow({
        sessionId,
        idea: input.idea,
        videoType: input.videoType,
        targetAudience: input.targetAudience,
        style: styleString,
        language: input.language,
      });

      phases.research = {
        completed: true,
        duration: Date.now() - researchStart,
        cost: researchOutput.metadata.totalCost,
        output: researchOutput,
      };

      console.log(`[MasterFlow] Research complete: ${phases.research.duration}ms, $${phases.research.cost.toFixed(4)}`);

      // ===========================================
      // Phase 2: Production (Parallel)
      // ===========================================
      if (!options.skipProduction) {
        console.log('\n' + '─'.repeat(60));
        console.log('[MasterFlow] PHASE 2: Production');
        console.log('─'.repeat(60));

        const productionStart = Date.now();

        // Get style preset for production
        const stylePreset = typeof input.style === 'string'
          ? input.style
          : input.style?.preset || 'cinematic';

        productionOutput = await productionFlow({
          sessionId,
          script: researchOutput.script,
          storyboard: researchOutput.storyboard,
          topic: researchOutput.topic.selectedTopic,
          thumbnailConcepts: researchOutput.topic.thumbnailConcepts,
          videoType: input.videoType,
          language: input.language === 'ko' ? 'ko-KR' : 'en-US',
          useFastGeneration: options.useFastGeneration ?? true,
          // Pass voice settings to production
          voiceSettings: input.voice ? {
            voiceName: input.voice.name,
            speakingRate: input.voice.speed,
            stylePrompt: input.voice.stylePrompt,
          } : undefined,
          // Pass output settings
          generateSubtitles: input.output?.subtitles ?? true,
          thumbnailVariants: input.output?.thumbnailVariants ?? 3,
          resolution: input.output?.resolution || '1080p',
          // Pass style for production
          productionStyle: stylePreset,
        } as any);

        phases.production = {
          completed: true,
          duration: Date.now() - productionStart,
          cost: productionOutput.metadata.totalCost,
          output: productionOutput,
        };

        console.log(`[MasterFlow] Production complete: ${phases.production.duration}ms, $${phases.production.cost.toFixed(2)}`);
      } else {
        console.log('[MasterFlow] Production skipped (skipProduction=true)');
      }

      // ===========================================
      // Phase 3: Quality Loop
      // ===========================================
      if (!options.skipQuality) {
        console.log('\n' + '─'.repeat(60));
        console.log('[MasterFlow] PHASE 3: Quality');
        console.log('─'.repeat(60));

        const qualityStart = Date.now();

        const videoClips = productionOutput?.video?.clips || [];
        const heroClipCount = videoClips.filter((clip: { priority?: string }) => clip.priority === 'hero').length;
        const videoMetadata = productionOutput?.video ? {
          clipCount: videoClips.length,
          totalDuration: productionOutput.video.totalDuration,
          resolution: productionOutput.video.metadata?.resolution || productionOutput.video.resolution || '1080p',
          heroClipCount,
        } : undefined;

        qualityOutput = await qualityFlow({
          sessionId,
          script: researchOutput.script,
          storyboard: researchOutput.storyboard,
          thumbnails: productionOutput?.thumbnails?.thumbnails,
          videoMetadata,
          videoType: input.videoType,
          targetAudience: input.targetAudience,
          minThreshold: options.minQualityThreshold ?? 0.85,
          maxIterations: options.maxQualityIterations ?? 5,
        });

        phases.quality = {
          completed: true,
          duration: Date.now() - qualityStart,
          cost: qualityOutput.metadata.totalCost,
          finalScore: qualityOutput.finalScore,
          iterations: qualityOutput.iterations,
          output: qualityOutput,
        };

        console.log(`[MasterFlow] Quality complete: ${phases.quality.duration}ms, $${phases.quality.cost.toFixed(2)}`);
        console.log(`[MasterFlow] Final score: ${qualityOutput.finalScore.toFixed(3)}, verdict: ${qualityOutput.verdict}`);
      } else {
        console.log('[MasterFlow] Quality skipped (skipQuality=true)');
      }

      // ===========================================
      // Phase 4: Publishing (Optional)
      // ===========================================
      const readyToPublish = qualityOutput ? canPublish(qualityOutput) : false;
      const publishableVideoUrl =
        productionOutput?.finalVideo?.path ||
        productionOutput?.video?.outputUrl ||
        productionOutput?.video?.clips?.[0]?.url ||
        '';
      const shouldPublish =
        !!publishableVideoUrl &&
        input.publishOptions?.autoPublish &&
        readyToPublish;

      if (shouldPublish) {
        console.log('\n' + '─'.repeat(60));
        console.log('[MasterFlow] PHASE 4: Publishing');
        console.log('─'.repeat(60));

        const publishingStart = Date.now();

        try {
          // Prepare publisher input
          const publisherInput = {
            video: {
              url: publishableVideoUrl,
              duration: productionOutput!.finalVideo?.duration || productionOutput!.video.totalDuration,
              resolution: productionOutput!.video.metadata?.resolution || productionOutput!.video.resolution,
            },
            thumbnail: productionOutput!.thumbnails?.thumbnails[0] ? {
              url: productionOutput!.thumbnails.thumbnails[0].url || productionOutput!.thumbnails.thumbnails[0].imagePath,
              variationType: productionOutput!.thumbnails.thumbnails[0].variationType,
            } : undefined,
            script: {
              title: researchOutput!.script.title,
              hook: researchOutput!.script.hook,
              fullText: researchOutput!.script.sections.map((s: { content: string }) => s.content).join('\n'),
              keywords: researchOutput!.script.keywords || [],
              callToAction: researchOutput!.script.callToAction || 'Subscribe!',
            },
            topic: {
              title: researchOutput!.topic.selectedTopic.title,
              hook: researchOutput!.topic.selectedTopic.hook,
              angle: researchOutput!.topic.selectedTopic.angle,
              targetKeywords: researchOutput!.topic.selectedTopic.keywords,
            },
            publishOptions: {
              visibility: input.publishOptions!.visibility,
              scheduledTime: input.publishOptions!.scheduledTime,
              categoryId: input.publishOptions!.categoryId,
              playlistId: input.publishOptions!.playlistId,
              language: input.language,
              notifySubscribers: input.publishOptions!.notifySubscribers,
            },
            videoType: input.videoType,
          };

          const publishResult = await publisherAgent.execute(publisherInput, {
            sessionId,
            phase: 'publishing',
            videoType: input.videoType,
          });

          if (publishResult.success && publishResult.data) {
            publisherOutput = publishResult.data;
            phases.publishing = {
              completed: true,
              duration: Date.now() - publishingStart,
              cost: publishResult.metrics?.cost || 0,
              videoId: publisherOutput.videoId,
              url: publisherOutput.url,
              status: publisherOutput.status === 'published' ? 'published' :
                      publisherOutput.status === 'scheduled' ? 'scheduled' : 'published',
              output: publisherOutput,
            };
            console.log(`[MasterFlow] Published: ${publisherOutput.url}`);
          } else {
            phases.publishing = {
              completed: false,
              duration: Date.now() - publishingStart,
              cost: 0,
              status: 'failed',
            };
            console.error('[MasterFlow] Publishing failed:', publishResult.error);
          }
        } catch (publishError) {
          console.error('[MasterFlow] Publishing error:', publishError);
          phases.publishing = {
            completed: false,
            duration: Date.now() - publishingStart,
            cost: 0,
            status: 'failed',
          };
        }
      } else {
        phases.publishing = {
          completed: false,
          duration: 0,
          cost: 0,
          status: 'skipped',
        };
        if (input.publishOptions?.autoPublish && !readyToPublish) {
          console.log('[MasterFlow] Publishing skipped (quality threshold not met)');
        } else if (input.publishOptions?.autoPublish && readyToPublish && !publishableVideoUrl) {
          console.log('[MasterFlow] Publishing skipped (no composed video available)');
        } else if (!input.publishOptions?.autoPublish) {
          console.log('[MasterFlow] Publishing skipped (autoPublish=false)');
        }
      }

      // ===========================================
      // Finalize
      // ===========================================
      const totalDuration = Date.now() - startTime;
      const totalCost = phases.research.cost + phases.production.cost + phases.quality.cost + (phases.publishing?.cost || 0);
      const wasPublished = phases.publishing?.status === 'published' || phases.publishing?.status === 'scheduled';

      console.log('\n' + '='.repeat(60));
      console.log('[MasterFlow] Pipeline Complete');
      console.log('='.repeat(60));
      console.log(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
      console.log(`Total Cost: $${totalCost.toFixed(2)}`);
      console.log(`Ready to Publish: ${readyToPublish}`);
      console.log(`Published: ${wasPublished ? (phases.publishing?.url || 'Yes') : 'No'}`);
      console.log('='.repeat(60));

      return {
        sessionId,
        status: 'completed',
        phases,
        finalContent: {
          script: qualityOutput?.finalScript || researchOutput.script,
          storyboard: qualityOutput?.finalStoryboard || researchOutput.storyboard,
          videoClips: productionOutput?.video?.clips,
          thumbnails: productionOutput?.thumbnails?.thumbnails,
          audio: productionOutput?.voice,
        },
        metadata: {
          totalDuration,
          totalCost,
          estimatedCost,
          videoType: input.videoType,
          qualityVerdict: qualityOutput?.verdict,
          publishedUrl: phases.publishing?.url,
        },
        readyToPublish,
      };

    } catch (error) {
      console.error('[MasterFlow] Pipeline failed:', error);

      const totalDuration = Date.now() - startTime;
      const totalCost = phases.research.cost + phases.production.cost + phases.quality.cost + (phases.publishing?.cost || 0);

      return {
        sessionId,
        status: 'failed',
        phases,
        metadata: {
          totalDuration,
          totalCost,
          estimatedCost,
          videoType: input.videoType,
        },
        readyToPublish: false,
      };
    }
  }
);

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get pipeline cost estimate
 */
export function estimatePipelineCost(
  videoType: VideoType,
  useFast: boolean = true
): {
  estimated: number;
  breakdown: {
    research: number;
    production: number;
    quality: number;
  };
} {
  const estimatedProduction = quickEstimate(videoType, useFast);

  return {
    estimated: estimatedProduction + 1.0,
    breakdown: {
      research: 0.30,
      production: estimatedProduction,
      quality: 0.70,
    },
  };
}

/**
 * Create a simple video (research only)
 */
export async function createResearchOnly(
  idea: string,
  videoType: VideoType,
  language: string = 'ko'
): Promise<ResearchFlowOutput> {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  return researchFlow({
    sessionId,
    idea,
    videoType,
    language,
  });
}

// ===========================================
// Export
// ===========================================

export default masterFlow;
