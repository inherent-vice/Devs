# Phase 3: State Management (상태 관리)

## 목표
동시성 안전 및 세션 격리를 보장하고, 외부 상태 저장소로의 확장 가능성을 확보합니다.

---

## 선행 조건

Phase 2가 완료되어야 합니다. 먼저 확인:

```bash
npm run build
```

---

## Task 3.1: Executor 저장소 추상화

### 새 파일 생성: `apps/web/src/lib/workflow/executor-store.ts`

```typescript
import type { WorkflowExecutor } from './executor';

/**
 * Executor 저장소 인터페이스
 * 메모리, Redis, DB 등 다양한 백엔드 지원
 */
export interface IExecutorStore {
  get(sessionId: string): Promise<WorkflowExecutor | undefined>;
  set(sessionId: string, executor: WorkflowExecutor): Promise<void>;
  delete(sessionId: string): Promise<void>;
  has(sessionId: string): Promise<boolean>;
  list(): Promise<string[]>;
}

/**
 * 메모리 기반 구현 (기본)
 * 단일 인스턴스 환경에서 사용
 */
export class MemoryExecutorStore implements IExecutorStore {
  private store = new Map<string, WorkflowExecutor>();

  async get(sessionId: string): Promise<WorkflowExecutor | undefined> {
    return this.store.get(sessionId);
  }

  async set(sessionId: string, executor: WorkflowExecutor): Promise<void> {
    this.store.set(sessionId, executor);
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }

  async has(sessionId: string): Promise<boolean> {
    return this.store.has(sessionId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

// 싱글톤 인스턴스
let executorStore: IExecutorStore | null = null;

export function getExecutorStore(): IExecutorStore {
  if (!executorStore) {
    // 환경에 따라 다른 구현 선택 가능
    // if (process.env.REDIS_URL) {
    //   executorStore = new RedisExecutorStore();
    // } else {
    executorStore = new MemoryExecutorStore();
    // }
  }
  return executorStore;
}

export function setExecutorStore(store: IExecutorStore): void {
  executorStore = store;
}
```

### 파일 수정: `apps/web/src/app/api/workflow/execute/route.ts`

```typescript
import { getExecutorStore } from '@/lib/workflow/executor-store';

// 기존 Map 제거
// const activeExecutors = new Map<string, WorkflowExecutor>();

export async function POST(request: NextRequest) {
  const store = getExecutorStore();

  // ... 기존 로직

  // 저장
  await store.set(sessionId, executor);

  // 콜백에서 삭제
  callbacks: {
    onComplete: async (result) => {
      sseCallbacks.onComplete?.(result);
      await store.delete(sessionId);
    },
    onCancel: async () => {
      sseCallbacks.onCancel?.();
      await store.delete(sessionId);
    },
  },
}
```

### 파일 수정: `apps/web/src/app/api/workflow/control/route.ts`

```typescript
import { getExecutorStore } from '@/lib/workflow/executor-store';

export async function POST(request: NextRequest) {
  const store = getExecutorStore();
  const { sessionId, action } = await request.json();

  const executor = await store.get(sessionId);
  if (!executor) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // ... 나머지 로직
}
```

---

## Task 3.2: 전역 세션 제거

### 파일: `src/storage/LocalStorageManager.ts`

**현재 문제:**
```typescript
export class LocalStorageManager {
  private currentSession: SessionInfo | null = null;  // 전역 상태
```

**수정:**
```typescript
export class LocalStorageManager {
  // currentSession 제거
  // private currentSession: SessionInfo | null = null;

  // 모든 메서드에 sessionId 파라미터 추가

  getSessionDir(sessionId: string): string {
    return path.join(this.baseDir, 'sessions', sessionId);
  }

  saveAsset(
    sessionId: string,  // 필수 파라미터
    type: AssetType,
    filename: string,
    data: Buffer
  ): AssetInfo {
    const sessionDir = this.getSessionDir(sessionId);
    const typeDir = path.join(sessionDir, type);

    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }

    const filepath = path.join(typeDir, filename);
    fs.writeFileSync(filepath, data);

    return {
      type,
      filename,
      path: filepath,
      size: data.length,
      createdAt: new Date().toISOString(),
    };
  }

  loadAsset(sessionId: string, type: AssetType, filename: string): Buffer | null {
    const filepath = path.join(this.getSessionDir(sessionId), type, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    return fs.readFileSync(filepath);
  }

  getSessionManifest(sessionId: string): SessionManifest | null {
    const manifestPath = path.join(this.getSessionDir(sessionId), 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }

  saveSessionManifest(sessionId: string, manifest: SessionManifest): void {
    const sessionDir = this.getSessionDir(sessionId);

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const manifestPath = path.join(sessionDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  // 세션 초기화도 sessionId 기반
  initializeSession(sessionId: string, config?: SessionConfig): SessionInfo {
    const sessionDir = this.getSessionDir(sessionId);

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const sessionInfo: SessionInfo = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      config: config || {},
    };

    // manifest 생성
    this.saveSessionManifest(sessionId, {
      session: sessionInfo,
      assets: [],
    });

    return sessionInfo;
  }
}
```

### 호출하는 곳 모두 수정

관련 파일들에서 sessionId를 명시적으로 전달하도록 수정:

- `src/agents/production/ImageVideoAgent.ts`
- `src/agents/production/VideoAgent.ts`
- `src/clients/nano-banana.ts`
- 기타 storage 사용 파일들

---

## Task 3.3: 수정본 저장 정책

### 파일: `apps/web/src/lib/workflow/executor.ts`

**수정된 출력도 저장:**
```typescript
// executeAgent 메서드 내부
if (this.storage) {
  await this.storage.saveAgentOutput(agent.phase, agent.id, finalOutput);

  // ✅ 수정 여부도 기록
  if (this.modifiedOutputs[agent.id]) {
    await this.storage.saveAgentOutput(
      agent.phase,
      agent.id,
      finalOutput,
      { suffix: '_modified', isModification: true }
    );
  }
}
```

**rerun 시 수정본 초기화 옵션:**
```typescript
async rerunAgent(
  agentId: string,
  modifiedInput?: unknown,
  options: { clearModifications?: boolean } = {}
): Promise<void> {
  const { clearModifications = true } = options;

  if (clearModifications) {
    delete this.modifiedOutputs[agentId];
  }

  const agent = AGENT_DEFINITIONS.find(a => a.id === agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  await this.executeAgent(agent, modifiedInput);
}
```

---

## Task 3.4: Race Condition 해결

### 파일: `apps/web/src/lib/workflow/executor.ts`

**병렬 실행 시 결과 수집 후 일괄 업데이트:**

```typescript
private async executePhaseAgents(
  agents: AgentDefinition[],
  parallel: boolean
): Promise<void> {
  if (!parallel) {
    // 순차 실행
    for (const agent of agents) {
      if (this.isCancelled) break;
      await this.executeAgentWithPause(agent);
    }
    return;
  }

  // 병렬 실행 - 결과 수집
  const results = await Promise.all(
    agents.map(async (agent) => {
      if (this.isCancelled) return null;

      try {
        // 임시 결과 저장 (공유 상태 미수정)
        const input = this.prepareAgentInput(agent);
        const output = await this.callAgentAPI(agent, input);
        const duration = Date.now() - Date.now(); // 실제 시작 시간 필요

        return {
          agent,
          input,
          output,
          duration,
          success: true,
        };
      } catch (error) {
        return {
          agent,
          error,
          success: false,
        };
      }
    })
  );

  // ✅ 순차적으로 상태 업데이트 (race condition 방지)
  for (const result of results) {
    if (!result || this.isCancelled) continue;

    if (result.success) {
      const agentResult: AgentExecutionResult = {
        agentId: result.agent.id,
        status: 'completed',
        input: result.input,
        output: result.output,
        duration: result.duration,
        cost: extractCost(result.output),
      };

      this.agentResults[result.agent.id] = agentResult;
      this.totalCost += agentResult.cost || 0;

      // Storage 저장
      if (this.storage) {
        await this.storage.saveAgentOutput(
          result.agent.phase,
          result.agent.id,
          result.output
        );
      }

      this.callbacks.onAgentComplete?.(result.agent.id, agentResult);
    } else {
      this.agentResults[result.agent.id] = {
        agentId: result.agent.id,
        status: 'failed',
        error: result.error?.message || 'Unknown error',
      };
    }
  }
}
```

---

## Task 3.5: Pause/Resume 개선

### 파일: `apps/web/src/lib/workflow/executor.ts`

```typescript
// 클래스 필드
private pausePromise: {
  resolve: () => void;
  reject: (err: Error) => void;
} | null = null;
private pauseTimeoutId: NodeJS.Timeout | null = null;

// Pause 대기 로직
private async waitForResume(): Promise<void> {
  if (!this.isPaused) return;

  return new Promise<void>((resolve, reject) => {
    this.pausePromise = { resolve, reject };

    // 30분 타임아웃
    this.pauseTimeoutId = setTimeout(() => {
      if (this.pausePromise) {
        this.pausePromise.reject(new Error('Pause timeout (30 minutes)'));
        this.pausePromise = null;
        this.pauseTimeoutId = null;
      }
    }, 30 * 60 * 1000);
  });
}

// Resume
resume(): void {
  if (!this.isPaused) return;

  this.isPaused = false;

  if (this.pauseTimeoutId) {
    clearTimeout(this.pauseTimeoutId);
    this.pauseTimeoutId = null;
  }

  if (this.pausePromise) {
    this.pausePromise.resolve();
    this.pausePromise = null;
  }

  this.callbacks.onResume?.();
  this.emitProgress();
}

// Cancel
cancel(): void {
  this.isCancelled = true;

  if (this.pauseTimeoutId) {
    clearTimeout(this.pauseTimeoutId);
    this.pauseTimeoutId = null;
  }

  if (this.pausePromise) {
    this.pausePromise.reject(new Error('Cancelled by user'));
    this.pausePromise = null;
  }

  this.callbacks.onCancel?.();
}

// executeAgentWithPause에서 사용
private async executeAgentWithPause(agent: AgentDefinition): Promise<void> {
  if (this.options.mode === 'step' && !this.isPaused) {
    this.log('info', `Step mode: Pausing before ${agent.id}`);
    this.isPaused = true;
    this.callbacks.onPause?.();
    this.emitProgress();
  }

  if (this.isPaused) {
    await this.waitForResume();  // ✅ 개선된 대기
  }

  if (this.isCancelled) return;

  await this.executeAgent(agent);
}
```

---

## Task 3.6: Storage Provider 추상화

### 새 파일: `apps/web/src/lib/workflow/storage-provider.ts`

```typescript
/**
 * Storage Provider 인터페이스
 * 로컬 FS, S3, GCS 등 다양한 백엔드 지원
 */
export interface IStorageProvider {
  write(relativePath: string, data: Buffer | string): Promise<void>;
  read(relativePath: string): Promise<Buffer>;
  readText(relativePath: string): Promise<string>;
  exists(relativePath: string): Promise<boolean>;
  delete(relativePath: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  getUrl(relativePath: string): string;
}

/**
 * 로컬 파일시스템 구현
 */
export class LocalStorageProvider implements IStorageProvider {
  constructor(private baseDir: string) {}

  async write(relativePath: string, data: Buffer | string): Promise<void> {
    const fullPath = path.join(this.baseDir, relativePath);
    const dir = path.dirname(fullPath);

    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, data);
  }

  async read(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, relativePath);
    return fs.promises.readFile(fullPath);
  }

  async readText(relativePath: string): Promise<string> {
    const buffer = await this.read(relativePath);
    return buffer.toString('utf-8');
  }

  async exists(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, relativePath);
    try {
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, relativePath);
    await fs.promises.unlink(fullPath);
  }

  async list(prefix: string): Promise<string[]> {
    const fullPath = path.join(this.baseDir, prefix);
    try {
      const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
      return entries.map(e => path.join(prefix, e.name));
    } catch {
      return [];
    }
  }

  getUrl(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }
}

// 팩토리 함수
let storageProvider: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (!storageProvider) {
    const baseDir = process.env.STORAGE_DIR || path.join(process.cwd(), 'data');
    storageProvider = new LocalStorageProvider(baseDir);
  }
  return storageProvider;
}
```

---

## 완료 확인

```bash
npm run build
npx tsc --noEmit
```

---

## 완료 조건

- [ ] `npm run build` 성공
- [ ] Executor Store 추상화 완료
- [ ] LocalStorageManager에서 전역 세션 제거됨
- [ ] 수정본 저장 정책 구현됨
- [ ] 병렬 실행 race condition 해결됨
- [ ] Pause/Resume에 타임아웃 및 reject 추가됨
- [ ] Storage Provider 추상화 완료

**모든 조건 충족 시 아래 출력:**

<promise>PHASE3 COMPLETE</promise>
