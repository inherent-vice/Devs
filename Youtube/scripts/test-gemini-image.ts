/**
 * Test Gemini Image Generation API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnv } from '../src/utils/env.js';
import * as fs from 'fs';

async function main() {
  const env = getEnv();
  console.log('Testing Gemini Image Generation...\n');

  const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);

  // Try different models
  const models = [
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.5-flash-image-preview',
    'gemini-2.5-flash-image',
  ];

  for (const modelName of models) {
    console.log(`\nTrying model: ${modelName}`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: 'Generate an image of a red apple on a white background' }]
        }],
        generationConfig: {
          responseModalities: ['IMAGE'],
        } as any,
      });

      const response = result.response;
      const candidate = response.candidates?.[0];

      console.log('Response received!');
      console.log('Parts count:', candidate?.content?.parts?.length || 0);

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          const inlineData = (part as any).inlineData;
          if (inlineData?.data) {
            console.log('✅ Image generated successfully!');
            console.log('MIME type:', inlineData.mimeType);
            console.log('Data length:', inlineData.data.length);

            // Save image
            const buffer = Buffer.from(inlineData.data, 'base64');
            fs.writeFileSync(`test-${modelName.replace(/\//g, '-')}.png`, buffer);
            console.log('Image saved!');
            return; // Success, exit
          }
        }
      }
    } catch (error: any) {
      console.log('Error:', error.message?.substring(0, 200));
    }
  }

  console.log('\nNo models worked. Falling back to placeholder approach.');
}

main().catch(console.error);
