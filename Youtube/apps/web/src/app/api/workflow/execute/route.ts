/**
 * Workflow Execution API
 *
 * POST /api/workflow/execute
 * Starts workflow execution and returns SSE stream for real-time updates
 *
 * Request body:
 * {
 *   config: WorkflowConfig,
 *   mode: "auto" | "step" | "manual",
 *   startFromPhase?: WorkflowPhase,
 *   skipAgents?: string[]
 * }
 */

import { NextRequest } from "next/server";
import {
  createWorkflowExecutor,
  createSSECallbacks,
  ExecutionMode,
  WorkflowExecutor,
} from "@/lib/workflow/executor";
import type { WorkflowConfig, WorkflowPhase } from "@/lib/workflow/types";
import { getExecutorStore } from "@/lib/workflow/executor-store";

// Get executor store instance (abstraction over Map/Redis/etc.)
const executorStore = getExecutorStore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      config,
      mode = "auto",
      startFromPhase,
      skipAgents,
    }: {
      config: WorkflowConfig;
      mode: ExecutionMode;
      startFromPhase?: WorkflowPhase;
      skipAgents?: string[];
    } = body;

    if (!config) {
      return new Response(JSON.stringify({ error: "Config is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create SSE stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Generate session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Send initial connection message
    writer.write(encoder.encode(`data: ${JSON.stringify({ type: "connected", data: { sessionId } })}\n\n`));

    // Create executor with SSE callbacks
    const sseCallbacks = createSSECallbacks(writer);
    const executor = createWorkflowExecutor(config, {
      mode,
      sessionId,
      startFromPhase,
      skipAgents,
      callbacks: {
        ...sseCallbacks,
        onComplete: (result) => {
          sseCallbacks.onComplete?.(result);
          executorStore.delete(sessionId).catch(console.error);
        },
        onCancel: () => {
          sseCallbacks.onCancel?.();
          executorStore.delete(sessionId).catch(console.error);
        },
      },
    });

    // Store executor for control (using abstracted store)
    await executorStore.set(sessionId, executor);

    // Start execution in background
    executor.execute().catch((error) => {
      console.error("Workflow execution error:", error);
      const errorMessage = `data: ${JSON.stringify({
        type: "error",
        data: { message: error.message },
      })}\n\n`;
      writer.write(encoder.encode(errorMessage)).catch(console.error);
      writer.close().catch(console.error);
      executorStore.delete(sessionId).catch(console.error);
    });

    // Return SSE response
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Session-Id": sessionId,
      },
    });
  } catch (error) {
    console.error("Workflow execute error:", error);
    const message = error instanceof Error ? error.message : "Execution failed";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Get executor for external control
export async function getExecutor(sessionId: string): Promise<WorkflowExecutor | undefined> {
  return executorStore.get(sessionId);
}

// Clean up stale executors
export async function cleanupExecutors(): Promise<void> {
  // This could be called periodically to clean up abandoned sessions
  // For now, executors are removed on completion/cancel
  // Future: implement timeout-based cleanup
}

// Get all active session IDs
export async function getActiveSessionIds(): Promise<string[]> {
  return executorStore.list();
}
