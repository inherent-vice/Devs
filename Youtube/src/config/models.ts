/**
 * Model Configuration
 *
 * Centralized configuration for all AI models including
 * pricing, capabilities, and recommended settings.
 */

export interface ModelPricing {
  input: number;  // per 1M tokens
  output: number; // per 1M tokens
}

export interface ModelCapabilities {
  contextWindow: number;
  maxOutput: number;
  supportsImages: boolean;
  supportsVideo: boolean;
  supportsAudio: boolean;
}

export interface ModelSettings {
  temperature: number;
  topP?: number;
  topK?: number;
  maxOutputTokens: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  pricing: ModelPricing;
  capabilities: ModelCapabilities;
  defaultSettings: ModelSettings;
}

// ===========================================
// Gemini 3 Models Configuration
// ===========================================

export const ModelConfigs: Record<string, ModelConfig> = {
  'gemini-3-flash': {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    description: 'Fast, general-purpose model for most agent tasks',
    pricing: {
      input: 0.50,   // $0.50 per 1M tokens
      output: 3.00,  // $3.00 per 1M tokens
    },
    capabilities: {
      contextWindow: 1_000_000,  // 1M tokens
      maxOutput: 64_000,         // 64K tokens
      supportsImages: true,
      supportsVideo: false,
      supportsAudio: true,
    },
    defaultSettings: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  },

  'gemini-3-pro': {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    description: 'Highest accuracy for quality evaluation and complex reasoning',
    pricing: {
      input: 1.25,   // Premium pricing
      output: 5.00,
    },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 64_000,
      supportsImages: true,
      supportsVideo: true,
      supportsAudio: true,
    },
    defaultSettings: {
      temperature: 0.3,  // Lower for consistent evaluation
      maxOutputTokens: 16384,
    },
  },

  'gemini-3-deep-think': {
    id: 'gemini-3-deep-think',
    name: 'Gemini 3 Deep Think',
    description: 'Complex reasoning and strategic planning',
    pricing: {
      input: 2.00,
      output: 8.00,
    },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 64_000,
      supportsImages: true,
      supportsVideo: false,
      supportsAudio: false,
    },
    defaultSettings: {
      temperature: 0.2,
      maxOutputTokens: 32768,
    },
  },
};

// ===========================================
// Media Generation Models Configuration
// ===========================================

export interface VideoModelConfig {
  id: string;
  name: string;
  maxDuration: number;        // seconds
  optimalClipDuration: number;// seconds (cost-effective)
  resolutions: string[];
  aspectRatios: string[];
  fps: number;
  nativeAudio: boolean;
  maxReferenceImages: number;
  pricing: {
    fast: number;     // per second
    standard: number; // per second
  };
}

export const Veo31Config: VideoModelConfig = {
  id: 'veo-3.1',
  name: 'Veo 3.1',
  maxDuration: 148,
  optimalClipDuration: 8,
  resolutions: ['1080p', '720p'],
  aspectRatios: ['16:9', '9:16'],
  fps: 24,
  nativeAudio: true,
  maxReferenceImages: 3,
  pricing: {
    fast: 0.15,
    standard: 0.40,
  },
};

export interface ImageModelConfig {
  id: string;
  name: string;
  maxResolution: { width: number; height: number };
  youtubeOptimal: { width: number; height: number };
  multiStepReasoning: boolean;
  synthIdWatermark: boolean;
}

export const NanoBananaProConfig: ImageModelConfig = {
  id: 'nano-banana-pro',
  name: 'Nano Banana Pro',
  maxResolution: { width: 5632, height: 3072 },  // 4K+
  youtubeOptimal: { width: 1280, height: 720 },
  multiStepReasoning: true,
  synthIdWatermark: true,
};

// ===========================================
// Cost Calculation Utilities
// ===========================================

export function calculateTokenCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const config = ModelConfigs[modelId];
  if (!config) return 0;

  const inputCost = (inputTokens / 1_000_000) * config.pricing.input;
  const outputCost = (outputTokens / 1_000_000) * config.pricing.output;
  return inputCost + outputCost;
}

export function calculateVideoCost(
  durationSeconds: number,
  useFast: boolean = true
): number {
  const rate = useFast ? Veo31Config.pricing.fast : Veo31Config.pricing.standard;
  return durationSeconds * rate;
}

export function estimateTotalCost(params: {
  videoType: 'shorts' | 'medium' | 'longform';
  useFastVideo: boolean;
  qualityIterations: number;
  thumbnailVariants: number;
}): number {
  const durations = {
    shorts: 60,
    medium: 300,
    longform: 900,
  };

  const duration = durations[params.videoType];

  // Video cost (main expense)
  const videoCost = calculateVideoCost(duration, params.useFastVideo);

  // LLM costs (estimates)
  const researchTokens = 50_000;
  const scriptTokens = 30_000;
  const qualityTokens = 100_000 * params.qualityIterations;

  const llmCost =
    calculateTokenCost('gemini-3-flash', researchTokens, researchTokens * 0.5) +
    calculateTokenCost('gemini-3-flash', scriptTokens, scriptTokens * 0.8) +
    calculateTokenCost('gemini-3-pro', qualityTokens, qualityTokens * 0.3);

  // Thumbnail cost (estimate)
  const thumbnailCost = params.thumbnailVariants * 0.10;

  // TTS cost (minimal)
  const ttsCost = (duration / 60) * 0.02;

  return videoCost + llmCost + thumbnailCost + ttsCost;
}

// ===========================================
// Default Settings by Agent Type
// ===========================================

export const AgentModelSettings: Record<string, { model: string; temperature: number }> = {
  // Research Agents - Creative, exploratory
  TrendAgent: { model: 'gemini-3-flash', temperature: 0.7 },
  TopicAgent: { model: 'gemini-3-flash', temperature: 0.7 },
  ScriptAgent: { model: 'gemini-3-flash', temperature: 0.8 },

  // Production Agents
  VoiceAgent: { model: 'google-cloud-tts', temperature: 0 },
  VideoAgent: { model: 'veo-3.1', temperature: 0 },
  ThumbnailAgent: { model: 'nano-banana-pro', temperature: 0.7 },
  EditorAgent: { model: 'gemini-3-flash', temperature: 0.5 },

  // Quality Agents - Precision, consistency
  CriticAgent: { model: 'gemini-3-pro', temperature: 0.3 },
  ArtEvaluator: { model: 'gemini-3-pro', temperature: 0.4 },
  RevisionAgent: { model: 'gemini-3-flash', temperature: 0.6 },

  // Publisher Agent
  PublisherAgent: { model: 'gemini-3-flash', temperature: 0.5 },
};
