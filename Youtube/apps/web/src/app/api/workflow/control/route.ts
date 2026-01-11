/**
 * Workflow Control API
 *
 * POST /api/workflow/control
 * Control workflow execution (pause, resume, cancel, modify)
 *
 * Request body:
 * {
 *   sessionId: string,
 *   action: "pause" | "resume" | "cancel" | "modify" | "rerun",
 *   agentId?: string,       // Required for modify/rerun
 *   modifiedOutput?: any,   // For modify action
 *   modifiedInput?: any     // For rerun action
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getExecutor } from "../execute/route";

type ControlAction = "pause" | "resume" | "cancel" | "modify" | "rerun" | "skip" | "status";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      action,
      agentId,
      modifiedOutput,
      modifiedInput,
    }: {
      sessionId: string;
      action: ControlAction;
      agentId?: string;
      modifiedOutput?: unknown;
      modifiedInput?: unknown;
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // getExecutor is now async (uses abstracted store)
    const executor = await getExecutor(sessionId);
    if (!executor && action !== "status") {
      return NextResponse.json(
        { error: "Session not found or no longer active" },
        { status: 404 }
      );
    }

    switch (action) {
      case "pause":
        await executor!.pause();
        return NextResponse.json({
          success: true,
          message: "Workflow paused",
          progress: executor!.getProgress(),
        });

      case "resume":
        await executor!.resume();
        return NextResponse.json({
          success: true,
          message: "Workflow resumed",
          progress: executor!.getProgress(),
        });

      case "cancel":
        await executor!.cancel();
        return NextResponse.json({
          success: true,
          message: "Workflow cancelled",
        });

      case "modify":
        if (!agentId) {
          return NextResponse.json(
            { error: "Agent ID is required for modify action" },
            { status: 400 }
          );
        }
        if (modifiedOutput === undefined) {
          return NextResponse.json(
            { error: "Modified output is required for modify action" },
            { status: 400 }
          );
        }
        executor!.modifyAgentOutput(agentId, modifiedOutput);
        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} output modified`,
          progress: executor!.getProgress(),
        });

      case "rerun":
        if (!agentId) {
          return NextResponse.json(
            { error: "Agent ID is required for rerun action" },
            { status: 400 }
          );
        }
        const result = await executor!.rerunAgent(agentId, modifiedInput);
        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} re-executed`,
          result,
          progress: executor!.getProgress(),
        });

      case "skip":
        if (!agentId) {
          return NextResponse.json(
            { error: "Agent ID is required for skip action" },
            { status: 400 }
          );
        }
        executor!.skipAgent(agentId);
        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} skipped`,
          progress: executor!.getProgress(),
        });

      case "status":
        if (!executor) {
          return NextResponse.json({
            success: true,
            active: false,
            message: "Session not found or completed",
          });
        }
        return NextResponse.json({
          success: true,
          active: true,
          progress: executor.getProgress(),
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Workflow control error:", error);
    const message = error instanceof Error ? error.message : "Control action failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET endpoint for status check
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  // getExecutor is now async
  const executor = await getExecutor(sessionId);
  if (!executor) {
    return NextResponse.json({
      success: true,
      active: false,
      message: "Session not found or completed",
    });
  }

  return NextResponse.json({
    success: true,
    active: true,
    progress: executor.getProgress(),
  });
}
