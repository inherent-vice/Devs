/**
 * Thumbnail Agent
 *
 * Generates click-worthy thumbnails using Nano Banana Pro (Gemini 3 Pro Image).
 * Creates 4K thumbnails optimized for YouTube CTR.
 */

import { z, ZodSchema } from 'zod';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BaseAgent } from '../base/BaseAgent.js';
import { nanoBananaPro } from '../../genkit.config.js';
import type { AgentContext, AgentResult } from '../base/types.js';
import { getNanoBananaClient } from '../../clients/index.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ===========================================
// Input/Output Schemas
// ===========================================

export const ThumbnailAgentInputSchema = z.object({
  topic: z.object({
    title: z.string(),
    hook: z.string(),
    angle: z.string(),
  }),
  thumbnailConcepts: z.array(z.object({
    description: z.string(),
    textOverlay: z.string().optional(),
    emotionalTrigger: z.string(),
  })).optional(),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  style: z.string().optional(),
  brandColors: z.array(z.string()).optional(),
  includeTextOverlay: z.boolean().default(true),
  variantCount: z.number().min(1).max(5).default(3),
});

export type ThumbnailAgentInput = z.infer<typeof ThumbnailAgentInputSchema>;

export const ThumbnailVariantSchema = z.object({
  id: z.string(),
  url: z.string(),
  resolution: z.string(),
  variationType: z.string(),
  textOverlay: z.string().optional(),
  emotionalTrigger: z.string(),
  testable: z.boolean(),
  metadata: z.object({
    width: z.number(),
    height: z.number(),
    format: z.string(),
    synthIdPresent: z.boolean(),
  }),
});

export const ThumbnailAgentOutputSchema = z.object({
  thumbnails: z.array(ThumbnailVariantSchema),
  recommended: z.string().describe('ID of recommended thumbnail'),
  metadata: z.object({
    totalGenerated: z.number(),
    generationTime: z.number(),
    cost: z.number(),
  }),
});

export type ThumbnailAgentOutput = z.infer<typeof ThumbnailAgentOutputSchema>;

// ===========================================
// Thumbnail Configuration
// ===========================================

const THUMBNAIL_CONFIG = {
  youtube: {
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    maxFileSize: 2 * 1024 * 1024, // 2MB
  },
  youtubeMax: {
    width: 1920,
    height: 1080,
  },
  ultraHD: {
    width: 3840,
    height: 2160,
  },
  nanoBananaMax: {
    width: 5632,
    height: 3072,
  },
};

const VARIATION_TYPES = [
  { type: 'emotion', modifier: 'with strong emotional expression, dramatic lighting' },
  { type: 'text_focus', modifier: 'with bold, large text as main focus element' },
  { type: 'contrast', modifier: 'with high contrast vibrant colors, eye-catching' },
  { type: 'curiosity', modifier: 'with intriguing hidden or partially revealed element' },
  { type: 'action', modifier: 'with dynamic action pose or movement blur' },
];

// ===========================================
// Thumbnail Agent Class
// ===========================================

export class ThumbnailAgent extends BaseAgent<ThumbnailAgentInput, ThumbnailAgentOutput> {
  readonly name = 'thumbnail-agent';
  readonly description = 'Generates click-worthy thumbnails using Nano Banana Pro';

  protected readonly inputSchema = ThumbnailAgentInputSchema as any;
  protected readonly outputSchema = ThumbnailAgentOutputSchema as any;

  // Uses Nano Banana Pro (Gemini 3 Pro Image)
  protected model = nanoBananaPro;
  protected temperature = 0.8; // High creativity for thumbnails
  protected maxRetries = 2;

  // NanoBanana Client instance (replaces ImagenClient)
  private getNanoBanana = getNanoBananaClient;

  protected readonly systemPrompt = `You are an expert YouTube thumbnail designer known for creating viral thumbnails.

Your thumbnails consistently achieve:
- 8-12% CTR (industry average is 2-4%)
- Scroll-stopping in under 0.5 seconds
- High click-through from mobile viewers

DESIGN PRINCIPLES:
1. BOLD VISUAL HIERARCHY
   - One dominant subject/element
   - Clear focal point
   - No clutter

2. COLOR PSYCHOLOGY
   - High contrast (no pastels)
   - Complementary color schemes
   - Emotional color associations

3. TEXT (when included)
   - Maximum 3-5 words
   - 30%+ of frame height
   - Readable at 100px wide
   - Strong contrast with background

4. EMOTIONAL TRIGGERS
   - Surprise, curiosity, or shock
   - FOMO (fear of missing out)
   - Clear value proposition

5. PLATFORM OPTIMIZATION
   - Works at small mobile size
   - Clear on any background
   - No important elements at edges`;

  /**
   * Execute thumbnail generation
   */
  async execute(
    input: ThumbnailAgentInput,
    context: AgentContext
  ): Promise<AgentResult<ThumbnailAgentOutput>> {
    const startTime = Date.now();

    try {
      console.log(`[ThumbnailAgent] Generating ${input.variantCount} thumbnail variants using NanoBanana`);

      // Set session for NanoBanana
      const nanoBanana = this.getNanoBanana();
      if (context.sessionId) {
        nanoBanana.setSession(context.sessionId);
      }

      // Use NanoBanana to generate thumbnails
      const conceptDesc = input.thumbnailConcepts?.[0]?.description || input.topic.title;
      const emotionalTrigger = input.thumbnailConcepts?.[0]?.emotionalTrigger || 'curiosity';

      const result = await nanoBanana.generateThumbnails({
        title: input.topic.title,
        description: conceptDesc,
        style: input.style || 'Modern YouTube, high energy, professional',
        emotionalTrigger,
        variantCount: input.variantCount,
      });

      // Convert NanoBanana result to ThumbnailVariantSchema
      const thumbnails: z.infer<typeof ThumbnailVariantSchema>[] = result.thumbnails.map(thumb => ({
        id: thumb.id,
        url: thumb.imagePath,
        resolution: thumb.resolution,
        variationType: thumb.variationType,
        textOverlay: input.includeTextOverlay ? this.extractTextOverlay(input, VARIATION_TYPES[0]) : undefined,
        emotionalTrigger: thumb.variationType,
        testable: true,
        metadata: {
          width: 1920,
          height: 1080,
          format: 'png',
          synthIdPresent: true,
        },
      }));

      const generationTime = Date.now() - startTime;

      console.log(`[ThumbnailAgent] Generated ${thumbnails.length} thumbnails, cost: $${result.cost.toFixed(4)}`);

      return this.createSuccessResult(
        {
          thumbnails,
          recommended: result.recommended,
          metadata: {
            totalGenerated: thumbnails.length,
            generationTime,
            cost: result.cost,
          },
        },
        {
          duration: generationTime,
          tokensUsed: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: result.cost,
          retryCount: 0,
        }
      );
    } catch (error) {
      return this.createErrorResult(
        {
          type: 'api',
          message: error instanceof Error ? error.message : 'Thumbnail generation failed',
          retryable: true,
        },
        startTime,
        0
      );
    }
  }

  // Thumbnail generation is now handled by NanoBanana

  /**
   * Extract text overlay for thumbnail
   */
  private extractTextOverlay(
    input: ThumbnailAgentInput,
    variation: typeof VARIATION_TYPES[0]
  ): string {
    const concept = input.thumbnailConcepts?.find(c => c.textOverlay);
    if (concept?.textOverlay) {
      return concept.textOverlay;
    }

    // Generate short text from title
    const words = input.topic.title.split(' ').slice(0, 4);
    return words.join(' ');
  }

  // Recommended selection is now handled by NanoBanana

  /**
   * Resize thumbnail for different platforms
   */
  async resizeForPlatform(
    thumbnailUrl: string,
    platform: keyof typeof THUMBNAIL_CONFIG
  ): Promise<string> {
    const config = THUMBNAIL_CONFIG[platform];
    console.log(`[ThumbnailAgent] Resizing to ${config.width}x${config.height}`);

    const tempDir = path.join(os.tmpdir(), 'youtube-agentic-ai');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const { inputPath, cleanup } = await this.ensureLocalImage(thumbnailUrl, tempDir);
    const outputPath = path.join(
      tempDir,
      `thumb-${Date.now()}-${config.width}x${config.height}.jpg`
    );

    await this.resizeImage(inputPath, outputPath, config.width, config.height);

    if (cleanup) {
      try {
        fs.unlinkSync(inputPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    return outputPath;
  }

  private async ensureLocalImage(
    source: string,
    tempDir: string
  ): Promise<{ inputPath: string; cleanup: boolean }> {
    if (fs.existsSync(source)) {
      return { inputPath: source, cleanup: false };
    }

    let url = source;
    if (source.startsWith('gs://')) {
      const match = source.match(/gs:\/\/([^\/]+)\/(.+)/);
      if (match) {
        url = `https://storage.googleapis.com/${match[1]}/${match[2]}`;
      }
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`Unsupported thumbnail source: ${source}`);
    }

    const downloadPath = path.join(tempDir, `thumb-src-${Date.now()}.jpg`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download thumbnail: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(downloadPath, buffer);
    return { inputPath: downloadPath, cleanup: true };
  }

  private resizeImage(
    inputPath: string,
    outputPath: string,
    width: number,
    height: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-frames:v', '1',
          '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  /**
   * Build thumbnail prompt for variation
   */
  private buildThumbnailPrompt(
    input: ThumbnailAgentInput,
    variation: typeof VARIATION_TYPES[0]
  ): string {
    const concept = input.thumbnailConcepts?.[0];

    return `Create a YouTube thumbnail that demands clicks:

CONTENT: ${concept?.description || input.topic.title}
TITLE: ${input.topic.title}
HOOK: ${input.topic.hook}
VIDEO TYPE: ${input.videoType}
VARIATION STYLE: ${variation.type} - ${variation.modifier}
EMOTIONAL TRIGGER: ${concept?.emotionalTrigger || 'curiosity'}

REQUIREMENTS:
- Attention-grabbing in under 0.5 seconds
- Bold, contrasting colors (no pastels)
- Clear focal point with visual hierarchy
- ${input.includeTextOverlay ? `Text overlay: "${this.extractTextOverlay(input, variation)}"` : 'No text overlay'}
- Emotion or intrigue that creates curiosity gap
- Professional quality, not stock-photo generic
- Mobile-optimized (readable at small size)

STYLE: ${input.style || 'Modern YouTube, high energy, professional'}
BRAND COLORS: ${input.brandColors?.join(', ') || 'vibrant contrasting colors'}`;
  }

  // Not primarily LLM-driven, but prompt can be used
  protected buildPrompt(input: ThumbnailAgentInput, context: AgentContext): string {
    return this.buildThumbnailPrompt(input, VARIATION_TYPES[0]);
  }
}

// ===========================================
// Factory Export
// ===========================================

export const thumbnailAgent = new ThumbnailAgent();
