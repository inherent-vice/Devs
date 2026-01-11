# Phase 4: Security & Error Handling

## 목표
API 보안을 강화하고 에러 처리를 개선하여 시스템 안정성을 높입니다.

---

## 선행 조건

Phase 3이 완료되어야 합니다. 먼저 확인:

```bash
npm run build
```

---

## Task 4.1: API 인증 미들웨어

### 새 파일 생성/수정: `apps/web/src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 인증이 필요한 API 경로
const PROTECTED_API_ROUTES = [
  '/api/workflow',
  '/api/sessions',
  '/api/generate',
];

// 인증 제외 경로 (개발용)
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/status',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 경로만 체크
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 공개 경로는 통과
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 보호된 경로 체크
  const isProtected = PROTECTED_API_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // 개발 환경에서는 인증 스킵 옵션
  if (process.env.NODE_ENV === 'development' &&
      process.env.SKIP_AUTH === 'true') {
    return NextResponse.next();
  }

  // 인증 방법 1: API 키
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey === process.env.API_KEY) {
    return NextResponse.next();
  }

  // 인증 방법 2: 세션 쿠키
  const sessionToken = request.cookies.get('session-token');
  if (sessionToken && isValidSession(sessionToken.value)) {
    return NextResponse.next();
  }

  // 인증 방법 3: Bearer 토큰
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (isValidToken(token)) {
      return NextResponse.next();
    }
  }

  // 인증 실패
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: 'Valid authentication required',
    },
    { status: 401 }
  );
}

// 세션 검증 (간단한 구현)
function isValidSession(token: string): boolean {
  // TODO: 실제 세션 검증 로직
  // 데이터베이스 또는 Redis에서 세션 확인
  return token.length > 0;
}

// 토큰 검증 (간단한 구현)
function isValidToken(token: string): boolean {
  // TODO: JWT 검증 또는 토큰 스토어 확인
  return token === process.env.API_KEY;
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
```

### 환경 변수 추가 (.env.example)

```bash
# API 인증
API_KEY=your-secure-api-key-here
SKIP_AUTH=true  # 개발 환경에서만
```

---

## Task 4.2: Error Boundary 컴포넌트

### 새 파일: `apps/web/src/components/ErrorBoundary.tsx`

```typescript
'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // 에러 로깅
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // 콜백 호출
    this.props.onError?.(error, errorInfo);

    // TODO: 에러 리포팅 서비스 전송
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-red-800 text-lg font-semibold mb-2">
              오류가 발생했습니다
            </h2>
            <p className="text-red-600 text-sm mb-4">
              {this.state.error?.message || '알 수 없는 오류'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-4">
                <summary className="text-red-500 text-xs cursor-pointer">
                  상세 정보
                </summary>
                <pre className="text-xs mt-2 p-2 bg-red-100 rounded overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 함수형 컴포넌트 래퍼
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
```

### 워크플로우 페이지에 적용

**파일: `apps/web/src/app/(dashboard)/workflow/page.tsx`**

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function WorkflowPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <p>워크플로우 로딩 중 오류가 발생했습니다.</p>
          <button onClick={() => window.location.reload()}>
            페이지 새로고침
          </button>
        </div>
      }
    >
      {/* 기존 페이지 내용 */}
    </ErrorBoundary>
  );
}
```

---

## Task 4.3: Fetch 타임아웃

### 새 파일: `apps/web/src/lib/utils/fetch.ts`

```typescript
/**
 * 타임아웃이 있는 fetch 유틸리티
 */

export class FetchTimeoutError extends Error {
  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`);
    this.name = 'FetchTimeoutError';
  }
}

export class FetchError extends Error {
  public status: number;
  public statusText: string;

  constructor(url: string, status: number, statusText: string) {
    super(`Request to ${url} failed: ${status} ${statusText}`);
    this.name = 'FetchError';
    this.status = status;
    this.statusText = statusText;
  }
}

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = 30000,
    retries = 0,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const attemptFetch = async (attempt: number): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (!response.ok && attempt < retries) {
        await sleep(retryDelay * Math.pow(2, attempt));
        return attemptFetch(attempt + 1);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new FetchTimeoutError(url, timeout);
      }

      if (attempt < retries) {
        await sleep(retryDelay * Math.pow(2, attempt));
        return attemptFetch(attempt + 1);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return attemptFetch(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * JSON 응답을 위한 편의 함수
 */
export async function fetchJson<T>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new FetchError(url, response.status, response.statusText);
  }

  return response.json();
}
```

### 기존 fetch 호출 교체

**파일: `apps/web/src/lib/workflow/executor.ts`**

```typescript
import { fetchWithTimeout, FetchTimeoutError } from '@/lib/utils/fetch';

private async callAgentAPI(agent: AgentDefinition, input: unknown): Promise<unknown> {
  const baseUrl = this.getBaseUrl();

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/workflow/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: agent.id,
        input,
        config: this.config,
      }),
      timeout: 120000,  // 2분 타임아웃
      retries: 2,       // 2회 재시도
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent API failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      this.log('error', `Agent ${agent.id} timed out`);
    }
    throw error;
  }
}
```

---

## Task 4.4: 0 나눔 방지

### 파일: `apps/web/src/lib/workflow/executor.ts`

```typescript
private calculateTotalProgress(): number {
  const enabledAgents = AGENT_DEFINITIONS.filter(a => this.isAgentEnabled(a));
  const totalAgents = enabledAgents.length;

  // ✅ 0 나눔 방지
  if (totalAgents === 0) {
    return 100;  // 또는 0, 상황에 따라
  }

  const completedAgents = Object.values(this.agentResults).filter(
    r => r.status === 'completed'
  ).length;

  return Math.round((completedAgents / totalAgents) * 100);
}

private calculatePhaseProgress(phase: WorkflowPhase): number {
  const phaseAgents = AGENT_DEFINITIONS.filter(
    a => a.phase === phase && this.isAgentEnabled(a)
  );
  const totalInPhase = phaseAgents.length;

  // ✅ 0 나눔 방지
  if (totalInPhase === 0) {
    return 100;
  }

  const completedInPhase = phaseAgents.filter(
    a => this.agentResults[a.id]?.status === 'completed'
  ).length;

  return Math.round((completedInPhase / totalInPhase) * 100);
}
```

---

## Task 4.5: Silent Failure 제거

### 파일: `apps/web/src/lib/workflow/executor.ts`

```typescript
// 옵션에 throwOnStorageError 추가
export interface WorkflowExecutorOptions {
  mode: ExecutionMode;
  sessionId?: string;
  callbacks?: WorkflowCallbacks;
  persistResults?: boolean;
  throwOnStorageError?: boolean;  // 새 옵션
}

// 클래스 내부
private async safeStorageOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.log('error', `Storage operation failed (${context}): ${errorMessage}`);

    if (this.options.throwOnStorageError) {
      throw new Error(`Storage error in ${context}: ${errorMessage}`);
    }

    return fallback;
  }
}

// 사용 예시
if (this.storage) {
  await this.safeStorageOperation(
    () => this.storage!.saveAgentOutput(agent.phase, agent.id, finalOutput),
    undefined,
    `saveAgentOutput(${agent.id})`
  );
}
```

### 에러 로깅 강화

```typescript
private log(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: unknown
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    sessionId: this.sessionId,
    message,
    data,
  };

  // 콘솔 출력
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.sessionId}]`;
  if (level === 'error') {
    console.error(prefix, message, data);
  } else if (level === 'warn') {
    console.warn(prefix, message, data);
  } else {
    console.log(prefix, message, data);
  }

  // 로그 저장
  this.executionLogs.push(logEntry);

  // Storage에도 저장 (비동기, 실패 무시)
  this.storage?.appendLog(logEntry).catch(() => {});
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
- [ ] API 인증 미들웨어 작동 (개발 환경에서 SKIP_AUTH로 우회 가능)
- [ ] ErrorBoundary 컴포넌트 생성됨
- [ ] 워크플로우 페이지에 ErrorBoundary 적용됨
- [ ] fetchWithTimeout 유틸리티 생성됨
- [ ] executor에서 fetchWithTimeout 사용
- [ ] 0 나눔 방지 로직 추가됨
- [ ] Silent failure 대신 로깅 + 옵션 기반 throw

**모든 조건 충족 시 아래 출력:**

<promise>PHASE4 COMPLETE</promise>
