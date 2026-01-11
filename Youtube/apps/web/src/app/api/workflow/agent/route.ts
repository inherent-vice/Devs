/**
 * Workflow Agent Execution API
 *
 * POST /api/workflow/agent
 * Execute a single agent and return its output
 *
 * Request body:
 * {
 *   sessionId: string,
 *   agentId: string,
 *   phase: WorkflowPhase,
 *   input: any,
 *   config: AgentConfig
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import type { WorkflowPhase } from "@/lib/workflow/types";
import { config as appConfig } from "@/lib/config";

interface AgentRequest {
  sessionId: string;
  agentId: string;
  phase: WorkflowPhase;
  input: unknown;
  config: unknown;
}

// Execute agent via backend
async function executeAgent(
  agentId: string,
  phase: WorkflowPhase,
  input: unknown,
  config: unknown
): Promise<{ output: unknown; cost: number; duration: number }> {
  const backendUrl = appConfig.backendUrl;

  const response = await fetch(`${backendUrl}/api/agent/${agentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phase, input, config }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Backend agent ${agentId} failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return {
    output: result.output,
    cost: result.cost || 0,
    duration: result.duration || 0,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentRequest = await request.json();
    const { sessionId, agentId, phase, input, config } = body;

    if (!sessionId || !agentId || !phase) {
      return NextResponse.json(
        { error: "Session ID, agent ID, and phase are required" },
        { status: 400 }
      );
    }

    console.log(`[${sessionId}] Executing agent: ${agentId} (phase: ${phase})`);

    // Execute the agent
    const result = await executeAgent(agentId, phase, input, config);

    console.log(`[${sessionId}] Agent ${agentId} completed in ${result.duration}ms`);

    return NextResponse.json({
      success: true,
      agentId,
      phase,
      output: result.output,
      cost: result.cost,
      duration: result.duration,
    });
  } catch (error) {
    console.error("Agent execution error:", error);
    const message = error instanceof Error ? error.message : "Agent execution failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
