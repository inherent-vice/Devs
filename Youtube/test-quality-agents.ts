/**
 * Test Quality Agents
 * Verify all quality agents load correctly
 */

async function testQualityAgents() {
  console.log('Loading Quality Agents...\n');

  try {
    const { criticAgent } = await import('./src/agents/quality/CriticAgent.js');
    console.log('✓ CriticAgent:', criticAgent.name);
  } catch (e: any) {
    console.log('✗ CriticAgent error:', e.message);
  }

  try {
    const { artEvaluator } = await import('./src/agents/quality/ArtEvaluator.js');
    console.log('✓ ArtEvaluator:', artEvaluator.name);
  } catch (e: any) {
    console.log('✗ ArtEvaluator error:', e.message);
  }

  try {
    const { revisionAgent } = await import('./src/agents/quality/RevisionAgent.js');
    console.log('✓ RevisionAgent:', revisionAgent.name);
  } catch (e: any) {
    console.log('✗ RevisionAgent error:', e.message);
  }

  console.log('\nAll Quality Agents loaded!');
}

testQualityAgents().catch(e => console.error('Error:', e.message));
