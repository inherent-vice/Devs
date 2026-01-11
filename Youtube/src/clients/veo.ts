/**
 * Veo 3.0 / 3.1 Video Generation Client
 *
 * Generates high-quality video content using Google's Veo 3.0/3.1 models.
 * Supports both AI Studio (generativelanguage.googleapis.com) and Vertex AI.
 *
 * - Veo 3.0: Standard generation
 * - Veo 3.1: Latest with improved quality and native audio
 */

import { VertexAI } from '@google-cloud/vertexai';
import { getEnv } from '../utils/env.js';
import { getDriveClient } from './drive.js';
import { getLocalStorage } from '../storage/LocalStorageManager.js';
import * as fs from 'fs';
import * as path from 'path';

// ===========================================
// Types
// ===========================================

export interface VeoGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  duration: number; // 4, 6, or 8 seconds
  aspectRatio: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
  fps?: number;
  seed?: number;
  referenceImages?: string[]; // URLs, max 3
  generateAudio?: boolean;
  model?: 'veo-3.1' | 'veo-3.1-fast';
}

export interface VeoGenerationResult {
  videoUrl: string;
  fileId: string;
  duration: number;
  resolution: string;
  hasAudio: boolean;
  cost: number;
  generationTimeMs: number;
}

export interface VeoExtendRequest {
  sourceVideoUrl: string;
  prompt: string;
  targetDuration: number;
}

// ===========================================
// Veo Configuration
// ===========================================

const VEO_CONFIG = {
  maxDuration: 148,
  minDuration: 4,
  maxTotalDuration: 148, // seconds for extended videos
  supportedDurations: [4, 6, 8] as const,
  supportedResolutions: ['720p', '1080p'] as const,
  supportedAspectRatios: ['16:9', '9:16'] as const,
  maxReferenceImages: 3,
  pricing: {
    fast: 0.15, // per second
    standard: 0.40, // per second
  },
  // AI Studio endpoints (generativelanguage.googleapis.com)
  aiStudio: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: {
      veo31: 'models/veo-3.1-generate', // Latest Veo 3.1
      veo30: 'models/veo-3.0-generate', // Veo 3.0
    },
  },
  // Vertex AI endpoints (legacy)
  vertexAI: {
    generate: 'publishers/google/models/veo-3.0-generate-001',
    fast: 'publishers/google/models/veo-3.0-fast-generate-001',
    latest: 'publishers/google/models/veo-3.1-generate-preview',
  },
};

// ===========================================
// Veo Client
// ===========================================

export class VeoClient {
  private vertexAI: VertexAI | null = null;
  private projectId: string;
  private location: string;
  private driveClient = getDriveClient();
  private storage = getLocalStorage();
  private apiKey: string;
  private useAIStudio: boolean;
  private currentSessionId: string | null = null;

  constructor() {
    const env = getEnv();
    this.projectId = env.GOOGLE_CLOUD_PROJECT;
    this.location = env.GOOGLE_CLOUD_LOCATION;
    this.apiKey = env.GOOGLE_AI_API_KEY || '';

    // Prefer AI Studio if API key is available
    this.useAIStudio = !!this.apiKey;

    if (this.useAIStudio) {
      console.log(`[VeoClient] Using AI Studio (Gemini API) for Veo 3.1`);
    } else if (this.projectId) {
      this.vertexAI = new VertexAI({
        project: this.projectId,
        location: this.location,
      });
      console.log(`[VeoClient] Using Vertex AI in ${this.location}`);
    } else {
      console.warn('[VeoClient] No GOOGLE_AI_API_KEY or GOOGLE_CLOUD_PROJECT configured');
    }
  }

  /**
   * Set the active session for storage operations
   */
  setSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    const session = this.storage.getSession(sessionId);
    if (!session) {
      console.log(`[VeoClient] Session ${sessionId} not found yet, will be available when created`);
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

  // ===========================================
  // Generation Methods
  // ===========================================

  /**
   * Generate a video clip
   */
  async generate(request: VeoGenerationRequest): Promise<VeoGenerationResult> {
    const startTime = Date.now();
    const useFast = request.model === 'veo-3.1-fast';

    // Validate request
    this.validateRequest(request);

    // Build the generation request
    const generationRequest = {
      prompt: this.buildPrompt(request),
      negativePrompt: request.negativePrompt,
      videoConfig: {
        duration: request.duration,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution || '1080p',
        fps: request.fps || 24,
        seed: request.seed,
        generateAudio: request.generateAudio ?? false,
      },
      referenceImages: request.referenceImages?.slice(0, VEO_CONFIG.maxReferenceImages),
    };

    // Call Veo API via Vertex AI
    const endpoint = useFast ? VEO_CONFIG.vertexAI.fast : VEO_CONFIG.vertexAI.generate;
    const response = await this.callVeoAPI(endpoint, generationRequest);

    const generationTimeMs = Date.now() - startTime;
    const cost = this.calculateCost(request.duration, useFast);

    console.log(`[VeoClient] Generated video: ${request.duration}s, cost: $${cost.toFixed(2)}`);

    return {
      videoUrl: response.url,
      fileId: response.fileId,
      duration: request.duration,
      resolution: request.resolution || '1080p',
      hasAudio: request.generateAudio ?? false,
      cost,
      generationTimeMs,
    };
  }

  /**
   * Generate multiple clips from storyboard
   */
  async generateBatch(
    scenes: Array<{
      id: string;
      prompt: string;
      duration: number;
      priority: 'hero' | 'standard' | 'b-roll';
      referenceImages?: string[];
    }>,
    options: {
      aspectRatio: '16:9' | '9:16';
      resolution?: '1080p' | '720p';
      sessionId: string;
      useFast?: boolean;
      parallelLimit?: number;
    }
  ): Promise<{
    clips: Array<VeoGenerationResult & { sceneId: string }>;
    totalCost: number;
    totalDuration: number;
  }> {
    this.setSession(options.sessionId);
    const clips: Array<VeoGenerationResult & { sceneId: string }> = [];
    let totalCost = 0;
    let totalDuration = 0;

    const parallelLimit = options.parallelLimit || 3;

    // Process in batches for parallel generation
    for (let i = 0; i < scenes.length; i += parallelLimit) {
      const batch = scenes.slice(i, i + parallelLimit);

      const batchResults = await Promise.all(
        batch.map(async (scene) => {
          const useFast = options.useFast && scene.priority !== 'hero';

          const result = await this.generate({
            prompt: scene.prompt,
            duration: Math.min(scene.duration, VEO_CONFIG.maxDuration) as 4 | 6 | 8,
            aspectRatio: options.aspectRatio,
            resolution: options.resolution || '1080p',
            referenceImages: scene.referenceImages,
            model: useFast ? 'veo-3.1-fast' : 'veo-3.1',
          });

          return { ...result, sceneId: scene.id };
        })
      );

      for (const result of batchResults) {
        clips.push(result);
        totalCost += result.cost;
        totalDuration += result.duration;
      }

      console.log(`[VeoClient] Batch ${Math.floor(i / parallelLimit) + 1} complete: ${batchResults.length} clips`);
    }

    return { clips, totalCost, totalDuration };
  }

  /**
   * Extend a video to longer duration
   */
  async extend(request: VeoExtendRequest): Promise<VeoGenerationResult> {
    const startTime = Date.now();

    if (request.targetDuration > VEO_CONFIG.maxTotalDuration) {
      throw new Error(`Target duration ${request.targetDuration}s exceeds maximum ${VEO_CONFIG.maxTotalDuration}s`);
    }

    try {
      // Call extension API
      const response = await this.callVeoExtendAPI(request);

      const generationTimeMs = Date.now() - startTime;
      const cost = this.calculateCost(request.targetDuration, false);

      return {
        videoUrl: response.url,
        fileId: response.fileId,
        duration: request.targetDuration,
        resolution: '1080p',
        hasAudio: false,
        cost,
        generationTimeMs,
      };
    } catch (error) {
      console.warn('[VeoClient] Extend API unavailable, generating fallback clip.');
      const fallbackDuration = this.getSupportedDuration(request.targetDuration);
      const fallback = await this.generate({
        prompt: `${request.prompt}. Continue the scene seamlessly.`,
        duration: fallbackDuration,
        aspectRatio: '16:9',
        resolution: '1080p',
        fps: 24,
        generateAudio: false,
        model: 'veo-3.1',
      });
      return fallback;
    }
  }

  // ===========================================
  // Private Methods
  // ===========================================

  private validateRequest(request: VeoGenerationRequest): void {
    if (!VEO_CONFIG.supportedDurations.includes(request.duration as any)) {
      throw new Error(`Duration must be one of: ${VEO_CONFIG.supportedDurations.join(', ')}`);
    }

    if (!VEO_CONFIG.supportedAspectRatios.includes(request.aspectRatio)) {
      throw new Error(`Aspect ratio must be one of: ${VEO_CONFIG.supportedAspectRatios.join(', ')}`);
    }

    if (request.referenceImages && request.referenceImages.length > VEO_CONFIG.maxReferenceImages) {
      throw new Error(`Maximum ${VEO_CONFIG.maxReferenceImages} reference images allowed`);
    }
  }

  private buildPrompt(request: VeoGenerationRequest): string {
    let prompt = request.prompt;

    // Add quality modifiers
    prompt += '. High quality, cinematic, smooth motion, no artifacts, professional videography';

    return prompt;
  }

  private calculateCost(durationSeconds: number, useFast: boolean): number {
    const rate = useFast ? VEO_CONFIG.pricing.fast : VEO_CONFIG.pricing.standard;
    return durationSeconds * rate;
  }

  /**
   * Call Veo generation API
   *
   * Supports both AI Studio and Vertex AI backends.
   */
  private async callVeoAPI(
    endpoint: string,
    request: any
  ): Promise<{ url: string; fileId: string }> {
    if (this.useAIStudio) {
      return this.callAIStudioVeo(request);
    } else {
      return this.callVertexAIVeo(endpoint, request);
    }
  }

  /**
   * Call Veo via AI Studio (generativelanguage.googleapis.com)
   *
   * Uses the Gemini API with Veo 3.1 model.
   * Reference: https://ai.google.dev/gemini-api/docs/video
   */
  private async callAIStudioVeo(request: any): Promise<{ url: string; fileId: string }> {
    const model = VEO_CONFIG.aiStudio.models.veo31;
    const url = `${VEO_CONFIG.aiStudio.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    console.log(`[VeoClient] AI Studio: Generating ${request.videoConfig.duration}s video...`);

    // Build the prompt with video generation instructions
    const prompt = `Generate a video:
${request.prompt}

Video specifications:
- Duration: ${request.videoConfig.duration} seconds
- Aspect ratio: ${request.videoConfig.aspectRatio}
- Resolution: ${request.videoConfig.resolution || '1080p'}
- Style: Cinematic, high quality, smooth motion
${request.negativePrompt ? `\nAvoid: ${request.negativePrompt}` : ''}`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseModalities: ['VIDEO'],
        videoDuration: request.videoConfig.duration,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VeoClient] AI Studio Error: ${response.status}`);

      if (response.status === 429) {
        throw new Error('Veo rate limit exceeded. Please wait and try again.');
      }
      if (response.status === 400) {
        // Check if video generation is not supported yet
        if (errorText.includes('VIDEO') || errorText.includes('modality')) {
          throw new Error('Video generation modality not yet available in AI Studio. Use Vertex AI or Image Mode instead.');
        }
      }

      throw new Error(`AI Studio Veo error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: {
              data: string;
              mimeType: string;
            };
            fileData?: {
              fileUri: string;
              mimeType: string;
            };
          }>;
        };
      }>;
      name?: string; // For async operations
    };

    // Handle async operation
    if (result.name) {
      console.log(`[VeoClient] Async operation: ${result.name}`);
      return this.pollAIStudioOperation(result.name);
    }

    const candidate = result.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error('No video generated - empty response');
    }

    // Find video part
    for (const part of candidate.content.parts) {
      if (part.fileData?.fileUri) {
        return {
          url: part.fileData.fileUri,
          fileId: `veo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        };
      }

      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('video/')) {
        // Save base64 video locally
        const saved = await this.saveBase64VideoLocal(part.inlineData.data, part.inlineData.mimeType);
        return saved;
      }
    }

    throw new Error('No video data in AI Studio response');
  }

  /**
   * Poll AI Studio async operation
   */
  private async pollAIStudioOperation(operationName: string): Promise<{ url: string; fileId: string }> {
    const maxWaitMs = 300000; // 5 minutes
    const pollIntervalMs = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const url = `${VEO_CONFIG.aiStudio.baseUrl}/${operationName}?key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to poll operation: ${response.status}`);
      }

      const operation = await response.json() as {
        done?: boolean;
        response?: any;
        error?: { message: string };
      };

      if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
      }

      if (operation.done && operation.response) {
        // Extract video from response
        const candidate = operation.response.candidates?.[0];
        for (const part of candidate?.content?.parts || []) {
          if (part.fileData?.fileUri) {
            return {
              url: part.fileData.fileUri,
              fileId: `veo-${Date.now()}`,
            };
          }
          if (part.inlineData?.data) {
            return this.saveBase64VideoLocal(part.inlineData.data, part.inlineData.mimeType || 'video/mp4');
          }
        }
        throw new Error('Operation done but no video found');
      }

      console.log(`[VeoClient] Waiting... (${Math.round((Date.now() - startTime) / 1000)}s)`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Video generation timed out');
  }

  /**
   * Save base64 video to local storage
   */
  private async saveBase64VideoLocal(base64Data: string, mimeType: string): Promise<{ url: string; fileId: string }> {
    const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
    const fileId = `veo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const filename = `${fileId}.${ext}`;

    const sessionId = this.getSessionId();
    const buffer = Buffer.from(base64Data, 'base64');
    const videoDir = path.join(this.storage.getSessionDir(sessionId), 'video');

    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    const videoPath = path.join(videoDir, filename);
    fs.writeFileSync(videoPath, buffer);

    console.log(`[VeoClient] Video saved: ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);

    return {
      url: videoPath,
      fileId,
    };
  }

  /**
   * Call Veo via Vertex AI REST API
   */
  private async callVertexAIVeo(
    endpoint: string,
    request: any
  ): Promise<{ url: string; fileId: string }> {
    console.log(`[VeoClient] Vertex AI: Calling ${endpoint}...`);

    // Get access token using Application Default Credentials
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const accessToken = await auth.getAccessToken();

    if (!accessToken) {
      throw new Error('Failed to get access token for Vertex AI');
    }

    const apiUrl = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/${endpoint}:generateVideo`;

    const referenceImage = request.referenceImages?.length
      ? await this.resolveReferenceImage(request.referenceImages[0])
      : null;

    const requestBody = {
      instances: [{
        prompt: request.prompt,
        ...(request.negativePrompt && { negativePrompt: request.negativePrompt }),
        ...(referenceImage && {
          image: { bytesBase64Encoded: referenceImage },
        }),
      }],
      parameters: {
        sampleCount: 1,
        aspectRatio: request.videoConfig.aspectRatio,
        durationSeconds: request.videoConfig.duration,
        fps: request.videoConfig.fps || 24,
        resolution: request.videoConfig.resolution === '1080p' ? '1080p' : '720p',
        ...(request.videoConfig.seed && { seed: request.videoConfig.seed }),
      },
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VeoClient] Vertex AI Error: ${response.status}`);
      throw new Error(`Vertex AI Veo error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json() as {
      predictions?: Array<{
        video?: { uri?: string; gcsUri?: string; bytesBase64Encoded?: string };
        videoUri?: string;
      }>;
      name?: string;
    };

    if (result.name && !result.predictions) {
      return this.pollVertexAIOperation(result.name, accessToken);
    }

    const prediction = result.predictions?.[0];
    const videoUri = prediction?.video?.uri || prediction?.video?.gcsUri || prediction?.videoUri;

    if (videoUri) {
      return {
        url: videoUri,
        fileId: `veo-${Date.now()}`,
      };
    }

    if (prediction?.video?.bytesBase64Encoded) {
      return this.saveBase64VideoLocal(prediction.video.bytesBase64Encoded, 'video/mp4');
    }

    throw new Error('No video in Vertex AI response');
  }

  /**
   * Poll Vertex AI operation
   */
  private async pollVertexAIOperation(
    operationName: string,
    accessToken: string
  ): Promise<{ url: string; fileId: string }> {
    const maxWaitMs = 300000;
    const pollIntervalMs = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/${operationName}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to poll: ${response.status}`);
      }

      const op = await response.json() as {
        done?: boolean;
        response?: { predictions?: Array<{ video?: { uri?: string } }> };
        error?: { message: string };
      };

      if (op.error) {
        throw new Error(`Generation failed: ${op.error.message}`);
      }

      if (op.done) {
        const videoUri = op.response?.predictions?.[0]?.video?.uri;
        if (videoUri) {
          return { url: videoUri, fileId: `veo-${Date.now()}` };
        }
        throw new Error('Done but no video URI');
      }

      await new Promise(r => setTimeout(r, pollIntervalMs));
    }

    throw new Error('Timed out');
  }

  /**
   * Call Veo extension API
   */
  private async callVeoExtendAPI(
    request: VeoExtendRequest
  ): Promise<{ url: string; fileId: string }> {
    console.log(`[VeoClient] Extending video to ${request.targetDuration}s`);

    // Extend API not yet available; caller will fallback to clip generation.
    throw new Error('Veo extension API integration pending.');
  }

  private isLikelyBase64(value: string): boolean {
    if (value.length < 100) return false;
    return /^[A-Za-z0-9+/=]+$/.test(value);
  }

  private async resolveReferenceImage(reference: string): Promise<string | null> {
    try {
      if (!reference) return null;

      if (reference.startsWith('data:')) {
        const [, base64] = reference.split(',');
        return base64 || null;
      }

      if (this.isLikelyBase64(reference)) {
        return reference;
      }

      if (reference.startsWith('gs://')) {
        const match = reference.match(/gs:\/\/([^\/]+)\/(.+)/);
        if (match) {
          const httpUrl = `https://storage.googleapis.com/${match[1]}/${match[2]}`;
          const response = await fetch(httpUrl);
          if (!response.ok) return null;
          const buffer = Buffer.from(await response.arrayBuffer());
          return buffer.toString('base64');
        }
      }

      if (reference.startsWith('http://') || reference.startsWith('https://')) {
        const response = await fetch(reference);
        if (!response.ok) return null;
        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer.toString('base64');
      }

      if (fs.existsSync(reference)) {
        return fs.readFileSync(reference).toString('base64');
      }
    } catch (error) {
      console.warn('[VeoClient] Failed to resolve reference image:', error);
    }

    return null;
  }

  private getSupportedDuration(targetDuration: number): 4 | 6 | 8 {
    if (targetDuration >= 8) return 8;
    if (targetDuration >= 6) return 6;
    return 4;
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Estimate cost for a batch of scenes
   */
  estimateCost(
    scenes: Array<{ duration: number; priority: string }>,
    useFast: boolean = true
  ): number {
    return scenes.reduce((total, scene) => {
      const isFast = useFast && scene.priority !== 'hero';
      return total + this.calculateCost(scene.duration, isFast);
    }, 0);
  }

  /**
   * Get optimal clip duration for cost efficiency
   */
  getOptimalDuration(targetDuration: number): number[] {
    const clips: number[] = [];
    let remaining = targetDuration;

    while (remaining > 0) {
      if (remaining >= 8) {
        clips.push(8);
        remaining -= 8;
      } else if (remaining >= 6) {
        clips.push(6);
        remaining -= 6;
      } else if (remaining >= 4) {
        clips.push(4);
        remaining -= 4;
      } else {
        clips.push(4); // Minimum clip duration
        remaining = 0;
      }
    }

    return clips;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...VEO_CONFIG };
  }
}

// ===========================================
// Singleton Export
// ===========================================

let veoClientInstance: VeoClient | null = null;

export function getVeoClient(): VeoClient {
  if (!veoClientInstance) {
    veoClientInstance = new VeoClient();
  }
  return veoClientInstance;
}
