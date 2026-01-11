/**
 * Video Types Configuration
 *
 * Defines settings for different video formats:
 * - Shorts: < 60 seconds, vertical (9:16)
 * - Medium: 1-5 minutes, horizontal (16:9)
 * - Longform: 5-15 minutes, horizontal (16:9)
 */

import type { VideoType } from '../agents/base/types.js';

// ===========================================
// Video Type Configuration Interface
// ===========================================

export interface VideoTypeConfig {
  /** Maximum video duration in seconds */
  maxDuration: number;

  /** Minimum video duration in seconds */
  minDuration: number;

  /** Aspect ratio */
  aspectRatio: '16:9' | '9:16';

  /** Video resolution */
  resolution: '1080p' | '720p';

  /** Veo generation settings */
  veoConfig: {
    /** Optimal clip duration for cost efficiency */
    clipDuration: number;
    /** Transition style */
    transitions: 'fast_cut' | 'smooth' | 'cinematic';
    /** Content pacing */
    pacing: 'high' | 'medium' | 'varied';
    /** Include chapter markers */
    chapters: boolean;
  };

  /** Thumbnail settings */
  thumbnailConfig: {
    /** Include text overlay */
    textOverlay: boolean;
    /** Aspect ratio for thumbnail */
    aspectRatio: '16:9' | '9:16';
    /** Number of A/B test variants */
    variants: number;
  };

  /** Script settings */
  scriptConfig: {
    /** Hook duration in seconds */
    hookDuration: number;
    /** Intro duration in seconds */
    introDuration: number;
    /** Outro duration in seconds */
    outroDuration: number;
    /** Words per minute for pacing */
    wordsPerMinute: number;
  };

  /** Estimated costs */
  estimatedCost: {
    /** Using Veo Fast */
    fast: number;
    /** Using Veo Standard */
    standard: number;
  };

  /** Content guidelines */
  guidelines: {
    /** Maximum number of topics */
    maxTopics: number;
    /** Recommended hook style */
    hookStyle: string;
    /** Call to action style */
    ctaStyle: string;
  };
}

// ===========================================
// Video Type Configurations
// ===========================================

export const VideoTypeConfigs: Record<VideoType, VideoTypeConfig> = {
  shorts: {
    maxDuration: 60,
    minDuration: 15,
    aspectRatio: '9:16',
    resolution: '1080p',

    veoConfig: {
      clipDuration: 6,
      transitions: 'fast_cut',
      pacing: 'high',
      chapters: false,
    },

    thumbnailConfig: {
      textOverlay: false, // Shorts don't need text on thumbnail
      aspectRatio: '9:16',
      variants: 2,
    },

    scriptConfig: {
      hookDuration: 3,
      introDuration: 5,
      outroDuration: 5,
      wordsPerMinute: 180, // Faster pace
    },

    estimatedCost: {
      fast: 9.00,
      standard: 24.00,
    },

    guidelines: {
      maxTopics: 1,
      hookStyle: 'Immediate attention grab - question, shocking fact, or visual hook',
      ctaStyle: 'Quick follow/like reminder, no lengthy outro',
    },
  },

  medium: {
    maxDuration: 300, // 5 minutes
    minDuration: 60,
    aspectRatio: '16:9',
    resolution: '1080p',

    veoConfig: {
      clipDuration: 8,
      transitions: 'smooth',
      pacing: 'medium',
      chapters: false,
    },

    thumbnailConfig: {
      textOverlay: true,
      aspectRatio: '16:9',
      variants: 3,
    },

    scriptConfig: {
      hookDuration: 5,
      introDuration: 15,
      outroDuration: 20,
      wordsPerMinute: 160,
    },

    estimatedCost: {
      fast: 45.00,
      standard: 120.00,
    },

    guidelines: {
      maxTopics: 3,
      hookStyle: 'Promise value within first 5 seconds, preview key points',
      ctaStyle: 'Clear CTA with subscribe reminder and next video teaser',
    },
  },

  longform: {
    maxDuration: 900, // 15 minutes
    minDuration: 300,
    aspectRatio: '16:9',
    resolution: '1080p',

    veoConfig: {
      clipDuration: 8,
      transitions: 'cinematic',
      pacing: 'varied',
      chapters: true,
    },

    thumbnailConfig: {
      textOverlay: true,
      aspectRatio: '16:9',
      variants: 5,
    },

    scriptConfig: {
      hookDuration: 10,
      introDuration: 30,
      outroDuration: 45,
      wordsPerMinute: 150,
    },

    estimatedCost: {
      fast: 135.00,
      standard: 360.00,
    },

    guidelines: {
      maxTopics: 7,
      hookStyle: 'Story setup with curiosity gap, promise transformation',
      ctaStyle: 'Extended outro with related videos, community engagement',
    },
  },
};

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get configuration for a video type
 */
export function getVideoConfig(videoType: VideoType): VideoTypeConfig {
  return VideoTypeConfigs[videoType];
}

/**
 * Calculate estimated word count for a video
 */
export function estimateWordCount(videoType: VideoType, durationSeconds: number): number {
  const config = VideoTypeConfigs[videoType];
  const durationMinutes = durationSeconds / 60;
  return Math.round(durationMinutes * config.scriptConfig.wordsPerMinute);
}

/**
 * Calculate number of scenes needed
 */
export function estimateSceneCount(videoType: VideoType, durationSeconds: number): number {
  const config = VideoTypeConfigs[videoType];
  return Math.ceil(durationSeconds / config.veoConfig.clipDuration);
}

/**
 * Get estimated cost for video production
 */
export function estimateProductionCost(
  videoType: VideoType,
  useFast: boolean = true
): number {
  const config = VideoTypeConfigs[videoType];
  return useFast ? config.estimatedCost.fast : config.estimatedCost.standard;
}

/**
 * Validate duration for video type
 */
export function validateDuration(videoType: VideoType, durationSeconds: number): {
  valid: boolean;
  message?: string;
} {
  const config = VideoTypeConfigs[videoType];

  if (durationSeconds < config.minDuration) {
    return {
      valid: false,
      message: `Duration ${durationSeconds}s is below minimum ${config.minDuration}s for ${videoType}`,
    };
  }

  if (durationSeconds > config.maxDuration) {
    return {
      valid: false,
      message: `Duration ${durationSeconds}s exceeds maximum ${config.maxDuration}s for ${videoType}`,
    };
  }

  return { valid: true };
}

/**
 * Get recommended hook duration
 */
export function getHookDuration(videoType: VideoType): number {
  return VideoTypeConfigs[videoType].scriptConfig.hookDuration;
}

/**
 * Check if video type supports chapters
 */
export function supportsChapters(videoType: VideoType): boolean {
  return VideoTypeConfigs[videoType].veoConfig.chapters;
}
