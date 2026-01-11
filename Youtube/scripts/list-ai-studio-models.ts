/**
 * List available AI Studio models
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnv } from '../src/utils/env.js';

async function main() {
  const env = getEnv();
  const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);

  console.log('=== AI Studio 사용 가능 모델 ===\n');

  const models = await genAI.listModels();

  const allModels: Array<{ name: string; methods: string[] }> = [];

  for await (const model of models) {
    allModels.push({
      name: model.name || '',
      methods: model.supportedGenerationMethods || [],
    });
  }

  // Gemini 3.0 / 2.5 모델
  console.log('🚀 Gemini 2.5/3.0 최신 모델:');
  allModels
    .filter(m => m.name.includes('gemini-3') || m.name.includes('gemini-2.5'))
    .forEach(m => {
      console.log(`  ${m.name}`);
      console.log(`    Methods: ${m.methods.join(', ')}`);
    });

  // 이미지 생성 모델
  console.log('\n📷 이미지 생성 관련 모델:');
  allModels
    .filter(m =>
      m.name.includes('image') ||
      m.name.includes('imagen') ||
      m.methods.includes('generateImages')
    )
    .forEach(m => {
      console.log(`  ${m.name}`);
      console.log(`    Methods: ${m.methods.join(', ')}`);
    });

  // Flash 실험 모델
  console.log('\n⚡ Flash 실험 모델 (이미지 생성 가능):');
  allModels
    .filter(m => m.name.includes('flash') && m.name.includes('exp'))
    .forEach(m => {
      console.log(`  ${m.name}`);
      console.log(`    Methods: ${m.methods.join(', ')}`);
    });
}

main().catch(console.error);
