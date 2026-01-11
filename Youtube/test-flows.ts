/**
 * Test All Flows
 * Verify all flows load correctly
 */

async function testFlows() {
  console.log('Loading Flows...\n');

  try {
    const { researchFlow } = await import('./src/flows/ResearchFlow.js');
    console.log('✓ ResearchFlow:', researchFlow.name);
  } catch (e: any) {
    console.log('✗ ResearchFlow error:', e.message);
  }

  try {
    const { productionFlow } = await import('./src/flows/ProductionFlow.js');
    console.log('✓ ProductionFlow:', productionFlow.name);
  } catch (e: any) {
    console.log('✗ ProductionFlow error:', e.message);
  }

  try {
    const { qualityFlow } = await import('./src/flows/QualityFlow.js');
    console.log('✓ QualityFlow:', qualityFlow.name);
  } catch (e: any) {
    console.log('✗ QualityFlow error:', e.message);
  }

  try {
    const { masterFlow } = await import('./src/flows/MasterFlow.js');
    console.log('✓ MasterFlow:', masterFlow.name);
  } catch (e: any) {
    console.log('✗ MasterFlow error:', e.message);
  }

  console.log('\nAll Flows loaded!');
}

testFlows().catch(e => console.error('Error:', e.message));
