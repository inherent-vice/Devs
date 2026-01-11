import { NextRequest, NextResponse } from "next/server";

/**
 * API Key Test Endpoint
 *
 * Tests if the provided API key is valid by making a minimal API call.
 * SECURITY: API keys are passed via headers, not URL query strings.
 */

// Rate limiting: Track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5; // Max 5 requests
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // Per hour

export interface TestApiKeyRequest {
  type: "googleAI" | "youtube";
  apiKey: string;
}

export interface TestApiKeyResponse {
  success: boolean;
  message: string;
  details?: string;
}

/**
 * Check rate limit for IP
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
               request.headers.get("x-real-ip") ||
               "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          message: "요청 한도를 초과했습니다. 1시간 후 다시 시도하세요.",
        },
        { status: 429 }
      );
    }

    const body: TestApiKeyRequest = await request.json();

    if (!body.apiKey?.trim()) {
      return NextResponse.json(
        { success: false, message: "API 키가 제공되지 않았습니다" },
        { status: 400 }
      );
    }

    // Basic API key format validation
    if (body.apiKey.length < 20 || body.apiKey.length > 100) {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 API 키 형식입니다" },
        { status: 400 }
      );
    }

    if (body.type === "googleAI") {
      return await testGoogleAI(body.apiKey);
    } else if (body.type === "youtube") {
      return await testYouTube(body.apiKey);
    }

    return NextResponse.json(
      { success: false, message: "알 수 없는 API 유형입니다" },
      { status: 400 }
    );
  } catch (error) {
    console.error("API key test error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "API 키 테스트 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}

async function testGoogleAI(apiKey: string): Promise<NextResponse> {
  try {
    // SECURITY: Use header for API key instead of URL query string
    // This prevents key from appearing in logs, browser history, etc.
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Test" }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      }
    );

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "Google AI API 키가 유효합니다",
      });
    }

    const error = await response.json().catch(() => ({}));
    const errorMessage = error?.error?.message || "알 수 없는 오류";

    if (response.status === 400 && errorMessage.includes("API key not valid")) {
      return NextResponse.json({
        success: false,
        message: "유효하지 않은 API 키입니다",
      });
    }

    if (response.status === 403) {
      return NextResponse.json({
        success: false,
        message: "API 키에 권한이 없습니다. AI Studio에서 확인하세요.",
      });
    }

    return NextResponse.json({
      success: false,
      message: `API 오류: ${response.status}`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "API 연결 실패",
    });
  }
}

async function testYouTube(apiKey: string): Promise<NextResponse> {
  try {
    // Note: YouTube Data API v3 requires API key in URL (no header option)
    // This is a limitation of their API design
    // We minimize exposure by using POST from server-side only
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${apiKey}`,
      {
        // Add cache control to prevent logging by intermediaries
        cache: "no-store",
      }
    );

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "YouTube API 키가 유효합니다",
      });
    }

    const error = await response.json().catch(() => ({}));
    const errorMessage = error?.error?.message || "알 수 없는 오류";

    if (response.status === 400 || response.status === 403) {
      return NextResponse.json({
        success: false,
        message: "유효하지 않은 API 키입니다",
      });
    }

    return NextResponse.json({
      success: false,
      message: `API 오류: ${response.status}`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "API 연결 실패",
    });
  }
}
