import { NextRequest, NextResponse } from "next/server";
import { VOICE_LIBRARY } from "../voices/route";
import { BACKEND_URL, CACHE, TIMEOUTS } from "@/lib/constants";

// Voice preview request schema
interface VoicePreviewRequest {
  text: string;
  voiceName: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
}

// Simple in-memory cache for previews
const previewCache = new Map<string, { audioBase64: string; timestamp: number }>();

function getCacheKey(request: VoicePreviewRequest): string {
  return `${request.voiceName}-${request.text}-${request.speed}-${request.pitch}-${request.emotion}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: VoicePreviewRequest = await req.json();

    // Validate request
    if (!body.text || body.text.length === 0) {
      return NextResponse.json(
        { error: "텍스트를 입력해주세요" },
        { status: 400 }
      );
    }

    if (body.text.length > 500) {
      return NextResponse.json(
        { error: "미리듣기는 500자까지 가능합니다" },
        { status: 400 }
      );
    }

    if (!body.voiceName) {
      return NextResponse.json(
        { error: "음성을 선택해주세요" },
        { status: 400 }
      );
    }

    // Validate voice exists
    const voice = VOICE_LIBRARY.find((v) => v.id === body.voiceName);
    if (!voice) {
      return NextResponse.json(
        { error: "유효하지 않은 음성입니다" },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = getCacheKey(body);
    const cached = previewCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE.VOICE_PREVIEW_TTL_MS) {
      return NextResponse.json({
        audioBase64: cached.audioBase64,
        duration: estimateDuration(body.text, body.speed || 1),
        cached: true,
        voice: voice,
      });
    }

    // Call the backend TTS API
    const ttsResponse = await fetch(`${BACKEND_URL}/api/tts/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: body.text,
        voice: body.voiceName,
        speed: body.speed || 1.0,
        pitch: body.pitch || 0,
        emotion: body.emotion,
      }),
      signal: AbortSignal.timeout(TIMEOUTS.API_DEFAULT),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text().catch(() => "Unknown error");
      throw new Error(`TTS API failed: ${ttsResponse.status} - ${errorText}`);
    }

    const ttsData = await ttsResponse.json();

    // Cache the result
    if (ttsData.audioBase64) {
      previewCache.set(cacheKey, {
        audioBase64: ttsData.audioBase64,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json({
      audioBase64: ttsData.audioBase64,
      audioUrl: ttsData.audioUrl,
      duration: ttsData.duration || estimateDuration(body.text, body.speed || 1),
      voice: voice,
    });

  } catch (error) {
    console.error("Voice preview error:", error);
    const message = error instanceof Error ? error.message : "음성 미리듣기 생성 중 오류가 발생했습니다";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Estimate audio duration based on text length and speaking rate
function estimateDuration(text: string, speed: number): number {
  // Average speaking rate: ~150 words/min for English, ~250 chars/min for Korean
  const isKorean = /[가-힣]/.test(text);
  const charsPerSecond = isKorean ? 4.2 : 2.5; // chars per second at 1x speed
  const adjustedRate = charsPerSecond * speed;
  return Math.ceil(text.length / adjustedRate);
}

// Clear old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of previewCache.entries()) {
    if (now - value.timestamp > CACHE.VOICE_PREVIEW_TTL_MS) {
      previewCache.delete(key);
    }
  }
}, CACHE.CLEANUP_INTERVAL_MS);
