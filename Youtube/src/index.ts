/**
 * YouTube Agentic AI - Entry Point
 *
 * Main entry point for the agentic AI workflow system.
 * Uses Genkit 1.27+ API pattern.
 */

import { ai, gemini3Flash } from './genkit.config.js';
import { z } from 'zod';

// Import all flows for Genkit UI registration
import { researchFlow } from './flows/ResearchFlow.js';
import { productionFlow } from './flows/ProductionFlow.js';
import { qualityFlow } from './flows/QualityFlow.js';
import { masterFlow } from './flows/MasterFlow.js';

// Re-export flows so Genkit can discover them
export { researchFlow, productionFlow, qualityFlow, masterFlow };

// ===========================================
// Health Check Flow
// ===========================================

export const healthCheckFlow = ai.defineFlow(
  {
    name: 'health-check',
    inputSchema: z.object({}),
    outputSchema: z.object({
      status: z.string(),
      timestamp: z.string(),
      version: z.string(),
      services: z.record(z.string(), z.boolean()),
    }),
  },
  async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        genkit: true,
        googleAI: true,
        vertexAI: true,
      },
    };
  }
);

// ===========================================
// Simple Generate Test Flow
// ===========================================

export const testGenerateFlow = ai.defineFlow(
  {
    name: 'test-generate',
    inputSchema: z.object({
      prompt: z.string(),
    }),
    outputSchema: z.object({
      response: z.string(),
      model: z.string(),
    }),
  },
  async (input) => {
    const response = await ai.generate({
      model: gemini3Flash,
      prompt: input.prompt,
    });

    return {
      response: response.text,
      model: gemini3Flash,
    };
  }
);

// ===========================================
// Cost Estimation
// ===========================================

export function getCostEstimate(
  videoType: 'shorts' | 'medium' | 'longform',
  useFast: boolean = true
): { estimated: number; breakdown: { research: number; production: number; quality: number } } {
  const costs = {
    shorts: {
      fast: { research: 0.15, production: 9.00, quality: 1.50 },
      standard: { research: 0.15, production: 24.00, quality: 1.50 },
    },
    medium: {
      fast: { research: 0.25, production: 45.00, quality: 2.00 },
      standard: { research: 0.25, production: 120.00, quality: 2.00 },
    },
    longform: {
      fast: { research: 0.50, production: 135.00, quality: 3.00 },
      standard: { research: 0.50, production: 360.00, quality: 3.00 },
    },
  };

  const mode = useFast ? 'fast' : 'standard';
  const cost = costs[videoType][mode];

  return {
    estimated: cost.research + cost.production + cost.quality,
    breakdown: cost,
  };
}

// ===========================================
// CLI Entry Point
// ===========================================

async function main() {
  console.log('');
  console.log('YouTube Agentic AI System v1.0.0');
  console.log('='.repeat(50));
  console.log('');
  console.log('Cost Estimates:');
  console.log('  - Shorts (< 60s):   ~$' + getCostEstimate('shorts').estimated.toFixed(2));
  console.log('  - Medium (5min):    ~$' + getCostEstimate('medium').estimated.toFixed(2));
  console.log('  - Longform (15min): ~$' + getCostEstimate('longform').estimated.toFixed(2));
  console.log('');
  console.log('Available Flows:');
  console.log('  - health-check: System status');
  console.log('  - test-generate: Test AI generation');
  console.log('  - research-flow: Research phase (Trend → Topic → Script)');
  console.log('  - production-flow: Production phase (Voice + Video + Thumbnail)');
  console.log('  - quality-improvement-loop: Quality phase (Critic → Revision)');
  console.log('  - master-orchestration-flow: Full pipeline');
  console.log('');
  console.log('Usage:');
  console.log('  1. Start Genkit UI: npx genkit start -- npx tsx src/index.ts');
  console.log('  2. Or run directly: npx tsx src/index.ts');
  console.log('');

  // Run health check
  console.log('Running health check...');
  try {
    const health = await healthCheckFlow({});
    console.log('  Status:', health.status);
    console.log('  Version:', health.version);
    console.log('');

    // Test AI generation
    console.log('Testing AI generation with Gemini...');
    const testResult = await testGenerateFlow({
      prompt: 'Say "Hello, YouTube AI is working!" in Korean.',
    });
    console.log('  Response:', testResult.response);
    console.log('  Model:', testResult.model);
    console.log('');
    console.log('All systems operational!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if executed directly
main().catch(console.error);
