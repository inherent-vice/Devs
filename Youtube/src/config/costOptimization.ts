/**
 * Cost Optimization Configuration
 *
 * Strategies and settings for minimizing production costs
 * while maintaining quality.
 */

// ===========================================
// Veo Optimization Strategy
// ===========================================

export const VeoOptimization = {
  /** Use Veo Fast for non-critical content */
  enabled: true,

  /** Scene types to use Fast generation */
  useFastFor: ['b-roll', 'transitions', 'filler', 'background'] as const,

  /** Scene types requiring Standard quality */
  useStandardFor: ['hero_shots', 'key_moments', 'intro', 'outro', 'face_close_up'] as const,

  /** Expected savings when using Fast appropriately */
  expectedSavings: 0.625, // 62.5% cost reduction

  /** Optimal clip duration for cost efficiency */
  optimalClipDuration: 8, // seconds

  /** Maximum parallel generations */
  maxParallelGenerations: 3,
};

// ===========================================
// Scene Reuse Strategy
// ===========================================

export const SceneReuse = {
  /** Enable scene caching and reuse */
  enabled: true,

  /** Cache generated clips */
  cacheGeneratedClips: true,

  /** Cache duration in milliseconds */
  cacheDuration: 7 * 24 * 60 * 60 * 1000, // 7 days

  /** Minimum similarity threshold for reuse */
  similarityThreshold: 0.85,

  /** Maximum cached scenes per project */
  maxCachedScenes: 100,
};

// ===========================================
// Context Caching Strategy (Gemini)
// ===========================================

export const ContextCaching = {
  /** Enable Gemini context caching */
  enabled: true,

  /** Cache system prompts */
  cacheSystemPrompts: true,

  /** Cache frequent queries */
  cacheFrequentQueries: true,

  /** Expected token savings */
  expectedTokenSavings: 0.90, // 90% reduction

  /** Cache TTL in seconds */
  cacheTTL: 3600, // 1 hour
};

// ===========================================
// Batch Processing Strategy
// ===========================================

export const BatchProcessing = {
  /** Enable batch processing */
  enabled: true,

  /** Batch size for parallel processing */
  batchSize: 5,

  /** Enable parallel generation within batch */
  parallelGeneration: true,

  /** Maximum concurrent API calls */
  maxConcurrentCalls: 10,
};

// ===========================================
// Early Termination Strategy
// ===========================================

export const EarlyTermination = {
  /** Enable early termination of quality loop */
  enabled: true,

  /** Stop if score exceeds this threshold */
  scoreThreshold: 0.90,

  /** Stop if improvement is below this threshold */
  convergenceThreshold: 0.02,

  /** Maximum iterations regardless of score */
  maxIterations: 3,

  /** Stop if improvement rate drops below this */
  diminishingReturnRate: 0.5,
};

// ===========================================
// Cost Estimation Functions
// ===========================================

export interface CostBreakdown {
  video: number;
  thumbnail: number;
  llm: number;
  qualityLoop: number;
  tts: number;
  total: number;
  perMinute: number;
  savingsFromOptimization: number;
}

export interface CostEstimateParams {
  durationSeconds: number;
  useFastVideo: boolean;
  thumbnailVariants: number;
  expectedTokens: number;
  expectedIterations: number;
  heroSceneCount: number;
  standardSceneCount: number;
}

/**
 * Calculate detailed cost estimate
 */
export function calculateDetailedCost(params: CostEstimateParams): CostBreakdown {
  const {
    durationSeconds,
    useFastVideo,
    thumbnailVariants,
    expectedTokens,
    expectedIterations,
    heroSceneCount,
    standardSceneCount,
  } = params;

  // Video cost calculation
  let videoCost: number;
  if (VeoOptimization.enabled && useFastVideo) {
    // Mixed pricing: hero shots at standard, others at fast
    const heroCost = heroSceneCount * VeoOptimization.optimalClipDuration * 0.40;
    const standardCost = standardSceneCount * VeoOptimization.optimalClipDuration * 0.15;
    videoCost = heroCost + standardCost;
  } else {
    // All at standard pricing
    videoCost = durationSeconds * 0.40;
  }

  // Thumbnail cost
  const thumbnailCost = thumbnailVariants * 0.10;

  // LLM cost (Gemini 3 average)
  const baseTokenCost = (expectedTokens / 1_000_000) * 3.50;
  const llmCost = ContextCaching.enabled
    ? baseTokenCost * (1 - ContextCaching.expectedTokenSavings)
    : baseTokenCost;

  // Quality loop cost
  const qualityLoopCost = llmCost * expectedIterations;

  // TTS cost
  const ttsCost = (durationSeconds / 60) * 0.02;

  // Calculate total
  const total = videoCost + thumbnailCost + llmCost + qualityLoopCost + ttsCost;

  // Calculate savings
  const baselineCost = durationSeconds * 0.40 + thumbnailVariants * 0.10 +
    baseTokenCost * (1 + expectedIterations) + ttsCost;
  const savingsFromOptimization = baselineCost - total;

  return {
    video: videoCost,
    thumbnail: thumbnailCost,
    llm: llmCost,
    qualityLoop: qualityLoopCost,
    tts: ttsCost,
    total,
    perMinute: total / (durationSeconds / 60),
    savingsFromOptimization,
  };
}

/**
 * Quick cost estimate for video type
 */
export function quickEstimate(
  videoType: 'shorts' | 'medium' | 'longform',
  useFast: boolean = true
): number {
  const durations = {
    shorts: 60,
    medium: 300,
    longform: 900,
  };

  const duration = durations[videoType];
  const sceneCount = Math.ceil(duration / VeoOptimization.optimalClipDuration);
  const heroSceneCount = Math.ceil(sceneCount * 0.3); // 30% hero shots
  const standardSceneCount = sceneCount - heroSceneCount;

  const estimate = calculateDetailedCost({
    durationSeconds: duration,
    useFastVideo: useFast,
    thumbnailVariants: videoType === 'shorts' ? 2 : 3,
    expectedTokens: 100000,
    expectedIterations: 2,
    heroSceneCount,
    standardSceneCount,
  });

  return estimate.total;
}

/**
 * Check if cost is within budget
 */
export function isWithinBudget(estimatedCost: number, maxBudget: number): {
  withinBudget: boolean;
  percentage: number;
  warning: boolean;
} {
  const percentage = (estimatedCost / maxBudget) * 100;

  return {
    withinBudget: estimatedCost <= maxBudget,
    percentage,
    warning: percentage >= 80,
  };
}

/**
 * Suggest optimizations to reduce cost
 */
export function suggestOptimizations(currentCost: number, targetCost: number): string[] {
  const suggestions: string[] = [];
  const reduction = (currentCost - targetCost) / currentCost;

  if (reduction > 0.1) {
    suggestions.push('Use Veo Fast for all non-hero scenes');
  }

  if (reduction > 0.2) {
    suggestions.push('Reduce thumbnail variants to minimum');
  }

  if (reduction > 0.3) {
    suggestions.push('Limit quality loop to 2 iterations');
    suggestions.push('Enable aggressive context caching');
  }

  if (reduction > 0.5) {
    suggestions.push('Consider shorter video duration');
    suggestions.push('Use Veo Fast for all scenes');
  }

  return suggestions;
}
