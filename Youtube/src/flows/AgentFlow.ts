/**
 * Agent Execution Flow
 *
 * Runs a single agent by ID so the web workflow can execute step-by-step
 * through the Genkit backend.
 */
import { z } from "zod";
import { ai } from "../genkit.config.js";
import type { AgentContext } from "../agents/base/types.js";
import { trendAgent } from "../agents/research/TrendAgent.js";
import { topicAgent } from "../agents/research/TopicAgent.js";
import { scriptAgent } from "../agents/research/ScriptAgent.js";
import { voiceAgent } from "../agents/production/VoiceAgent.js";
import { videoAgent } from "../agents/production/VideoAgent.js";
import { imageVideoAgent } from "../agents/production/ImageVideoAgent.js";
import { thumbnailAgent } from "../agents/production/ThumbnailAgent.js";
import { editorAgent } from "../agents/production/EditorAgent.js";
import { criticAgent } from "../agents/quality/CriticAgent.js";
import { artEvaluator } from "../agents/quality/ArtEvaluator.js";
import { revisionAgent } from "../agents/quality/RevisionAgent.js";
import { publisherAgent } from "../agents/publisher/PublisherAgent.js";

const AgentExecutionInputSchema = z.object({
  sessionId: z.string(),
  agentId: z.string(),
  phase: z.enum(["research", "production", "quality", "publishing"]).optional(),
  input: z.any(),
});

const AgentExecutionOutputSchema = z.object({
  success: z.boolean(),
  output: z.any().optional(),
  cost: z.number().optional(),
  duration: z.number().optional(),
  error: z.string().optional(),
});

const AGENT_PHASE_MAP: Record<string, "research" | "production" | "quality" | "publishing"> = {
  trend: "research",
  topic: "research",
  script: "research",
  voice: "production",
  video: "production",
  thumbnail: "production",
  editor: "production",
  critic: "quality",
  artEvaluator: "quality",
  revision: "quality",
  publisher: "publishing",
};

function inferVideoType(input: any): "shorts" | "medium" | "longform" {
  if (input?.videoType) return input.videoType;
  if (input?.storyboard?.videoType) return input.storyboard.videoType;
  return "medium";
}

function resolveAgent(agentId: string, input: any) {
  if (agentId === "video") {
    const mode = input?.mode || input?.videoMode || input?.config?.mode;
    if (mode && mode !== "veo") {
      return imageVideoAgent;
    }
  }

  const registry: Record<string, any> = {
    trend: trendAgent,
    topic: topicAgent,
    script: scriptAgent,
    voice: voiceAgent,
    video: videoAgent,
    thumbnail: thumbnailAgent,
    editor: editorAgent,
    critic: criticAgent,
    artEvaluator,
    revision: revisionAgent,
    publisher: publisherAgent,
  };

  return registry[agentId];
}

export const agentExecutionFlow = ai.defineFlow(
  {
    name: "agent-execution",
    inputSchema: AgentExecutionInputSchema,
    outputSchema: AgentExecutionOutputSchema,
  },
  async (payload) => {
    const { sessionId, agentId, phase, input } = payload;

    const agent = resolveAgent(agentId, input);
    if (!agent) {
      return {
        success: false,
        error: `Unknown agent: ${agentId}`,
      };
    }

    const context: AgentContext = {
      sessionId,
      phase: phase || AGENT_PHASE_MAP[agentId] || "research",
      videoType: inferVideoType(input),
    };

    const result = await agent.execute(input, context);
    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || "Agent execution failed",
      };
    }

    return {
      success: true,
      output: result.data,
      cost: result.metrics?.cost || 0,
      duration: result.metrics?.duration || 0,
    };
  }
);

export default agentExecutionFlow;
