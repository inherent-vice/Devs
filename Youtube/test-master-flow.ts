/**
 * Test MasterFlow
 * Full pipeline test with options
 */

async function testMasterFlow() {
  console.log('='.repeat(70));
  console.log('MASTERFLOW TEST - YouTube Video Production Pipeline');
  console.log('='.repeat(70));

  const { masterFlow } = await import('./src/flows/MasterFlow.js');

  // Test 1: Research Only (skipProduction, skipQuality)
  console.log('\n[TEST 1] Research Only Mode\n');

  try {
    const result = await masterFlow({
      idea: '한국의 숨겨진 맛집을 찾아가는 먹방 콘텐츠 - 서울 골목길 로컬 맛집 탐방',
      videoType: 'shorts',
      targetAudience: '20-30대 푸드 콘텐츠 시청자',
      style: '활기차고 맛있어 보이는',
      language: 'ko',
      options: {
        skipProduction: true,
        skipQuality: true,
        useFastGeneration: true,
      },
    });

    console.log('\n' + '='.repeat(70));
    console.log('TEST 1 RESULT:');
    console.log('='.repeat(70));
    console.log('Session ID:', result.sessionId);
    console.log('Status:', result.status);
    console.log('Ready to Publish:', result.readyToPublish);
    console.log('\nPhases:');
    console.log('  - Research:', result.phases.research.completed ? '✓' : '✗',
      `(${result.phases.research.duration}ms, $${result.phases.research.cost.toFixed(4)})`);
    console.log('  - Production:', result.phases.production.completed ? '✓' : 'Skipped');
    console.log('  - Quality:', result.phases.quality.completed ? '✓' : 'Skipped');

    if (result.finalContent?.script) {
      console.log('\nGenerated Script:');
      console.log('  Title:', result.finalContent.script.title);
      console.log('  Hook:', result.finalContent.script.hook?.substring(0, 80) + '...');
      console.log('  Sections:', result.finalContent.script.sections?.length);
    }

    if (result.finalContent?.storyboard) {
      console.log('\nGenerated Storyboard:');
      console.log('  Scenes:', result.finalContent.storyboard.scenes?.length);
    }

    console.log('\nMetadata:');
    console.log('  Total Duration:', (result.metadata.totalDuration / 1000).toFixed(1), 's');
    console.log('  Total Cost: $', result.metadata.totalCost.toFixed(4));
    console.log('  Estimated Cost: $', result.metadata.estimatedCost.toFixed(2));

    console.log('\n✓ TEST 1 PASSED\n');

  } catch (error) {
    console.error('\n✗ TEST 1 FAILED:', error);
  }
}

testMasterFlow().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
