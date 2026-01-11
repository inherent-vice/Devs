import { NextRequest, NextResponse } from "next/server";
import { access, stat, readdir, readFile } from "fs/promises";
import path from "path";
import { loadSession } from "@/lib/workflow/session-storage";

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

// Serve static files from session directories (both legacy and workflow)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; path: string[] }> }
) {
  try {
    const { sessionId, path: pathParts } = await params;

    // Special paths for workflow session data
    if (pathParts[0] === "_data") {
      return handleWorkflowDataRequest(sessionId, pathParts.slice(1));
    }

    // Try legacy output directory first
    let filePath = path.join(OUTPUT_DIR, sessionId, ...pathParts);
    let baseDir = OUTPUT_DIR;

    // Check if file exists in legacy directory
    if (!(await pathExists(filePath))) {
      // Try workflow sessions directory
      filePath = path.join(WORKFLOW_SESSIONS_DIR, sessionId, ...pathParts);
      baseDir = WORKFLOW_SESSIONS_DIR;

      if (!(await pathExists(filePath))) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    // Security check - prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(baseDir)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      // If it's a directory, return directory listing as JSON
      if (fileStat.isDirectory()) {
        const files = await readdir(filePath);
        const fileInfos = await Promise.all(
          files.map(async (f) => {
            const fPath = path.join(filePath, f);
            const fStat = await stat(fPath);
            return {
              name: f,
              type: fStat.isDirectory() ? "directory" : "file",
              size: fStat.size,
              modified: fStat.mtime.toISOString(),
            };
          })
        );
        return NextResponse.json({
          directory: pathParts.join("/"),
          files: fileInfos,
        });
      }
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
      ".ogg": "audio/ogg",
      ".srt": "text/plain",
      ".vtt": "text/vtt",
      ".json": "application/json",
      ".txt": "text/plain",
      ".log": "text/plain",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    // Read file and return
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}

// Handle workflow session data requests
async function handleWorkflowDataRequest(
  sessionId: string,
  pathParts: string[]
): Promise<NextResponse> {
  const storage = await loadSession(sessionId);

  if (!storage) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const dataType = pathParts[0];

  switch (dataType) {
    case "metadata": {
      const metadata = await storage.getMetadata();
      return NextResponse.json({ success: true, data: metadata });
    }

    case "config": {
      const config = await storage.getConfig();
      return NextResponse.json({ success: true, data: config });
    }

    case "summary": {
      let summary = await storage.getSummary();
      if (!summary) {
        summary = await storage.generateSummary();
      }
      return NextResponse.json({ success: true, data: summary });
    }

    case "logs": {
      const logs = await storage.getLogs();
      return NextResponse.json({ success: true, data: logs });
    }

    case "agent": {
      const phase = pathParts[1] as "research" | "production" | "quality" | "publishing";
      const agentId = pathParts[2];
      const dataKey = pathParts[3]; // input, output, execution, logs

      if (!phase || !agentId) {
        return NextResponse.json({ error: "Phase and agentId required" }, { status: 400 });
      }

      switch (dataKey) {
        case "input": {
          const input = await storage.getAgentInput(phase, agentId);
          return NextResponse.json({ success: true, data: input });
        }
        case "output": {
          const output = await storage.getAgentOutput(phase, agentId);
          return NextResponse.json({ success: true, data: output });
        }
        case "execution": {
          const execution = await storage.getAgentExecution(phase, agentId);
          return NextResponse.json({ success: true, data: execution });
        }
        case "logs": {
          const agentLogs = await storage.getAgentLogs(agentId);
          return NextResponse.json({ success: true, data: agentLogs });
        }
        case "media": {
          const subdir = pathParts[4];
          const mediaFiles = await storage.listMediaFiles(phase, agentId, subdir);
          return NextResponse.json({
            success: true,
            data: mediaFiles.map((f) => ({
              name: f,
              url: `/api/sessions/${sessionId}/${phase}/${agentId}${subdir ? `/${subdir}` : ""}/${f}`,
            })),
          });
        }
        default: {
          // Return all agent data
          const [input, output, execution] = await Promise.all([
            storage.getAgentInput(phase, agentId),
            storage.getAgentOutput(phase, agentId),
            storage.getAgentExecution(phase, agentId),
          ]);
          return NextResponse.json({
            success: true,
            data: { input, output, execution },
          });
        }
      }
    }

    case "files": {
      const allFiles = await storage.getAllFiles();
      const basePath = storage.getBasePath();
      return NextResponse.json({
        success: true,
        data: allFiles.map((f) => ({
          path: f.replace(basePath, "").replace(/\\/g, "/"),
          url: `/api/sessions/${sessionId}${f.replace(basePath, "").replace(/\\/g, "/")}`,
        })),
      });
    }

    default:
      return NextResponse.json({ error: "Unknown data type" }, { status: 400 });
  }
}
