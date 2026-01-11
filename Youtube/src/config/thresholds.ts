/**
 * Quality Thresholds Configuration
 *
 * Defines thresholds and limits for the quality evaluation system.
 */

// ===========================================
// Quality Score Thresholds
// ===========================================

export const QualityThresholds = {
  /** Minimum score to approve content */
  minApprovalScore: 0.85,

  /** Score considered excellent */
  excellentScore: 0.95,

  /** Score below which content is rejected outright */
  rejectionScore: 0.5,

  /** Maximum quality improvement iterations */
  maxIterations: 5,

  /** Convergence threshold (stop if improvement < this) */
  convergenceThreshold: 0.02,

  /** Diminishing returns threshold (stop if improvement rate < 50% of previous) */
  diminishingReturnThreshold: 0.5,
};

// ===========================================
// Dimension Weights
// ===========================================

export const DimensionWeights = {
  technical: 0.25,
  narrative: 0.25,
  engagement: 0.25,
  originality: 0.15,
  ethical: 0.10,
};

// ===========================================
// Minimum Dimension Scores
// ===========================================

export const MinDimensionScores = {
  technical: 0.7,
  narrative: 0.7,
  engagement: 0.6,
  originality: 0.5,
  ethical: 0.9, // Ethical issues are critical
};

// ===========================================
// Technical Quality Metrics
// ===========================================

export const TechnicalMetrics = {
  videoResolution: { min: 1080, target: 1080 },
  frameRate: { min: 24, target: 30 },
  audioClearness: { min: 0.8, target: 0.95 },
  colorGrading: { min: 0.7, target: 0.9 },
  transitionSmooth: { min: 0.8, target: 0.95 },
  pacingScore: { min: 0.75, target: 0.9 },
  audioVideoSync: { min: 0.95, target: 1.0 },
  compressionQuality: { min: 0.85, target: 0.95 },
};

// ===========================================
// Narrative Quality Metrics
// ===========================================

export const NarrativeMetrics = {
  hookStrength: { min: 0.8, target: 0.95 },
  openingImpact: { min: 0.8, target: 0.9 },
  storyArc: { min: 0.75, target: 0.9 },
  emotionalResonance: { min: 0.7, target: 0.85 },
  informationDensity: { min: 0.6, target: 0.8 },
  clarityScore: { min: 0.85, target: 0.95 },
  callToAction: { min: 0.7, target: 0.85 },
  closingImpact: { min: 0.75, target: 0.9 },
  paceVariation: { min: 0.6, target: 0.8 },
  tensionRelease: { min: 0.7, target: 0.85 },
  messageClarity: { min: 0.8, target: 0.95 },
  valueDelivery: { min: 0.75, target: 0.9 },
};

// ===========================================
// Engagement Metrics
// ===========================================

export const EngagementMetrics = {
  thumbnailCTR: { min: 0.05, target: 0.10 },
  titleAppeal: { min: 0.8, target: 0.95 },
  retentionPrediction: { min: 0.50, target: 0.70 },
  shareability: { min: 0.6, target: 0.8 },
  commentPotential: { min: 0.5, target: 0.7 },
  replayValue: { min: 0.4, target: 0.6 },
  curiosityGap: { min: 0.7, target: 0.9 },
  emotionalTrigger: { min: 0.6, target: 0.8 },
  socialProof: { min: 0.5, target: 0.7 },
  urgencyFactor: { min: 0.4, target: 0.6 },
};

// ===========================================
// Originality Metrics
// ===========================================

export const OriginalityMetrics = {
  conceptUniqueness: { min: 0.6, target: 0.8 },
  presentationStyle: { min: 0.7, target: 0.85 },
  creativeApproach: { min: 0.65, target: 0.8 },
  voiceDistinctness: { min: 0.6, target: 0.8 },
  visualIdentity: { min: 0.7, target: 0.85 },
  contentAngle: { min: 0.65, target: 0.8 },
  formatInnovation: { min: 0.5, target: 0.7 },
};

// ===========================================
// Ethical Metrics (Binary/Critical)
// ===========================================

export const EthicalMetrics = {
  factualAccuracy: { min: 0.95, target: 1.0 },
  sourceCredibility: { min: 0.9, target: 1.0 },
  noMisinformation: { required: true },
  noHarmfulContent: { required: true },
  noCopyrightViolation: { required: true },
  ageAppropriateness: { required: true },
  transparencyScore: { min: 0.9, target: 1.0 },
  noManipulation: { required: true },
  culturalSensitivity: { min: 0.85, target: 0.95 },
  accessibilityScore: { min: 0.7, target: 0.9 },
};

// ===========================================
// Cost Limits
// ===========================================

export const CostLimits = {
  /** Maximum cost per video */
  maxPerVideo: parseFloat(process.env.MAX_COST_PER_VIDEO || '30'),

  /** Maximum cost per session (batch) */
  maxPerSession: parseFloat(process.env.MAX_COST_PER_SESSION || '100'),

  /** Warning threshold (% of max) */
  warningThreshold: 0.8,
};

// ===========================================
// Retry Limits
// ===========================================

export const RetryLimits = {
  /** Maximum retries per agent */
  maxAgentRetries: 3,

  /** Maximum retries for API calls */
  maxApiRetries: 5,

  /** Base delay for exponential backoff (ms) */
  baseDelay: 1000,

  /** Maximum delay (ms) */
  maxDelay: 30000,
};

// ===========================================
// Timeout Limits
// ===========================================

export const TimeoutLimits = {
  /** Agent execution timeout (ms) */
  agentTimeout: 60000,

  /** Video generation timeout (ms) */
  videoTimeout: 300000,

  /** Image generation timeout (ms) */
  imageTimeout: 120000,

  /** API call timeout (ms) */
  apiTimeout: 30000,
};
