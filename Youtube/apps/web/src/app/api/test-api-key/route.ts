import { NextRequest, NextResponse } from "next/server";

/**
 * API Key Test Endpoint
 *
 * Tests if the provided API key is valid by making a minimal API call.
 */

export interface TestApiKeyRequest {
  type: "googleAI" | "youtube";
  apiKey: string;
}

export interface TestApiKeyResponse {
  success: boolean;
  message: string;
  details?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestApiKeyRequest = await request.json();

    if (!body.apiKey?.trim()) {
      return NextResponse.json(
        { success: false, message: "API 키가 제공되지 않았습니다" },
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
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function testGoogleAI(apiKey: string): Promise<NextResponse> {
  try {
    // Test with a minimal generateContent call to Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hi" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      }
    );

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "Google AI API 키가 유효합니다",
      });
    }

    const error = await response.json();
    const errorMessage = error?.error?.message || "알 수 없는 오류";

    if (response.status === 400 && errorMessage.includes("API key not valid")) {
      return NextResponse.json({
        success: false,
        message: "유효하지 않은 API 키입니다",
        details: errorMessage,
      });
    }

    if (response.status === 403) {
      return NextResponse.json({
        success: false,
        message: "API 키에 권한이 없습니다. AI Studio에서 확인하세요.",
        details: errorMessage,
      });
    }

    return NextResponse.json({
      success: false,
      message: `API 오류: ${response.status}`,
      details: errorMessage,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "API 연결 실패",
      details: error instanceof Error ? error.message : "Network error",
    });
  }
}

async function testYouTube(apiKey: string): Promise<NextResponse> {
  try {
    // Test with a minimal YouTube Data API call
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${apiKey}`
    );

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "YouTube API 키가 유효합니다",
      });
    }

    const error = await response.json();
    const errorMessage = error?.error?.message || "알 수 없는 오류";

    if (response.status === 400 || response.status === 403) {
      return NextResponse.json({
        success: false,
        message: "유효하지 않은 API 키입니다",
        details: errorMessage,
      });
    }

    return NextResponse.json({
      success: false,
      message: `API 오류: ${response.status}`,
      details: errorMessage,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "API 연결 실패",
      details: error instanceof Error ? error.message : "Network error",
    });
  }
}
