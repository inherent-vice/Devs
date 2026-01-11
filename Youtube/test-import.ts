console.log('Testing...'); import('./src/agents/research/TrendAgent.ts').then(m => console.log('OK:', m.trendAgent.name)).catch(e => console.error('ERR:', e.message));
