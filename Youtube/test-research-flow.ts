/**
 * Test Research Flow
 * Quick test to verify the flow loads and executes
 */

async function testResearchFlow() {
  console.log('Loading ResearchFlow...');

  const { researchFlow } = await import('./src/flows/ResearchFlow.js');
  console.log('✓ ResearchFlow loaded:', researchFlow.name);

  console.log('\nTesting ResearchFlow execution...');
  console.log('This will call Gemini 3 Flash for trend analysis, topic selection, and script generation.\n');

  try {
    const result = await researchFlow({
      sessionId: 'test-session-001',
      idea: '한국 길거리 음식의 숨겨진 맛집을 소개하는 영상',
      videoType: 'shorts' as const,
      targetAudience: '20-30대 푸드 콘텐츠 시청자',
      style: '활기차고 맛있어 보이는',
      language: 'ko',
    });

    console.log('\n=== ResearchFlow Result ===');
    console.log('Session ID:', result.sessionId);
    console.log('\n--- Trends ---');
    console.log('Trend count:', result.trends?.trends?.length || 0);

    console.log('\n--- Topic ---');
    console.log('Selected topic:', result.topic?.selectedTopic?.title || 'N/A');
    console.log('Hook:', result.topic?.selectedTopic?.hook || 'N/A');

    console.log('\n--- Script ---');
    console.log('Script title:', result.script?.title || 'N/A');
    console.log('Section count:', result.script?.sections?.length || 0);

    console.log('\n--- Storyboard ---');
    console.log('Scene count:', result.storyboard?.scenes?.length || 0);

    console.log('\n--- Metadata ---');
    console.log('Total duration:', result.metadata.totalDuration, 'ms');
    console.log('Total cost: $', result.metadata.totalCost.toFixed(4));
    console.log('Phases:', result.metadata.phases.map(p => `${p.name}: ${p.duration}ms`).join(', '));

    console.log('\n✓ ResearchFlow test complete!');
  } catch (error) {
    console.error('\n✗ ResearchFlow failed:', error);
    throw error;
  }
}

testResearchFlow().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
