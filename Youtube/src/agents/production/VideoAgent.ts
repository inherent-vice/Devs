/**
 * Video Agent
 *
 * Generates video content using Veo 3.1.
 * Handles scene generation, extension, and quality optimization.
 */

import { z } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { veo31 } from '../../genkit.config.js';
import type { AgentContext, AgentResult } from '../base/types.js';
import { VideoTypeConfigs } from '../../config/videoTypes.js';
import { VeoOptimization } from '../../config/costOptimization.js';
import { getVeoClient, type VeoGenerationResult } from '../../clients/index.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const VideoAgentInputSchema = z.object({
  storyboard: z.object({
    scenes: z.array(z.object({
      id: z.string(),
      description: z.string(),
      prompt: z.string(),
      duration: z.number().min(4).max(8),
      priority: z.enum(['hero', 'standard', 'b-roll']),
      visualStyle: z.string().optional(),
      referenceImages: z.array(z.string()).max(3).optional(),
      transitions: z.object({
        in: z.string(),
        out: z.string(),
      }).optional(),
    })),
    totalDuration: z.number(),
    videoType: z.enum(['shorts', 'medium', 'longform']),
    style: z.string().optional(),
  }),
  resolution: z.enum(['1080p', '720p']).default('1080p'),
  fps: z.number().default(24),
  useNativeAudio: z.boolean().default(false),
  useFastGeneration: z.boolean().default(true),
});

export type VideoAgentInput = z.infer<typeof VideoAgentInputSchema>;

export const VideoClipSchema = z.object({
  sceneId: z.string(),
  url: z.string(),
  duration: z.number(),
  resolution: z.string(),
  hasAudio: z.boolean(),
  priority: z.enum(['hero', 'standard', 'b-roll']),
  cost: z.number(),
  generationTime: z.number(),
});

export const VideoAgentOutputSchema = z.object({
  clips: z.array(VideoClipSchema),
  totalDuration: z.number(),
  totalCost: z.number(),
  metadata: z.object({
    resolution: z.string(),
    fps: z.number(),
    clipCount: z.number(),
    heroClipCount: z.number(),
    fastGenerationUsed: z.boolean(),
    averageGenerationTime: z.number(),
  }),
});

export type VideoAgentOutput = z.infer<typeof VideoAgentOutputSchema>;

// ===========================================
// Veo 3.1 Constraints
// ===========================================

const VEO_CONSTRAINTS = {
  maxDuration: 148,
  optimalClipDuration: 8,
  minClipDuration: 4,
  resolutions: ['1080p', '720p'] as const,
  aspectRatios: ['16:9', '9:16'] as const,
  fps: 24,
  maxReferenceImages: 3,
  pricing: {
    fast: 0.15, // per second
    standard: 0.40, // per second
  },
};

// ===========================================
// Video Agent Class
// ===========================================

export class VideoAgent extends BaseAgent<VideoAgentInput, VideoAgentOutput> {
  readonly name = 'video-agent';
  readonly description = 'Generates video content using Veo 3.1';

  protected readonly inputSchema = VideoAgentInputSchema as any;
  protected readonly outputSchema = VideoAgentOutputSchema as any;

  // Video agent uses Veo 3.1 directly, not Gemini
  protected model = veo31;
  protected temperature = 0.7;
  protected maxRetries = 2; // Video generation is expensive, limit retries

  // Veo Client instance
  private veoClient = getVeoClient();

  protected readonly systemPrompt = ''; // Not used for video generation

  /**
   * Execute video generation
   */
  async execute(
    input: VideoAgentInput,
    context: AgentContext
  ): Promise<AgentResult<VideoAgentOutput>> {
    const startTime = Date.now();
    const clips: z.infer<typeof VideoClipSchema>[] = [];
    let totalCost = 0;

    try {
      console.log(`[VideoAgent] Starting generation for ${input.storyboard.scenes.length} scenes`);

      // Get aspect ratio based on video type
      const aspectRatio = this.getAspectRatio(input.storyboard.videoType);

      // Process scenes in batches for parallel generation
      const batchSize = VeoOptimization.maxParallelGenerations;
      const scenes = input.storyboard.scenes;

      for (let i = 0; i < scenes.length; i += batchSize) {
        const batch = scenes.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(scene => this.generateClip(scene, {
            resolution: input.resolution,
            fps: input.fps,
            aspectRatio,
            useNativeAudio: input.useNativeAudio,
            useFast: this.shouldUseFast(scene.priority, input.useFastGeneration),
          }))
        );

        for (const result of batchResults) {
          clips.push(result);
          totalCost += result.cost;

          // Check cost limit
          if (context.maxCost && totalCost > context.maxCost) {
            console.warn(`[VideoAgent] Cost limit reached: $${totalCost.toFixed(2)}`);
            break;
          }
        }
      }

      const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);
      const heroClipCount = clips.filter(c => c.priority === 'hero').length;
      const avgGenTime = clips.reduce((sum, c) => sum + c.generationTime, 0) / clips.length;

      return this.createSuccessResult(
        {
          clips,
          totalDuration,
          totalCost,
          metadata: {
            resolution: input.resolution,
            fps: input.fps,
            clipCount: clips.length,
            heroClipCount,
            fastGenerationUsed: input.useFastGeneration,
            averageGenerationTime: avgGenTime,
          },
        },
        {
          duration: Date.now() - startTime,
          tokensUsed: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: totalCost,
          retryCount: 0,
        }
      );
    } catch (error) {
      return this.createErrorResult(
        {
          type: 'api',
          message: error instanceof Error ? error.message : 'Video generation failed',
          retryable: true,
        },
        startTime,
        0
      );
    }
  }

  /**
   * Generate a single video clip
   */
  private async generateClip(
    scene: VideoAgentInput['storyboard']['scenes'][0],
    config: {
      resolution: string;
      fps: number;
      aspectRatio: string;
      useNativeAudio: boolean;
      useFast: boolean;
    }
  ): Promise<z.infer<typeof VideoClipSchema>> {
    const genStartTime = Date.now();

    // Optimize the prompt for Veo 3.1
    const optimizedPrompt = this.optimizePrompt(scene.prompt, scene.visualStyle);

    console.log(`[VideoAgent] Generating scene ${scene.id}: ${scene.duration}s, ${config.useFast ? 'fast' : 'standard'}`);

    // Use real VeoClient for generation
    const result = await this.veoClient.generate({
      prompt: optimizedPrompt,
      duration: scene.duration as 4 | 6 | 8,
      aspectRatio: config.aspectRatio as '16:9' | '9:16',
      resolution: config.resolution as '720p' | '1080p',
      fps: config.fps,
      referenceImages: scene.referenceImages,
      generateAudio: config.useNativeAudio,
      model: config.useFast ? 'veo-3.1-fast' : 'veo-3.1',
    });

    const generationTime = Date.now() - genStartTime;

    console.log(`[VideoAgent] Scene ${scene.id} generated: ${result.duration}s, cost: $${result.cost.toFixed(2)}`);

    return {
      sceneId: scene.id,
      url: result.videoUrl,
      duration: result.duration,
      resolution: result.resolution,
      hasAudio: result.hasAudio,
      priority: scene.priority,
      cost: result.cost,
      generationTime,
    };
  }

  /**
   * Optimize prompt for Veo 3.1
   */
  private optimizePrompt(prompt: string, style?: string): string {
    const parts = [prompt];

    if (style) {
      parts.push(`Visual style: ${style}`);
    }

    // Add Veo-specific optimizations
    parts.push('High quality, cinematic, smooth motion, no artifacts');

    return parts.join('. ');
  }

  /**
   * Determine if fast generation should be used
   */
  private shouldUseFast(priority: string, useFastGeneration: boolean): boolean {
    if (!useFastGeneration) return false;

    // Always use standard for hero shots
    if (priority === 'hero') return false;

    // Use fast for b-roll and standard scenes when optimization is enabled
    return VeoOptimization.enabled &&
      VeoOptimization.useFastFor.includes(priority as any);
  }

  /**
   * Get aspect ratio for video type
   */
  private getAspectRatio(videoType: string): string {
    return videoType === 'shorts' ? '9:16' : '16:9';
  }

  /**
   * Extend video to target duration
   */
  async extendVideo(
    clips: z.infer<typeof VideoClipSchema>[],
    targetDuration: number,
    context: AgentContext
  ): Promise<z.infer<typeof VideoClipSchema>[]> {
    const currentDuration = clips.reduce((sum, c) => sum + c.duration, 0);

    if (currentDuration >= targetDuration) {
      return clips;
    }

    if (targetDuration > VEO_CONSTRAINTS.maxDuration) {
      throw new Error(`Target duration ${targetDuration}s exceeds Veo 3.1 max of ${VEO_CONSTRAINTS.maxDuration}s`);
    }

    const extensionNeeded = targetDuration - currentDuration;
    console.log(`[VideoAgent] Extending video by ${extensionNeeded}s`);

    // Generate extension clip
    const extensionClip = await this.generateClip(
      {
        id: `extension-${Date.now()}`,
        description: 'Continue previous scene',
        prompt: 'Continue the previous scene seamlessly, maintaining visual consistency',
        duration: Math.min(extensionNeeded, VEO_CONSTRAINTS.optimalClipDuration),
        priority: 'standard',
      },
      {
        resolution: '1080p',
        fps: 24,
        aspectRatio: '16:9',
        useNativeAudio: false,
        useFast: false, // Use standard for extensions
      }
    );

    return [...clips, extensionClip];
  }

  /**
   * Calculate estimated cost using VeoClient
   */
  estimateCost(scenes: VideoAgentInput['storyboard']['scenes'], useFast: boolean): number {
    const scenesWithPriority = scenes.map(scene => ({
      duration: scene.duration,
      priority: scene.priority,
    }));
    return this.veoClient.estimateCost(scenesWithPriority, useFast);
  }

  // Not used for video generation
  protected buildPrompt(input: VideoAgentInput, context: AgentContext): string {
    return '';
  }
}

// ===========================================
// Factory Export
// ===========================================

export const videoAgent = new VideoAgent();
