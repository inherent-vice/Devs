import { NextRequest, NextResponse } from "next/server";
import { configToFlowInput, runMasterFlow, getCostEstimate } from "@/lib/backend";
import type { GenerationConfig } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const config: GenerationConfig = await request.json();

    // Convert frontend config to backend input
    const flowInput = configToFlowInput(config);

    // Get cost estimate first
    const estimate = await getCostEstimate(
      config.videoFormat,
      config.models.text === "gemini-3-flash"
    );

    // Start the generation (this will be a long-running operation)
    // In production, this should be handled with a job queue
    const result = await runMasterFlow(flowInput);

    return NextResponse.json({
      success: true,
      projectId: result.sessionId,
      status: result.status,
      cost: {
        estimated: estimate.estimated,
        actual: result.metadata.totalCost,
      },
      duration: result.metadata.totalDuration,
      readyToPublish: result.readyToPublish,
      content: result.finalContent,
    });
  } catch (error) {
    console.error("Generation error:", error);

    const message = error instanceof Error ? error.message : "Generation failed";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const { checkHealth } = await import("@/lib/backend");
    const health = await checkHealth();

    return NextResponse.json({
      success: true,
      backend: health,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      backend: {
        status: "offline",
        version: "unknown",
        services: {},
      },
    });
  }
}
