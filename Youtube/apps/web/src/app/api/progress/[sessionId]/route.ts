import { NextRequest, NextResponse } from "next/server";
import { access, readFile } from "fs/promises";
import * as path from "path";
import { BACKEND_URL } from "@/lib/constants";

// Backend URL is imported from constants (used for future backend calls)
void BACKEND_URL;

const SESSIONS_BASE = path.join(process.cwd(), "..", "..", "data", "sessions");

// Async file existence check
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

interface PhaseProgress {
  name: string;
  status: "pending" | "running" | "completed" | "error";
  progress: number;
  message?: string;
  startTime?: number;
  endTime?: number;
  cost?: number;
  details?: Record<string, unknown>;
}

interface GenerationProgress {
  sessionId: string;
  status: "idle" | "running" | "completed" | "error";
  totalProgress: number;
  currentPhase: string;
  currentStep: string;
  estimatedCost: number;
  actualCost: number;
  phases: {
    research: PhaseProgress & {
      trends?: Array<{ title: string; score: number }>;
      selectedTopic?: string;
      scriptSections?: Array<{ title: string; duration: number }>;
      scriptPreview?: string;
    };
    production: PhaseProgress & {
      voiceStatus?: string;
      voiceDuration?: number;
      imagesGenerated?: number;
      totalImages?: number;
      thumbnailsGenerated?: number;
    };
    quality: PhaseProgress & {
      scores?: Record<string, number>;
      verdict?: string;
      iterations?: number;
    };
  };
  logs: Array<{
    timestamp: string;
    level: "info" | "warn" | "error";
    message: string;
    phase?: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Try to read progress from session directory
    const sessionDir = path.join(SESSIONS_BASE, sessionId);
    const progressFile = path.join(sessionDir, "progress.json");
    const manifestFile = path.join(sessionDir, "manifest.json");

    let progress: GenerationProgress = {
      sessionId,
      status: "idle",
      totalProgress: 0,
      currentPhase: "",
      currentStep: "준비 중...",
      estimatedCost: 0,
      actualCost: 0,
      phases: {
        research: { name: "research", status: "pending", progress: 0 },
        production: { name: "production", status: "pending", progress: 0 },
        quality: { name: "quality", status: "pending", progress: 0 },
      },
      logs: [],
    };

    // Read progress file if exists
    if (await pathExists(progressFile)) {
      try {
        const progressContent = await readFile(progressFile, "utf-8");
        const progressData = JSON.parse(progressContent);
        progress = { ...progress, ...progressData };
      } catch {
        // Ignore parse errors
      }
    }

    // Also read manifest for additional data
    if (await pathExists(manifestFile)) {
      try {
        const manifestContent = await readFile(manifestFile, "utf-8");
        const manifest = JSON.parse(manifestContent);

        // Extract script sections from manifest
        if (manifest.script?.sections) {
          progress.phases.research.scriptSections = manifest.script.sections.map(
            (s: { title: string; duration: number }) => ({
              title: s.title,
              duration: s.duration,
            })
          );
          progress.phases.research.scriptPreview = manifest.script.fullText?.substring(0, 500);
        }

        // Extract trend data
        if (manifest.trends) {
          progress.phases.research.trends = manifest.trends.slice(0, 10).map(
            (t: { title: string; score: number }) => ({
              title: t.title,
              score: t.score || 0,
            })
          );
        }

        // Extract topic
        if (manifest.topic?.title) {
          progress.phases.research.selectedTopic = manifest.topic.title;
        }

        // Session status
        if (manifest.session?.status === "completed") {
          progress.status = "completed";
          progress.totalProgress = 100;
        }

        // Costs
        if (manifest.session?.costs) {
          progress.actualCost = manifest.session.costs.total || 0;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Calculate total progress
    const phaseWeights = { research: 0.2, production: 0.6, quality: 0.2 };
    progress.totalProgress = Math.round(
      progress.phases.research.progress * phaseWeights.research +
      progress.phases.production.progress * phaseWeights.production +
      progress.phases.quality.progress * phaseWeights.quality
    );

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
