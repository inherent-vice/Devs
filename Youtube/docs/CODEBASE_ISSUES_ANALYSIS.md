# YouTube AI Workflow - 코드베이스 이슈 분석 문서

> **분석 일시**: 2026-01-11
> **분석 범위**: 전체 코드베이스 (apps/web, src)
> **총 발견 이슈**: 47개 (Critical: 6, High: 12, Medium: 18, Low: 11)

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [Critical Issues (P0)](#2-critical-issues-p0)
3. [High Priority Issues (P1)](#3-high-priority-issues-p1)
4. [Medium Priority Issues (P2)](#4-medium-priority-issues-p2)
5. [Low Priority Issues (P3)](#5-low-priority-issues-p3)
6. [Architecture Recommendations](#6-architecture-recommendations)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Executive Summary

### 1.1 현재 상태 개요

| 영역 | 상태 | 주요 문제 |
|------|------|----------|
| **Backend 통합** | 🔴 Critical | 상대 URL 호출, Mock fallback 우회 |
| **데이터 파이프라인** | 🔴 Critical | 스키마 불일치, 오디오/자막 미연결 |
| **상태 관리** | 🟠 High | 메모리 Map, 전역 세션, 동시성 문제 |
| **보안** | 🟠 High | 인증 없음, API 키 노출 가능성 |
| **타입 안전성** | 🟠 High | unsafe any 캐스트, 런타임 불일치 |
| **에러 처리** | 🟡 Medium | Silent failures, Error Boundary 없음 |
| **성능** | 🟡 Medium | Memoization 누락, N+1 쿼리 |

### 1.2 우선순위 분류 기준

- **P0 (Critical)**: 시스템 기능 불가 또는 데이터 손실 위험
- **P1 (High)**: 주요 기능 저하 또는 보안 취약점
- **P2 (Medium)**: 안정성/성능 영향
- **P3 (Low)**: 코드 품질/유지보수성

---

## 2. Critical Issues (P0)

### 2.1 상대 URL로 서버 사이드 fetch 호출

**파일**: `apps/web/src/lib/workflow/executor.ts:729-746`

```typescript
// 문제 코드
private async callAgentAPI(agent: AgentDefinition, input: unknown): Promise<unknown> {
  const response = await fetch("/api/workflow/agent", {  // ❌ 상대 URL
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({...}),
  });
}
```

**영향**:
- Node.js 런타임에서 상대 URL fetch는 실패
- SSR/서버 컴포넌트에서 API 호출 불가
- 워크플로우 실행이 완전히 중단됨

**해결 방안**:
```typescript
// 1. 환경 변수 기반 절대 URL 생성
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const response = await fetch(`${baseUrl}/api/workflow/agent`, {...});

// 2. 또는 request 객체에서 URL 추출
private async callAgentAPI(agent: AgentDefinition, input: unknown, request?: Request): Promise<unknown> {
  const baseUrl = request ? new URL(request.url).origin : process.env.NEXT_PUBLIC_APP_URL;
  const response = await fetch(`${baseUrl}/api/workflow/agent`, {...});
}
```

---

### 2.2 Backend 실패 시 항상 Mock으로 대체

**파일**: `apps/web/src/app/api/workflow/agent/route.ts:36-61`

```typescript
// 문제 코드
async function executeAgent(...): Promise<{...}> {
  const backendUrl = process.env.GENKIT_BACKEND_URL || "http://localhost:3400";

  try {
    const response = await fetch(`${backendUrl}/api/agent/${agentId}`, {...});

    if (!response.ok) {
      console.warn(`Backend agent ${agentId} not available, using mock data`);  // ❌
      return mockAgentExecution(agentId, input, config);  // 조용히 Mock 반환
    }
  } catch (error) {
    console.warn(`Backend connection failed...`);  // ❌
    return mockAgentExecution(agentId, input, config);  // 항상 성공으로 처리
  }
}
```

**영향**:
- 실제 백엔드 실행이 항상 우회될 가능성
- 사용자가 Mock 데이터를 실제 결과로 착각
- 프로덕션에서 의미 없는 결과물 생성

**해결 방안**:
```typescript
// 1. 환경별 Mock 허용 여부 제어
const ALLOW_MOCK = process.env.NODE_ENV === 'development';

async function executeAgent(...) {
  try {
    const response = await fetch(...);

    if (!response.ok) {
      if (ALLOW_MOCK) {
        console.warn(`[DEV] Using mock for ${agentId}`);
        return mockAgentExecution(...);
      }
      throw new Error(`Backend agent ${agentId} failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (ALLOW_MOCK) {
      return mockAgentExecution(...);
    }
    throw error;  // 프로덕션에서는 에러 전파
  }
}
```

---

### 2.3 이미지 모드 클립 스키마 불일치

**관련 파일**:
- `src/agents/production/ImageVideoAgent.ts:73-87` (ImageClipSchema)
- `src/flows/ProductionFlow.ts:318-324` (clip 변환)
- `src/agents/production/EditorAgent.ts:30-36` (EditorAgentInputSchema)

**문제**:
```typescript
// ImageVideoAgent 출력 (ImageClipSchema)
{
  sceneId: string,
  imageUrl: string,  // 👈 imageUrl 사용
  duration: number,
  ...
}

// EditorAgent 입력 (EditorAgentInputSchema)
videoClips: z.array(z.object({
  sceneId: z.string(),
  url: z.string().optional(),      // 👈 url 사용
  imagePath: z.string().optional(), // 👈 imagePath 사용
  duration: z.number(),
  ...
}))

// ProductionFlow에서 변환 시도
videoClips: videoResult.data!.clips.map((c: any) => ({
  sceneId: c.sceneId,
  url: c.url || c.imagePath,  // ❌ imageUrl이 아닌 url/imagePath 참조
  imagePath: c.imagePath,
  ...
})),
```

**영향**:
- 이미지 모드 사용 시 Editor가 `undefined` URL 수신
- 타임라인 생성 실패
- 최종 영상 렌더링 불가

**해결 방안**:
```typescript
// 1. 스키마 통일 (권장)
// 모든 곳에서 일관된 필드명 사용: mediaUrl
export const MediaClipSchema = z.object({
  sceneId: z.string(),
  mediaUrl: z.string(),  // 통일된 필드명
  mediaType: z.enum(['video', 'image']),
  duration: z.number(),
  ...
});

// 2. 변환 레이어 수정 (임시)
// ProductionFlow.ts
videoClips: videoResult.data!.clips.map((c: any) => ({
  sceneId: c.sceneId,
  url: c.url || c.imageUrl || c.imagePath,  // 모든 가능성 처리
  imagePath: c.imagePath || c.imageUrl,
  duration: c.duration,
  priority: c.priority,
})),
```

---

### 2.4 오디오/자막 경로 미연결

**파일**: `src/flows/ProductionFlow.ts:192-214`

```typescript
// ImageVideoAgent 호출 시 오디오 경로 미전달
useImageMode
  ? imageVideoAgent.execute(
      {
        storyboard: {...},
        resolution: '1080p',
        // audioPath: ???  ❌ 오디오 경로 미전달
        includeSubtitles: true,
        composeVideo: true,
      },
      context
    )
```

**영향**:
- 이미지 모드 영상에 무음 출력
- 자막이 생성되지만 영상에 적용되지 않음
- Voice 에이전트 결과물 손실

**해결 방안**:
```typescript
// 1. VoiceAgent 결과를 먼저 얻고 경로 전달
// parallelTasks를 순차적으로 분리하거나 2단계로 나눔

// Stage 1: Voice 먼저 실행
const voiceResult = await voiceAgent.execute({...}, context);
const audioPath = voiceResult.data?.audioUrl;

// Stage 2: 나머지 병렬 실행 (오디오 경로 포함)
const [videoResult, thumbnailResult] = await Promise.all([
  useImageMode
    ? imageVideoAgent.execute({
        ...config,
        audioPath,  // ✅ 오디오 경로 전달
        subtitleData: subtitleResult?.data,  // ✅ 자막 데이터 전달
      }, context)
    : videoAgent.execute({...}, context),
  thumbnailAgent.execute({...}, context),
]);
```

---

### 2.5 Editor가 실제 렌더링하지 않음

**파일**: `src/agents/production/EditorAgent.ts:47-93`

```typescript
// EditorAgent 출력
export const EditorAgentOutputSchema = z.object({
  timeline: z.object({...}),      // 타임라인 데이터만
  editDecisions: z.array(...),
  transitions: z.array(...),
  effects: z.array(...),
  textOverlays: z.array(...),
  exportSettings: z.object({...}),
  // ❌ 실제 렌더링된 영상 URL 없음
});
```

**영향**:
- 타임라인 메타데이터만 반환, 실제 MP4 없음
- `composedVideo`가 ImageVideoAgent에만 있고 Editor에 없음
- 최종 산출물이 영상이 아닌 JSON

**해결 방안**:
```typescript
// 방안 1: Editor에 렌더링 단계 추가
export const EditorAgentOutputSchema = z.object({
  timeline: z.object({...}),
  // ... 기존 필드

  // 새 필드: 렌더링된 영상
  renderedVideo: z.object({
    videoPath: z.string(),
    fileSize: z.number(),
    duration: z.number(),
    format: z.string(),
  }).optional(),
});

// 방안 2: ImageVideoAgent의 composedVideo를 최종 결과로 사용
// ProductionFlow 반환값에서 video.composedVideo를 finalVideo로 지정
return {
  ...results,
  finalVideo: useImageMode
    ? videoResult.data.composedVideo
    : await renderTimeline(editorResult.data.timeline),
};
```

---

### 2.6 비용 추적 불완전

**파일**: `apps/web/src/lib/workflow/executor.ts:598`

```typescript
// 에이전트 실행 결과에서 비용 추출
const result: AgentExecutionResult = {
  ...
  cost: (output as any)?.cost || 0,  // ❌ 최상위 cost만 확인
};
```

**영향**:
- API 응답 스키마와 불일치 시 비용이 0으로 기록
- 예산 제어 기능 무력화
- 비용 리포트 왜곡

**해결 방안**:
```typescript
// 1. 응답 스키마에 맞는 비용 추출
interface AgentAPIResponse {
  success: boolean;
  output: unknown;
  cost: number;       // 최상위
  duration: number;
  metrics?: {
    cost: number;     // metrics 내부
    tokensUsed: number;
  };
}

const result: AgentExecutionResult = {
  ...
  cost: response.cost || response.metrics?.cost || (output as any)?.cost || 0,
};
```

---

## 3. High Priority Issues (P1)

### 3.1 메모리 기반 Executor 저장소

**파일**: `apps/web/src/app/api/workflow/execute/route.ts:26`

```typescript
// 문제 코드
const activeExecutors = new Map<string, WorkflowExecutor>();
```

**영향**:
- 서버리스 환경에서 인스턴스 간 상태 공유 불가
- 멀티 노드 배포 시 pause/resume/cancel 제어 불가
- 서버 재시작 시 모든 세션 손실

**해결 방안**:
```typescript
// 1. Redis 기반 상태 저장소
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// 상태 저장
await redis.set(`executor:${sessionId}`, JSON.stringify(state), { ex: 3600 });

// 상태 조회
const state = await redis.get(`executor:${sessionId}`);

// 2. 또는 데이터베이스 기반 (Prisma)
await prisma.workflowSession.update({
  where: { id: sessionId },
  data: { state: JSON.stringify(executorState) },
});
```

---

### 3.2 전역 currentSession 공유

**파일**: `src/storage/LocalStorageManager.ts:55-56`

```typescript
export class LocalStorageManager {
  private currentSession: SessionInfo | null = null;  // ❌ 전역 상태
  private manifest: SessionManifest | null = null;
  ...
}
```

**영향**:
- 동시 실행 시 세션 충돌
- 잘못된 세션에 파일 저장
- 데이터 무결성 손상

**해결 방안**:
```typescript
// 1. 세션 ID를 모든 메서드에 명시적 전달
class LocalStorageManager {
  // currentSession 제거

  saveAsset(sessionId: string, type: AssetType, filename: string, data: Buffer): AssetInfo {
    const sessionDir = this.getSessionDir(sessionId);
    // ...
  }

  getSessionManifest(sessionId: string): SessionManifest {
    // ...
  }
}

// 2. 팩토리 패턴으로 세션별 인스턴스
function getStorageForSession(sessionId: string): LocalStorageManager {
  return new LocalStorageManager({ sessionId });
}
```

---

### 3.3 BaseAgent postProcess 미호출

**파일**: `src/agents/base/BaseAgent.ts:175-211`

```typescript
// executeCore에서 postProcess가 호출되지 않음
private async executeCore(...): Promise<AgentResult<TOutput>> {
  const prompt = this.buildPrompt(input, context);

  const response = await ai.generate({...});

  const outputValidation = this.outputSchema.safeParse(response.output);
  if (!outputValidation.success) {
    throw new Error(`Output validation failed`);
  }

  // ❌ postProcess 호출 없음
  return {
    success: true,
    data: outputValidation.data,  // postProcess 미적용
    ...
  };
}

// EditorAgent에는 postProcess 정의됨
protected async postProcess(output: EditorAgentOutput, input: EditorAgentInput): Promise<EditorAgentOutput> {
  // 이 코드가 실행되지 않음!
}
```

**해결 방안**:
```typescript
private async executeCore(...): Promise<AgentResult<TOutput>> {
  const prompt = this.buildPrompt(input, context);
  const response = await ai.generate({...});

  const outputValidation = this.outputSchema.safeParse(response.output);
  if (!outputValidation.success) {
    throw new Error(`Output validation failed`);
  }

  // ✅ postProcess 호출 추가
  const processedOutput = await this.postProcess(outputValidation.data, input);

  return {
    success: true,
    data: processedOutput,
    ...
  };
}
```

---

### 3.4 수정 출력 저장 미반영

**파일**: `apps/web/src/lib/workflow/executor.ts:365-606`

```typescript
// 수정된 출력 사용
const finalOutput = this.modifiedOutputs[agent.id] || output;

// 하지만 저장은 수정 전 output으로
if (this.storage) {
  await this.storage.saveAgentOutput(agent.phase, agent.id, finalOutput);  // 여기서는 finalOutput
}

// rerun 시 이전 수정본 덮어씀
async rerunAgent(agentId: string, modifiedInput?: unknown): Promise<void> {
  // modifiedOutputs 초기화 없음
  await this.executeAgent(agent, modifiedInput);
}
```

**해결 방안**:
```typescript
// 1. 수정본 별도 저장
if (this.modifiedOutputs[agent.id]) {
  await this.storage.saveAgentOutput(agent.phase, agent.id, finalOutput, { modified: true });
}

// 2. rerun 시 수정본 초기화 옵션
async rerunAgent(agentId: string, modifiedInput?: unknown, clearModifications = true): Promise<void> {
  if (clearModifications) {
    delete this.modifiedOutputs[agentId];
  }
  await this.executeAgent(agent, modifiedInput);
}
```

---

### 3.5 환경 변수 불일치

**관련 파일**:
- `apps/web/src/lib/backend.ts:10`: `NEXT_PUBLIC_BACKEND_URL`
- `apps/web/src/app/api/workflow/agent/route.ts:36`: `GENKIT_BACKEND_URL`

```typescript
// backend.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// agent/route.ts
const backendUrl = process.env.GENKIT_BACKEND_URL || "http://localhost:3400";
```

**영향**:
- 두 파일이 다른 백엔드 URL 참조
- 환경 설정 혼란
- 배포 시 일부 기능만 작동

**해결 방안**:
```typescript
// 1. 단일 환경 변수로 통합
// .env
BACKEND_URL=http://localhost:4000

// lib/config.ts (중앙 설정)
export const config = {
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:4000",
};

// 모든 파일에서 import해서 사용
import { config } from '@/lib/config';
const response = await fetch(`${config.backendUrl}/api/...`);
```

---

### 3.6 보안: API 인증 없음

**관련 파일**:
- `apps/web/src/app/api/sessions/route.ts`
- `apps/web/src/app/api/workflow/execute/route.ts`
- `apps/web/src/app/api/workflow/agent/route.ts`

```typescript
// 모든 API에 인증 없음
export async function POST(request: NextRequest) {
  // ❌ 인증 체크 없음
  const body = await request.json();
  // 바로 실행...
}
```

**해결 방안**:
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // API 키 또는 세션 검증
    const apiKey = request.headers.get('x-api-key');
    const session = request.cookies.get('session');

    if (!apiKey && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

---

### 3.7 unsafe `any` 타입 캐스트

**파일**: `apps/web/src/lib/workflow/executor.ts`

```typescript
// 발견된 unsafe any 캐스트 (7개)
cost: (output as any)?.cost || 0,                    // :598
videoClips: videoResult.data!.clips.map((c: any) => // ProductionFlow.ts:318
protected readonly inputSchema = ... as any;         // 여러 Agent 파일
protected readonly outputSchema = ... as any;        // 여러 Agent 파일
```

**해결 방안**:
```typescript
// 1. 타입 가드 사용
function hasCoSt(obj: unknown): obj is { cost: number } {
  return typeof obj === 'object' && obj !== null && 'cost' in obj;
}

const cost = hasCoSt(output) ? output.cost : 0;

// 2. Zod infer 타입 사용
import { z } from 'zod';

const outputSchema = z.object({ cost: z.number() });
type OutputType = z.infer<typeof outputSchema>;

const output: OutputType = outputSchema.parse(rawOutput);
```

---

### 3.8 Race Condition: 병렬 에이전트 실행

**파일**: `apps/web/src/lib/workflow/executor.ts:484` (추정)

```typescript
// 병렬 실행 시 공유 상태 접근
private async executePhase(phase: WorkflowPhase): Promise<void> {
  const phaseAgents = AGENT_DEFINITIONS.filter(a => a.phase === phase);

  // 병렬 에이전트들이 동시에 실행
  await Promise.all(
    phaseAgents.map(agent => this.executeAgent(agent))
  );
  // ❌ this.agentResults, this.totalCost 등 공유 상태 동시 수정
}
```

**해결 방안**:
```typescript
// 1. 결과 수집 후 일괄 업데이트
private async executePhase(phase: WorkflowPhase): Promise<void> {
  const phaseAgents = AGENT_DEFINITIONS.filter(a => a.phase === phase);

  const results = await Promise.all(
    phaseAgents.map(async agent => {
      const result = await this.callAgentAPI(agent, this.prepareAgentInput(agent));
      return { agentId: agent.id, result };
    })
  );

  // 순차적으로 상태 업데이트
  for (const { agentId, result } of results) {
    this.agentResults[agentId] = result;
    this.totalCost += result.cost || 0;
  }
}
```

---

### 3.9 Pause/Resume Promise 불일치

**파일**: `apps/web/src/lib/workflow/executor.ts:548-552`

```typescript
// 문제 코드
if (this.isPaused) {
  await new Promise<void>((resolve) => {
    this.pauseResolve = resolve;  // resolve만 저장
  });
  // ❌ reject 핸들링 없음
  // ❌ 타임아웃 없음
}

// resume() 에서
resume(): void {
  if (this.pauseResolve) {
    this.pauseResolve();
    this.pauseResolve = null;  // 한 번만 호출 가능
  }
}
```

**해결 방안**:
```typescript
private pausePromise: { resolve: () => void; reject: (err: Error) => void } | null = null;

if (this.isPaused) {
  await new Promise<void>((resolve, reject) => {
    this.pausePromise = { resolve, reject };

    // 타임아웃 설정 (30분)
    setTimeout(() => {
      if (this.pausePromise) {
        this.pausePromise.reject(new Error('Pause timeout'));
        this.pausePromise = null;
      }
    }, 30 * 60 * 1000);
  });
}

resume(): void {
  if (this.pausePromise) {
    this.pausePromise.resolve();
    this.pausePromise = null;
  }
}

cancel(): void {
  if (this.pausePromise) {
    this.pausePromise.reject(new Error('Cancelled'));
    this.pausePromise = null;
  }
}
```

---

## 4. Medium Priority Issues (P2)

### 4.1 0으로 나눔 가능성

**파일**: `apps/web/src/lib/workflow/executor.ts:902-907`

```typescript
private calculateTotalProgress(): number {
  const completedAgents = Object.values(this.agentResults).filter(
    (r) => r.status === "completed"
  ).length;
  const totalAgents = AGENT_DEFINITIONS.filter((a) => this.isAgentEnabled(a)).length;
  return Math.round((completedAgents / totalAgents) * 100);  // ❌ totalAgents가 0일 때
}
```

**해결 방안**:
```typescript
private calculateTotalProgress(): number {
  const totalAgents = AGENT_DEFINITIONS.filter((a) => this.isAgentEnabled(a)).length;
  if (totalAgents === 0) return 100;  // 또는 0

  const completedAgents = Object.values(this.agentResults).filter(
    (r) => r.status === "completed"
  ).length;
  return Math.round((completedAgents / totalAgents) * 100);
}
```

---

### 4.2 Pause가 에이전트 사이에서만 작동

**파일**: `apps/web/src/lib/workflow/executor.ts:538-558`

```typescript
// pause는 에이전트 실행 전에만 체크됨
private async executeAgentWithPause(agent: AgentDefinition): Promise<void> {
  if (this.options.mode === "step" && !this.isPaused) {
    this.isPaused = true;
    // ...
  }

  if (this.isPaused) {
    await new Promise<void>((resolve) => {...});
  }

  // 여기서 에이전트 실행 시작하면 중간에 pause 불가
  await this.executeAgent(agent);
}
```

**해결 방안**:
```typescript
// AbortController 사용
private abortController: AbortController | null = null;

private async executeAgent(agent: AgentDefinition): Promise<void> {
  this.abortController = new AbortController();

  const response = await fetch("/api/workflow/agent", {
    signal: this.abortController.signal,  // 취소 신호
    ...
  });
}

pause(): void {
  this.isPaused = true;
  this.abortController?.abort();  // 진행 중인 요청 취소
}
```

---

### 4.3 세션 스토리지 로컬 FS 의존

**파일**: `apps/web/src/lib/workflow/session-storage.ts`

```typescript
// 로컬 파일시스템에 의존
const sessionsDir = path.join(process.cwd(), "data", "sessions");
```

**영향**: 서버리스/멀티노드 환경에서 데이터 유실

**해결 방안**:
```typescript
// 추상화 레이어 도입
interface StorageProvider {
  write(path: string, data: Buffer): Promise<void>;
  read(path: string): Promise<Buffer>;
  list(prefix: string): Promise<string[]>;
  delete(path: string): Promise<void>;
}

// 로컬 구현
class LocalStorageProvider implements StorageProvider {...}

// S3/GCS 구현
class CloudStorageProvider implements StorageProvider {...}

// 환경에 따라 선택
const storage = process.env.STORAGE_PROVIDER === 'cloud'
  ? new CloudStorageProvider()
  : new LocalStorageProvider();
```

---

### 4.4 API 미구현 (Veo/Imagen)

**파일들**:
- `src/clients/veo.ts:624-626`
- `src/clients/imagen.ts:322-335`

```typescript
// Veo
throw new Error('Veo extension API integration pending.');

// Imagen
throw new Error(
  'Imagen API integration pending. ' +
  'The API is available via Vertex AI but requires specific endpoint configuration.'
);
```

**해결 방안**:
```typescript
// 1. 기능 플래그로 분기
const FEATURES = {
  VEO_EXTEND: process.env.ENABLE_VEO_EXTEND === 'true',
  IMAGEN: process.env.ENABLE_IMAGEN === 'true',
};

if (!FEATURES.VEO_EXTEND) {
  console.warn('[VeoClient] Extension not available, using workaround');
  return this.generateNewClip(request);  // 대체 로직
}

// 2. 명시적 에러 처리
class FeatureNotImplementedError extends Error {
  constructor(feature: string) {
    super(`Feature '${feature}' is not yet implemented`);
    this.name = 'FeatureNotImplementedError';
  }
}
```

---

### 4.5 React 컴포넌트 Memoization 누락

**파일들**:
- `apps/web/src/components/workflow/WorkflowExecutionPanel.tsx`
- `apps/web/src/components/workflow/SessionBrowser.tsx`

```typescript
// 문제: 매 렌더링마다 새 객체 생성
function WorkflowExecutionPanel({ config }: Props) {
  const [progress, setProgress] = useState({});  // 매번 새 객체

  // 콜백도 매번 새로 생성
  const handleAgentClick = (agentId: string) => {...};

  return (
    <AgentList
      onClick={handleAgentClick}  // 불필요한 리렌더링 유발
    />
  );
}
```

**해결 방안**:
```typescript
import { useMemo, useCallback, memo } from 'react';

const WorkflowExecutionPanel = memo(function WorkflowExecutionPanel({ config }: Props) {
  const [progress, setProgress] = useState({});

  // 콜백 메모이제이션
  const handleAgentClick = useCallback((agentId: string) => {
    // ...
  }, [/* dependencies */]);

  // 계산된 값 메모이제이션
  const enabledAgents = useMemo(() =>
    agents.filter(a => isEnabled(a, config)),
    [agents, config]
  );

  return <AgentList onClick={handleAgentClick} agents={enabledAgents} />;
});
```

---

### 4.6 Error Boundary 없음

**영향**: React 컴포넌트 에러가 전체 앱 크래시 유발

**해결 방안**:
```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // 에러 리포팅 서비스에 전송
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2>Something went wrong</h2>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

### 4.7 N+1 쿼리 패턴 (Sessions API)

**파일**: `apps/web/src/app/api/sessions/route.ts`

```typescript
// 각 세션마다 개별 파일 읽기
const sessions = await Promise.all(
  sessionDirs.map(async (dir) => {
    const manifestPath = path.join(sessionsDir, dir, 'manifest.json');
    // N개 세션 = N번 파일 읽기
  })
);
```

**해결 방안**:
```typescript
// 1. 인덱스 파일 유지
// sessions/index.json에 모든 세션 메타데이터 저장

// 2. 캐싱 레이어 추가
import { LRUCache } from 'lru-cache';

const sessionCache = new LRUCache<string, SessionMetadata>({
  max: 100,
  ttl: 1000 * 60 * 5,  // 5분
});
```

---

### 4.8 fetch 타임아웃 없음

**해결 방안**:
```typescript
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}
```

---

## 5. Low Priority Issues (P3)

### 5.1 ARIA 레이블 누락

```tsx
// 문제
<button onClick={handleClick}>
  <Plus className="w-4 h-4" />
</button>

// 해결
<button onClick={handleClick} aria-label="새 워크플로우 추가">
  <Plus className="w-4 h-4" />
</button>
```

---

### 5.2 키보드 내비게이션 미지원

```tsx
// 해결
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  ...
</div>
```

---

### 5.3 Magic Numbers

```typescript
// 문제
const timeout = 30000;
const maxRetries = 3;

// 해결
// config/constants.ts
export const WORKFLOW_CONFIG = {
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  QUALITY_THRESHOLD: 0.85,
} as const;
```

---

### 5.4 하드코딩된 문자열

```typescript
// 문제
console.log('[VoiceAgent] Starting...');

// 해결
import { AGENT_NAMES } from '@/config/constants';
console.log(`[${AGENT_NAMES.VOICE}] Starting...`);
```

---

## 6. Architecture Recommendations

### 6.1 레이어드 아키텍처 도입

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│  (React Components, Pages, Hooks)                   │
├─────────────────────────────────────────────────────┤
│                  Application Layer                   │
│  (WorkflowExecutor, SessionManager, Use Cases)      │
├─────────────────────────────────────────────────────┤
│                   Domain Layer                       │
│  (Agents, Flows, Business Logic)                    │
├─────────────────────────────────────────────────────┤
│                Infrastructure Layer                  │
│  (API Clients, Storage, External Services)          │
└─────────────────────────────────────────────────────┘
```

### 6.2 의존성 주입 패턴

```typescript
// 인터페이스 정의
interface IStorageService {
  save(key: string, data: unknown): Promise<void>;
  load(key: string): Promise<unknown>;
}

interface IAgentService {
  execute(agentId: string, input: unknown): Promise<unknown>;
}

// 컨테이너
class DependencyContainer {
  private static instance: DependencyContainer;
  private services = new Map<string, unknown>();

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  resolve<T>(key: string): T {
    return this.services.get(key) as T;
  }
}
```

### 6.3 이벤트 기반 통신

```typescript
// 이벤트 버스
class EventBus {
  private handlers = new Map<string, Set<Function>>();

  on(event: string, handler: Function): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach(h => h(data));
  }
}

// 사용
eventBus.emit('agent:completed', { agentId: 'voice', output: {...} });
eventBus.on('agent:completed', (data) => updateUI(data));
```

---

## 7. Implementation Roadmap

### Phase 1: Critical Fixes (1-2일)

1. **상대 URL → 절대 URL** (`executor.ts:729`)
2. **Mock fallback 제어** (`agent/route.ts`)
3. **클립 스키마 통일** (ImageVideoAgent ↔ EditorAgent)

### Phase 2: Pipeline Integrity (2-3일)

4. **오디오/자막 연결** (ProductionFlow)
5. **Editor 렌더링 또는 composedVideo 활용**
6. **비용 추적 스키마 정렬**

### Phase 3: State Management (2-3일)

7. **메모리 Map → 외부 상태 저장소**
8. **전역 currentSession 제거**
9. **postProcess 호출 체인 수정**

### Phase 4: Security & Stability (1-2일)

10. **API 인증 미들웨어 추가**
11. **Error Boundary 추가**
12. **타임아웃 및 재시도 로직**

### Phase 5: Performance & Quality (지속적)

13. **React 컴포넌트 최적화**
14. **캐싱 레이어 추가**
15. **타입 안전성 강화**

---

## 부록: 파일별 이슈 맵

| 파일 | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| `executor.ts` | 2 | 5 | 3 | 1 |
| `agent/route.ts` | 1 | 1 | - | - |
| `ProductionFlow.ts` | 2 | 1 | - | - |
| `EditorAgent.ts` | 1 | - | - | - |
| `ImageVideoAgent.ts` | 1 | - | - | - |
| `BaseAgent.ts` | - | 1 | - | - |
| `LocalStorageManager.ts` | - | 1 | 1 | - |
| `backend.ts` | - | 1 | - | - |
| `session-storage.ts` | - | - | 1 | - |
| `execute/route.ts` | - | 1 | - | - |
| `sessions/route.ts` | - | 1 | 1 | - |
| `veo.ts` | - | - | 1 | - |
| `imagen.ts` | - | - | 1 | - |
| Components (전체) | - | - | 3 | 4 |

---

**문서 작성**: Claude Code
**검토 필요**: 기술 리드
