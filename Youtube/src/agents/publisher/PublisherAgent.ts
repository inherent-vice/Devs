/**
 * Publisher Agent
 *
 * Handles YouTube video publishing with optimized metadata:
 * - Title and description optimization for SEO
 * - Tag generation and optimization
 * - Thumbnail selection
 * - Scheduling and visibility management
 * - Analytics tracking setup
 */

import { z, ZodSchema } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { getYouTubeClient, VideoUploadResult } from '../../clients/youtube.js';
import { getDriveClient } from '../../clients/drive.js';
import type { AgentContext, AgentResult, AgentMetrics } from '../base/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ===========================================
// Input/Output Schemas
// ===========================================

export const PublisherInputSchema = z.object({
  // Production outputs
  video: z.object({
    url: z.string(),
    duration: z.number(),
    resolution: z.string().optional(),
  }),
  thumbnail: z.object({
    url: z.string(),
    variationType: z.string().optional(),
  }).optional(),
  subtitles: z.object({
    srtUrl: z.string().optional(),
    vttUrl: z.string().optional(),
  }).optional(),

  // Content metadata
  script: z.object({
    title: z.string(),
    hook: z.string(),
    fullText: z.string(),
    keywords: z.array(z.string()),
    callToAction: z.string(),
  }),

  // Topic information
  topic: z.object({
    title: z.string(),
    hook: z.string(),
    angle: z.string(),
    targetKeywords: z.array(z.string()).optional(),
  }),

  // Publishing options
  publishOptions: z.object({
    visibility: z.enum(['public', 'unlisted', 'private']).default('private'),
    scheduledTime: z.string().datetime().optional(),
    categoryId: z.string().default('22'), // People & Blogs
    playlistId: z.string().optional(),
    language: z.string().default('ko'),
    notifySubscribers: z.boolean().default(true),
  }).optional(),

  // Video type for optimization
  videoType: z.enum(['shorts', 'medium', 'longform']),
});

export type PublisherInput = z.infer<typeof PublisherInputSchema>;

export const PublisherOutputSchema = z.object({
  // Upload result
  videoId: z.string(),
  url: z.string(),
  status: z.enum(['published', 'scheduled', 'processing', 'uploaded']),
  publishedAt: z.string().optional(),
  scheduledFor: z.string().optional(),

  // Optimized metadata
  metadata: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    categoryId: z.string(),
    thumbnailUrl: z.string().optional(),
  }),

  // Optimization details
  optimization: z.object({
    titleScore: z.number(),
    descriptionScore: z.number(),
    tagRelevance: z.number(),
    seoScore: z.number(),
    suggestions: z.array(z.string()),
  }),
});

export type PublisherOutput = z.infer<typeof PublisherOutputSchema>;

// Internal schema for LLM optimization
const MetadataOptimizationSchema = z.object({
  optimizedTitle: z.string().describe('SEO-optimized title (max 100 chars)'),
  optimizedDescription: z.string().describe('Full description with timestamps, links, CTAs'),
  optimizedTags: z.array(z.string()).describe('Relevant tags for discovery'),
  titleScore: z.number().min(0).max(1).describe('Title optimization score'),
  descriptionScore: z.number().min(0).max(1).describe('Description completeness score'),
  tagRelevance: z.number().min(0).max(1).describe('Tag relevance score'),
  seoScore: z.number().min(0).max(1).describe('Overall SEO score'),
  suggestions: z.array(z.string()).describe('Further optimization suggestions'),
});

// ===========================================
// Publisher Agent
// ===========================================

export class PublisherAgent extends BaseAgent<PublisherInput, PublisherOutput> {
  readonly name = 'publisher-agent';
  readonly description = 'Optimizes metadata and publishes videos to YouTube';

  // Note: Using type assertion due to Zod's default() creating input/output type asymmetry
  protected readonly inputSchema = PublisherInputSchema as ZodSchema<PublisherInput>;
  protected readonly outputSchema = PublisherOutputSchema as ZodSchema<PublisherOutput>;

  protected readonly systemPrompt = `You are a YouTube SEO and publishing expert.
Your task is to optimize video metadata for maximum discoverability and engagement.

## Title Optimization
- Keep under 100 characters (60-70 ideal)
- Front-load keywords
- Create curiosity gap
- Include numbers when relevant
- Avoid clickbait that doesn't deliver

## Description Optimization
- First 150 chars are crucial (visible before "Show more")
- Include timestamps for longer videos
- Add relevant links and CTAs
- Use natural keyword placement
- Include hashtags (3-5 relevant ones)
- Add social links and channel info

## Tag Strategy
- Mix of broad and specific tags
- Include brand/channel name
- Related search terms
- Competitor video tags (relevant ones)
- Long-tail keywords
- 15-25 tags optimal

## Platform-Specific Rules
For Shorts:
- Title under 40 chars
- #Shorts tag required
- Vertical format emphasis
- Quick hook mention

For Regular Videos:
- Detailed descriptions
- Chapter timestamps
- Community engagement CTAs

Provide scores from 0 to 1 for each optimization aspect.`;

  // Override model settings
  protected temperature = 0.6;
  protected maxOutputTokens = 4096;

  /**
   * Execute the publishing workflow
   */
  async execute(input: PublisherInput, context: AgentContext): Promise<AgentResult<PublisherOutput>> {
    const startTime = Date.now();

    try {
      console.log(`[PublisherAgent] Starting publish workflow for session ${context.sessionId}`);

      // Step 1: Optimize metadata using LLM
      const optimizedMetadata = await this.optimizeMetadata(input, context);

      // Step 2: Download video and thumbnail to temp files
      const { videoPath, thumbnailPath } = await this.downloadAssets(input);

      // Step 3: Upload to YouTube
      const defaultOptions = {
        visibility: 'private' as const,
        categoryId: '22',
        language: 'ko',
        notifySubscribers: true,
      };
      const uploadResult = await this.uploadToYouTube(
        videoPath,
        thumbnailPath,
        optimizedMetadata,
        { ...defaultOptions, ...input.publishOptions },
        input.videoType
      );

      // Step 4: Cleanup temp files
      await this.cleanupTempFiles(videoPath, thumbnailPath);

      // Calculate metrics
      const metrics: AgentMetrics = {
        duration: Date.now() - startTime,
        tokensUsed: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0, // YouTube API is free within quota
        retryCount: 0,
      };

      const output: PublisherOutput = {
        videoId: uploadResult.videoId,
        url: uploadResult.url,
        status: uploadResult.status === 'scheduled' ? 'scheduled' :
                uploadResult.status === 'processing' ? 'processing' : 'published',
        publishedAt: uploadResult.publishedAt?.toISOString(),
        scheduledFor: uploadResult.scheduledFor?.toISOString(),
        metadata: {
          title: optimizedMetadata.optimizedTitle,
          description: optimizedMetadata.optimizedDescription,
          tags: optimizedMetadata.optimizedTags,
          categoryId: input.publishOptions?.categoryId || '22',
          thumbnailUrl: input.thumbnail?.url,
        },
        optimization: {
          titleScore: optimizedMetadata.titleScore,
          descriptionScore: optimizedMetadata.descriptionScore,
          tagRelevance: optimizedMetadata.tagRelevance,
          seoScore: optimizedMetadata.seoScore,
          suggestions: optimizedMetadata.suggestions,
        },
      };

      console.log(`[PublisherAgent] Published successfully: ${uploadResult.url}`);
      return this.createSuccessResult(output, metrics);

    } catch (error) {
      console.error(`[PublisherAgent] Error:`, error);
      return this.createErrorResult(
        {
          type: 'api',
          message: (error as Error).message,
          cause: error as Error,
          retryable: true,
        },
        startTime,
        0
      );
    }
  }

  /**
   * Optimize metadata using LLM
   */
  private async optimizeMetadata(
    input: PublisherInput,
    context: AgentContext
  ): Promise<z.infer<typeof MetadataOptimizationSchema>> {
    const { ai } = await import('../../genkit.config.js');

    const prompt = this.buildOptimizationPrompt(input);

    const response = await ai.generate({
      model: this.model,
      prompt,
      config: {
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
      },
      output: { schema: MetadataOptimizationSchema },
    });

    return response.output as z.infer<typeof MetadataOptimizationSchema>;
  }

  /**
   * Build optimization prompt
   */
  private buildOptimizationPrompt(input: PublisherInput): string {
    const isShorts = input.videoType === 'shorts';

    return `${this.systemPrompt}

## Video Information
- Type: ${input.videoType.toUpperCase()}
- Original Title: ${input.script.title}
- Hook: ${input.script.hook}
- Topic Angle: ${input.topic.angle}
- Duration: ${Math.round(input.video.duration / 60)} minutes
- Keywords: ${input.script.keywords.join(', ')}
- Target Keywords: ${input.topic.targetKeywords?.join(', ') || 'N/A'}
- Language: ${input.publishOptions?.language || 'ko'}

## Script Summary
${input.script.fullText.substring(0, 500)}...

## Call to Action
${input.script.callToAction}

## Your Task
Optimize the metadata for ${isShorts ? 'YouTube Shorts' : 'a regular YouTube video'}.

Requirements:
${isShorts ? `
- Title: Max 40 characters, include #Shorts
- Description: Brief, include relevant hashtags
- Tags: Include #Shorts, #YTShorts, plus relevant tags
` : `
- Title: 60-70 characters ideal, max 100
- Description: Complete with timestamps placeholder, CTAs, links section
- Tags: 15-25 relevant tags
`}

Respond with optimized metadata in the specified format.`;
  }

  /**
   * Download video and thumbnail to temp files
   */
  private async downloadAssets(input: PublisherInput): Promise<{
    videoPath: string;
    thumbnailPath?: string;
  }> {
    const driveClient = getDriveClient();
    const tempDir = os.tmpdir();

    // Download video
    const videoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
    await this.downloadFile(input.video.url, videoPath);

    // Download thumbnail if available
    let thumbnailPath: string | undefined;
    if (input.thumbnail?.url) {
      thumbnailPath = path.join(tempDir, `thumb-${Date.now()}.jpg`);
      await this.downloadFile(input.thumbnail.url, thumbnailPath);
    }

    return { videoPath, thumbnailPath };
  }

  /**
   * Download a file from URL or GCS
   */
  private async downloadFile(url: string, destPath: string): Promise<void> {
    if (url.startsWith('gs://')) {
      // Download from Google Cloud Storage
      const driveClient = getDriveClient();
      // Parse GCS URL
      const match = url.match(/gs:\/\/([^\/]+)\/(.+)/);
      if (!match) throw new Error(`Invalid GCS URL: ${url}`);

      // For now, we'll fetch via HTTP URL converted from GCS
      const httpUrl = `https://storage.googleapis.com/${match[1]}/${match[2]}`;
      await this.downloadFromHttp(httpUrl, destPath);
    } else if (url.startsWith('http')) {
      await this.downloadFromHttp(url, destPath);
    } else {
      // Assume it's a local path
      if (fs.existsSync(url)) {
        fs.copyFileSync(url, destPath);
      } else {
        throw new Error(`File not found: ${url}`);
      }
    }
  }

  /**
   * Download from HTTP URL
   */
  private async downloadFromHttp(url: string, destPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
  }

  /**
   * Upload to YouTube
   */
  private async uploadToYouTube(
    videoPath: string,
    thumbnailPath: string | undefined,
    metadata: z.infer<typeof MetadataOptimizationSchema>,
    options: NonNullable<PublisherInput['publishOptions']>,
    videoType: PublisherInput['videoType']
  ): Promise<VideoUploadResult> {
    const youtubeClient = getYouTubeClient();

    // Check if authenticated
    if (!youtubeClient.canUpload()) {
      throw new Error('YouTube OAuth not configured. Please authenticate first.');
    }

    // Prepare tags with #Shorts for shorts videos
    let tags = [...metadata.optimizedTags];
    if (videoType === 'shorts' && !tags.includes('Shorts')) {
      tags = ['Shorts', 'YTShorts', ...tags];
    }

    // Upload video
    const result = await youtubeClient.uploadVideo({
      title: metadata.optimizedTitle,
      description: metadata.optimizedDescription,
      tags: tags.slice(0, 500), // YouTube limit
      categoryId: options.categoryId || '22',
      privacyStatus: options.visibility || 'private',
      videoFilePath: videoPath,
      thumbnailFilePath: thumbnailPath,
      playlistId: options.playlistId,
      scheduledStartTime: options.scheduledTime ? new Date(options.scheduledTime) : undefined,
      language: options.language || 'ko',
    });

    return result;
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(videoPath: string, thumbnailPath?: string): Promise<void> {
    try {
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    } catch (error) {
      console.warn('[PublisherAgent] Cleanup warning:', error);
    }
  }
}

// ===========================================
// Singleton Export
// ===========================================

export const publisherAgent = new PublisherAgent();
export default publisherAgent;
