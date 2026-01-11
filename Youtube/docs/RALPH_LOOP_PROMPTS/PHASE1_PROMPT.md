# Phase 1: Critical API/URL 수정

## 목표
서버-클라이언트 API 통신 문제를 해결하여 워크플로우 실행이 정상 작동하도록 합니다.

---

## 반복 시작 시 확인사항

매 반복마다 다음을 먼저 확인하세요:

```bash
npm run build
```

빌드 결과를 분석하고, 이전 반복에서 수정한 내용이 제대로 적용되었는지 확인합니다.

---

## Task 1.1: 상대 URL → 절대 URL

### 파일: `apps/web/src/lib/workflow/executor.ts`
### 위치: 약 729번째 줄 `callAgentAPI` 메서드

**현재 문제 코드:**
```typescript
const response = await fetch("/api/workflow/agent", {
  method: "POST",
  ...
});
```

**수정 방향:**
```typescript
private getBaseUrl(): string {
  // 서버 환경에서는 환경변수 사용, 없으면 localhost
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  // 클라이언트에서는 현재 origin 사용
  return window.location.origin;
}

private async callAgentAPI(agent: AgentDefinition, input: unknown): Promise<unknown> {
  const baseUrl = this.getBaseUrl();
  const response = await fetch(`${baseUrl}/api/workflow/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: agent.id,
      input,
      config: this.config,
    }),
  });
  // ...
}
```

---

## Task 1.2: Mock Fallback 제어

### 파일: `apps/web/src/app/api/workflow/agent/route.ts`
### 위치: 약 36-61번째 줄

**현재 문제 코드:**
```typescript
try {
  const response = await fetch(`${backendUrl}/api/agent/${agentId}`, {...});
  if (!response.ok) {
    console.warn(`Backend agent ${agentId} not available, using mock data`);
    return mockAgentExecution(agentId, input, config);  // 항상 Mock
  }
} catch (error) {
  console.warn(`Backend connection failed...`);
  return mockAgentExecution(agentId, input, config);  // 항상 Mock
}
```

**수정 방향:**
```typescript
// 파일 상단에 환경 설정
const ALLOW_MOCK_FALLBACK = process.env.ALLOW_MOCK_FALLBACK === 'true' ||
                            process.env.NODE_ENV === 'development';

async function executeAgent(...) {
  try {
    const response = await fetch(`${backendUrl}/api/agent/${agentId}`, {...});

    if (!response.ok) {
      if (ALLOW_MOCK_FALLBACK) {
        console.warn(`[DEV] Backend agent ${agentId} not available, using mock`);
        return mockAgentExecution(agentId, input, config);
      }
      throw new Error(`Backend agent ${agentId} failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (ALLOW_MOCK_FALLBACK) {
      console.warn(`[DEV] Backend connection failed, using mock for ${agentId}`);
      return mockAgentExecution(agentId, input, config);
    }
    throw error;  // 프로덕션에서는 에러 전파
  }
}
```

---

## Task 1.3: URL 설정 통합

### 새 파일 생성: `apps/web/src/lib/config.ts`

```typescript
/**
 * 중앙 설정 파일
 * 모든 URL 및 환경 설정을 여기서 관리
 */

export const config = {
  // 애플리케이션 URL
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // 백엔드 URL (Genkit 서버)
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ||
              process.env.GENKIT_BACKEND_URL ||
              'http://localhost:4000',

  // 개발 모드 여부
  isDevelopment: process.env.NODE_ENV === 'development',

  // Mock 허용 여부
  allowMockFallback: process.env.ALLOW_MOCK_FALLBACK === 'true' ||
                     process.env.NODE_ENV === 'development',
} as const;

export type Config = typeof config;
```

### 기존 파일 수정

**`apps/web/src/lib/backend.ts`:**
```typescript
import { config } from './config';

const BACKEND_URL = config.backendUrl;
// 나머지 코드에서 BACKEND_URL 사용
```

**`apps/web/src/app/api/workflow/agent/route.ts`:**
```typescript
import { config } from '@/lib/config';

const backendUrl = config.backendUrl;
const ALLOW_MOCK_FALLBACK = config.allowMockFallback;
```

---

## Task 1.4-1.6: 클립 스키마 통일

### 파일: `src/agents/production/ImageVideoAgent.ts`
### 위치: ImageClipSchema (약 73-87줄)

**수정:**
```typescript
export const ImageClipSchema = z.object({
  sceneId: z.string(),
  imageUrl: z.string(),      // 기존 유지
  mediaUrl: z.string(),      // 새 통합 필드 (imageUrl과 동일값)
  duration: z.number(),
  // ... 나머지 필드
});
```

**execute 메서드에서 클립 생성 시:**
```typescript
clips.push({
  sceneId: scene.id,
  imageUrl: imageResult.url,
  mediaUrl: imageResult.url,  // 통합 필드도 설정
  duration: scene.duration,
  // ...
});
```

### 파일: `src/flows/ProductionFlow.ts`
### 위치: EditorAgent 호출 부분 (약 318-324줄)

**수정:**
```typescript
videoClips: videoResult.data!.clips.map((c: any) => ({
  sceneId: c.sceneId,
  url: c.url || c.mediaUrl || c.imageUrl || c.imagePath,  // 모든 가능성
  imagePath: c.imagePath || c.imageUrl || c.mediaUrl,
  mediaUrl: c.mediaUrl || c.imageUrl || c.url,
  duration: c.duration,
  priority: c.priority,
})),
```

### 파일: `src/agents/production/EditorAgent.ts`
### 위치: EditorAgentInputSchema (약 30-36줄)

**수정:**
```typescript
videoClips: z.array(z.object({
  sceneId: z.string(),
  url: z.string().optional(),
  imagePath: z.string().optional(),
  mediaUrl: z.string().optional(),  // 새 통합 필드
  duration: z.number(),
  priority: z.enum(['hero', 'standard', 'b-roll']).optional(),
})),
```

---

## 완료 확인

모든 Task 완료 후:

1. **빌드 테스트:**
   ```bash
   npm run build
   ```

2. **타입 검사:**
   ```bash
   npx tsc --noEmit
   ```

3. **수정된 파일 확인:**
   - `apps/web/src/lib/workflow/executor.ts`
   - `apps/web/src/app/api/workflow/agent/route.ts`
   - `apps/web/src/lib/config.ts` (새 파일)
   - `apps/web/src/lib/backend.ts`
   - `src/agents/production/ImageVideoAgent.ts`
   - `src/flows/ProductionFlow.ts`
   - `src/agents/production/EditorAgent.ts`

---

## 완료 조건

다음 조건이 모두 충족되면 완료:

- [ ] `npm run build` 성공 (에러 0개)
- [ ] 상대 URL이 절대 URL로 변경됨
- [ ] Mock fallback이 환경 변수로 제어됨
- [ ] config.ts에서 URL 통합 관리
- [ ] 클립 스키마가 mediaUrl 포함

**모든 조건 충족 시 아래 출력:**

<promise>PHASE1 COMPLETE</promise>
