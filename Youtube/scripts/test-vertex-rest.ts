/**
 * Test Vertex AI Imagen using REST API with gcloud access token
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import { getEnv } from '../src/utils/env.js';

async function getAccessToken(): Promise<string> {
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
  return token;
}

async function generateImageWithVertexAI(prompt: string): Promise<Buffer | null> {
  const env = getEnv();
  const project = env.GOOGLE_CLOUD_PROJECT;
  const location = env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  const token = await getAccessToken();

  // Vertex AI Gemini endpoint
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/gemini-2.0-flash-exp:generateContent`;

  console.log('Using endpoint:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', error.substring(0, 500));
    return null;
  }

  const result = await response.json();
  const candidate = result.candidates?.[0];

  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
  }

  console.log('No image in response');
  console.log('Response:', JSON.stringify(result, null, 2).substring(0, 1000));
  return null;
}

async function main() {
  console.log('Testing Vertex AI Image Generation via REST API...\n');

  const prompt = 'Generate a cinematic image of a futuristic city skyline at night with holographic displays, blue and purple neon lights, wide format 16:9';

  const image = await generateImageWithVertexAI(prompt);

  if (image) {
    fs.writeFileSync('test-vertex-rest.png', image);
    console.log(`\n✅ Image saved: test-vertex-rest.png (${(image.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log('\n❌ Failed to generate image');
  }
}

main().catch(console.error);
