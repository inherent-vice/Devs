import { NextResponse } from "next/server";

// Voice information matching Gemini TTS presets
export const VOICE_LIBRARY = [
  {
    id: "Kore",
    name: "Kore",
    nameKo: "코레",
    description: "Warm and professional, perfect for narration",
    descriptionKo: "따뜻하고 전문적인 음성, 내레이션에 적합",
    gender: "female" as const,
    age: "adult" as const,
    style: "narration" as const,
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "안녕하세요, AI 스튜디오입니다. 오늘도 좋은 하루 되세요.",
  },
  {
    id: "Puck",
    name: "Puck",
    nameKo: "퍽",
    description: "Bright and upbeat, great for energetic content",
    descriptionKo: "밝고 활기찬 음성, 에너지 넘치는 콘텐츠에 적합",
    gender: "male" as const,
    age: "young" as const,
    style: "energetic" as const,
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "안녕하세요! 오늘은 정말 신나는 소식을 전해드릴게요!",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    nameKo: "제퍼",
    description: "Calm and soothing, ideal for relaxing content",
    descriptionKo: "차분하고 편안한 음성, 휴식 콘텐츠에 적합",
    gender: "female" as const,
    age: "adult" as const,
    style: "calm" as const,
    language: "en-US",
    provider: "gemini_tts",
    sampleText: "Welcome to our channel. Let's explore together.",
  },
  {
    id: "Enceladus",
    name: "Enceladus",
    nameKo: "엔셀라두스",
    description: "Deep and authoritative, perfect for news/documentary",
    descriptionKo: "깊고 권위 있는 음성, 뉴스/다큐멘터리에 적합",
    gender: "male" as const,
    age: "mature" as const,
    style: "news" as const,
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "오늘의 주요 뉴스를 전해드리겠습니다.",
  },
  {
    id: "Charon",
    name: "Charon",
    nameKo: "카론",
    description: "Clear and articulate, great for tutorials",
    descriptionKo: "명확하고 또렷한 음성, 튜토리얼에 적합",
    gender: "male" as const,
    age: "adult" as const,
    style: "tutorial" as const,
    language: "en-US",
    provider: "gemini_tts",
    sampleText: "Let me show you how this works step by step.",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    nameKo: "펜리르",
    description: "Dynamic and engaging, perfect for entertainment",
    descriptionKo: "역동적이고 매력적인 음성, 엔터테인먼트에 적합",
    gender: "male" as const,
    age: "young" as const,
    style: "entertainment" as const,
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "자, 그럼 지금부터 시작해볼까요? 재미있을 거예요!",
  },
  {
    id: "Aoede",
    name: "Aoede",
    nameKo: "아오이데",
    description: "Melodic and expressive, ideal for storytelling",
    descriptionKo: "멜로디컬하고 표현력 있는 음성, 스토리텔링에 적합",
    gender: "female" as const,
    age: "young" as const,
    style: "storytelling" as const,
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "옛날 옛적에, 아주 먼 곳에서 이야기가 시작됩니다.",
  },
  {
    id: "Leda",
    name: "Leda",
    nameKo: "레다",
    description: "Friendly and approachable, great for conversational content",
    descriptionKo: "친근하고 편안한 음성, 대화형 콘텐츠에 적합",
    gender: "female" as const,
    age: "adult" as const,
    style: "conversational" as const,
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "안녕하세요! 오늘 어떻게 지내세요? 좋은 하루 보내고 계신가요?",
  },
];

export type VoiceInfo = (typeof VOICE_LIBRARY)[number];

export async function GET() {
  try {
    // In production, we would generate or load pre-generated samples
    // For now, return voice info without actual audio samples
    const voices = VOICE_LIBRARY.map((voice) => ({
      ...voice,
      // Sample URL would be provided by the TTS service or pre-generated files
      sampleUrl: null,
    }));

    return NextResponse.json({
      voices,
      providers: [
        { id: "gemini_tts", name: "Gemini TTS", available: true },
        { id: "elevenlabs", name: "ElevenLabs", available: false },
        { id: "google_cloud", name: "Google Cloud TTS", available: true },
      ],
    });
  } catch (error) {
    console.error("Error fetching voices:", error);
    return NextResponse.json(
      { error: "Failed to fetch voices" },
      { status: 500 }
    );
  }
}
