/**
 * Test MasterFlow and save results to JSON
 */

import * as fs from 'fs';

async function testAndSave() {
  console.log('Running MasterFlow and saving results...\n');

  const { masterFlow } = await import('./src/flows/MasterFlow.js');

  const result = await masterFlow({
    idea: '한국의 숨겨진 맛집을 찾아가는 먹방 콘텐츠 - 서울 골목길 로컬 맛집 탐방',
    videoType: 'shorts',
    targetAudience: '20-30대 푸드 콘텐츠 시청자',
    style: '활기차고 맛있어 보이는',
    language: 'ko',
    options: {
      skipProduction: true,
      skipQuality: true,
    },
  });

  // Save full result
  const outputPath = './output/result.json';
  fs.mkdirSync('./output', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  // Save script separately for easy reading
  const scriptPath = './output/script.json';
  fs.writeFileSync(scriptPath, JSON.stringify(result.finalContent?.script, null, 2), 'utf-8');

  // Save storyboard
  const storyboardPath = './output/storyboard.json';
  fs.writeFileSync(storyboardPath, JSON.stringify(result.finalContent?.storyboard, null, 2), 'utf-8');

  console.log('\n✓ Results saved to:');
  console.log('  - output/result.json (전체 결과)');
  console.log('  - output/script.json (대본)');
  console.log('  - output/storyboard.json (스토리보드)');
  console.log('\nOr view in Genkit Developer UI: http://localhost:4000');
}

testAndSave().catch(console.error);
