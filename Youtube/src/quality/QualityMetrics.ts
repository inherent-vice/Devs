/**
 * Quality Metrics System
 *
 * Defines 50+ metrics across 5 dimensions for content evaluation.
 * Used by CriticAgent and ArtEvaluator for quality assessment.
 */

// ===========================================
// Metric Types
// ===========================================

export interface MetricDefinition {
  name: string;
  description: string;
  min?: number;
  target?: number;
  max?: number;
  required?: boolean;
  unit?: string;
}

export interface DimensionDefinition {
  name: string;
  weight: number;
  description: string;
  metrics: Record<string, MetricDefinition>;
}

// ===========================================
// Quality Dimensions (5-Dimensional Framework)
// ===========================================

export const QualityDimensions: Record<string, DimensionDefinition> = {
  // ===========================================
  // TECHNICAL (Weight: 0.25)
  // ===========================================
  technical: {
    name: 'Technical',
    weight: 0.25,
    description: 'Video/audio quality, editing, and technical execution',
    metrics: {
      videoResolution: {
        name: 'Video Resolution',
        description: 'Resolution matches target (1080p)',
        min: 720,
        target: 1080,
        unit: 'p',
      },
      frameRate: {
        name: 'Frame Rate',
        description: 'Consistent frame rate',
        min: 24,
        target: 30,
        unit: 'fps',
      },
      audioClearness: {
        name: 'Audio Clearness',
        description: 'Voice clarity and audio quality',
        min: 0.8,
        target: 0.95,
      },
      colorGrading: {
        name: 'Color Grading',
        description: 'Color consistency and visual appeal',
        min: 0.7,
        target: 0.9,
      },
      transitionSmooth: {
        name: 'Transition Smoothness',
        description: 'Seamless transitions between scenes',
        min: 0.8,
        target: 0.95,
      },
      pacingScore: {
        name: 'Pacing',
        description: 'Appropriate content pacing for format',
        min: 0.75,
        target: 0.9,
      },
      audioVideoSync: {
        name: 'Audio-Video Sync',
        description: 'Lip sync and audio timing',
        min: 0.95,
        target: 1.0,
      },
      compressionQuality: {
        name: 'Compression Quality',
        description: 'No visible compression artifacts',
        min: 0.85,
        target: 0.95,
      },
      aspectRatioCorrect: {
        name: 'Aspect Ratio',
        description: 'Correct aspect ratio for platform',
        required: true,
      },
      renderingErrors: {
        name: 'Rendering Errors',
        description: 'No visual glitches or errors',
        max: 0,
      },
    },
  },

  // ===========================================
  // NARRATIVE (Weight: 0.25)
  // ===========================================
  narrative: {
    name: 'Narrative',
    weight: 0.25,
    description: 'Story structure, flow, and content quality',
    metrics: {
      hookStrength: {
        name: 'Hook Strength',
        description: 'Opening captures attention immediately',
        min: 0.8,
        target: 0.95,
      },
      openingImpact: {
        name: 'Opening Impact',
        description: 'First 5 seconds create strong impression',
        min: 0.8,
        target: 0.9,
      },
      storyArc: {
        name: 'Story Arc',
        description: 'Clear beginning, middle, end structure',
        min: 0.75,
        target: 0.9,
      },
      emotionalResonance: {
        name: 'Emotional Resonance',
        description: 'Content connects emotionally',
        min: 0.7,
        target: 0.85,
      },
      informationDensity: {
        name: 'Information Density',
        description: 'Optimal info per minute for format',
        min: 0.6,
        target: 0.8,
      },
      clarityScore: {
        name: 'Clarity',
        description: 'Message is clear and understandable',
        min: 0.85,
        target: 0.95,
      },
      callToAction: {
        name: 'Call to Action',
        description: 'Clear and compelling CTA',
        min: 0.7,
        target: 0.85,
      },
      closingImpact: {
        name: 'Closing Impact',
        description: 'Strong ending that reinforces message',
        min: 0.75,
        target: 0.9,
      },
      paceVariation: {
        name: 'Pace Variation',
        description: 'Appropriate variation to maintain interest',
        min: 0.6,
        target: 0.8,
      },
      tensionRelease: {
        name: 'Tension & Release',
        description: 'Effective use of tension and payoff',
        min: 0.7,
        target: 0.85,
      },
      messageClarity: {
        name: 'Message Clarity',
        description: 'Core message is unmistakable',
        min: 0.8,
        target: 0.95,
      },
      valueDelivery: {
        name: 'Value Delivery',
        description: 'Delivers promised value to viewer',
        min: 0.75,
        target: 0.9,
      },
    },
  },

  // ===========================================
  // ENGAGEMENT (Weight: 0.25)
  // ===========================================
  engagement: {
    name: 'Engagement',
    weight: 0.25,
    description: 'Viewer retention, interaction potential',
    metrics: {
      thumbnailCTR: {
        name: 'Thumbnail CTR',
        description: 'Predicted click-through rate',
        min: 0.05,
        target: 0.10,
        unit: '%',
      },
      titleAppeal: {
        name: 'Title Appeal',
        description: 'Title attracts clicks',
        min: 0.8,
        target: 0.95,
      },
      retentionPrediction: {
        name: 'Retention Prediction',
        description: 'Expected average view duration',
        min: 0.50,
        target: 0.70,
        unit: '%',
      },
      shareability: {
        name: 'Shareability',
        description: 'Likelihood of being shared',
        min: 0.6,
        target: 0.8,
      },
      commentPotential: {
        name: 'Comment Potential',
        description: 'Encourages comments and discussion',
        min: 0.5,
        target: 0.7,
      },
      replayValue: {
        name: 'Replay Value',
        description: 'Worth watching again',
        min: 0.4,
        target: 0.6,
      },
      curiosityGap: {
        name: 'Curiosity Gap',
        description: 'Creates desire to keep watching',
        min: 0.7,
        target: 0.9,
      },
      emotionalTrigger: {
        name: 'Emotional Trigger',
        description: 'Evokes emotional response',
        min: 0.6,
        target: 0.8,
      },
      socialProof: {
        name: 'Social Proof',
        description: 'Feels like content worth consuming',
        min: 0.5,
        target: 0.7,
      },
      urgencyFactor: {
        name: 'Urgency Factor',
        description: 'Creates sense of relevance/timeliness',
        min: 0.4,
        target: 0.6,
      },
    },
  },

  // ===========================================
  // ORIGINALITY (Weight: 0.15)
  // ===========================================
  originality: {
    name: 'Originality',
    weight: 0.15,
    description: 'Uniqueness and creative approach',
    metrics: {
      conceptUniqueness: {
        name: 'Concept Uniqueness',
        description: 'Idea is fresh and original',
        min: 0.6,
        target: 0.8,
      },
      presentationStyle: {
        name: 'Presentation Style',
        description: 'Distinctive presentation approach',
        min: 0.7,
        target: 0.85,
      },
      creativeApproach: {
        name: 'Creative Approach',
        description: 'Novel way of presenting information',
        min: 0.65,
        target: 0.8,
      },
      voiceDistinctness: {
        name: 'Voice Distinctness',
        description: 'Unique voice/personality',
        min: 0.6,
        target: 0.8,
      },
      visualIdentity: {
        name: 'Visual Identity',
        description: 'Recognizable visual style',
        min: 0.7,
        target: 0.85,
      },
      contentAngle: {
        name: 'Content Angle',
        description: 'Unique perspective on topic',
        min: 0.65,
        target: 0.8,
      },
      formatInnovation: {
        name: 'Format Innovation',
        description: 'Creative use of format',
        min: 0.5,
        target: 0.7,
      },
      noPlagiarism: {
        name: 'No Plagiarism',
        description: 'All content is original',
        required: true,
      },
    },
  },

  // ===========================================
  // ETHICAL (Weight: 0.10)
  // ===========================================
  ethical: {
    name: 'Ethical',
    weight: 0.10,
    description: 'Accuracy, safety, and responsibility',
    metrics: {
      factualAccuracy: {
        name: 'Factual Accuracy',
        description: 'All facts are correct and verifiable',
        min: 0.95,
        target: 1.0,
      },
      sourceCredibility: {
        name: 'Source Credibility',
        description: 'Information from reliable sources',
        min: 0.9,
        target: 1.0,
      },
      noMisinformation: {
        name: 'No Misinformation',
        description: 'Does not spread false information',
        required: true,
      },
      noHarmfulContent: {
        name: 'No Harmful Content',
        description: 'No dangerous or harmful content',
        required: true,
      },
      noCopyrightViolation: {
        name: 'No Copyright Violation',
        description: 'All content properly licensed',
        required: true,
      },
      ageAppropriateness: {
        name: 'Age Appropriateness',
        description: 'Appropriate for target audience age',
        required: true,
      },
      transparencyScore: {
        name: 'Transparency',
        description: 'Clear about AI-generated content',
        min: 0.9,
        target: 1.0,
      },
      noManipulation: {
        name: 'No Manipulation',
        description: 'Does not use manipulative tactics',
        required: true,
      },
      culturalSensitivity: {
        name: 'Cultural Sensitivity',
        description: 'Respectful of cultural differences',
        min: 0.85,
        target: 0.95,
      },
      accessibilityScore: {
        name: 'Accessibility',
        description: 'Accessible to diverse audiences',
        min: 0.7,
        target: 0.9,
      },
    },
  },
};

// ===========================================
// Utility Functions
// ===========================================

/**
 * Get all metrics for a dimension
 */
export function getDimensionMetrics(dimension: string): Record<string, MetricDefinition> {
  return QualityDimensions[dimension]?.metrics || {};
}

/**
 * Get weight for a dimension
 */
export function getDimensionWeight(dimension: string): number {
  return QualityDimensions[dimension]?.weight || 0;
}

/**
 * Calculate weighted score
 */
export function calculateWeightedScore(dimensionScores: Record<string, number>): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [dimension, score] of Object.entries(dimensionScores)) {
    const weight = getDimensionWeight(dimension);
    totalScore += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Check if score meets threshold
 */
export function meetsThreshold(score: number, threshold: number = 0.85): boolean {
  return score >= threshold;
}

/**
 * Get required metrics that failed
 */
export function getFailedRequiredMetrics(
  dimension: string,
  scores: Record<string, number | boolean>
): string[] {
  const metrics = getDimensionMetrics(dimension);
  const failed: string[] = [];

  for (const [name, definition] of Object.entries(metrics)) {
    if (definition.required && scores[name] === false) {
      failed.push(name);
    }
  }

  return failed;
}

/**
 * Get total metric count
 */
export function getTotalMetricCount(): number {
  return Object.values(QualityDimensions).reduce(
    (total, dim) => total + Object.keys(dim.metrics).length,
    0
  );
}

/**
 * Export dimension names
 */
export const DimensionNames = Object.keys(QualityDimensions);
