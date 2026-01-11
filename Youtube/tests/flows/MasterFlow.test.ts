/**
 * MasterFlow Tests
 *
 * Tests for schema validation and helper functions.
 * Integration tests with mock responses.
 */

import { describe, it, expect } from 'vitest';
import {
  MasterFlowInputSchema,
  MasterFlowOutputSchema,
  estimatePipelineCost,
} from '../../src/flows/MasterFlow.js';

describe('MasterFlow', () => {
  describe('MasterFlowInputSchema', () => {
    it('should validate valid input', () => {
      const validInput = {
        idea: 'Create a tutorial video about TypeScript generics',
        videoType: 'medium',
        targetAudience: 'intermediate developers',
        language: 'ko',
      };

      const result = MasterFlowInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject idea shorter than 10 characters', () => {
      const invalidInput = {
        idea: 'Short',
        videoType: 'shorts',
      };

      const result = MasterFlowInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid video type', () => {
      const invalidInput = {
        idea: 'Create a great video about programming',
        videoType: 'invalid-type',
      };

      const result = MasterFlowInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept all valid video types', () => {
      const videoTypes = ['shorts', 'medium', 'longform'] as const;

      for (const videoType of videoTypes) {
        const input = {
          idea: 'Create a tutorial video about TypeScript',
          videoType,
        };

        const result = MasterFlowInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should default language to "ko"', () => {
      const input = {
        idea: 'Create a tutorial video about TypeScript',
        videoType: 'medium',
      };

      const result = MasterFlowInputSchema.parse(input);
      expect(result.language).toBe('ko');
    });

    it('should accept style as string', () => {
      const input = {
        idea: 'Create a tutorial video about TypeScript',
        videoType: 'medium',
        style: 'cinematic',
      };

      const result = MasterFlowInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept style as object', () => {
      const input = {
        idea: 'Create a tutorial video about TypeScript',
        videoType: 'medium',
        style: {
          preset: 'cinematic',
          colorTone: 'warm',
          pacing: 'moderate',
        },
      };

      const result = MasterFlowInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate voice configuration', () => {
      const input = {
        idea: 'Create a tutorial video about TypeScript',
        videoType: 'medium',
        voice: {
          name: 'Kore',
          speed: 1.0,
          stylePrompt: 'Professional and clear',
        },
      };

      const result = MasterFlowInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject voice speed outside valid range', () => {
      const inputTooFast = {
        idea: 'Create a tutorial video about TypeScript',
        videoType: 'medium',
        voice: {
          name: 'Kore',
          speed: 3.0, // Max is 2.0
        },
      };

      expect(MasterFlowInputSchema.safeParse(inputTooFast).success).toBe(false);

      const inputTooSlow = {
        idea: 'Create a tutorial video about TypeScript',
        videoType: 'medium',
        voice: {
          name: 'Kore',
          speed: 0.1, // Min is 0.5
        },
      };

      expect(MasterFlowInputSchema.safeParse(inputTooSlow).success).toBe(false);
    });

    it('should validate options with default values', () => {
      const input = {
        idea: 'Create a tutorial video about TypeScript',
        videoType: 'medium',
        options: {
          useFastGeneration: false,
          maxQualityIterations: 3,
          minQualityThreshold: 0.9,
        },
      };

      const result = MasterFlowInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('MasterFlowOutputSchema', () => {
    it('should validate valid output', () => {
      const validOutput = {
        sessionId: 'session-123',
        status: 'completed',
        phases: {
          research: { completed: true, duration: 1000, cost: 0.5 },
          production: { completed: true, duration: 5000, cost: 2.0 },
          quality: {
            completed: true,
            duration: 2000,
            cost: 0.3,
            finalScore: 0.92,
            iterations: 2,
          },
        },
        metadata: {
          totalDuration: 8000,
          totalCost: 2.8,
          estimatedCost: 3.0,
          videoType: 'medium',
          qualityVerdict: 'excellent',
        },
        readyToPublish: true,
      };

      const result = MasterFlowOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should validate failed output', () => {
      const failedOutput = {
        sessionId: 'session-456',
        status: 'failed',
        phases: {
          research: { completed: true, duration: 1000, cost: 0.5 },
          production: { completed: false, duration: 500, cost: 0 },
          quality: { completed: false, duration: 0, cost: 0 },
        },
        metadata: {
          totalDuration: 1500,
          totalCost: 0.5,
          estimatedCost: 3.0,
          videoType: 'shorts',
        },
        readyToPublish: false,
      };

      const result = MasterFlowOutputSchema.safeParse(failedOutput);
      expect(result.success).toBe(true);
    });

    it('should validate partial output', () => {
      const partialOutput = {
        sessionId: 'session-789',
        status: 'partial',
        phases: {
          research: { completed: true, duration: 1000, cost: 0.5, output: {} },
          production: { completed: true, duration: 2000, cost: 1.0 },
          quality: { completed: false, duration: 0, cost: 0 },
        },
        metadata: {
          totalDuration: 3000,
          totalCost: 1.5,
          estimatedCost: 3.0,
          videoType: 'medium',
        },
        readyToPublish: false,
      };

      const result = MasterFlowOutputSchema.safeParse(partialOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('estimatePipelineCost', () => {
    it('should return cost estimate for shorts with fast generation', () => {
      const estimate = estimatePipelineCost('shorts', true);

      expect(estimate.estimated).toBeGreaterThan(0);
      expect(estimate.breakdown.research).toBeGreaterThan(0);
      expect(estimate.breakdown.production).toBeGreaterThan(0);
      expect(estimate.breakdown.quality).toBeGreaterThan(0);
    });

    it('should return higher cost for longform videos', () => {
      const shortsEstimate = estimatePipelineCost('shorts', true);
      const longformEstimate = estimatePipelineCost('longform', true);

      expect(longformEstimate.estimated).toBeGreaterThan(shortsEstimate.estimated);
    });

    it('should return higher cost when not using fast generation', () => {
      const fastEstimate = estimatePipelineCost('medium', true);
      const standardEstimate = estimatePipelineCost('medium', false);

      expect(standardEstimate.estimated).toBeGreaterThan(fastEstimate.estimated);
    });

    it('should include breakdown totaling to estimated cost', () => {
      const estimate = estimatePipelineCost('medium', true);

      const breakdownTotal =
        estimate.breakdown.research +
        estimate.breakdown.production +
        estimate.breakdown.quality;

      // Allow small floating point difference
      expect(Math.abs(estimate.estimated - breakdownTotal)).toBeLessThan(0.01);
    });
  });
});
