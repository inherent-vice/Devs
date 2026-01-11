/**
 * Test Vertex AI Imagen API
 */

import { VertexAI } from '@google-cloud/vertexai';
import { getEnv } from '../src/utils/env.js';
import * as fs from 'fs';

async function main() {
  const env = getEnv();

  console.log('Testing Vertex AI Image Generation...');
  console.log('Project:', env.GOOGLE_CLOUD_PROJECT);
  console.log('Location:', env.GOOGLE_CLOUD_LOCATION);

  const vertexAI = new VertexAI({
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
  });

  // Try Gemini model with image generation
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
  });

  try {
    console.log('\nGenerating image with Vertex AI Gemini...');

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: 'Generate an image of a red apple on a white background' }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      } as any,
    });

    const response = result.response;
    const candidate = response.candidates?.[0];

    console.log('Response received!');
    console.log('Parts:', candidate?.content?.parts?.length || 0);

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        const inlineData = (part as any).inlineData;
        if (inlineData?.data) {
          console.log('✅ Image generated!');
          console.log('MIME:', inlineData.mimeType);
          console.log('Size:', inlineData.data.length);

          const buffer = Buffer.from(inlineData.data, 'base64');
          fs.writeFileSync('test-vertex-image.png', buffer);
          console.log('Saved to test-vertex-image.png');
          return;
        }
      }
    }

    console.log('No image in response');
  } catch (error: any) {
    console.error('Error:', error.message?.substring(0, 500));
    if (error.message?.includes('PERMISSION_DENIED')) {
      console.log('\n⚠️ Permission denied. Try: gcloud auth application-default login');
    }
  }
}

main().catch(console.error);
