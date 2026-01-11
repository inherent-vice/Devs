/**
 * Test Production Agents
 * Verify all production agents load correctly
 */

async function testProductionAgents() {
  console.log('Loading Production Agents...\n');

  try {
    const { videoAgent } = await import('./src/agents/production/VideoAgent.js');
    console.log('✓ VideoAgent:', videoAgent.name);
  } catch (e: any) {
    console.log('✗ VideoAgent error:', e.message);
  }

  try {
    const { thumbnailAgent } = await import('./src/agents/production/ThumbnailAgent.js');
    console.log('✓ ThumbnailAgent:', thumbnailAgent.name);
  } catch (e: any) {
    console.log('✗ ThumbnailAgent error:', e.message);
  }

  try {
    const { voiceAgent } = await import('./src/agents/production/VoiceAgent.js');
    console.log('✓ VoiceAgent:', voiceAgent.name);
  } catch (e: any) {
    console.log('✗ VoiceAgent error:', e.message);
  }

  try {
    const { editorAgent } = await import('./src/agents/production/EditorAgent.js');
    console.log('✓ EditorAgent:', editorAgent.name);
  } catch (e: any) {
    console.log('✗ EditorAgent error:', e.message);
  }

  console.log('\nAll Production Agents loaded!');
}

testProductionAgents().catch(e => console.error('Error:', e.message));
