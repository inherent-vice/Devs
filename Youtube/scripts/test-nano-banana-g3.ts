/**
 * Test Nano Banana with AI Studio + Gemini 3.0
 */

import { getNanoBananaClient } from '../src/clients/nano-banana.js';
import { getLocalStorage } from '../src/storage/LocalStorageManager.js';

async function main() {
  console.log('=== Nano Banana AI Studio + Gemini 3.0 테스트 ===\n');

  // Initialize session
  const storage = getLocalStorage();
  storage.createSession({ name: 'test-g3' });

  const client = getNanoBananaClient();
  console.log('Model:', client.getModel());

  console.log('\nGenerating image...');
  const result = await client.generate({
    prompt: '2026년 글로벌 경제 - AI와 로봇이 함께하는 미래 도시, 홀로그램 디스플레이',
    aspectRatio: '16:9',
  });

  console.log('\n✅ 이미지 생성 성공!');
  console.log('Path:', result.images[0].path);
  console.log('Size:', result.images[0].base64 ? (result.images[0].base64.length / 1024).toFixed(1) + ' KB' : 'N/A');
  console.log('Time:', result.generationTimeMs, 'ms');
}

main().catch(console.error);
