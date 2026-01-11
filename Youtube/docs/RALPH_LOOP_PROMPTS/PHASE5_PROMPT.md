# Phase 5: Optimization & Type Safety

## 목표
성능 최적화, 타입 안전성 강화, 코드 품질 개선을 완료합니다.

---

## 선행 조건

Phase 4가 완료되어야 합니다. 먼저 확인:

```bash
npm run build
```

---

## Task 5.1: unsafe any 타입 제거

### 파일: `apps/web/src/lib/workflow/executor.ts`

**찾아야 할 패턴:**
```typescript
(output as any)?.cost
(c: any) =>
... as any
```

**수정 방향:**

```typescript
// 1. 타입 가드 함수들 추가
interface HasCost {
  cost: number;
}

interface HasMetrics {
  metrics?: {
    cost?: number;
  };
}

function hasCost(obj: unknown): obj is HasCost {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'cost' in obj &&
    typeof (obj as HasCost).cost === 'number'
  );
}

function hasMetrics(obj: unknown): obj is HasMetrics {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'metrics' in obj
  );
}

// 2. 비용 추출 함수 개선
function extractCost(output: unknown): number {
  if (hasCost(output)) {
    return output.cost;
  }
  if (hasMetrics(output) && output.metrics?.cost !== undefined) {
    return output.metrics.cost;
  }
  return 0;
}

// 3. 클립 타입 정의
interface ClipData {
  sceneId: string;
  url?: string;
  imageUrl?: string;
  imagePath?: string;
  mediaUrl?: string;
  duration: number;
  priority?: 'hero' | 'standard' | 'b-roll';
}

// 사용
videoClips: (videoResult.data?.clips as ClipData[] | undefined)?.map((c) => ({
  sceneId: c.sceneId,
  url: c.url || c.mediaUrl || c.imageUrl || c.imagePath,
  duration: c.duration,
  priority: c.priority,
})) ?? [],
```

### Agent 파일들의 `as any` 제거

**파일: `src/agents/production/ImageVideoAgent.ts` 등**

```typescript
// 변경 전
protected readonly inputSchema = ImageVideoInputSchema as any;
protected readonly outputSchema = ImageVideoOutputSchema as any;

// 변경 후 - 제네릭 활용
export class ImageVideoAgent extends BaseAgent<
  z.infer<typeof ImageVideoInputSchema>,
  z.infer<typeof ImageVideoOutputSchema>
> {
  protected readonly inputSchema = ImageVideoInputSchema;
  protected readonly outputSchema = ImageVideoOutputSchema;
}
```

### BaseAgent 제네릭 개선

**파일: `src/agents/base/BaseAgent.ts`**

```typescript
import { z, ZodType, ZodTypeDef } from 'zod';

export abstract class BaseAgent<
  TInput,
  TOutput,
  TInputSchema extends ZodType<TInput, ZodTypeDef, unknown> = ZodType<TInput>,
  TOutputSchema extends ZodType<TOutput, ZodTypeDef, unknown> = ZodType<TOutput>
> {
  protected abstract readonly inputSchema: TInputSchema;
  protected abstract readonly outputSchema: TOutputSchema;

  // 타입 안전한 검증
  protected validateInput(input: unknown): TInput {
    return this.inputSchema.parse(input);
  }

  protected validateOutput(output: unknown): TOutput {
    return this.outputSchema.parse(output);
  }
}
```

---

## Task 5.2: React 컴포넌트 최적화

### 파일: `apps/web/src/components/workflow/WorkflowExecutionPanel.tsx`

```typescript
import { memo, useMemo, useCallback, useState } from 'react';

// 하위 컴포넌트 메모이제이션
const AgentCard = memo(function AgentCard({
  agent,
  result,
  onClick,
}: {
  agent: AgentDefinition;
  result?: AgentExecutionResult;
  onClick: (id: string) => void;
}) {
  const handleClick = useCallback(() => {
    onClick(agent.id);
  }, [agent.id, onClick]);

  return (
    <div onClick={handleClick} className="...">
      {/* ... */}
    </div>
  );
});

// 메인 컴포넌트
export const WorkflowExecutionPanel = memo(function WorkflowExecutionPanel({
  config,
  onComplete,
}: Props) {
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // 콜백 메모이제이션
  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgent(agentId);
  }, []);

  // 계산된 값 메모이제이션
  const enabledAgents = useMemo(() => {
    return AGENT_DEFINITIONS.filter(agent =>
      isAgentEnabled(agent, config)
    );
  }, [config]);

  const groupedAgents = useMemo(() => {
    return groupAgentsByPhase(enabledAgents);
  }, [enabledAgents]);

  const selectedResult = useMemo(() => {
    if (!selectedAgent || !progress) return null;
    return progress.agentResults[selectedAgent];
  }, [selectedAgent, progress]);

  return (
    <div className="...">
      {groupedAgents.map(({ phase, agents }) => (
        <PhaseSection key={phase} phase={phase}>
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              result={progress?.agentResults[agent.id]}
              onClick={handleAgentClick}
            />
          ))}
        </PhaseSection>
      ))}

      {selectedResult && (
        <AgentDetailPanel result={selectedResult} />
      )}
    </div>
  );
});
```

### 파일: `apps/web/src/components/workflow/SessionBrowser.tsx`

```typescript
import { memo, useMemo, useCallback } from 'react';

// 세션 목록 아이템
const SessionItem = memo(function SessionItem({
  session,
  isSelected,
  onSelect,
}: {
  session: SessionMetadata;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(session.id);
  }, [session.id, onSelect]);

  return (
    <div
      onClick={handleClick}
      className={`... ${isSelected ? 'bg-blue-50' : ''}`}
    >
      {/* ... */}
    </div>
  );
});

export const SessionBrowser = memo(function SessionBrowser({
  onSelectSession,
  onResumeSession,
}: Props) {
  // ...

  // 정렬된 세션 목록 (메모이제이션)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [sessions]);

  return (/* ... */);
});
```

---

## Task 5.3: N+1 쿼리 개선

### 파일: `apps/web/src/app/api/sessions/route.ts`

**방안 1: 인덱스 파일 사용**

```typescript
// 세션 생성 시 인덱스 업데이트
async function updateSessionIndex(sessionInfo: SessionMetadata): Promise<void> {
  const indexPath = path.join(sessionsDir, 'index.json');

  let index: SessionMetadata[] = [];
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }

  // 기존 항목 업데이트 또는 추가
  const existingIndex = index.findIndex(s => s.id === sessionInfo.id);
  if (existingIndex >= 0) {
    index[existingIndex] = sessionInfo;
  } else {
    index.push(sessionInfo);
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

// GET: 인덱스에서 조회 (빠름)
export async function GET(request: NextRequest) {
  const indexPath = path.join(sessionsDir, 'index.json');

  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    return NextResponse.json({ sessions: index });
  }

  // 인덱스 없으면 기존 방식 (초기화용)
  // ...
}
```

**방안 2: LRU 캐시 사용**

```typescript
import { LRUCache } from 'lru-cache';

const sessionCache = new LRUCache<string, SessionMetadata>({
  max: 100,
  ttl: 1000 * 60 * 5,  // 5분
});

async function getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
  // 캐시 확인
  const cached = sessionCache.get(sessionId);
  if (cached) {
    return cached;
  }

  // 파일에서 로드
  const manifestPath = path.join(sessionsDir, sessionId, 'metadata.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const metadata = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // 캐시에 저장
  sessionCache.set(sessionId, metadata);

  return metadata;
}
```

---

## Task 5.4: Constants 추출

### 새 파일: `apps/web/src/lib/constants.ts`

```typescript
/**
 * 애플리케이션 상수
 */

// 타임아웃 설정 (밀리초)
export const TIMEOUTS = {
  API_DEFAULT: 30000,       // 30초
  AGENT_EXECUTION: 120000,  // 2분
  PAUSE_MAX: 30 * 60 * 1000, // 30분
  SSE_KEEPALIVE: 15000,     // 15초
} as const;

// 재시도 설정
export const RETRY = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000,
} as const;

// 워크플로우 설정
export const WORKFLOW = {
  MAX_COST_PER_VIDEO: 30.00,
  QUALITY_THRESHOLD: 0.85,
  MAX_QUALITY_ITERATIONS: 5,
  CONVERGENCE_THRESHOLD: 0.02,
  DIMINISHING_RETURNS_THRESHOLD: 0.5,
} as const;

// 비디오 설정
export const VIDEO = {
  VEO_OPTIMAL_CLIP_DURATION: 8,
  VEO_MAX_CLIP_DURATION: 148,
  DEFAULT_FPS: 30,
  DEFAULT_RESOLUTION: '1080p',
} as const;

// 에이전트 이름
export const AGENT_NAMES = {
  TREND: 'trend-agent',
  TOPIC: 'topic-agent',
  SCRIPT: 'script-agent',
  VOICE: 'voice-agent',
  VIDEO: 'video-agent',
  IMAGE_VIDEO: 'image-video-agent',
  THUMBNAIL: 'thumbnail-agent',
  SUBTITLE: 'subtitle-agent',
  EDITOR: 'editor-agent',
  CRITIC: 'critic-agent',
  ART_EVALUATOR: 'art-evaluator-agent',
  REVISION: 'revision-agent',
} as const;

// 로그 접두사
export const LOG_PREFIX = {
  WORKFLOW: '[Workflow]',
  EXECUTOR: '[Executor]',
  AGENT: '[Agent]',
  STORAGE: '[Storage]',
  API: '[API]',
} as const;
```

### 기존 코드에서 사용

```typescript
import { TIMEOUTS, RETRY, WORKFLOW } from '@/lib/constants';

// 변경 전
const timeout = 30000;

// 변경 후
const timeout = TIMEOUTS.API_DEFAULT;
```

---

## Task 5.5: 접근성 개선

### 버튼 및 인터랙티브 요소

```tsx
// 변경 전
<button onClick={handleClick}>
  <Plus className="w-4 h-4" />
</button>

// 변경 후
<button
  onClick={handleClick}
  aria-label="새 워크플로우 추가"
  title="새 워크플로우 추가"
>
  <Plus className="w-4 h-4" aria-hidden="true" />
</button>
```

### 키보드 내비게이션

```tsx
// 클릭 가능한 div를 접근 가능하게
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label={`${agent.name} 에이전트 선택`}
>
  {/* ... */}
</div>
```

### 스크린 리더 지원

```tsx
// 상태 알림
<div role="status" aria-live="polite" className="sr-only">
  {isLoading && '로딩 중...'}
  {error && `오류: ${error}`}
  {success && '완료되었습니다'}
</div>

// 진행률 표시
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="워크플로우 진행률"
>
  <div style={{ width: `${progress}%` }} />
</div>
```

---

## Task 5.6: 미구현 에러 표준화

### 새 파일: `apps/web/src/lib/errors.ts`

```typescript
/**
 * 커스텀 에러 클래스들
 */

export class FeatureNotImplementedError extends Error {
  public readonly feature: string;

  constructor(feature: string, details?: string) {
    const message = details
      ? `Feature '${feature}' is not yet implemented: ${details}`
      : `Feature '${feature}' is not yet implemented`;

    super(message);
    this.name = 'FeatureNotImplementedError';
    this.feature = feature;
  }
}

export class ConfigurationError extends Error {
  public readonly configKey: string;

  constructor(configKey: string, message: string) {
    super(`Configuration error for '${configKey}': ${message}`);
    this.name = 'ConfigurationError';
    this.configKey = configKey;
  }
}

export class AgentExecutionError extends Error {
  public readonly agentId: string;
  public readonly phase?: string;

  constructor(agentId: string, message: string, phase?: string) {
    super(`Agent '${agentId}' execution failed: ${message}`);
    this.name = 'AgentExecutionError';
    this.agentId = agentId;
    this.phase = phase;
  }
}

export class ValidationError extends Error {
  public readonly field: string;
  public readonly value: unknown;

  constructor(field: string, message: string, value?: unknown) {
    super(`Validation error for '${field}': ${message}`);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}
```

### Veo/Imagen에서 사용

**파일: `src/clients/veo.ts`**

```typescript
import { FeatureNotImplementedError } from '@/lib/errors';

async extend(request: ExtendRequest): Promise<ExtendResult> {
  throw new FeatureNotImplementedError(
    'VEO_EXTEND',
    'Veo extension API requires additional configuration. ' +
    'See Google Cloud documentation for details.'
  );
}
```

**파일: `src/clients/imagen.ts`**

```typescript
import { FeatureNotImplementedError } from '@/lib/errors';

private async callImagenAPI(request: any): Promise<ImagenResponse> {
  throw new FeatureNotImplementedError(
    'IMAGEN_API',
    'Imagen API is available via Vertex AI but requires specific endpoint configuration.'
  );
}
```

---

## Task 5.7: 에러 메시지 상수화

### 파일: `apps/web/src/lib/error-messages.ts`

```typescript
export const ERROR_MESSAGES = {
  // API 에러
  API_TIMEOUT: '요청 시간이 초과되었습니다. 다시 시도해 주세요.',
  API_UNAUTHORIZED: '인증이 필요합니다.',
  API_FORBIDDEN: '접근 권한이 없습니다.',
  API_NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
  API_SERVER_ERROR: '서버 오류가 발생했습니다.',

  // 워크플로우 에러
  WORKFLOW_CANCELLED: '워크플로우가 취소되었습니다.',
  WORKFLOW_TIMEOUT: '워크플로우 실행 시간이 초과되었습니다.',
  WORKFLOW_BUDGET_EXCEEDED: '예산 한도를 초과했습니다.',

  // 에이전트 에러
  AGENT_NOT_FOUND: (id: string) => `에이전트를 찾을 수 없습니다: ${id}`,
  AGENT_EXECUTION_FAILED: (id: string) => `에이전트 실행 실패: ${id}`,
  AGENT_VALIDATION_FAILED: '입력 데이터 검증에 실패했습니다.',

  // 스토리지 에러
  STORAGE_WRITE_FAILED: '파일 저장에 실패했습니다.',
  STORAGE_READ_FAILED: '파일 읽기에 실패했습니다.',
  SESSION_NOT_FOUND: (id: string) => `세션을 찾을 수 없습니다: ${id}`,
} as const;
```

---

## 완료 확인

```bash
npm run build
npx tsc --noEmit
npm run lint
```

---

## 완료 조건

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 성공 (타입 에러 0개)
- [ ] unsafe `any` 캐스트 제거됨 (최소 7개)
- [ ] React 컴포넌트 memo/useMemo/useCallback 적용
- [ ] N+1 쿼리 개선됨 (인덱스 또는 캐시)
- [ ] constants.ts에 매직 넘버 추출됨
- [ ] 접근성 속성 추가됨 (aria-label, role 등)
- [ ] FeatureNotImplementedError 사용
- [ ] 에러 메시지 상수화됨

**모든 조건 충족 시 아래 출력:**

<promise>ALL PHASES COMPLETE</promise>
