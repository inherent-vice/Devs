import { NextRequest, NextResponse } from "next/server";
import { access, readdir, stat, readFile } from "fs/promises";
import path from "path";
import {
  listSessions as listWorkflowSessions,
  createSession as createWorkflowSession,
  cleanupOldSessions,
} from "@/lib/workflow/session-storage";
import type { WorkflowConfig } from "@/lib/workflow/types";
import { CACHE } from "@/lib/constants";
import { apiLogger } from "@/lib/logger";

const OUTPUT_DIR = path.join(process.cwd(), "..", "..", "output", "sessions");
const WORKFLOW_SESSIONS_DIR = path.join(process.cwd(), "data", "sessions");

// ===========================================
// Async File Helpers
// ===========================================

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// ===========================================
// Simple In-Memory Cache
// ===========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE.SESSIONS_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(keyPrefix?: string): void {
  if (keyPrefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

interface SessionManifest {
  session: {
    id: string;
    createdAt: string;
    topic?: string;
    videoType?: string;
    status: string;
  };
  assets: Array<{
    type: string;
    filename: string;
    path: string;
    size: number;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
  totalSize: number;
  lastUpdated: string;
}

interface SessionResult {
  title: string;
  description: string;
  costs: Array<{ phase: string; cost: number; detail: string }>;
  totalCost: number;
  totalDuration: number;
  videoPath?: string;
  videoDuration?: number;
  videoSize?: number;
  sceneCount?: number;
  subtitleCount?: number;
}

// GET - Load all existing sessions (both legacy and workflow sessions)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source"); // "legacy", "workflow", or null for all
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Check cache first
    const cacheKey = `sessions:${source || "all"}:${status || "all"}:${limit}`;
    const cached = getCached<{ sessions: unknown[]; count: number; total: number }>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        ...cached,
        fromCache: true,
      });
    }

    const allSessions: Array<{
      id: string;
      title: string;
      description: string;
      status: string;
      videoType: string;
      createdAt: string;
      updatedAt: string;
      source: "legacy" | "workflow";
      config?: unknown;
      result?: unknown;
      phases?: unknown;
    }> = [];

    // Load legacy sessions
    if (!source || source === "legacy") {
      if (await pathExists(OUTPUT_DIR)) {
        const allDirs = await readdir(OUTPUT_DIR);
        const sessionDirs: string[] = [];

        // Filter directories asynchronously
        for (const dir of allDirs) {
          const fullPath = path.join(OUTPUT_DIR, dir);
          if (dir.startsWith("session-") && (await isDirectory(fullPath))) {
            sessionDirs.push(dir);
          }
        }

        for (const sessionDir of sessionDirs) {
          const sessionPath = path.join(OUTPUT_DIR, sessionDir);
          const manifestPath = path.join(sessionPath, "manifest.json");
          const resultPath = path.join(sessionPath, "result.json");

          if (!(await pathExists(manifestPath))) continue;

          try {
            const manifestContent = await readFile(manifestPath, "utf-8");
            const manifest: SessionManifest = JSON.parse(manifestContent);

            let result: SessionResult | null = null;
            if (await pathExists(resultPath)) {
              const resultContent = await readFile(resultPath, "utf-8");
              result = JSON.parse(resultContent);
            }

            // Find video and thumbnail files
            const videoDir = path.join(sessionPath, "video");
            const thumbnailDir = path.join(sessionPath, "thumbnails");

            let videoFile: string | undefined;
            let thumbnails: string[] = [];

            if (await pathExists(videoDir)) {
              const videoFiles = await readdir(videoDir);
              const videos = videoFiles.filter((f) => f.endsWith(".mp4"));
              if (videos.length > 0) {
                videoFile = `/api/sessions/${sessionDir}/video/${videos[0]}`;
              }
            }

            if (await pathExists(thumbnailDir)) {
              const thumbnailFiles = await readdir(thumbnailDir);
              thumbnails = thumbnailFiles
                .filter((f) => f.endsWith(".png") || f.endsWith(".jpg"))
                .map((f) => `/api/sessions/${sessionDir}/thumbnails/${f}`);
            }

            allSessions.push({
              id: manifest.session.id,
              title: result?.title || manifest.session.topic || sessionDir,
              description: result?.description || manifest.session.topic || "",
              status: manifest.session.status === "completed" ? "completed" : "draft",
              videoType: manifest.session.videoType || "medium",
              createdAt: manifest.session.createdAt,
              updatedAt: manifest.lastUpdated,
              source: "legacy",
              config: {
                topic: manifest.session.topic || "",
                style: "cinematic",
                voice: "Kore",
                models: {
                  text: "gemini-3-flash",
                  image: "gemini-3-pro-image",
                  tts: "gemini-2.5-flash-tts",
                },
              },
              result: {
                videoUrl: videoFile,
                thumbnails,
                duration: result?.videoDuration,
                cost: result?.totalCost,
                qualityScore: undefined,
              },
            });
          } catch (err) {
            apiLogger.error(`Error reading session ${sessionDir}`, err instanceof Error ? err : undefined);
          }
        }
      }
    }

    // Load workflow sessions
    if (!source || source === "workflow") {
      try {
        const workflowSessions = await listWorkflowSessions();

        for (const session of workflowSessions) {
          allSessions.push({
            id: session.sessionId,
            title: session.name,
            description: `${session.videoType} 영상 - ${session.completedAgents.length}개 에이전트 완료`,
            status: session.status,
            videoType: session.videoType,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            source: "workflow",
            phases: {
              currentPhase: session.currentPhase,
              currentAgent: session.currentAgent,
              completedAgents: session.completedAgents,
            },
          });
        }
      } catch (err) {
        apiLogger.error("Error loading workflow sessions", err instanceof Error ? err : undefined);
      }
    }

    // Filter by status if provided
    let filteredSessions = allSessions;
    if (status) {
      filteredSessions = allSessions.filter((s) => s.status === status);
    }

    // Sort by creation date (newest first)
    filteredSessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Limit results
    filteredSessions = filteredSessions.slice(0, limit);

    // Cache the result
    const result = {
      sessions: filteredSessions,
      count: filteredSessions.length,
      total: allSessions.length,
    };
    setCache(cacheKey, result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    apiLogger.error("Error loading sessions", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sessions",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new workflow session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, name, sessionId } = body as {
      config: WorkflowConfig;
      name?: string;
      sessionId?: string;
    };

    if (!config) {
      return NextResponse.json(
        { success: false, error: "Workflow config is required" },
        { status: 400 }
      );
    }

    const storage = await createWorkflowSession(config, name, sessionId);
    const metadata = await storage.getMetadata();

    // Invalidate sessions cache
    invalidateCache("sessions:");

    return NextResponse.json({
      success: true,
      sessionId: metadata?.sessionId,
      metadata,
      basePath: storage.getBasePath(),
    });
  } catch (error) {
    apiLogger.error("Failed to create session", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// DELETE - Cleanup old sessions
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const maxAgeDays = parseInt(searchParams.get("maxAgeDays") || "30", 10);

    const deletedCount = await cleanupOldSessions(maxAgeDays);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old sessions`,
    });
  } catch (error) {
    apiLogger.error("Failed to cleanup sessions", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { success: false, error: "Failed to cleanup sessions" },
      { status: 500 }
    );
  }
}
