/**
 * Genkit Configuration
 *
 * Configures Genkit with Google AI (Gemini 3) and Vertex AI plugins.
 * Uses Genkit 1.27+ API pattern with the genkit() constructor.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';
import 'dotenv/config';

// ===========================================
// Genkit Instance
// ===========================================

/**
 * Main Genkit AI instance configured with Google AI and Vertex AI plugins.
 * Use this instance for all AI operations.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }),
    vertexAI({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    }),
  ],
});

// ===========================================
// Gemini 3 Model References
// ===========================================

/**
 * Gemini 3 Flash - Fast, versatile model for most tasks
 * Use for: TrendAgent, TopicAgent, ScriptAgent, EditorAgent, RevisionAgent
 */
export const gemini3Flash = 'googleai/gemini-3-flash-preview';

/**
 * Gemini 3 Pro - High accuracy for quality evaluation
 * Use for: CriticAgent, ArtEvaluator
 */
export const gemini3Pro = 'googleai/gemini-3-pro-preview';

/**
 * Gemini 3 Pro Image - Image generation
 * Use for: ThumbnailAgent
 */
export const gemini3ProImage = 'googleai/gemini-3-pro-image-preview';

// ===========================================
// Backward Compatibility Aliases
// ===========================================

export const geminiFlash = gemini3Flash;
export const geminiPro = gemini3Pro;

// ===========================================
// Vertex AI Models for Media
// ===========================================

/**
 * Imagen 3 - Image generation (Vertex AI)
 * Not used - using Gemini 3.0 Pro Image instead
 */
export const imagen3 = 'vertexai/imagen-3.0-generate-001';

/**
 * Veo 3.0 - Video generation (Standard)
 * Use for: VideoAgent
 */
export const veo = 'vertexai/veo-3.0-generate-001';

/**
 * Veo 3.0 Fast - Faster video generation
 */
export const veoFast = 'vertexai/veo-3.0-fast-generate-001';

/**
 * Veo 3.1 - Latest video generation model
 */
export const veo31 = 'vertexai/veo-3.1-generate-preview';

/**
 * Nano Banana Pro - Image generation for thumbnails
 * Alias for Gemini 3 Pro Image
 */
export const nanoBananaPro = gemini3ProImage;

// ===========================================
// Helper Types
// ===========================================

export type ModelType = 'flash' | 'pro' | 'pro-image' | 'image' | 'video';

export function getModelName(type: ModelType): string {
  const models: Record<ModelType, string> = {
    'flash': gemini3Flash,
    'pro': gemini3Pro,
    'pro-image': gemini3ProImage,
    'image': imagen3,
    'video': veo,
  };
  return models[type];
}

// Re-export for convenience
export { googleAI, vertexAI };
