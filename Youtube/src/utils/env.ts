/**
 * Environment Configuration
 *
 * Validates required environment variables and provides typed access.
 * All APIs require valid credentials - no mock mode.
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

// ===========================================
// Environment Schema
// ===========================================

const EnvSchema = z.object({
  // Google AI (Gemini)
  GOOGLE_AI_API_KEY: z.string().min(1, 'GOOGLE_AI_API_KEY is required'),

  // Google Cloud
  GOOGLE_CLOUD_PROJECT: z.string().min(1, 'GOOGLE_CLOUD_PROJECT is required'),
  GOOGLE_CLOUD_LOCATION: z.string().default('us-central1'),

  // Google Drive
  GOOGLE_DRIVE_CLIENT_ID: z.string().min(1, 'GOOGLE_DRIVE_CLIENT_ID is required'),
  GOOGLE_DRIVE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_DRIVE_CLIENT_SECRET is required'),
  GOOGLE_DRIVE_REFRESH_TOKEN: z.string().min(1, 'GOOGLE_DRIVE_REFRESH_TOKEN is required'),

  // YouTube API
  YOUTUBE_API_KEY: z.string().min(1, 'YOUTUBE_API_KEY is required'),

  // YouTube OAuth (for uploads)
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_REFRESH_TOKEN: z.string().optional(),

  // Cost Limits
  MAX_COST_PER_VIDEO: z.string().transform(Number).default('30'),
  MAX_COST_PER_SESSION: z.string().transform(Number).default('100'),

  // Quality Thresholds
  QUALITY_MIN_THRESHOLD: z.string().transform(Number).default('0.85'),
  QUALITY_MAX_ITERATIONS: z.string().transform(Number).default('5'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

// ===========================================
// Environment Access
// ===========================================

let cachedEnv: Env | null = null;

/**
 * Get validated environment variables
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(issue =>
      `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');

    throw new Error(`Environment validation failed:\n${errors}\n\nPlease check your .env file.`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

// ===========================================
// Validation Helpers
// ===========================================

export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

/**
 * Validate Google AI credentials
 */
export function validateGoogleAI(): ValidationResult {
  const missing: string[] = [];

  if (!process.env.GOOGLE_AI_API_KEY) {
    missing.push('GOOGLE_AI_API_KEY');
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Validate Vertex AI credentials
 */
export function validateVertexAI(): ValidationResult {
  const missing: string[] = [];

  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    missing.push('GOOGLE_CLOUD_PROJECT');
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Validate Google Drive credentials
 */
export function validateGoogleDrive(): ValidationResult {
  const missing: string[] = [];

  if (!process.env.GOOGLE_DRIVE_CLIENT_ID) {
    missing.push('GOOGLE_DRIVE_CLIENT_ID');
  }
  if (!process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
    missing.push('GOOGLE_DRIVE_CLIENT_SECRET');
  }
  if (!process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
    missing.push('GOOGLE_DRIVE_REFRESH_TOKEN');
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Validate YouTube API credentials
 */
export function validateYouTubeAPI(): ValidationResult {
  const missing: string[] = [];

  if (!process.env.YOUTUBE_API_KEY) {
    missing.push('YOUTUBE_API_KEY');
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Validate YouTube OAuth credentials (for uploads)
 */
export function validateYouTubeOAuth(): ValidationResult {
  const missing: string[] = [];

  if (!process.env.YOUTUBE_CLIENT_ID) {
    missing.push('YOUTUBE_CLIENT_ID');
  }
  if (!process.env.YOUTUBE_CLIENT_SECRET) {
    missing.push('YOUTUBE_CLIENT_SECRET');
  }
  if (!process.env.YOUTUBE_REFRESH_TOKEN) {
    missing.push('YOUTUBE_REFRESH_TOKEN');
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Validate all required credentials
 */
export function validateAll(): {
  googleAI: ValidationResult;
  vertexAI: ValidationResult;
  googleDrive: ValidationResult;
  youtube: ValidationResult;
  youtubeOAuth: ValidationResult;
  allValid: boolean;
} {
  const googleAI = validateGoogleAI();
  const vertexAI = validateVertexAI();
  const googleDrive = validateGoogleDrive();
  const youtube = validateYouTubeAPI();
  const youtubeOAuth = validateYouTubeOAuth();

  // YouTube OAuth is optional (only for uploads)
  const allValid = googleAI.valid && vertexAI.valid && googleDrive.valid && youtube.valid;

  return {
    googleAI,
    vertexAI,
    googleDrive,
    youtube,
    youtubeOAuth,
    allValid,
  };
}

/**
 * Get cost limits
 */
export function getCostLimits(): {
  perVideo: number;
  perSession: number;
} {
  const env = getEnv();
  return {
    perVideo: env.MAX_COST_PER_VIDEO,
    perSession: env.MAX_COST_PER_SESSION,
  };
}

/**
 * Print validation status
 */
export function printValidationStatus(): void {
  const status = validateAll();

  console.log('\n=== API Credentials Status ===\n');

  const printStatus = (name: string, result: ValidationResult) => {
    if (result.valid) {
      console.log(`✓ ${name}: Ready`);
    } else {
      console.log(`✗ ${name}: Missing ${result.missing.join(', ')}`);
    }
  };

  printStatus('Google AI (Gemini)', status.googleAI);
  printStatus('Vertex AI (Veo, Imagen)', status.vertexAI);
  printStatus('Google Drive', status.googleDrive);
  printStatus('YouTube API', status.youtube);
  printStatus('YouTube OAuth (uploads)', status.youtubeOAuth);

  console.log('\n');

  if (!status.allValid) {
    throw new Error('Required credentials are missing. Check your .env file.');
  }

  console.log('✓ All required credentials are configured.\n');
}
