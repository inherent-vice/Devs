import { NextResponse } from "next/server";

/**
 * Environment Variables Status API
 *
 * Returns the status of required API keys without exposing actual values.
 * Only indicates whether each key is configured (exists and is non-empty).
 */

export interface EnvStatusResponse {
  success: boolean;
  status: {
    googleAI: boolean;
    googleCloud: boolean;
    googleCloudLocation: string | null;
    youtube: boolean;
  };
  message: string;
}

export async function GET() {
  try {
    const status = {
      // Google AI Studio API Key (for Gemini, Veo, Imagen)
      googleAI: Boolean(process.env.GOOGLE_AI_API_KEY?.trim()),

      // Google Cloud Project ID (for Vertex AI fallback)
      googleCloud: Boolean(process.env.GOOGLE_CLOUD_PROJECT?.trim()),

      // Google Cloud Location (show actual value, not sensitive)
      googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION || null,

      // YouTube Data API Key
      youtube: Boolean(process.env.YOUTUBE_API_KEY?.trim()),
    };

    const configuredCount = [status.googleAI, status.googleCloud, status.youtube].filter(Boolean).length;

    let message = "";
    if (configuredCount === 0) {
      message = "API 키가 설정되지 않았습니다. .env.local 파일을 확인하세요.";
    } else if (!status.googleAI) {
      message = "Google AI API 키가 필요합니다. (필수)";
    } else if (configuredCount < 3) {
      message = `${configuredCount}/3 API 키가 설정됨`;
    } else {
      message = "모든 API 키가 설정됨";
    }

    const response: EnvStatusResponse = {
      success: true,
      status,
      message,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Env status check error:", error);
    return NextResponse.json(
      {
        success: false,
        status: {
          googleAI: false,
          googleCloud: false,
          googleCloudLocation: null,
          youtube: false,
        },
        message: "환경변수 상태 확인 실패",
      },
      { status: 500 }
    );
  }
}
