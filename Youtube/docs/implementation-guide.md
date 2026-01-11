# YouTube 에이전틱 AI 워크플로우 시스템 - 종합 구현 가이드

> **프로젝트**: Genkit 기반 YouTube 자동 제작 시스템
> **기술 스택**: TypeScript, Genkit 1.27+, Gemini 3.0, Vertex AI
> **세션 단위**: 3-4시간 (중규모)
> **최종 업데이트**: 2026-01-10

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [에이전트 설계](#4-에이전트-설계)
5. [프로젝트 구조](#5-프로젝트-구조)
6. [핵심 코드 설계](#6-핵심-코드-설계)
7. [상태 관리 시스템](#7-상태-관리-시스템)
8. [품질 평가 시스템](#8-품질-평가-시스템)
9. [영상 제작 파이프라인](#9-영상-제작-파이프라인)
10. [비용 최적화](#10-비용-최적화)
11. [세션별 구현 계획](#11-세션별-구현-계획)
12. [환경 설정](#12-환경-설정)
13. [검증 계획](#13-검증-계획)
14. [참고 자료](#14-참고-자료)

---

## 1. 프로젝트 개요

### 1.1 목표
사람이 제작한 결과물보다 우수한 품질의 YouTube 영상을 자동 생산하는 에이전틱 AI 워크플로우 시스템

### 1.2 핵심 원칙
- **Google 생태계 중심**: Genkit, ADK, Vertex AI, Gemini
- **세션 기반 작업**: 점진적 구현 (3-4시간 단위)
- **품질 우선**: 자기 개선 루프 필수
- **비용 효율**: 최적화 전략 적용

### 1.3 지원 영상 유형
| 유형 | 길이 | 비율 | 예상 비용 (Fast) |
|------|------|------|------------------|
| Shorts | 최대 60초 | 9:16 | ~$9 |
| Medium | 최대 5분 | 16:9 | ~$45 |
| Longform | 최대 15분 | 16:9 | ~$135 |

---

## 2. 기술 스택

### 2.1 핵심 AI 모델 (2026년 1월 기준)

| 모델 | 버전 | 용도 | 가격 | 특징 |
|------|------|------|------|------|
| **Gemini 3 Flash** | 3.0 | 일반 에이전트 | $0.50/1M in, $3/1M out | 기본 모델, 1M 컨텍스트 |
| **Gemini 3 Pro** | 3.0 | 품질 평가 | 프리미엄 | 최고 성능, 심층 추론 |
| **Gemini 3 Deep Think** | 3.0 | 복잡한 추론 | 프리미엄 | ARC-AGI-2 45.1% |
| **Nano Banana Pro** | Gemini 3 Pro Image | 썸네일 생성 | 이미지당 과금 | 4K 해상도 (5632×3072) |
| **Veo 3.1** | 3.1 | 영상 생성 | $0.15-0.40/초 | 1080p, 최대 148초, 네이티브 오디오 |
| **Google Cloud TTS** | v1 | 음성 합성 | 표준 요금 | 다양한 음성 스타일 |

### 2.2 프레임워크 버전

| 프레임워크 | 버전 | 상태 |
|-----------|------|------|
| **Genkit** | 1.27.0+ | GA (Production Ready) |
| **@genkit-ai/googleai** | 1.27.0+ | GA |
| **@genkit-ai/vertexai** | 1.27.0+ | GA |
| **Genkit Go** | 1.0.0 | GA |
| **Genkit Python** | 0.4.0 | Alpha |
| **ADK TypeScript** | 0.2.0+ | Beta |

### 2.3 모델 설정 코드

```typescript
// src/config/models.ts
export const ModelConfig = {
  // 범용 에이전트 (Research, Script, Editor)
  general: {
    model: 'gemini-3-flash',
    contextWindow: 1_000_000,  // 1M 토큰
    maxOutput: 64_000,         // 64K 토큰
    temperature: 0.7,
    pricing: { input: 0.50, output: 3.00 }  // per 1M tokens
  },

  // 품질 평가 (Critic, ArtEvaluator)
  evaluation: {
    model: 'gemini-3-pro',
    temperature: 0.3,  // 일관된 평가
    reasoning: 'deep'
  },

  // 복잡한 추론 (계획, 전략)
  deepThink: {
    model: 'gemini-3-deep-think',
    temperature: 0.2,
    useCase: 'complex-planning'
  },

  // 이미지 생성 (Thumbnail)
  image: {
    model: 'nano-banana-pro',
    resolution: '4K',          // 5632×3072
    multiStepReasoning: true,
    synthIdWatermark: true
  },

  // 영상 생성
  video: {
    model: 'veo-3.1',
    resolution: '1080p',
    fps: 24,
    maxDuration: 148,          // 초
    nativeAudio: true,
    pricing: { fast: 0.15, standard: 0.40 }  // per second
  }
};
```

---

## 3. 시스템 아키텍처

### 3.1 전체 파이프라인 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MASTER ORCHESTRATOR (MasterFlow.ts)               │
│                        Gemini 3 Flash 기반                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────────┐
        ▼                           ▼                               ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  RESEARCH PHASE   │     │  PRODUCTION PHASE │     │   QUALITY PHASE   │
│   (Sequential)    │────▶│    (Parallel)     │────▶│     (Loop)        │
│  Gemini 3 Flash   │     │  Gemini 3 Flash   │     │  Gemini 3 Pro     │
└───────────────────┘     └───────────────────┘     └───────────────────┘
        │                           │                           │
   ┌────┴────┐              ┌───────┴───────┐            ┌──────┴──────┐
   ▼         ▼              ▼       ▼       ▼            ▼             ▼
┌─────┐  ┌─────┐        ┌─────┐ ┌─────┐ ┌─────┐     ┌─────┐       ┌─────┐
│Trend│─▶│Topic│        │Voice│ │Video│ │Thumb│     │Critic│──────▶│ Art │
│Agent│  │Agent│        │Agent│ │Agent│ │Agent│     │Agent │       │Eval │
└─────┘  └─────┘        └─────┘ └─────┘ └─────┘     └─────┘       └─────┘
  │         │           TTS     Veo3.1  NanaBanana   G3 Pro        G3 Pro
  │         │                     │         Pro        │             │
  ▼         ▼                     ▼                    ▼             ▼
┌─────────────┐              ┌─────────┐          ┌──────────┐
│Script Agent │              │ Editor  │          │ Revision │
│ G3 Flash    │              │ Agent   │          │  Agent   │
└─────────────┘              └─────────┘          └──────────┘
        │                         │                    │
        └─────────────────────────┴────────────────────┘
                                  ▼
                           ┌─────────────┐
                           │  Publisher  │
                           │   Agent     │
                           └─────────────┘
```

### 3.2 계층화 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                                  │
│  CLI Interface │ Web Dashboard │ API Gateway │ Genkit Developer UI          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATION LAYER                                   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │  MasterFlow     │  │  FlowRegistry   │  │  EventBus       │            │
│  │  (Coordinator)  │  │  (Discovery)    │  │  (Pub/Sub)      │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT LAYER                                        │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ RESEARCH GROUP          │ PRODUCTION GROUP    │ QUALITY GROUP        │  │
│  │ ┌────────┐ ┌────────┐  │ ┌────────┐ ┌─────┐ │ ┌────────┐ ┌───────┐ │  │
│  │ │ Trend  │ │ Topic  │  │ │ Voice  │ │Video│ │ │ Critic │ │ Art   │ │  │
│  │ │ Agent  │ │ Agent  │  │ │ Agent  │ │Agent│ │ │ Agent  │ │ Eval  │ │  │
│  │ └────────┘ └────────┘  │ └────────┘ └─────┘ │ └────────┘ └───────┘ │  │
│  │ ┌────────┐             │ ┌────────┐ ┌─────┐ │ ┌────────┐           │  │
│  │ │ Script │             │ │ Thumb  │ │Edit │ │ │Revision│           │  │
│  │ │ Agent  │             │ │ Agent  │ │Agent│ │ │ Agent  │           │  │
│  │ └────────┘             │ └────────┘ └─────┘ │ └────────┘           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE LAYER                                 │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ State Store │  │ Checkpoint  │  │ Cost Tracker│  │ Telemetry   │       │
│  │ (Redis/GCS) │  │ Manager     │  │             │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 에이전트 설계

### 4.1 에이전트별 모델 배정

| 에이전트 | 모델 | 역할 | 이유 |
|----------|------|------|------|
| TrendAgent | Gemini 3 Flash | 트렌드 분석 | 빠른 처리 |
| TopicAgent | Gemini 3 Flash | 주제 선정 | 빠른 처리 |
| ScriptAgent | Gemini 3 Flash | 대본 생성 | 창의성 필요 |
| VoiceAgent | Google Cloud TTS | 음성 합성 | 전용 서비스 |
| VideoAgent | **Veo 3.1** | 영상 생성 | 1080p, 네이티브 오디오 |
| ThumbnailAgent | **Nano Banana Pro** | 썸네일 생성 | 4K, 멀티스텝 추론 |
| EditorAgent | Gemini 3 Flash | 편집 지시 | 빠른 처리 |
| **CriticAgent** | **Gemini 3 Pro** | 품질 평가 | 정확도 필수 |
| **ArtEvaluator** | **Gemini 3 Pro** | 예술성 평가 | 심층 분석 |
| RevisionAgent | Gemini 3 Flash | 피드백 기반 수정 | 빠른 반복 |
| PublisherAgent | Gemini 3 Flash | 메타데이터 최적화 | SEO 최적화 |

### 4.2 에이전트 실행 패턴

| 패턴 | 적용 단계 | 설명 |
|------|----------|------|
| **Sequential** | Research | Trend → Topic → Script 순차 실행 |
| **Parallel** | Production | Voice, Video, Thumbnail 동시 실행 |
| **Loop** | Quality | Evaluate → Revise 반복 (수렴까지) |
| **Orchestrator** | Master | 전체 파이프라인 조율 |

---

## 5. 프로젝트 구조

```
C:\Devs\Youtube\
├── docs/
│   ├── research/                    # 연구 문서
│   │   ├── agentic-ai-youtube-research.md
│   │   ├── framework-comparison.md
│   │   ├── github-repos-catalog.md
│   │   └── implementation-roadmap.md
│   └── implementation-guide.md      # 이 문서
│
├── src/
│   ├── index.ts                      # 진입점
│   ├── genkit.config.ts              # Genkit + Gemini 3 설정
│   │
│   ├── agents/
│   │   ├── base/
│   │   │   ├── BaseAgent.ts          # Gemini 3 기반 베이스
│   │   │   └── types.ts
│   │   ├── research/
│   │   │   ├── TrendAgent.ts         # G3 Flash
│   │   │   ├── TopicAgent.ts         # G3 Flash
│   │   │   └── ScriptAgent.ts        # G3 Flash
│   │   ├── production/
│   │   │   ├── VoiceAgent.ts         # Cloud TTS
│   │   │   ├── VideoAgent.ts         # Veo 3.1
│   │   │   ├── ThumbnailAgent.ts     # Nano Banana Pro
│   │   │   └── EditorAgent.ts        # G3 Flash
│   │   ├── quality/
│   │   │   ├── CriticAgent.ts        # G3 Pro
│   │   │   ├── ArtEvaluator.ts       # G3 Pro
│   │   │   └── RevisionAgent.ts      # G3 Flash
│   │   └── publisher/
│   │       └── PublisherAgent.ts     # G3 Flash
│   │
│   ├── tools/
│   │   ├── youtube/
│   │   │   ├── DataTool.ts           # YouTube Data API
│   │   │   └── UploadTool.ts         # 업로드
│   │   ├── media/
│   │   │   ├── Veo31Tool.ts          # Veo 3.1 API
│   │   │   ├── NanoBananaTool.ts     # Nano Banana Pro API
│   │   │   └── TTSTool.ts            # Google Cloud TTS
│   │   └── storage/
│   │       └── CloudStorageTool.ts   # GCS
│   │
│   ├── flows/
│   │   ├── ResearchFlow.ts           # 연구 단계
│   │   ├── ProductionFlow.ts         # 제작 단계
│   │   ├── QualityFlow.ts            # 품질 단계
│   │   └── MasterFlow.ts             # 마스터 오케스트레이터
│   │
│   ├── config/
│   │   ├── models.ts                 # Gemini 3 모델 설정
│   │   ├── thresholds.ts             # 품질 임계값
│   │   ├── videoTypes.ts             # 영상 유형 설정
│   │   └── costOptimization.ts       # 비용 최적화
│   │
│   ├── state/
│   │   ├── SessionStore.ts           # 세션 상태 관리
│   │   └── CheckpointManager.ts      # 체크포인트
│   │
│   ├── quality/
│   │   └── QualityMetrics.ts         # 50+ 메트릭
│   │
│   ├── errors/
│   │   └── ErrorHandler.ts           # 에러 처리
│   │
│   ├── hitl/
│   │   └── HumanReviewGateway.ts     # Human-in-the-Loop
│   │
│   └── schemas/
│       └── *.schema.ts               # Zod 스키마
│
├── tests/
│   ├── agents/
│   ├── flows/
│   └── e2e/
│
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 6. 핵심 코드 설계

### 6.1 Genkit + Gemini 3 설정

```typescript
// src/genkit.config.ts
import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';

configureGenkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }),
    vertexAI({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      location: 'us-central1',
    }),
  ],
  logLevel: 'info',
  enableTracingAndMetrics: true,
});

// Gemini 3 모델 정의
export const gemini3Flash = googleAI.model('gemini-3-flash');
export const gemini3Pro = googleAI.model('gemini-3-pro');
export const gemini3DeepThink = googleAI.model('gemini-3-deep-think');

// 미디어 생성 모델 (Vertex AI)
export const nanoBananaPro = vertexAI.model('nano-banana-pro');
export const veo31 = vertexAI.model('veo-3.1');
```

### 6.2 BaseAgent with Gemini 3

```typescript
// src/agents/base/BaseAgent.ts
import { generate } from '@genkit-ai/ai';
import { gemini3Flash, gemini3Pro } from '../../genkit.config';
import { z, ZodSchema } from 'zod';

export interface AgentContext {
  sessionId: string;
  phase: string;
  previousResults?: Record<string, unknown>;
}

export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  metrics: {
    duration: number;
    tokensUsed: number;
    cost: number;
  };
}

export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly name: string;
  abstract readonly description: string;

  protected abstract inputSchema: ZodSchema<TInput>;
  protected abstract outputSchema: ZodSchema<TOutput>;
  protected abstract systemPrompt: string;

  // 기본: Gemini 3 Flash, 품질 평가: Gemini 3 Pro
  protected model = gemini3Flash;
  protected temperature = 0.7;
  protected maxRetries = 3;
  protected maxOutputTokens = 64000;  // Gemini 3 지원

  async execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
    const startTime = Date.now();
    let retryCount = 0;

    try {
      const validatedInput = this.inputSchema.parse(input);

      const response = await generate({
        model: this.model,
        prompt: this.buildPrompt(validatedInput),
        config: {
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
        },
        output: { schema: this.outputSchema },
      });

      return {
        success: true,
        data: response.output,
        metrics: this.collectMetrics(startTime, response),
      };
    } catch (error) {
      return this.handleError(error as Error, retryCount);
    }
  }

  protected buildPrompt(input: TInput): string {
    return `${this.systemPrompt}\n\nInput: ${JSON.stringify(input, null, 2)}`;
  }

  protected collectMetrics(startTime: number, response: any) {
    return {
      duration: Date.now() - startTime,
      tokensUsed: response.usage?.totalTokens || 0,
      cost: this.calculateCost(response.usage),
    };
  }

  protected calculateCost(usage: any): number {
    if (!usage) return 0;
    const inputCost = (usage.promptTokens || 0) / 1_000_000 * 0.50;
    const outputCost = (usage.completionTokens || 0) / 1_000_000 * 3.00;
    return inputCost + outputCost;
  }

  protected handleError(error: Error, retryCount: number): AgentResult<TOutput> {
    return {
      success: false,
      error,
      metrics: { duration: 0, tokensUsed: 0, cost: 0 },
    };
  }
}
```

### 6.3 Thumbnail Agent with Nano Banana Pro

```typescript
// src/agents/production/ThumbnailAgent.ts
import { BaseAgent } from '../base/BaseAgent';
import { nanoBananaPro } from '../../genkit.config';
import { z } from 'zod';

const ThumbnailInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  style: z.string().optional(),
  mood: z.string().optional(),
});

const ThumbnailOutputSchema = z.object({
  imageUrl: z.string(),
  resolution: z.string(),
  variants: z.array(z.object({
    url: z.string(),
    type: z.string(),
  })).optional(),
});

type ThumbnailInput = z.infer<typeof ThumbnailInputSchema>;
type ThumbnailOutput = z.infer<typeof ThumbnailOutputSchema>;

export class ThumbnailAgent extends BaseAgent<ThumbnailInput, ThumbnailOutput> {
  readonly name = 'thumbnail-agent';
  readonly description = 'Generates click-worthy thumbnails using Nano Banana Pro';

  protected inputSchema = ThumbnailInputSchema;
  protected outputSchema = ThumbnailOutputSchema;
  protected model = nanoBananaPro;

  protected systemPrompt = `You are an expert YouTube thumbnail designer.
  Create thumbnails that:
  - Grab attention in the first 0.5 seconds
  - Use bold, contrasting colors
  - Include clear, readable text (< 5 words)
  - Show emotion or intrigue
  - Follow the 4K resolution capability of Nano Banana Pro
  - Are mobile-optimized (readable at small size)`;

  async generateThumbnail(input: ThumbnailInput): Promise<ThumbnailOutput> {
    const prompt = this.buildClickOptimizedPrompt(input);

    const result = await generate({
      model: this.model,
      prompt: {
        text: prompt,
        config: {
          resolution: '4K',  // 5632×3072
          multiStepReasoning: true,
          synthIdWatermark: true,
        }
      },
    });

    return {
      imageUrl: result.output.imageUrl,
      resolution: '4K',
      variants: result.output.variants,
    };
  }

  private buildClickOptimizedPrompt(input: ThumbnailInput): string {
    return `Create a YouTube thumbnail that demands clicks:

CONTENT: ${input.description}
TITLE: ${input.title}
VIDEO TYPE: ${input.videoType}

REQUIREMENTS:
- Attention-grabbing in under 0.5 seconds
- Bold, contrasting colors (no pastels)
- Clear focal point with visual hierarchy
- Readable text if included (< 5 words)
- Emotion or intrigue that creates curiosity gap
- Professional quality, not stock-photo generic
- Mobile-optimized (readable at small size)

STYLE: ${input.style || 'Modern YouTube, high energy'}
MOOD: ${input.mood || 'Exciting, must-watch'}`;
  }
}
```

### 6.4 Video Agent with Veo 3.1

```typescript
// src/agents/production/VideoAgent.ts
import { BaseAgent } from '../base/BaseAgent';
import { veo31 } from '../../genkit.config';
import { z } from 'zod';

const VideoInputSchema = z.object({
  storyboard: z.object({
    scenes: z.array(z.object({
      description: z.string(),
      duration: z.number(),
      referenceImages: z.array(z.string()).optional(),
      priority: z.enum(['hero', 'standard', 'b-roll']).default('standard'),
    })),
    videoType: z.enum(['shorts', 'medium', 'longform']),
  }),
  extendTo: z.number().optional(),
});

const VideoOutputSchema = z.object({
  scenes: z.array(z.object({
    url: z.string(),
    duration: z.number(),
    audioIncluded: z.boolean(),
  })),
  totalDuration: z.number(),
});

type VideoInput = z.infer<typeof VideoInputSchema>;
type VideoOutput = z.infer<typeof VideoOutputSchema>;

export class VideoAgent extends BaseAgent<VideoInput, VideoOutput> {
  readonly name = 'video-agent';
  readonly description = 'Generates video content using Veo 3.1';

  protected inputSchema = VideoInputSchema;
  protected outputSchema = VideoOutputSchema;
  protected model = veo31;
  protected systemPrompt = 'Generate high-quality video content';

  async generateVideo(input: VideoInput): Promise<VideoOutput> {
    const scenes: Array<{ url: string; duration: number; audioIncluded: boolean }> = [];

    for (const scene of input.storyboard.scenes) {
      const videoClip = await generate({
        model: this.model,
        prompt: {
          text: scene.description,
          referenceImages: scene.referenceImages?.slice(0, 3),  // 최대 3장
          config: {
            resolution: '1080p',
            fps: 24,
            duration: Math.min(scene.duration, 8),  // 최적 클립 길이
            aspectRatio: this.getAspectRatio(input.storyboard.videoType),
            nativeAudio: true,  // Veo 3.1 네이티브 오디오
          }
        },
      });

      scenes.push({
        url: videoClip.output.videoUrl,
        duration: scene.duration,
        audioIncluded: true,
      });
    }

    const totalDuration = scenes.reduce((a, s) => a + s.duration, 0);

    // 영상 확장 필요 시 (최대 148초)
    if (input.extendTo && input.extendTo > totalDuration) {
      const extended = await this.extendVideo(scenes, input.extendTo);
      return extended;
    }

    return { scenes, totalDuration };
  }

  private getAspectRatio(videoType: string): string {
    return videoType === 'shorts' ? '9:16' : '16:9';
  }

  private async extendVideo(
    clips: Array<{ url: string; duration: number; audioIncluded: boolean }>,
    targetDuration: number
  ): Promise<VideoOutput> {
    // 확장 로직 구현
    return { scenes: clips, totalDuration: targetDuration };
  }
}
```

### 6.5 Quality Agents with Gemini 3 Pro

```typescript
// src/agents/quality/CriticAgent.ts
import { BaseAgent } from '../base/BaseAgent';
import { gemini3Pro } from '../../genkit.config';
import { z } from 'zod';

const CriticInputSchema = z.object({
  content: z.any(),
  videoType: z.string(),
  targetAudience: z.string().optional(),
});

const CriticOutputSchema = z.object({
  overallScore: z.number(),
  dimensions: z.object({
    technical: z.number(),
    narrative: z.number(),
    engagement: z.number(),
    originality: z.number(),
    ethical: z.number(),
  }),
  criticalIssues: z.array(z.object({
    dimension: z.string(),
    issue: z.string(),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    suggestion: z.string(),
  })),
  improvements: z.array(z.any()),
  verdict: z.enum(['approved', 'needs_revision']),
  revisionGuidance: z.string(),
});

type CriticInput = z.infer<typeof CriticInputSchema>;
type CriticOutput = z.infer<typeof CriticOutputSchema>;

export class CriticAgent extends BaseAgent<CriticInput, CriticOutput> {
  readonly name = 'critic-agent';
  readonly description = 'Evaluates content quality with Gemini 3 Pro precision';

  protected inputSchema = CriticInputSchema;
  protected outputSchema = CriticOutputSchema;

  // 품질 평가는 Gemini 3 Pro 사용 (최고 정확도)
  protected model = gemini3Pro;
  protected temperature = 0.3;  // 일관된 평가

  protected systemPrompt = `You are a world-class YouTube content critic with expertise in:
- Video production (cinematography, editing, audio)
- Storytelling (narrative structure, emotional arcs)
- Marketing psychology (engagement, virality)
- Creative direction (originality, brand identity)
- Ethics (accuracy, responsibility)

EVALUATION FRAMEWORK:
For each dimension, provide:
1. Score (0.0-1.0) with 2 decimal precision
2. Specific evidence from the content
3. Actionable improvement suggestions
4. Priority ranking (critical/high/medium/low)

DIMENSIONS & WEIGHTS:
- TECHNICAL (0.25): Video/audio quality, editing, pacing
- NARRATIVE (0.25): Story structure, hook, flow, CTA
- ENGAGEMENT (0.25): Viewer retention potential, clickability
- ORIGINALITY (0.15): Uniqueness, creative approach
- ETHICAL (0.10): Content safety, accuracy, responsibility

CRITICAL RULES:
- Ethical violations = automatic fail (score 0)
- Technical failures below minimum = flag for revision
- Be specific, not generic
- Prioritize actionable feedback`;

  async evaluate(input: CriticInput): Promise<CriticOutput> {
    const result = await generate({
      model: this.model,
      prompt: this.buildEvaluationPrompt(input),
      config: {
        temperature: this.temperature,
        maxOutputTokens: 16384,
      },
      output: { schema: this.outputSchema },
    });

    return this.processResult(result.output);
  }

  private buildEvaluationPrompt(input: CriticInput): string {
    return `${this.systemPrompt}

CONTENT TO EVALUATE:
${JSON.stringify(input.content, null, 2)}

VIDEO TYPE: ${input.videoType}
TARGET AUDIENCE: ${input.targetAudience || 'General'}

Provide a comprehensive evaluation with scores, issues, and actionable improvements.`;
  }

  private processResult(raw: CriticOutput): CriticOutput {
    const weighted = this.calculateWeightedScore(raw.dimensions);

    return {
      ...raw,
      overallScore: weighted,
      verdict: weighted >= 0.85 ? 'approved' : 'needs_revision',
    };
  }

  private calculateWeightedScore(dimensions: CriticOutput['dimensions']): number {
    return (
      dimensions.technical * 0.25 +
      dimensions.narrative * 0.25 +
      dimensions.engagement * 0.25 +
      dimensions.originality * 0.15 +
      dimensions.ethical * 0.10
    );
  }
}
```

---

## 7. 상태 관리 시스템

### 7.1 세션 상태 스키마

```typescript
// src/state/SessionStore.ts
import { z } from 'zod';

const SessionStateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    'created',
    'researching',
    'producing',
    'reviewing',
    'publishing',
    'completed',
    'failed'
  ]),
  input: z.object({
    idea: z.string(),
    videoType: z.enum(['shorts', 'medium', 'longform']),
    targetAudience: z.string().optional(),
  }),
  research: z.object({
    trends: z.array(z.any()).optional(),
    topic: z.any().optional(),
    script: z.any().optional(),
  }).optional(),
  production: z.object({
    voice: z.any().optional(),
    video: z.any().optional(),
    thumbnail: z.any().optional(),
    edited: z.any().optional(),
  }).optional(),
  quality: z.object({
    iterations: z.number().default(0),
    scores: z.array(z.any()).default([]),
    finalScore: z.number().optional(),
  }).optional(),
  metadata: z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    completedAt: z.date().optional(),
    totalCost: z.number().default(0),
    duration: z.number().optional(),
  }),
  checkpoints: z.array(z.object({
    phase: z.string(),
    timestamp: z.date(),
    data: z.any(),
  })).default([]),
});

export type SessionState = z.infer<typeof SessionStateSchema>;

export class SessionStore {
  private cache = new Map<string, SessionState>();

  async create(input: { idea: string; videoType: 'shorts' | 'medium' | 'longform' }): Promise<SessionState> {
    const session: SessionState = {
      id: crypto.randomUUID(),
      status: 'created',
      input,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        totalCost: 0,
      },
      checkpoints: [],
    };
    await this.save(session);
    return session;
  }

  async get(sessionId: string): Promise<SessionState> {
    const session = this.cache.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    return session;
  }

  async save(session: SessionState): Promise<void> {
    this.cache.set(session.id, session);
    // TODO: Persist to Redis/GCS
  }

  async updatePhase(
    sessionId: string,
    phase: keyof SessionState,
    data: any
  ): Promise<void> {
    const session = await this.get(sessionId);
    (session as any)[phase] = { ...(session as any)[phase], ...data };
    session.metadata.updatedAt = new Date();

    // 자동 체크포인트
    session.checkpoints.push({
      phase: String(phase),
      timestamp: new Date(),
      data: structuredClone(data),
    });

    await this.save(session);
  }
}
```

### 7.2 체크포인트 시스템

```typescript
// src/state/CheckpointManager.ts
export interface CheckpointInfo {
  id: string;
  phase: string;
  createdAt: Date;
  cost: number;
}

export class CheckpointManager {
  private storage: any; // CloudStorage

  async saveCheckpoint(session: SessionState, phase: string): Promise<string> {
    const checkpointId = `${session.id}/${phase}/${Date.now()}`;

    const checkpoint = {
      id: checkpointId,
      sessionId: session.id,
      phase,
      state: structuredClone(session),
      createdAt: new Date(),
      metadata: {
        cost: session.metadata.totalCost,
        duration: Date.now() - session.metadata.createdAt.getTime(),
      },
    };

    await this.storage.save(`checkpoints/${checkpointId}.json`, checkpoint);
    return checkpointId;
  }

  async restore(checkpointId: string): Promise<SessionState> {
    const checkpoint = await this.storage.get(`checkpoints/${checkpointId}.json`);
    return checkpoint.state;
  }

  async listCheckpoints(sessionId: string): Promise<CheckpointInfo[]> {
    return this.storage.list(`checkpoints/${sessionId}/`);
  }
}
```

### 7.3 에러 처리 및 복구

```typescript
// src/errors/ErrorHandler.ts
export interface RecoveryStrategy {
  maxRetries: number;
  baseDelay: number;
  recover(error: any, context: any): Promise<{ success: boolean; result?: any }>;
}

export class ErrorHandler {
  private strategies = new Map<string, RecoveryStrategy>();
  private defaultStrategy: RecoveryStrategy;

  constructor() {
    this.defaultStrategy = RetryWithBackoff;
  }

  register(errorType: string, strategy: RecoveryStrategy): void {
    this.strategies.set(errorType, strategy);
  }

  async handle(error: any, context: any): Promise<{ success: boolean; result?: any }> {
    const strategy = this.strategies.get(error.type) || this.defaultStrategy;

    // 1. 로깅
    await this.logError(error, context);

    // 2. 복구 시도
    const result = await strategy.recover(error, context);

    // 3. 실패 시 체크포인트에서 복구
    if (!result.success && context.lastCheckpoint) {
      return this.restoreFromCheckpoint(context.lastCheckpoint);
    }

    return result;
  }

  private async logError(error: any, context: any): Promise<void> {
    console.error(`[${context.phase}] Error:`, error);
  }

  private async restoreFromCheckpoint(checkpointId: string): Promise<{ success: boolean }> {
    // 체크포인트 복구 로직
    return { success: true };
  }
}

// 지수 백오프 재시도 전략
export const RetryWithBackoff: RecoveryStrategy = {
  maxRetries: 3,
  baseDelay: 1000,
  async recover(error, context) {
    for (let i = 0; i < this.maxRetries; i++) {
      await new Promise(r => setTimeout(r, this.baseDelay * Math.pow(2, i)));
      try {
        return { success: true, result: await context.retry() };
      } catch (e) {
        continue;
      }
    }
    return { success: false };
  },
};
```

---

## 8. 품질 평가 시스템

### 8.1 5차원 품질 프레임워크

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      5-DIMENSIONAL QUALITY FRAMEWORK                         │
│                          (Gemini 3 Pro 기반)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
    ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
    │             │             │             │             │             │
    ▼             ▼             ▼             ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│TECHNICAL│ │NARRATIVE│ │ENGAGEMENT│ │ORIGINALITY│ │ ETHICAL │
│  0.25   │ │  0.25   │ │   0.25   │ │   0.15   │ │   0.10  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
     │           │           │           │           │
     ▼           ▼           ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│10 metrics│ │12 metrics│ │10 metrics│ │8 metrics │ │10 metrics│
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 8.2 차원별 세부 메트릭 (50+)

```typescript
// src/quality/QualityMetrics.ts
export const QualityDimensions = {
  TECHNICAL: {
    weight: 0.25,
    metrics: {
      videoResolution: { min: 1080, target: 1080 },
      frameRate: { min: 24, target: 30 },
      audioClearness: { min: 0.8, target: 0.95 },
      colorGrading: { min: 0.7, target: 0.9 },
      transitionSmooth: { min: 0.8, target: 0.95 },
      pacingScore: { min: 0.75, target: 0.9 },
      audioVideoSync: { min: 0.95, target: 1.0 },
      compressionQuality: { min: 0.85, target: 0.95 },
      aspectRatioCorrect: { required: true },
      renderingErrors: { max: 0 },
    },
  },

  NARRATIVE: {
    weight: 0.25,
    metrics: {
      hookStrength: { min: 0.8, target: 0.95 },
      openingImpact: { min: 0.8, target: 0.9 },
      storyArc: { min: 0.75, target: 0.9 },
      emotionalResonance: { min: 0.7, target: 0.85 },
      informationDensity: { min: 0.6, target: 0.8 },
      clarityScore: { min: 0.85, target: 0.95 },
      callToAction: { min: 0.7, target: 0.85 },
      closingImpact: { min: 0.75, target: 0.9 },
      paceVariation: { min: 0.6, target: 0.8 },
      tensionRelease: { min: 0.7, target: 0.85 },
      messageClarity: { min: 0.8, target: 0.95 },
      valueDelivery: { min: 0.75, target: 0.9 },
    },
  },

  ENGAGEMENT: {
    weight: 0.25,
    metrics: {
      thumbnailCTR: { min: 0.05, target: 0.10 },
      titleAppeal: { min: 0.8, target: 0.95 },
      retentionPrediction: { min: 0.50, target: 0.70 },
      shareability: { min: 0.6, target: 0.8 },
      commentPotential: { min: 0.5, target: 0.7 },
      replayValue: { min: 0.4, target: 0.6 },
      curiosityGap: { min: 0.7, target: 0.9 },
      emotionalTrigger: { min: 0.6, target: 0.8 },
      socialProof: { min: 0.5, target: 0.7 },
      urgencyFactor: { min: 0.4, target: 0.6 },
    },
  },

  ORIGINALITY: {
    weight: 0.15,
    metrics: {
      conceptUniqueness: { min: 0.6, target: 0.8 },
      presentationStyle: { min: 0.7, target: 0.85 },
      creativeApproach: { min: 0.65, target: 0.8 },
      voiceDistinctness: { min: 0.6, target: 0.8 },
      visualIdentity: { min: 0.7, target: 0.85 },
      contentAngle: { min: 0.65, target: 0.8 },
      formatInnovation: { min: 0.5, target: 0.7 },
      noPlagiarism: { required: true },
    },
  },

  ETHICAL: {
    weight: 0.10,
    metrics: {
      factualAccuracy: { min: 0.95, target: 1.0 },
      sourceCredibility: { min: 0.9, target: 1.0 },
      noMisinformation: { required: true },
      noHarmfulContent: { required: true },
      noCopyrightViolation: { required: true },
      ageAppropriateness: { required: true },
      transparencyScore: { min: 0.9, target: 1.0 },
      noManipulation: { required: true },
      culturalSensitivity: { min: 0.85, target: 0.95 },
      accessibilityScore: { min: 0.7, target: 0.9 },
    },
  },
};
```

### 8.3 자기 개선 루프 (QualityFlow)

```typescript
// src/flows/QualityFlow.ts
import { defineFlow } from '@genkit-ai/core';
import { CriticAgent } from '../agents/quality/CriticAgent';
import { ArtEvaluator } from '../agents/quality/ArtEvaluator';
import { RevisionAgent } from '../agents/quality/RevisionAgent';

const criticAgent = new CriticAgent();
const artEvaluator = new ArtEvaluator();
const revisionAgent = new RevisionAgent();

export const QualityFlow = defineFlow({
  name: 'quality-improvement-loop',
}, async (input: { content: any; videoType: string }) => {

  const config = {
    minThreshold: 0.85,
    maxIterations: 5,
    convergenceThreshold: 0.02,  // 점수 변화 < 2%면 수렴
    diminishingReturnThreshold: 0.5,  // 개선율 < 50%면 중단
  };

  let current = input.content;
  let scores: number[] = [];
  let iteration = 0;

  while (iteration < config.maxIterations) {
    iteration++;

    // 1. Critic 평가
    const criticResult = await criticAgent.evaluate({
      content: current,
      videoType: input.videoType,
    });
    scores.push(criticResult.overallScore);

    // 2. Art 평가
    const artResult = await artEvaluator.evaluate({ content: current });

    // 3. 종료 조건: 품질 임계값 도달
    if (criticResult.overallScore >= config.minThreshold) {
      return {
        content: current,
        finalScore: criticResult.overallScore,
        iterations: iteration,
        verdict: 'approved',
      };
    }

    // 4. 수렴 체크
    if (scores.length >= 2) {
      const improvement = scores[scores.length - 1] - scores[scores.length - 2];

      if (Math.abs(improvement) < config.convergenceThreshold) {
        return {
          content: current,
          finalScore: criticResult.overallScore,
          iterations: iteration,
          verdict: 'converged_below_threshold',
          reason: 'Score improvement below convergence threshold',
        };
      }

      // Diminishing returns 체크
      if (scores.length >= 3) {
        const prevImprovement = scores[scores.length - 2] - scores[scores.length - 3];
        if (improvement < prevImprovement * config.diminishingReturnThreshold) {
          return {
            content: current,
            finalScore: criticResult.overallScore,
            iterations: iteration,
            verdict: 'diminishing_returns',
          };
        }
      }
    }

    // 5. 개선 수행
    const revisionGuidance = {
      criticFeedback: criticResult.improvements,
      artDirections: artResult.creativeDirections,
    };

    current = await revisionAgent.revise(current, revisionGuidance);
  }

  // 최대 반복 도달
  return {
    content: current,
    finalScore: scores[scores.length - 1],
    iterations: iteration,
    verdict: 'max_iterations_reached',
  };
});
```

### 8.4 Human-in-the-Loop (HITL)

```typescript
// src/hitl/HumanReviewGateway.ts
export class HumanReviewGateway {
  // 리뷰 포인트 정의
  static ReviewPoints = {
    RESEARCH_COMPLETE: {
      trigger: 'after_research_phase',
      required: false,
      description: '연구 결과 및 주제 선정 확인',
    },
    SCRIPT_READY: {
      trigger: 'after_script_generation',
      required: true,  // 필수 리뷰
      description: '대본 내용 및 톤 확인',
    },
    PRODUCTION_COMPLETE: {
      trigger: 'after_production_phase',
      required: false,
      description: '영상/음성/썸네일 품질 확인',
    },
    PRE_PUBLISH: {
      trigger: 'before_publish',
      required: true,  // 필수 리뷰
      description: '최종 승인',
    },
  };

  async requestReview(content: any): Promise<{ approved: boolean; feedback?: string }> {
    const reviewRequest = {
      id: crypto.randomUUID(),
      content,
      requestedAt: new Date(),
      status: 'pending',
    };

    // 비동기 대기 또는 타임아웃
    return this.waitForDecision(reviewRequest.id, {
      timeout: 24 * 60 * 60 * 1000,  // 24시간
      fallback: 'auto_approve_with_flag',
    });
  }

  private async waitForDecision(
    requestId: string,
    options: { timeout: number; fallback: string }
  ): Promise<{ approved: boolean; feedback?: string }> {
    // 실제 구현에서는 웹훅/폴링으로 대기
    return { approved: true };
  }
}
```

---

## 9. 영상 제작 파이프라인

### 9.1 Veo 3.1 도구

```typescript
// src/tools/media/Veo31Tool.ts
export class Veo31Tool {
  // Veo 3.1 제약사항
  static readonly Constraints = {
    maxDuration: 148,       // 초
    optimalClipDuration: 8, // 초 (비용 효율)
    minClipDuration: 4,
    resolutions: ['1080p', '720p'],
    aspectRatios: ['16:9', '9:16'],
    fps: 24,
    nativeAudio: true,
    maxReferenceImages: 3,
  };

  // 비용 계층
  static readonly Pricing = {
    fast: { perSecond: 0.15, quality: 'standard' },
    standard: { perSecond: 0.40, quality: 'high' },
  };

  async generateClip(request: {
    description: string;
    duration: number;
    videoType: string;
    referenceImages?: string[];
    useFast?: boolean;
    includeAudio?: boolean;
  }) {
    const config = {
      prompt: request.description,
      duration: Math.min(request.duration, 8),
      resolution: '1080p',
      aspectRatio: request.videoType === 'shorts' ? '9:16' : '16:9',
      referenceImages: request.referenceImages?.slice(0, 3),
      model: request.useFast ? 'veo-3.1-fast' : 'veo-3.1',
      generateAudio: request.includeAudio ?? true,
    };

    // API 호출
    // const result = await this.client.generateVideo(config);

    return {
      videoUrl: 'generated-url',
      duration: request.duration,
      hasAudio: true,
      cost: this.calculateCost(request.duration, request.useFast),
    };
  }

  private calculateCost(duration: number, useFast?: boolean): number {
    const rate = useFast ? 0.15 : 0.40;
    return duration * rate;
  }
}
```

### 9.2 Nano Banana Pro 도구

```typescript
// src/tools/media/NanoBananaTool.ts
export class NanoBananaTool {
  static readonly Capabilities = {
    maxResolution: { width: 5632, height: 3072 },  // 4K+
    youtubeOptimal: { width: 1280, height: 720 },
    multiStepReasoning: true,
    synthIdWatermark: true,  // AI 생성 표시
  };

  async generateThumbnail(request: {
    description: string;
    title: string;
    videoType: string;
    style?: string;
    mood?: string;
  }) {
    const prompt = this.buildClickOptimizedPrompt(request);

    // API 호출
    return {
      imageUrl: 'generated-thumbnail-url',
      resolution: '4K',
      metadata: {
        synthIdPresent: true,
        generatedAt: new Date(),
      },
    };
  }

  // A/B 테스트 변형 생성
  async generateVariants(request: any, count: number = 3) {
    const variations = [
      { type: 'emotion', modifier: 'with expressive facial expression' },
      { type: 'text', modifier: 'with bold, large text overlay' },
      { type: 'color', modifier: 'with high contrast vibrant colors' },
      { type: 'curiosity', modifier: 'with intriguing hidden element' },
    ];

    return Promise.all(
      variations.slice(0, count).map(async (variation) => {
        const result = await this.generateThumbnail({
          ...request,
          description: `${request.description}, ${variation.modifier}`,
        });

        return {
          ...result,
          variationType: variation.type,
          testable: true,
        };
      })
    );
  }

  private buildClickOptimizedPrompt(request: any): string {
    return `Create a YouTube thumbnail that demands clicks:

CONTENT: ${request.description}
TITLE: ${request.title}
VIDEO TYPE: ${request.videoType}

REQUIREMENTS:
- Attention-grabbing in under 0.5 seconds
- Bold, contrasting colors (no pastels)
- Clear focal point with visual hierarchy
- Readable text if included (< 5 words)
- Emotion or intrigue that creates curiosity gap
- Professional quality, not stock-photo generic
- Mobile-optimized (readable at small size)

STYLE: ${request.style || 'Modern YouTube, high energy'}
MOOD: ${request.mood || 'Exciting, must-watch'}`;
  }
}
```

### 9.3 비디오 유형별 설정

```typescript
// src/config/videoTypes.ts
export const VideoTypeConfigs = {
  shorts: {
    maxDuration: 60,
    aspectRatio: '9:16',
    resolution: '1080p',
    veoConfig: {
      clipDuration: 6,
      transitions: 'fast_cut',
      pacing: 'high',
    },
    thumbnailConfig: {
      textOverlay: false,
      aspectRatio: '9:16',
    },
    estimatedCost: {
      fast: 9.00,
      standard: 24.00,
    },
  },

  medium: {
    maxDuration: 300,  // 5분
    aspectRatio: '16:9',
    resolution: '1080p',
    veoConfig: {
      clipDuration: 8,
      transitions: 'smooth',
      pacing: 'medium',
    },
    thumbnailConfig: {
      textOverlay: true,
      aspectRatio: '16:9',
      variants: 3,
    },
    estimatedCost: {
      fast: 45.00,
      standard: 120.00,
    },
  },

  longform: {
    maxDuration: 900,  // 15분
    aspectRatio: '16:9',
    resolution: '1080p',
    veoConfig: {
      clipDuration: 8,
      transitions: 'cinematic',
      pacing: 'varied',
      chapters: true,
    },
    thumbnailConfig: {
      textOverlay: true,
      aspectRatio: '16:9',
      variants: 5,
    },
    estimatedCost: {
      fast: 135.00,
      standard: 360.00,
    },
  },
};
```

---

## 10. 비용 최적화

### 10.1 예상 비용 (영상 1개당)

| 구성요소 | 모델 | 예상 사용량 | 비용 |
|----------|------|------------|------|
| Research | G3 Flash | ~50K tokens | ~$0.15 |
| Script | G3 Flash | ~30K tokens | ~$0.10 |
| Thumbnail | Nano Banana Pro | 3장 | ~$0.30 |
| Video (1분) | Veo 3.1 Standard | 60초 | ~$24.00 |
| Voice | Cloud TTS | 1분 | ~$0.02 |
| Quality (3회) | G3 Pro | ~100K tokens | ~$1.50 |
| **합계** | | | **~$26.07** |

### 10.2 비용 최적화 전략

```typescript
// src/config/costOptimization.ts
export const CostOptimizationStrategies = {
  // 1. Veo 3.1 Fast 우선 사용 (62.5% 절감)
  veoFastFirst: {
    enabled: true,
    useFastFor: ['b-roll', 'transitions', 'filler'],
    useStandardFor: ['hero_shots', 'key_moments', 'intro', 'outro'],
    expectedSavings: 0.625,
  },

  // 2. 장면 재사용 (캐싱)
  sceneReuse: {
    enabled: true,
    cacheGeneratedClips: true,
    cacheDuration: 7 * 24 * 60 * 60 * 1000,  // 7일
    similarityThreshold: 0.85,
  },

  // 3. Context Caching (Gemini) - 90% 토큰 절감
  contextCaching: {
    enabled: true,
    cacheSystemPrompts: true,
    cacheFrequentQueries: true,
    expectedTokenSavings: 0.90,
  },

  // 4. 배치 처리
  batchProcessing: {
    enabled: true,
    batchSize: 5,
    parallelGeneration: true,
  },

  // 5. 품질 루프 조기 종료
  earlyTermination: {
    enabled: true,
    scoreThreshold: 0.90,
    convergenceThreshold: 0.02,
    maxIterations: 3,
  },
};

// 비용 예상 계산기
export function estimateCost(config: {
  duration: number;
  thumbnailVariants: number;
  expectedTokens: number;
  expectedIterations: number;
  useFast: boolean;
}) {
  const baseVideoCost = config.duration * (config.useFast ? 0.15 : 0.40);
  const thumbnailCost = config.thumbnailVariants * 0.10;
  const llmCost = config.expectedTokens / 1_000_000 * 3.50;  // 평균
  const qualityLoopCost = llmCost * config.expectedIterations;

  const total = baseVideoCost + thumbnailCost + llmCost + qualityLoopCost;

  return {
    breakdown: {
      video: baseVideoCost,
      thumbnail: thumbnailCost,
      llm: llmCost,
      qualityLoop: qualityLoopCost,
    },
    total,
    perMinute: total / (config.duration / 60),
    savings: config.useFast ? (config.duration * 0.25) : 0,
  };
}
```

### 10.3 유형별 비용 예상

| 유형 | Veo Fast | Veo Standard |
|------|----------|--------------|
| Shorts (60초) | ~$9 | ~$24 |
| Medium (5분) | ~$45 | ~$120 |
| Longform (15분) | ~$135 | ~$360 |

---

## 11. 세션별 구현 계획

### Phase 1: Foundation (세션 1-3)

#### 세션 1: 프로젝트 초기화 + Gemini 3 연결 (3-4시간)
```
[ ] npm init, TypeScript 설정
[ ] Genkit 1.27+ 설치
[ ] Gemini 3 Flash/Pro 연결 테스트
[ ] Veo 3.1 API 연결 테스트
[ ] Nano Banana Pro API 연결 테스트
[ ] 개발자 UI 실행 확인
```
**검증**: 모든 Gemini 3 모델 API 호출 성공

#### 세션 2: 핵심 인프라 (3-4시간)
```
[ ] BaseAgent with Gemini 3 구현
[ ] 모델 설정 (models.ts)
[ ] 비용 추적 유틸리티
[ ] 재시도 로직
```

#### 세션 3: 스키마 + 프롬프트 (3-4시간)
```
[ ] 모든 Zod 스키마
[ ] Gemini 3 최적화 프롬프트 템플릿
[ ] 영상 유형별 설정
```

### Phase 2: Core Agents (세션 4-7)

#### 세션 4: Research Agents (3-4시간)
```
[ ] TrendAgent (G3 Flash)
[ ] TopicAgent (G3 Flash)
[ ] YouTube Data API Tool
[ ] ResearchFlow
```

#### 세션 5: Script Agent (3-4시간)
```
[ ] ScriptAgent with viral formula
[ ] Hook generator
[ ] Storyboard generator
```

#### 세션 6: Media Agents (3-4시간)
```
[ ] VoiceAgent (Cloud TTS)
[ ] VideoAgent (Veo 3.1)
[ ] ThumbnailAgent (Nano Banana Pro)
```

#### 세션 7: Integration (3-4시간)
```
[ ] EditorAgent
[ ] ProductionFlow (Parallel)
[ ] 체크포인트 시스템
```

### Phase 3: Quality System (세션 8-10)

#### 세션 8: Critic Agent (3-4시간)
```
[ ] CriticAgent with Gemini 3 Pro
[ ] 5차원 평가 시스템
[ ] 피드백 생성
```

#### 세션 9: Art Evaluator + Loop (3-4시간)
```
[ ] ArtEvaluator (G3 Pro)
[ ] RevisionAgent (G3 Flash)
[ ] QualityFlow
```

#### 세션 10: Full Pipeline (3-4시간)
```
[ ] MasterFlow 완성
[ ] PublisherAgent
[ ] E2E 테스트
```

---

## 12. 환경 설정

### 12.1 환경 변수

```bash
# .env.example

# Google AI (Gemini 3)
GOOGLE_AI_API_KEY=your-gemini-api-key

# Google Cloud (Vertex AI - Veo, Nano Banana)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# YouTube API
YOUTUBE_API_KEY=your-youtube-api-key
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret

# Storage
GCS_BUCKET=your-bucket-name

# Cost Limits
MAX_COST_PER_VIDEO=30.00
MAX_COST_PER_SESSION=100.00
```

### 12.2 의존성

```json
{
  "dependencies": {
    "@genkit-ai/core": "^1.27.0",
    "@genkit-ai/googleai": "^1.27.0",
    "@genkit-ai/vertexai": "^1.27.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 13. 검증 계획

### 13.1 단위 테스트

```bash
# 각 에이전트 개별 테스트
npm run test:agent TrendAgent
npm run test:agent CriticAgent
npm run test:tool Veo31Tool
```

### 13.2 통합 테스트

```bash
# 전체 파이프라인 E2E
npm run test:e2e -- --video-type=shorts
npm run test:e2e -- --video-type=medium
```

### 13.3 품질 벤치마크

```bash
# 품질 점수 검증
npm run benchmark:quality -- --samples=10
# 예상: 평균 품질 점수 >= 0.85
```

### 13.4 비용 검증

```bash
# 비용 추적 리포트
npm run report:cost -- --last=10-videos
# 예상: Shorts < $15, Medium < $50, Longform < $150
```

### 13.5 성공 지표

| 지표 | 목표 | 비고 |
|------|------|------|
| 전체 제작 시간 | < 30분 | Veo 3.1 병렬 생성 |
| 비용/영상 | < $30 (Fast), < $50 (Standard) | Veo 3.1 기준 |
| 품질 점수 | >= 0.85 | Gemini 3 Pro 평가 |
| 성공률 | > 95% | |
| 테스트 커버리지 | > 80% | |

---

## 14. 참고 자료

### 14.1 공식 문서

- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Nano Banana Pro](https://deepmind.google/models/gemini-image/pro/)
- [Veo 3.1 API](https://developers.googleblog.com/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/)
- [Genkit Documentation](https://genkit.dev/)

### 14.2 가격 정보

- Gemini 3 Flash: $0.50/1M input, $3/1M output
- Veo 3.1: $0.15/sec (Fast), $0.40/sec (Standard)
- Nano Banana Pro: Google AI Pro 구독 포함

### 14.3 관련 GitHub 레포지토리

| 레포지토리 | 용도 | 우선순위 |
|-----------|------|----------|
| [firebase/genkit](https://github.com/firebase/genkit) | Genkit 프레임워크 | 높음 |
| [google/adk-samples](https://github.com/google/adk-samples) | ADK 샘플 | 높음 |
| [HKUDS/ViMax](https://github.com/HKUDS/ViMax) | 영상 제작 참고 | 중간 |
| [HKUDS/VideoAgent](https://github.com/HKUDS/VideoAgent) | 셀프 평가 루프 | 중간 |
| [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) | 역할 기반 에이전트 | 중간 |

---

## 부록: 생성될 파일 목록

### 신규 생성 파일

```
src/
├── index.ts
├── genkit.config.ts
├── config/
│   ├── models.ts
│   ├── costOptimization.ts
│   ├── videoTypes.ts
│   └── thresholds.ts
├── agents/
│   ├── base/BaseAgent.ts
│   ├── research/TrendAgent.ts
│   ├── research/TopicAgent.ts
│   ├── research/ScriptAgent.ts
│   ├── production/VoiceAgent.ts
│   ├── production/VideoAgent.ts
│   ├── production/ThumbnailAgent.ts
│   ├── production/EditorAgent.ts
│   ├── quality/CriticAgent.ts
│   ├── quality/ArtEvaluator.ts
│   ├── quality/RevisionAgent.ts
│   └── publisher/PublisherAgent.ts
├── tools/
│   ├── media/Veo31Tool.ts
│   ├── media/NanoBananaTool.ts
│   ├── media/TTSTool.ts
│   ├── youtube/DataTool.ts
│   └── youtube/UploadTool.ts
├── flows/
│   ├── ResearchFlow.ts
│   ├── ProductionFlow.ts
│   ├── QualityFlow.ts
│   └── MasterFlow.ts
├── state/
│   ├── SessionStore.ts
│   └── CheckpointManager.ts
├── quality/
│   └── QualityMetrics.ts
├── errors/
│   └── ErrorHandler.ts
├── hitl/
│   └── HumanReviewGateway.ts
└── schemas/
    └── *.schema.ts
```

---

*이 문서는 2026년 1월 10일 기준으로 작성되었습니다. 최신 API 변경 사항은 공식 문서를 참조하세요.*
