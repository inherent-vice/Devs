/**
 * Workflow Agent Execution API
 *
 * POST /api/workflow/agent
 * Execute a single agent and return its output
 *
 * Request body:
 * {
 *   sessionId: string,
 *   agentId: string,
 *   phase: WorkflowPhase,
 *   input: any,
 *   config: AgentConfig
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import type { WorkflowPhase } from "@/lib/workflow/types";
import { config as appConfig } from "@/lib/config";

interface AgentRequest {
  sessionId: string;
  agentId: string;
  phase: WorkflowPhase;
  input: unknown;
  config: unknown;
}

// Environment-based mock control
const ALLOW_MOCK_FALLBACK = appConfig.allowMockFallback;

// Execute agent via backend or fallback to mock (if allowed)
async function executeAgent(
  agentId: string,
  phase: WorkflowPhase,
  input: unknown,
  config: unknown
): Promise<{ output: unknown; cost: number; duration: number }> {
  // Use centralized config for backend URL
  const backendUrl = appConfig.backendUrl;

  try {
    const response = await fetch(`${backendUrl}/api/agent/${agentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, input, config }),
    });

    if (!response.ok) {
      // Only use mock if explicitly allowed (development only)
      if (ALLOW_MOCK_FALLBACK) {
        console.warn(`[DEV] Backend agent ${agentId} not available (${response.status}), using mock data`);
        return mockAgentExecution(agentId, input, config);
      }
      // In production, throw error
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Backend agent ${agentId} failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return {
      output: result.output,
      cost: result.cost || 0,
      duration: result.duration || 0,
    };
  } catch (error) {
    // Only fallback to mock if explicitly allowed
    if (ALLOW_MOCK_FALLBACK) {
      console.warn(`[DEV] Backend connection failed for agent ${agentId}, using mock data`);
      return mockAgentExecution(agentId, input, config);
    }
    // In production, propagate the error
    throw error;
  }
}

// Mock agent execution for development/testing
function mockAgentExecution(
  agentId: string,
  input: unknown,
  _config: unknown
): { output: unknown; cost: number; duration: number } {
  const startTime = Date.now();

  // Simulate processing time
  const processingTime = Math.random() * 2000 + 500;

  // Mock outputs based on agent type
  const mockOutputs: Record<string, unknown> = {
    trend: {
      trends: [
        { title: "AI 기술 트렌드 2026", score: 0.95, source: "google_trends", keywords: ["AI", "기술", "미래"] },
        { title: "경제 전망 분석", score: 0.88, source: "youtube", keywords: ["경제", "투자", "금융"] },
        { title: "헬스케어 혁신", score: 0.82, source: "youtube", keywords: ["건강", "의료", "바이오"] },
      ],
      analysis: "AI 관련 주제가 높은 관심을 받고 있으며, 경제 관련 콘텐츠도 꾸준한 수요가 있습니다.",
      recommendedTopics: ["AI 활용법", "투자 전략", "건강 관리"],
    },

    topic: {
      selectedTopic: "AI가 바꾸는 2026년 일상생활",
      title: "AI가 바꾸는 2026년 일상생활 - 놀라운 변화 5가지",
      angle: "일반인 시점에서 AI가 어떻게 일상을 변화시키는지 실용적으로 설명",
      targetAudience: "20-40대 직장인",
      estimatedInterest: 0.87,
      keywords: ["AI", "2026년", "일상", "기술", "변화"],
      reasoning: "AI 트렌드가 높고 실용적인 관점의 콘텐츠가 부족하여 차별화 가능",
    },

    script: {
      script: "안녕하세요! 오늘은 AI가 2026년 우리 일상을 어떻게 바꾸고 있는지 알아보겠습니다...",
      sections: [
        { type: "hook", content: "여러분, 지금 손에 들고 있는 스마트폰이 사실은 AI 비서라는 거 아셨나요?", duration: 8 },
        { type: "intro", content: "안녕하세요! 오늘은 AI가 2026년 우리 일상을 어떻게 바꾸고 있는지 알아보겠습니다.", duration: 12 },
        { type: "main", content: "첫 번째 변화는 개인화된 건강 관리입니다...", duration: 120 },
        { type: "outro", content: "이렇게 AI는 우리 삶을 더 편리하게 만들고 있습니다. 다음에 또 만나요!", duration: 15 },
      ],
      wordCount: 450,
      estimatedDuration: 180,
      hooks: ["AI 비서", "미래 일상", "놀라운 변화"],
      keywords: ["AI", "일상", "2026", "변화", "기술"],
    },

    voice: {
      audioUrl: "/mock/audio/narration.wav",
      duration: 180,
      format: "wav",
      sampleRate: 24000,
      segments: [
        { text: "안녕하세요!", startTime: 0, endTime: 2 },
        { text: "오늘은 AI가 2026년 우리 일상을 어떻게 바꾸고 있는지 알아보겠습니다.", startTime: 2, endTime: 8 },
      ],
    },

    video: {
      videoUrl: "/mock/video/output.mp4",
      duration: 180,
      resolution: "1080x1920",
      fps: 30,
      scenes: [
        { url: "/mock/images/scene1.png", startTime: 0, endTime: 20, description: "AI 개념 소개 장면" },
        { url: "/mock/images/scene2.png", startTime: 20, endTime: 60, description: "일상 변화 설명" },
        { url: "/mock/images/scene3.png", startTime: 60, endTime: 120, description: "구체적 사례" },
        { url: "/mock/images/scene4.png", startTime: 120, endTime: 180, description: "마무리" },
      ],
      hasAudio: false,
    },

    thumbnail: {
      thumbnails: [
        { url: "/mock/thumbnails/thumb1.png", variant: "bold", predictedCTR: 0.08 },
        { url: "/mock/thumbnails/thumb2.png", variant: "minimal", predictedCTR: 0.06 },
        { url: "/mock/thumbnails/thumb3.png", variant: "text-heavy", predictedCTR: 0.07 },
      ],
      selectedIndex: 0,
    },

    editor: {
      videoUrl: "/mock/video/final.mp4",
      duration: 180,
      edits: [
        { type: "cut", timestamp: 0, description: "Opening" },
        { type: "transition", timestamp: 20, description: "Fade to scene 2" },
        { type: "text_overlay", timestamp: 30, description: "Key point highlight" },
      ],
      subtitlesUrl: "/mock/subtitles.srt",
    },

    critic: {
      overallScore: 0.86,
      passed: true,
      dimensions: {
        technical: { score: 0.88, feedback: "오디오 품질과 영상 해상도가 우수합니다." },
        narrative: { score: 0.85, feedback: "스토리 흐름이 자연스럽고 메시지가 명확합니다." },
        engagement: { score: 0.87, feedback: "훅이 효과적이며 시청 유지율이 높을 것으로 예상됩니다." },
        originality: { score: 0.82, feedback: "주제는 일반적이나 접근 방식이 신선합니다." },
        ethical: { score: 0.92, feedback: "정확한 정보와 균형 잡힌 시각을 제공합니다." },
      },
      criticalIssues: [],
      improvements: [
        { priority: "medium", area: "engagement", suggestion: "중간에 질문을 추가하여 시청자 참여 유도" },
        { priority: "low", area: "visual", suggestion: "그래픽 요소를 더 추가하면 좋겠습니다" },
      ],
      verdict: "전반적으로 우수한 콘텐츠입니다. 게시 승인됩니다.",
    },

    artEvaluator: {
      visualScore: 0.84,
      thumbnailScore: 0.87,
      audioScore: 0.89,
      overallArtisticScore: 0.86,
      suggestions: ["색상 대비를 약간 높이면 시각적 임팩트가 강해집니다"],
      thumbnailVariantRanking: [0, 2, 1],
    },

    revision: {
      revised: false,
      changes: [],
      iterationNumber: 1,
      newScore: 0.86,
    },

    publisher: {
      metadata: {
        title: "AI가 바꾸는 2026년 일상생활 - 놀라운 변화 5가지",
        description: "AI 기술이 우리의 일상을 어떻게 변화시키고 있는지 알아봅니다...",
        tags: ["AI", "인공지능", "2026", "미래기술", "일상생활", "테크"],
        hashtags: ["#AI기술", "#미래일상", "#2026트렌드"],
      },
      status: "prepared",
    },
  };

  return {
    output: mockOutputs[agentId] || { message: `Mock output for ${agentId}` },
    cost: Math.random() * 0.5,
    duration: Date.now() - startTime + processingTime,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentRequest = await request.json();
    const { sessionId, agentId, phase, input, config } = body;

    if (!sessionId || !agentId || !phase) {
      return NextResponse.json(
        { error: "Session ID, agent ID, and phase are required" },
        { status: 400 }
      );
    }

    console.log(`[${sessionId}] Executing agent: ${agentId} (phase: ${phase})`);

    // Execute the agent
    const result = await executeAgent(agentId, phase, input, config);

    console.log(`[${sessionId}] Agent ${agentId} completed in ${result.duration}ms`);

    return NextResponse.json({
      success: true,
      agentId,
      phase,
      output: result.output,
      cost: result.cost,
      duration: result.duration,
    });
  } catch (error) {
    console.error("Agent execution error:", error);
    const message = error instanceof Error ? error.message : "Agent execution failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
