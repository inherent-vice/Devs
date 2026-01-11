import { NextResponse } from "next/server";

/**
 * Health Check API
 *
 * Comprehensive health check endpoint for monitoring and orchestration.
 * Checks system components: API keys, optional services (Redis), and system status.
 */

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    api: ComponentHealth;
    googleAI: ComponentHealth;
    redis?: ComponentHealth;
    queue?: ComponentHealth;
  };
  details?: {
    nodeVersion: string;
    platform: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

interface ComponentHealth {
  status: "pass" | "warn" | "fail";
  message?: string;
  latency?: number;
}

// Track server start time for uptime calculation
const serverStartTime = Date.now();

export async function GET(request: Request) {
  const startTime = Date.now();
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "true";

  try {
    const checks: HealthCheckResponse["checks"] = {
      api: { status: "pass", message: "API is running" },
      googleAI: await checkGoogleAI(),
    };

    // Check Redis if configured
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      checks.redis = await checkRedis(redisUrl);
    }

    // Determine overall status
    const statuses = Object.values(checks).map((c) => c.status);
    let overallStatus: HealthCheckResponse["status"] = "healthy";

    if (statuses.includes("fail")) {
      // Critical component failed
      const criticalFails = ["api", "googleAI"];
      const hasCriticalFail = criticalFails.some(
        (key) => checks[key as keyof typeof checks]?.status === "fail"
      );
      overallStatus = hasCriticalFail ? "unhealthy" : "degraded";
    } else if (statuses.includes("warn")) {
      overallStatus = "degraded";
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      checks,
    };

    // Add verbose details if requested
    if (verbose) {
      const memUsage = process.memoryUsage();
      response.details = {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        },
      };
    }

    // Add response latency
    const latency = Date.now() - startTime;

    return NextResponse.json(response, {
      status: overallStatus === "unhealthy" ? 503 : 200,
      headers: {
        "X-Response-Time": `${latency}ms`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        uptime: Math.floor((Date.now() - serverStartTime) / 1000),
        checks: {
          api: {
            status: "fail",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          googleAI: { status: "fail", message: "Could not check" },
        },
      } satisfies HealthCheckResponse,
      { status: 503 }
    );
  }
}

/**
 * Check Google AI API key availability
 */
async function checkGoogleAI(): Promise<ComponentHealth> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey?.trim()) {
    return {
      status: "fail",
      message: "GOOGLE_AI_API_KEY not configured",
    };
  }

  // Basic format validation (API keys typically start with "AI")
  if (apiKey.length < 20) {
    return {
      status: "warn",
      message: "API key format may be invalid",
    };
  }

  return {
    status: "pass",
    message: "API key configured",
  };
}

/**
 * Check Redis connectivity with timeout
 */
async function checkRedis(redisUrl: string): Promise<ComponentHealth> {
  const TIMEOUT_MS = 2000;
  const startTime = Date.now();

  // Wrap in timeout to prevent hanging
  const timeoutPromise = new Promise<ComponentHealth>((resolve) => {
    setTimeout(() => {
      resolve({
        status: "warn",
        message: "Redis check timed out",
        latency: TIMEOUT_MS,
      });
    }, TIMEOUT_MS);
  });

  const checkPromise = (async (): Promise<ComponentHealth> => {
    try {
      // Dynamic import to handle cases where ioredis is not installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Redis = require("ioredis");
      const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      try {
        await client.connect();
        await client.ping();
        const latency = Date.now() - startTime;

        await client.quit();

        return {
          status: "pass",
          message: "Redis connected",
          latency,
        };
      } catch (connectError) {
        await client.quit().catch(() => {});

        return {
          status: "warn",
          message: `Redis connection failed: ${connectError instanceof Error ? connectError.message : "Unknown error"}`,
          latency: Date.now() - startTime,
        };
      }
    } catch {
      // ioredis not installed
      return {
        status: "warn",
        message: "Redis client (ioredis) not installed",
      };
    }
  })();

  return Promise.race([checkPromise, timeoutPromise]);
}

/**
 * HEAD request for simple liveness check
 */
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "X-Health-Status": "ok",
    },
  });
}
