/**
 * Test Imagen API directly
 */

import { GoogleGenAI } from '@google/genai';
import { getEnv } from '../src/utils/env.js';

async function main() {
  const env = getEnv();
  console.log('API Key present:', !!env.GOOGLE_AI_API_KEY);
  console.log('API Key prefix:', env.GOOGLE_AI_API_KEY?.substring(0, 10) + '...');

  const ai = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY });

  try {
    console.log('\nTesting Imagen API with imagen-4.0-generate-001...');
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: 'A simple red apple on a white background, photorealistic',
      config: {
        numberOfImages: 1,
      },
    });

    console.log('Success!');
    console.log('Generated images:', response.generatedImages?.length || 0);

    if (response.generatedImages && response.generatedImages.length > 0) {
      const img = response.generatedImages[0] as any;
      console.log('Image bytes length:', img.image?.imageBytes?.length || 0);
    }
  } catch (error: any) {
    console.log('\nError occurred:');
    console.log('Message:', error.message);
    console.log('Status:', error.status);
    console.log('Details:', JSON.stringify(error, null, 2).substring(0, 1500));
  }
}

main().catch(console.error);
