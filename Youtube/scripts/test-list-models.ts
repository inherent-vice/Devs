/**
 * List available Gemini models
 */

import { GoogleGenAI } from '@google/genai';
import { getEnv } from '../src/utils/env.js';

async function main() {
  const env = getEnv();
  const ai = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY });

  try {
    console.log('Listing available models...\n');

    // List models
    const models = await ai.models.list();

    console.log('Available models:');
    for await (const model of models) {
      const name = (model as any).name || model;
      const methods = (model as any).supportedGenerationMethods || [];
      if (name.includes('imagen') || name.includes('image') || methods.includes('generateImages')) {
        console.log(`  - ${name}`);
        console.log(`    Methods: ${methods.join(', ')}`);
      }
    }
  } catch (error: any) {
    console.log('Error:', error.message);
  }
}

main().catch(console.error);
