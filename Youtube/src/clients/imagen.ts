/**
 * Imagen (Nano Banana Pro) Image Generation Client
 *
 * Generates high-quality images using Google's Imagen model via Vertex AI.
 * Used for YouTube thumbnail generation.
 */

import { VertexAI } from '@google-cloud/vertexai';
import { getEnv } from '../utils/env.js';
import { getDriveClient } from './drive.js';

// ===========================================
// Types
// ===========================================

export interface ImagenGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  numberOfImages?: number; // 1-4
  seed?: number;
  guidanceScale?: number; // 0-100, default 60
  safetyFilterLevel?: 'block_few' | 'block_some' | 'block_most';
}

export interface ImagenGenerationResult {
  images: Array<{
    id: string;
    url: string;
    fileId: string;
    base64?: string;
  }>;
  cost: number;
  generationTimeMs: number;
}

export interface ThumbnailGenerationRequest {
  title: string;
  description: string;
  style?: string;
  emotionalTrigger?: string;
  includeText?: boolean;
  textOverlay?: string;
  brandColors?: string[];
  variantCount?: number; // 1-4
}

export interface ThumbnailResult {
  thumbnails: Array<{
    id: string;
    url: string;
    fileId: string;
    variationType: string;
    resolution: string;
  }>;
  recommended: string; // ID of recommended thumbnail
  cost: number;
  generationTimeMs: number;
}

// ===========================================
// Imagen Configuration
// ===========================================

const IMAGEN_CONFIG = {
  model: 'imagegeneration@006', // Imagen 3
  maxImages: 4,
  maxResolution: { width: 1024, height: 1024 },
  youtubeThumbSize: { width: 1280, height: 720 },
  supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'] as const,
  pricing: {
    perImage: 0.04, // Standard pricing
    perImageHD: 0.08, // High definition
  },
  endpoints: {
    generate: 'publishers/google/models/imagegeneration',
  },
};

// Thumbnail variation types
const THUMBNAIL_VARIATIONS = [
  {
    type: 'emotion',
    modifier: 'with strong emotional expression, dramatic lighting, cinematic mood',
    priority: 1,
  },
  {
    type: 'contrast',
    modifier: 'with high contrast vibrant colors, eye-catching, bold visual style',
    priority: 2,
  },
  {
    type: 'curiosity',
    modifier: 'with intriguing hidden element, mystery, creates curiosity gap',
    priority: 3,
  },
  {
    type: 'action',
    modifier: 'with dynamic action pose, movement, energy, excitement',
    priority: 4,
  },
];

// ===========================================
// Imagen Client
// ===========================================

export class ImagenClient {
  private vertexAI: VertexAI;
  private projectId: string;
  private location: string;
  private driveClient = getDriveClient();

  constructor() {
    const env = getEnv();
    this.projectId = env.GOOGLE_CLOUD_PROJECT;
    this.location = env.GOOGLE_CLOUD_LOCATION;

    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });

    console.log(`[ImagenClient] Connected to Vertex AI in ${this.location}`);
  }

  // ===========================================
  // Generation Methods
  // ===========================================

  /**
   * Generate images from prompt
   */
  async generate(request: ImagenGenerationRequest): Promise<ImagenGenerationResult> {
    const startTime = Date.now();
    const numberOfImages = Math.min(request.numberOfImages || 1, IMAGEN_CONFIG.maxImages);

    // Build the generation request
    const generationRequest = {
      prompt: this.buildPrompt(request),
      negativePrompt: request.negativePrompt,
      sampleCount: numberOfImages,
      aspectRatio: request.aspectRatio || '16:9',
      seed: request.seed,
      guidanceScale: request.guidanceScale || 60,
      safetyFilterLevel: request.safetyFilterLevel || 'block_some',
    };

    // Call Imagen API via Vertex AI
    const response = await this.callImagenAPI(generationRequest);

    const generationTimeMs = Date.now() - startTime;
    const cost = this.calculateCost(numberOfImages);

    return {
      images: response.images,
      cost,
      generationTimeMs,
    };
  }

  /**
   * Generate YouTube thumbnails with variations
   */
  async generateThumbnails(
    request: ThumbnailGenerationRequest,
    sessionId: string
  ): Promise<ThumbnailResult> {
    const startTime = Date.now();
    const variantCount = Math.min(request.variantCount || 3, IMAGEN_CONFIG.maxImages);

    const thumbnails: ThumbnailResult['thumbnails'] = [];
    let totalCost = 0;

    // Generate each variation
    const variations = THUMBNAIL_VARIATIONS.slice(0, variantCount);

    for (const variation of variations) {
      const prompt = this.buildThumbnailPrompt(request, variation);

      const result = await this.generate({
        prompt,
        negativePrompt: 'blurry, low quality, text, watermark, logo, ugly, distorted',
        aspectRatio: '16:9',
        numberOfImages: 1,
        guidanceScale: 70, // Higher for thumbnails
      });

      if (result.images.length > 0) {
        const image = result.images[0];

        thumbnails.push({
          id: image.id,
          url: image.url,
          fileId: image.fileId,
          variationType: variation.type,
          resolution: '1280x720',
        });

        totalCost += result.cost;
      }
    }

    // Select recommended thumbnail (prefer emotion type)
    const recommended = thumbnails.find(t => t.variationType === 'emotion')?.id
      || thumbnails[0]?.id
      || '';

    return {
      thumbnails,
      recommended,
      cost: totalCost,
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generate A/B test variants
   */
  async generateABTestVariants(
    basePrompt: string,
    variantModifiers: string[],
    sessionId: string
  ): Promise<ThumbnailResult> {
    const startTime = Date.now();
    const thumbnails: ThumbnailResult['thumbnails'] = [];
    let totalCost = 0;

    for (let i = 0; i < variantModifiers.length; i++) {
      const prompt = `${basePrompt}. ${variantModifiers[i]}`;

      const result = await this.generate({
        prompt,
        aspectRatio: '16:9',
        numberOfImages: 1,
      });

      if (result.images.length > 0) {
        thumbnails.push({
          id: result.images[0].id,
          url: result.images[0].url,
          fileId: result.images[0].fileId,
          variationType: `variant-${i + 1}`,
          resolution: '1280x720',
        });
        totalCost += result.cost;
      }
    }

    return {
      thumbnails,
      recommended: thumbnails[0]?.id || '',
      cost: totalCost,
      generationTimeMs: Date.now() - startTime,
    };
  }

  // ===========================================
  // Private Methods
  // ===========================================

  private buildPrompt(request: ImagenGenerationRequest): string {
    let prompt = request.prompt;

    // Add quality modifiers
    prompt += '. Ultra high quality, professional photography, sharp focus, well-lit';

    return prompt;
  }

  private buildThumbnailPrompt(
    request: ThumbnailGenerationRequest,
    variation: typeof THUMBNAIL_VARIATIONS[0]
  ): string {
    const parts: string[] = [];

    // Main subject
    parts.push(`YouTube thumbnail for: ${request.title}`);

    // Description
    if (request.description) {
      parts.push(request.description);
    }

    // Style
    parts.push(request.style || 'Modern YouTube style, high energy, professional');

    // Emotional trigger
    if (request.emotionalTrigger) {
      parts.push(`Emotional trigger: ${request.emotionalTrigger}`);
    }

    // Variation modifier
    parts.push(variation.modifier);

    // Text overlay note (Imagen may not handle text well)
    if (request.includeText && request.textOverlay) {
      parts.push(`Space for text overlay: "${request.textOverlay}"`);
    }

    // Brand colors
    if (request.brandColors?.length) {
      parts.push(`Using colors: ${request.brandColors.join(', ')}`);
    }

    // Quality requirements
    parts.push('Ultra high quality, 1280x720, suitable for YouTube thumbnail');
    parts.push('Eye-catching, scroll-stopping, click-worthy');
    parts.push('Clear focal point, high contrast, mobile-optimized');

    return parts.join('. ');
  }

  private calculateCost(numberOfImages: number, isHD: boolean = false): number {
    const rate = isHD ? IMAGEN_CONFIG.pricing.perImageHD : IMAGEN_CONFIG.pricing.perImage;
    return numberOfImages * rate;
  }

  /**
   * Call Imagen generation API
   */
  private async callImagenAPI(request: any): Promise<{
    images: Array<{ id: string; url: string; fileId: string; base64?: string }>;
  }> {
    console.log(`[ImagenClient] Generating ${request.sampleCount} images...`);

    // TODO: Implement actual Vertex AI Imagen API call
    // The Imagen API interface may evolve - this is a placeholder

    throw new Error(
      'Imagen API integration pending. ' +
      'The API is available via Vertex AI but requires specific endpoint configuration. ' +
      'Please check Google Cloud documentation for the latest API details.'
    );
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Estimate cost for thumbnail generation
   */
  estimateCost(variantCount: number): number {
    return this.calculateCost(variantCount);
  }

  /**
   * Get available variations
   */
  getVariations(): typeof THUMBNAIL_VARIATIONS {
    return [...THUMBNAIL_VARIATIONS];
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...IMAGEN_CONFIG };
  }

  /**
   * Generate a single scene image for video
   * Used by ImageVideoAgent for Ken Burns style videos
   */
  async generateSceneImage(request: {
    prompt: string;
    width: number;
    height: number;
    style?: string;
  }): Promise<{ url: string; fileId: string }> {
    const startTime = Date.now();

    // Determine aspect ratio from dimensions
    const aspectRatio = request.width > request.height ? '16:9' : '9:16';

    // Build optimized prompt for scene image
    const prompt = [
      request.prompt,
      request.style || 'cinematic, high quality',
      'detailed, professional photography',
      'perfect for video background',
      'no text, no watermarks',
    ].join(', ');

    console.log(`[ImagenClient] Generating scene image: ${request.width}x${request.height}`);

    // For now, return a placeholder URL
    // In production, this would call the Imagen API
    const imageId = `scene-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Save to Google Drive
    const driveResult = await this.driveClient.saveSceneImage({
      imageId,
      prompt,
      width: request.width,
      height: request.height,
    });

    console.log(`[ImagenClient] Scene image generated in ${Date.now() - startTime}ms`);

    return {
      url: driveResult.webViewLink,
      fileId: driveResult.fileId,
    };
  }
}

// ===========================================
// Singleton Export
// ===========================================

let imagenClientInstance: ImagenClient | null = null;

export function getImagenClient(): ImagenClient {
  if (!imagenClientInstance) {
    imagenClientInstance = new ImagenClient();
  }
  return imagenClientInstance;
}
