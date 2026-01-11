/**
 * A2A Protocol Module
 *
 * Agent-to-Agent communication protocol for:
 * - Agent discovery and registration
 * - Task delegation
 * - Inter-agent messaging
 */

export * from './types.js';
export * from './registry.js';
export * from './router.js';

import { getA2ARegistry, A2ARegistry } from './registry.js';
import { getA2ARouter, A2ARouter } from './router.js';
import { AgentCard } from './types.js';

// Import agents for registration
import { trendAgent } from '../../agents/research/TrendAgent.js';
import { topicAgent } from '../../agents/research/TopicAgent.js';
import { scriptAgent } from '../../agents/research/ScriptAgent.js';
import { voiceAgent } from '../../agents/production/VoiceAgent.js';
import { videoAgent } from '../../agents/production/VideoAgent.js';
import { imageVideoAgent } from '../../agents/production/ImageVideoAgent.js';
import { thumbnailAgent } from '../../agents/production/ThumbnailAgent.js';
import { editorAgent } from '../../agents/production/EditorAgent.js';
import { subtitleAgent } from '../../agents/production/SubtitleAgent.js';
import { criticAgent } from '../../agents/quality/CriticAgent.js';
import { artEvaluator } from '../../agents/quality/ArtEvaluator.js';
import { revisionAgent } from '../../agents/quality/RevisionAgent.js';
import { publisherAgent } from '../../agents/publisher/PublisherAgent.js';

// ===========================================
// Agent Cards
// ===========================================

const createAgentCard = (
  agent: { name: string; description: string },
  capabilities: AgentCard['capabilities'],
  skills: string[]
): AgentCard => ({
  id: agent.name,
  name: agent.name,
  description: agent.description,
  version: '1.0.0',
  provider: {
    name: 'YouTube AI Pipeline',
    url: 'https://github.com/anthropics/youtube-ai',
  },
  capabilities,
  skills,
  status: 'active',
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

// Pre-defined agent cards
export const AgentCards: Record<string, AgentCard> = {
  'trend-agent': createAgentCard(
    trendAgent,
    [{ name: 'trend-analysis', description: 'Analyze YouTube trends and patterns', tags: ['research', 'trends'] }],
    ['research', 'trends', 'analysis']
  ),
  'topic-agent': createAgentCard(
    topicAgent,
    [{ name: 'topic-selection', description: 'Select optimal video topics', tags: ['research', 'topics'] }],
    ['research', 'topics', 'strategy']
  ),
  'script-agent': createAgentCard(
    scriptAgent,
    [{ name: 'script-generation', description: 'Generate video scripts', tags: ['content', 'writing'] }],
    ['content', 'writing', 'scripts']
  ),
  'voice-agent': createAgentCard(
    voiceAgent,
    [{ name: 'voice-synthesis', description: 'Generate voice narration', tags: ['production', 'audio'] }],
    ['production', 'audio', 'tts']
  ),
  'video-agent': createAgentCard(
    videoAgent,
    [{ name: 'video-generation', description: 'Generate video clips with Veo', tags: ['production', 'video'] }],
    ['production', 'video', 'veo']
  ),
  'image-video-agent': createAgentCard(
    imageVideoAgent,
    [{ name: 'image-video-generation', description: 'Generate video from images with Ken Burns', tags: ['production', 'images'] }],
    ['production', 'images', 'ken-burns']
  ),
  'thumbnail-agent': createAgentCard(
    thumbnailAgent,
    [{ name: 'thumbnail-generation', description: 'Generate thumbnails', tags: ['production', 'images'] }],
    ['production', 'thumbnails', 'design']
  ),
  'editor-agent': createAgentCard(
    editorAgent,
    [{ name: 'video-editing', description: 'Edit and combine media', tags: ['production', 'editing'] }],
    ['production', 'editing', 'post-production']
  ),
  'subtitle-agent': createAgentCard(
    subtitleAgent,
    [{ name: 'subtitle-generation', description: 'Generate subtitles', tags: ['production', 'subtitles'] }],
    ['production', 'subtitles', 'accessibility']
  ),
  'critic-agent': createAgentCard(
    criticAgent,
    [{ name: 'quality-evaluation', description: 'Evaluate content quality', tags: ['quality', 'evaluation'] }],
    ['quality', 'evaluation', 'feedback']
  ),
  'art-evaluator': createAgentCard(
    artEvaluator,
    [{ name: 'art-evaluation', description: 'Evaluate visual quality', tags: ['quality', 'art'] }],
    ['quality', 'art', 'visual']
  ),
  'revision-agent': createAgentCard(
    revisionAgent,
    [{ name: 'content-revision', description: 'Revise content based on feedback', tags: ['quality', 'revision'] }],
    ['quality', 'revision', 'improvement']
  ),
  'publisher-agent': createAgentCard(
    publisherAgent,
    [{ name: 'youtube-publishing', description: 'Publish videos to YouTube', tags: ['publishing', 'youtube'] }],
    ['publishing', 'youtube', 'upload']
  ),
};

// Agent handler mapping
const agentHandlers: Record<string, (input: any, context: any) => Promise<any>> = {
  'trend-agent': (input, context) => trendAgent.execute(input, context),
  'topic-agent': (input, context) => topicAgent.execute(input, context),
  'script-agent': (input, context) => scriptAgent.execute(input, context),
  'voice-agent': (input, context) => voiceAgent.execute(input, context),
  'video-agent': (input, context) => videoAgent.execute(input, context),
  'image-video-agent': (input, context) => imageVideoAgent.execute(input, context),
  'thumbnail-agent': (input, context) => thumbnailAgent.execute(input, context),
  'editor-agent': (input, context) => editorAgent.execute(input, context),
  'subtitle-agent': (input, context) => subtitleAgent.execute(input, context),
  'critic-agent': (input, context) => criticAgent.execute(input, context),
  'art-evaluator': (input, context) => artEvaluator.execute(input, context),
  'revision-agent': (input, context) => revisionAgent.execute(input, context),
  'publisher-agent': (input, context) => publisherAgent.execute(input, context),
};

// ===========================================
// Initialization
// ===========================================

let initialized = false;

/**
 * Initialize A2A protocol with all agents
 */
export function initializeA2A(): { registry: A2ARegistry; router: A2ARouter } {
  if (initialized) {
    return { registry: getA2ARegistry(), router: getA2ARouter() };
  }

  const registry = getA2ARegistry();
  const router = getA2ARouter();

  // Register all agents
  for (const [id, card] of Object.entries(AgentCards)) {
    registry.register(card);

    // Register handler
    const handler = agentHandlers[id];
    if (handler) {
      router.registerHandler(id, async (task, context) => {
        return handler(task.input, context);
      });
    }
  }

  // Start registry
  registry.start();

  initialized = true;
  console.log(`[A2A] Initialized with ${Object.keys(AgentCards).length} agents`);

  return { registry, router };
}

/**
 * Shutdown A2A protocol
 */
export function shutdownA2A(): void {
  const registry = getA2ARegistry();
  registry.stop();
  registry.clear();
  initialized = false;
  console.log('[A2A] Shutdown complete');
}
