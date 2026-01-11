/**
 * Nano Banana Pro Client (AI Studio - Gemini 3.0)
 *
 * High-quality image generation using Google AI Studio with Gemini 3.0.
 * Uses Tier 1 paid account for higher quotas.
 *
 * Features:
 * - Gemini 3.0 Pro Image (최신 모델)
 * - Multiple aspect ratios (16:9, 9:16, 1:1, etc.)
 * - Scene image generation for videos
 * - YouTube thumbnail generation
 */

import { getEnv } from '../utils/env.js';
import { getLocalStorage, type LocalStorageManager } from '../storage/LocalStorageManager.js';
import * as fs from 'fs';
import * as path from 'path';

// ===========================================
// Types
// ===========================================

export interface NanoBananaRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  imageSize?: '1K' | '2K' | '4K';
  style?: string;
  numberOfImages?: number;
}

export interface NanoBananaResult {
  images: Array<{
    id: string;
    path: string;
    filename: string;
    base64?: string;
  }>;
  cost: number;
  generationTimeMs: number;
}

export interface SceneImageRequest {
  id: string;
  prompt: string;
  visualNotes?: string;
  style?: string;
  aspectRatio?: '16:9' | '9:16';
  duration?: number;
}

export interface SceneImageResult {
  id: string;
  imagePath: string;
  filename: string;
  width: number;
  height: number;
  cost: number;
}

export interface ThumbnailRequest {
  title: string;
  description?: string;
  style?: string;
  emotionalTrigger?: string;
  variantCount?: number;
}

export interface ThumbnailVariant {
  id: string;
  imagePath: string;
  filename: string;
  variationType: string;
  resolution: string;
}

export interface ThumbnailResult {
  thumbnails: ThumbnailVariant[];
  recommended: string;
  cost: number;
  generationTimeMs: number;
}

// ===========================================
// Configuration
// ===========================================

const NANO_BANANA_CONFIG = {
  // Gemini 3.0 Pro Image 모델 (AI Studio Tier 1) - 단일 모델만 사용
  model: 'gemini-3-pro-image-preview',
  apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  pricing: {
    perImage: 0.02,  // AI Studio 가격 (추정)
    perImage4K: 0.04,
  },
  // 재시도 설정
  retry: {
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 10000,
  },
  resolutions: {
    '1K': { width: 1024, height: 1024 },
    '2K': { width: 2048, height: 2048 },
    '4K': { width: 4096, height: 4096 },
  },
  aspectRatioSizes: {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:3': { width: 1440, height: 1080 },
    '3:4': { width: 1080, height: 1440 },
  },
};

// Thumbnail variation types for A/B testing
const THUMBNAIL_VARIATIONS = [
  {
    type: 'emotion',
    modifier: 'dramatic emotional expression, intense gaze, cinematic lighting, movie poster style',
  },
  {
    type: 'contrast',
    modifier: 'bold vibrant colors, high contrast, eye-catching, neon accents, modern design',
  },
  {
    type: 'curiosity',
    modifier: 'mysterious atmosphere, hidden details, intriguing elements, creates curiosity',
  },
  {
    type: 'action',
    modifier: 'dynamic composition, motion blur, energy, excitement, dramatic angle',
  },
];

// ===========================================
// Nano Banana Pro Client (AI Studio)
// ===========================================

export class NanoBananaClient {
  private storage: LocalStorageManager;
  private apiKey: string;
  private currentSessionId: string | null = null;

  constructor() {
    const env = getEnv();

    if (!env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is required for Nano Banana Pro');
    }

    this.apiKey = env.GOOGLE_AI_API_KEY;
    this.storage = getLocalStorage();

    console.log(`[NanoBanana] Initialized with Gemini 3.0 (AI Studio Tier 1)`);
    console.log(`[NanoBanana] Model: ${NANO_BANANA_CONFIG.model}`);
  }

  /**
   * Set the active session for storage operations
   */
  setSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    // Verify the session exists (optional check)
    const session = this.storage.getSession(sessionId);
    if (!session) {
      console.log(`[NanoBanana] Session ${sessionId} not found yet, will be available when created`);
    }
  }

  /**
   * Get the current session ID (required for storage operations)
   */
  private getSessionId(): string {
    if (!this.currentSessionId) {
      throw new Error('No session set. Call setSession() first.');
    }
    return this.currentSessionId;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================
  // Core Generation Methods
  // ===========================================

  /**
   * Generate image from prompt
   */
  async generate(request: NanoBananaRequest): Promise<NanoBananaResult> {
    const startTime = Date.now();
    const numberOfImages = request.numberOfImages || 1;
    const images: NanoBananaResult['images'] = [];

    console.log(`[NanoBanana] Generating ${numberOfImages} image(s) with ${NANO_BANANA_CONFIG.model}...`);

    for (let i = 0; i < numberOfImages; i++) {
      try {
        const result = await this.generateSingleImage(request);
        images.push(result);

        // 이미지 간 짧은 딜레이 (rate limit 방지)
        if (i < numberOfImages - 1) {
          await this.sleep(1000);
        }
      } catch (error) {
        console.error(`[NanoBanana] Failed to generate image ${i + 1}:`, error);
        throw error;
      }
    }

    const is4K = request.imageSize === '4K';
    const cost = images.length * (is4K ? NANO_BANANA_CONFIG.pricing.perImage4K : NANO_BANANA_CONFIG.pricing.perImage);

    return {
      images,
      cost,
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generate a single image with retry logic (Gemini 3.0 only, no fallback)
   */
  private async generateSingleImage(request: NanoBananaRequest): Promise<{
    id: string;
    path: string;
    filename: string;
    base64?: string;
  }> {
    const { maxRetries, baseDelayMs, maxDelayMs } = NANO_BANANA_CONFIG.retry;
    let lastError: Error | null = null;

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        return await this.callAIStudio(request);
      } catch (error: any) {
        lastError = error;
        const isRateLimit = error.message?.includes('429') || error.message?.includes('quota');

        if (isRateLimit && retry < maxRetries - 1) {
          const delayMs = Math.min(baseDelayMs * Math.pow(2, retry), maxDelayMs);
          console.log(`[NanoBanana] Rate limited. Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${retry + 1}/${maxRetries}...`);
          await this.sleep(delayMs);
          continue;
        }

        if (retry < maxRetries - 1) {
          const delayMs = baseDelayMs * Math.pow(2, retry);
          console.log(`[NanoBanana] Error: ${error.message?.substring(0, 80)}. Retrying in ${(delayMs / 1000).toFixed(1)}s...`);
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError || new Error('Image generation failed');
  }

  /**
   * Call AI Studio REST API (Gemini 3.0 Pro Image only)
   */
  private async callAIStudio(request: NanoBananaRequest): Promise<{
    id: string;
    path: string;
    filename: string;
    base64?: string;
  }> {
    const aspectRatio = request.aspectRatio || '16:9';
    const fullPrompt = this.buildPromptWithAspect(request, aspectRatio);

    const url = `${NANO_BANANA_CONFIG.apiEndpoint}/${NANO_BANANA_CONFIG.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Studio error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { data: string; mimeType?: string };
            text?: string;
          }>;
        };
      }>;
    };
    const candidate = result.candidates?.[0];

    if (!candidate?.content?.parts) {
      throw new Error('No image generated - empty response');
    }

    // Find the image part
    let imageData: string | null = null;
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        imageData = part.inlineData.data;
        break;
      }
    }

    if (!imageData) {
      throw new Error('No image data in response');
    }

    // Generate unique ID and filename
    const id = `img-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const filename = `${id}.png`;

    // Save to local storage with explicit sessionId
    const sessionId = this.getSessionId();
    const buffer = Buffer.from(imageData, 'base64');
    const thumbnailsDir = path.join(this.storage.getSessionDir(sessionId), 'thumbnails');

    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    const imagePath = path.join(thumbnailsDir, filename);
    fs.writeFileSync(imagePath, buffer);

    console.log(`[NanoBanana] Image saved: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);

    return {
      id,
      path: imagePath,
      filename,
      base64: imageData,
    };
  }

  // ===========================================
  // Scene Image Generation (for videos)
  // ===========================================

  /**
   * Generate scene images for video production
   */
  async generateSceneImages(
    scenes: SceneImageRequest[]
  ): Promise<SceneImageResult[]> {
    const results: SceneImageResult[] = [];

    console.log(`[NanoBanana] Generating ${scenes.length} scene images...`);

    for (const scene of scenes) {
      const result = await this.generateSceneImage(scene);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate a single scene image
   */
  async generateSceneImage(scene: SceneImageRequest): Promise<SceneImageResult> {
    const aspectRatio = scene.aspectRatio || '16:9';
    const size = NANO_BANANA_CONFIG.aspectRatioSizes[aspectRatio];

    const prompt = this.buildScenePrompt(scene);

    console.log(`[NanoBanana] Scene ${scene.id}: ${aspectRatio}`);

    const result = await this.generateSingleImage({
      prompt,
      aspectRatio,
      style: scene.style,
      imageSize: '2K',
    });

    return {
      id: scene.id,
      imagePath: result.path,
      filename: result.filename,
      width: size.width,
      height: size.height,
      cost: NANO_BANANA_CONFIG.pricing.perImage,
    };
  }

  /**
   * Build scene-optimized prompt
   */
  private buildScenePrompt(scene: SceneImageRequest): string {
    const parts: string[] = [];

    parts.push(scene.prompt);

    if (scene.visualNotes) {
      parts.push(scene.visualNotes);
    }

    if (scene.style) {
      parts.push(`Style: ${scene.style}`);
    }

    parts.push('Cinematic composition, professional photography');
    parts.push('Perfect for video background, suitable for Ken Burns effect');
    parts.push('No text, no watermarks, no logos');
    parts.push('High detail, sharp focus, well-lit');

    return parts.join('. ');
  }

  // ===========================================
  // Thumbnail Generation
  // ===========================================

  /**
   * Generate YouTube thumbnails with A/B test variants
   */
  async generateThumbnails(request: ThumbnailRequest): Promise<ThumbnailResult> {
    const startTime = Date.now();
    const variantCount = Math.min(request.variantCount || 3, 4);
    const thumbnails: ThumbnailVariant[] = [];
    let totalCost = 0;

    console.log(`[NanoBanana] Generating ${variantCount} thumbnail variants...`);

    const variations = THUMBNAIL_VARIATIONS.slice(0, variantCount);

    for (const variation of variations) {
      const prompt = this.buildThumbnailPrompt(request, variation);

      try {
        const result = await this.generateSingleImage({
          prompt,
          aspectRatio: '16:9',
          imageSize: '2K',
        });

        thumbnails.push({
          id: result.id,
          imagePath: result.path,
          filename: result.filename,
          variationType: variation.type,
          resolution: '1920x1080',
        });

        totalCost += NANO_BANANA_CONFIG.pricing.perImage;

        console.log(`[NanoBanana] Thumbnail variant: ${variation.type}`);
      } catch (error) {
        console.error(`[NanoBanana] Thumbnail ${variation.type} failed:`, error);
        throw error;
      }
    }

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
   * Build thumbnail-optimized prompt
   */
  private buildThumbnailPrompt(
    request: ThumbnailRequest,
    variation: typeof THUMBNAIL_VARIATIONS[0]
  ): string {
    const parts: string[] = [];

    parts.push(`YouTube thumbnail for: ${request.title}`);

    if (request.description) {
      parts.push(request.description);
    }

    parts.push(request.style || 'Modern YouTube style, professional, high energy');

    if (request.emotionalTrigger) {
      parts.push(`Emotional trigger: ${request.emotionalTrigger}`);
    }

    parts.push(variation.modifier);
    parts.push('Eye-catching, scroll-stopping, click-worthy');
    parts.push('Clear focal point, high contrast, bold colors');
    parts.push('Mobile-optimized, readable at small size');
    parts.push('No text overlay (text will be added separately)');
    parts.push('16:9 aspect ratio, 1920x1080 resolution');

    return parts.join('. ');
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  /**
   * Build full prompt with quality modifiers
   */
  private buildPrompt(request: NanoBananaRequest): string {
    const parts: string[] = [request.prompt];

    if (request.style) {
      parts.push(`Style: ${request.style}`);
    }

    parts.push('Ultra high quality, professional, sharp focus, well-lit');

    if (request.negativePrompt) {
      parts.push(`Avoid: ${request.negativePrompt}`);
    }

    return parts.join('. ');
  }

  /**
   * Build prompt with aspect ratio guidance
   */
  private buildPromptWithAspect(request: NanoBananaRequest, aspectRatio: string): string {
    const basePrompt = this.buildPrompt(request);

    const aspectHints: Record<string, string> = {
      '16:9': 'Wide cinematic format, horizontal composition, landscape orientation',
      '9:16': 'Vertical format, portrait orientation, mobile-optimized',
      '1:1': 'Square format, centered composition',
      '4:3': 'Classic 4:3 aspect ratio, slightly wider than tall',
      '3:4': 'Portrait 3:4 aspect ratio, slightly taller than wide',
    };

    const hint = aspectHints[aspectRatio] || aspectHints['16:9'];
    return `${basePrompt}. ${hint}`;
  }

  /**
   * Get model name (Gemini 3.0 Pro Image only)
   */
  getModel(): string {
    return NANO_BANANA_CONFIG.model;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...NANO_BANANA_CONFIG };
  }

  /**
   * Estimate cost
   */
  estimateCost(imageCount: number, is4K: boolean = false): number {
    const rate = is4K ? NANO_BANANA_CONFIG.pricing.perImage4K : NANO_BANANA_CONFIG.pricing.perImage;
    return imageCount * rate;
  }
}

// ===========================================
// Singleton Export
// ===========================================

let nanoBananaInstance: NanoBananaClient | null = null;

export function getNanoBananaClient(): NanoBananaClient {
  if (!nanoBananaInstance) {
    nanoBananaInstance = new NanoBananaClient();
  }
  return nanoBananaInstance;
}
