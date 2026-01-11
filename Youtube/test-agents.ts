async function testAgents() {
  console.log('Loading Research Agents...');
  
  const { trendAgent } = await import('./src/agents/research/TrendAgent.ts');
  console.log('✓ TrendAgent:', trendAgent.name);
  
  const { topicAgent } = await import('./src/agents/research/TopicAgent.ts');
  console.log('✓ TopicAgent:', topicAgent.name);
  
  const { scriptAgent } = await import('./src/agents/research/ScriptAgent.ts');
  console.log('✓ ScriptAgent:', scriptAgent.name);
  
  console.log('\nAll Research Agents loaded successfully!');
}

testAgents().catch(e => console.error('Error:', e));
