/**
 * Image Video Agent
 *
 * Generates video content using images + FFmpeg composition.
 * Features:
 * - Scene image generation (placeholder → Nano Banana Pro)
 * - Ken Burns effect for dynamic motion
 * - Audio track integration (from Gemini TTS)
 * - Subtitle overlay (from script)
 * - FFmpeg-based video composition
 *
 * Much cheaper alternative to Veo 3.1 ($0.40 -> $0.04 per scene)
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent } from '../base/BaseAgent.js';
import type { AgentContext, AgentResult } from '../base/types.js';
import { getNanoBananaClient, type NanoBananaClient } from '../../clients/nano-banana.js';
import {
  getVideoComposer,
  scriptToSubtitles,
  type SceneImage,
  type SubtitleEntry,
} from '../../clients/video-composer.js';
import { getLocalStorage } from '../../storage/LocalStorageManager.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const ImageVideoInputSchema = z.object({
  sessionId: z.string(), // Required for storage operations
  storyboard: z.object({
    scenes: z.array(z.object({
      id: z.string(),
      description: z.string(),
      prompt: z.string(),
      duration: z.number().min(3).max(60),
      priority: z.enum(['hero', 'standard', 'b-roll']),
      visualStyle: z.string().optional(),
      content: z.string().optional(), // Text content for subtitles
      kenBurns: z.object({
        type: z.enum(['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'pan_up', 'pan_down']),
        intensity: z.enum(['subtle', 'medium', 'strong']),
      }).optional(),
    })),
    totalDuration: z.number(),
    videoType: z.enum(['shorts', 'medium', 'longform']),
    style: z.string().optional(),
  }),
  // Audio integration
  audioPath: z.string().optional(),
  // Subtitle options
  includeSubtitles: z.boolean().default(true),
  subtitleStyle: z.object({
    fontSize: z.number().default(28),
    fontColor: z.string().default('white'),
    position: z.enum(['bottom', 'top', 'center']).default('bottom'),
  }).optional(),
  // Video settings
  resolution: z.enum(['1080p', '720p']).default('1080p'),
  aspectRatio: z.enum(['16:9', '9:16']).default('16:9'),
  fps: z.number().default(30),
  imagesPerMinute: z.number().min(5).max(20).default(10),
  // Output options
  outputFilename: z.string().optional(),
  composeVideo: z.boolean().default(true), // If true, compose final video with FFmpeg
});

export type ImageVideoInput = z.infer<typeof ImageVideoInputSchema>;

export const ImageClipSchema = z.object({
  sceneId: z.string(),
  imageUrl: z.string(),
  mediaUrl: z.string(),  // Unified field (same as imageUrl for compatibility)
  duration: z.number(),
  resolution: z.string(),
  aspectRatio: z.string(),
  kenBurns: z.object({
    type: z.string(),
    intensity: z.string(),
    startPosition: z.object({ x: z.number(), y: z.number(), scale: z.number() }),
    endPosition: z.object({ x: z.number(), y: z.number(), scale: z.number() }),
  }),
  priority: z.enum(['hero', 'standard', 'b-roll']),
  cost: z.number(),
});

export const ImageVideoOutputSchema = z.object({
  clips: z.array(ImageClipSchema),
  totalDuration: z.number(),
  totalCost: z.number(),
  metadata: z.object({
    resolution: z.string(),
    aspectRatio: z.string(),
    clipCount: z.number(),
    averageClipDuration: z.number(),
    estimatedFileSize: z.string(),
  }),
  // FFmpeg command to combine images into video
  ffmpegScript: z.string(),
  // Composed video result (if composeVideo: true)
  composedVideo: z.object({
    videoPath: z.string(),
    fileSize: z.number(),
    hasAudio: z.boolean(),
    hasSubtitles: z.boolean(),
    subtitlePath: z.string().optional(),
  }).optional(),
});

export type ImageVideoOutput = z.infer<typeof ImageVideoOutputSchema>;

// ===========================================
// Ken Burns Presets
// ===========================================

const KEN_BURNS_PRESETS = {
  zoom_in: {
    subtle: { startScale: 1.0, endScale: 1.1, startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5 },
    medium: { startScale: 1.0, endScale: 1.2, startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5 },
    strong: { startScale: 1.0, endScale: 1.4, startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5 },
  },
  zoom_out: {
    subtle: { startScale: 1.1, endScale: 1.0, startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5 },
    medium: { startScale: 1.2, endScale: 1.0, startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5 },
    strong: { startScale: 1.4, endScale: 1.0, startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5 },
  },
  pan_left: {
    subtle: { startScale: 1.1, endScale: 1.1, startX: 0.6, startY: 0.5, endX: 0.4, endY: 0.5 },
    medium: { startScale: 1.2, endScale: 1.2, startX: 0.7, startY: 0.5, endX: 0.3, endY: 0.5 },
    strong: { startScale: 1.3, endScale: 1.3, startX: 0.8, startY: 0.5, endX: 0.2, endY: 0.5 },
  },
  pan_right: {
    subtle: { startScale: 1.1, endScale: 1.1, startX: 0.4, startY: 0.5, endX: 0.6, endY: 0.5 },
    medium: { startScale: 1.2, endScale: 1.2, startX: 0.3, startY: 0.5, endX: 0.7, endY: 0.5 },
    strong: { startScale: 1.3, endScale: 1.3, startX: 0.2, startY: 0.5, endX: 0.8, endY: 0.5 },
  },
  pan_up: {
    subtle: { startScale: 1.1, endScale: 1.1, startX: 0.5, startY: 0.6, endX: 0.5, endY: 0.4 },
    medium: { startScale: 1.2, endScale: 1.2, startX: 0.5, startY: 0.7, endX: 0.5, endY: 0.3 },
    strong: { startScale: 1.3, endScale: 1.3, startX: 0.5, startY: 0.8, endX: 0.5, endY: 0.2 },
  },
  pan_down: {
    subtle: { startScale: 1.1, endScale: 1.1, startX: 0.5, startY: 0.4, endX: 0.5, endY: 0.6 },
    medium: { startScale: 1.2, endScale: 1.2, startX: 0.5, startY: 0.3, endX: 0.5, endY: 0.7 },
    strong: { startScale: 1.3, endScale: 1.3, startX: 0.5, startY: 0.2, endX: 0.5, endY: 0.8 },
  },
};

// ===========================================
// Image Video Agent Class
// ===========================================

export class ImageVideoAgent extends BaseAgent<ImageVideoInput, ImageVideoOutput> {
  readonly name = 'image-video-agent';
  readonly description = 'Generates video using images + Ken Burns effect + FFmpeg composition';

  protected readonly inputSchema = ImageVideoInputSchema as any;
  protected readonly outputSchema = ImageVideoOutputSchema as any;

  protected model = 'nano-banana-pro'; // Uses Nano Banana Pro for image generation
  protected temperature = 0.7;
  protected maxRetries = 3;

  private nanoBananaClient: NanoBananaClient | null = null;
  private videoComposer = getVideoComposer();
  private storage = getLocalStorage();

  private getNanoBanana(): NanoBananaClient {
    if (!this.nanoBananaClient) {
      this.nanoBananaClient = getNanoBananaClient();
    }
    return this.nanoBananaClient;
  }

  protected readonly systemPrompt = '';

  // Cost per image (much cheaper than Veo)
  private readonly COST_PER_IMAGE = 0.04;

  /**
   * Execute image-based video generation
   */
  async execute(
    input: ImageVideoInput,
    context: AgentContext
  ): Promise<AgentResult<ImageVideoOutput>> {
    const startTime = Date.now();
    const clips: z.infer<typeof ImageClipSchema>[] = [];
    let totalCost = 0;

    try {
      // Set session for NanoBanana storage operations
      if (context.sessionId) {
        this.getNanoBanana().setSession(context.sessionId);
      }

      console.log(`[ImageVideoAgent] Generating ${input.storyboard.scenes.length} scene images`);

      const { width, height } = this.getResolution(input.resolution, input.aspectRatio);

      // Generate images for each scene using Nano Banana Pro
      for (const scene of input.storyboard.scenes) {
        const imageResult = await this.generateSceneImage(scene, {
          width,
          height,
          style: input.storyboard.style,
        });

        const kenBurnsEffect = this.getKenBurnsEffect(scene);
        const imageCost = imageResult.cost || this.COST_PER_IMAGE;

        clips.push({
          sceneId: scene.id,
          imageUrl: imageResult.url,
          mediaUrl: imageResult.url,  // Unified field for cross-agent compatibility
          duration: scene.duration,
          resolution: input.resolution,
          aspectRatio: input.aspectRatio,
          kenBurns: {
            type: kenBurnsEffect.type,
            intensity: kenBurnsEffect.intensity,
            startPosition: {
              x: kenBurnsEffect.preset.startX,
              y: kenBurnsEffect.preset.startY,
              scale: kenBurnsEffect.preset.startScale,
            },
            endPosition: {
              x: kenBurnsEffect.preset.endX,
              y: kenBurnsEffect.preset.endY,
              scale: kenBurnsEffect.preset.endScale,
            },
          },
          priority: scene.priority,
          cost: imageCost,
        });

        totalCost += imageCost;

        console.log(`[ImageVideoAgent] Scene ${scene.id}: Nano Banana Pro image generated, ${scene.duration}s, $${imageCost.toFixed(2)}`);
      }

      const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);
      const ffmpegScript = this.generateFFmpegScript(clips, input);

      console.log(`[ImageVideoAgent] Complete: ${clips.length} images, ${totalDuration}s, $${totalCost.toFixed(2)}`);

      // Compose final video with FFmpeg if requested
      let composedVideo: ImageVideoOutput['composedVideo'] = undefined;

      if (input.composeVideo) {
        console.log('[ImageVideoAgent] Composing video with FFmpeg...');

        // Prepare scene images for composer
        const scenes: SceneImage[] = clips.map((clip) => ({
          id: clip.sceneId,
          imagePath: clip.imageUrl, // Local path from image generation
          duration: clip.duration,
          transition: 'fade',
          transitionDuration: 0.5,
        }));

        // Generate subtitles if needed
        let subtitles: SubtitleEntry[] = [];
        if (input.includeSubtitles) {
          const sectionsWithContent = input.storyboard.scenes
            .filter((s) => s.content)
            .map((s) => ({
              id: s.id,
              content: s.content!,
              duration: s.duration,
            }));

          if (sectionsWithContent.length > 0) {
            subtitles = scriptToSubtitles(sectionsWithContent, {
              maxCharsPerLine: input.aspectRatio === '9:16' ? 25 : 40,
              maxLinesPerSubtitle: 2,
            });
            console.log(`[ImageVideoAgent] Generated ${subtitles.length} subtitle entries`);
          }
        }

        // Compose video with explicit sessionId
        const compositionResult = await this.videoComposer.compose({
          sessionId: input.sessionId,
          scenes,
          audioPath: input.audioPath,
          subtitles,
          resolution: { width, height },
          fps: input.fps || 30,
          format: 'mp4',
          outputFilename: input.outputFilename,
        });

        composedVideo = {
          videoPath: compositionResult.videoPath,
          fileSize: compositionResult.fileSize,
          hasAudio: compositionResult.hasAudio,
          hasSubtitles: compositionResult.hasSubtitles,
          subtitlePath: compositionResult.hasSubtitles
            ? path.join(this.storage.getSessionDir(input.sessionId), 'subtitles', 'subtitles.srt')
            : undefined,
        };

        console.log(`[ImageVideoAgent] Video composed: ${compositionResult.videoPath}`);
      }

      return this.createSuccessResult(
        {
          clips,
          totalDuration,
          totalCost,
          metadata: {
            resolution: input.resolution,
            aspectRatio: input.aspectRatio,
            clipCount: clips.length,
            averageClipDuration: totalDuration / clips.length,
            estimatedFileSize: `${Math.round(totalDuration * 2)}MB`,
          },
          ffmpegScript,
          composedVideo,
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
          message: error instanceof Error ? error.message : 'Image generation failed',
          retryable: true,
        },
        startTime,
        0
      );
    }
  }

  /**
   * Generate a single scene image using Nano Banana Pro
   */
  private async generateSceneImage(
    scene: ImageVideoInput['storyboard']['scenes'][0],
    config: { width: number; height: number; style?: string }
  ): Promise<{ url: string; cost: number }> {
    const aspectRatio = config.width > config.height ? '16:9' : '9:16';

    const result = await this.getNanoBanana().generateSceneImage({
      id: scene.id,
      prompt: scene.prompt,
      visualNotes: scene.description,
      style: config.style || scene.visualStyle || 'cinematic, high quality',
      aspectRatio: aspectRatio as '16:9' | '9:16',
      duration: scene.duration,
    });

    return {
      url: result.imagePath,
      cost: result.cost,
    };
  }

  /**
   * Build optimized prompt for scene image
   */
  private buildImagePrompt(
    scene: ImageVideoInput['storyboard']['scenes'][0],
    style?: string
  ): string {
    const parts = [
      scene.prompt,
      scene.visualStyle || '',
      style || '',
      'high quality, detailed, cinematic lighting',
      '4K resolution, professional photography',
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Get Ken Burns effect configuration
   */
  private getKenBurnsEffect(scene: ImageVideoInput['storyboard']['scenes'][0]): {
    type: string;
    intensity: string;
    preset: typeof KEN_BURNS_PRESETS.zoom_in.medium;
  } {
    // Use scene's specified effect or auto-select
    const type = scene.kenBurns?.type || this.autoSelectKenBurns(scene);
    const intensity = scene.kenBurns?.intensity || 'medium';

    const presets = KEN_BURNS_PRESETS[type as keyof typeof KEN_BURNS_PRESETS];
    const preset = presets[intensity as keyof typeof presets];

    return { type, intensity, preset };
  }

  /**
   * Auto-select Ken Burns effect based on scene content
   */
  private autoSelectKenBurns(scene: ImageVideoInput['storyboard']['scenes'][0]): string {
    const prompt = scene.prompt.toLowerCase();

    // Food/product shots - zoom in
    if (prompt.includes('음식') || prompt.includes('food') || prompt.includes('close')) {
      return 'zoom_in';
    }

    // Landscape/wide shots - zoom out or pan
    if (prompt.includes('풍경') || prompt.includes('landscape') || prompt.includes('wide')) {
      return Math.random() > 0.5 ? 'zoom_out' : 'pan_right';
    }

    // People/faces - subtle zoom
    if (prompt.includes('사람') || prompt.includes('person') || prompt.includes('face')) {
      return 'zoom_in';
    }

    // Default: alternate between zoom types
    const effects = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right'];
    return effects[Math.floor(Math.random() * effects.length)];
  }

  /**
   * Get resolution dimensions
   */
  private getResolution(
    resolution: string,
    aspectRatio: string
  ): { width: number; height: number } {
    if (aspectRatio === '9:16') {
      // Vertical (Shorts)
      return resolution === '1080p'
        ? { width: 1080, height: 1920 }
        : { width: 720, height: 1280 };
    } else {
      // Horizontal
      return resolution === '1080p'
        ? { width: 1920, height: 1080 }
        : { width: 1280, height: 720 };
    }
  }

  /**
   * Generate FFmpeg script for combining images with Ken Burns
   */
  private generateFFmpegScript(
    clips: z.infer<typeof ImageClipSchema>[],
    input: ImageVideoInput
  ): string {
    const { width, height } = this.getResolution(input.resolution, input.aspectRatio);
    const fps = 30;

    const filterParts: string[] = [];
    const inputParts: string[] = [];

    clips.forEach((clip, i) => {
      inputParts.push(`-loop 1 -t ${clip.duration} -i "${clip.imageUrl}"`);

      const kb = clip.kenBurns;
      const frames = clip.duration * fps;

      // Ken Burns zoompan filter
      const zoomStart = kb.startPosition.scale;
      const zoomEnd = kb.endPosition.scale;
      const xStart = kb.startPosition.x;
      const xEnd = kb.endPosition.x;
      const yStart = kb.startPosition.y;
      const yEnd = kb.endPosition.y;

      filterParts.push(
        `[${i}:v]scale=8000:-1,` +
        `zoompan=z='${zoomStart}+(${zoomEnd}-${zoomStart})*on/${frames}':` +
        `x='iw*(${xStart}+(${xEnd}-${xStart})*on/${frames})-iw/2':` +
        `y='ih*(${yStart}+(${yEnd}-${yStart})*on/${frames})-ih/2':` +
        `d=${frames}:s=${width}x${height}:fps=${fps}[v${i}]`
      );
    });

    // Concat all clips
    const concatInputs = clips.map((_, i) => `[v${i}]`).join('');
    const concatFilter = `${concatInputs}concat=n=${clips.length}:v=1:a=0[outv]`;

    return `ffmpeg \\
${inputParts.join(' \\\n')} \\
-filter_complex "
${filterParts.join(';\\n')};
${concatFilter}
" \\
-map "[outv]" \\
-c:v libx264 -preset medium -crf 18 \\
-pix_fmt yuv420p \\
output_video.mp4`;
  }

  /**
   * Estimate cost for image-based video
   */
  static estimateCost(sceneCount: number): number {
    return sceneCount * 0.04; // $0.04 per image
  }

  protected buildPrompt(input: ImageVideoInput, context: AgentContext): string {
    return '';
  }
}

// ===========================================
// Factory Export
// ===========================================

export const imageVideoAgent = new ImageVideoAgent();
