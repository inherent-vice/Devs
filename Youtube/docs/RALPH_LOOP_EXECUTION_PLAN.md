# Ralph Loop 실행 계획서

> **목표**: 47개 코드베이스 이슈를 5개 Phase로 나누어 Ralph Loop로 체계적 수정
> **예상 총 반복**: 50-80 iterations
> **성공 기준**: 빌드 성공 + 타입 에러 0 + 핵심 기능 테스트 통과

---

## 전체 실행 구조

```
Phase 1: Critical API/URL (6 iterations) ──┐
                                           │
Phase 2: Pipeline Integrity (12 iterations)├──► 중간 검증 ──┐
                                           │               │
Phase 3: State Management (10 iterations) ─┘               │
                                                           │
Phase 4: Security & Error (8 iterations) ──────────────────┤
                                                           │
Phase 5: Optimization & Types (15 iterations) ─────────────┴──► 최종 검증
```

---

## Phase 1: Critical API/URL 수정

### 목표
서버-클라이언트 API 통신 문제 해결

### 수정 대상 (6개 이슈)

| # | 파일 | 이슈 | 수정 내용 |
|---|------|------|----------|
| 1.1 | `executor.ts:729` | 상대 URL fetch | 환경변수 기반 절대 URL 생성 |
| 1.2 | `agent/route.ts:36-61` | Mock 항상 반환 | 환경별 Mock 제어 플래그 |
| 1.3 | `backend.ts` + `agent/route.ts` | URL 불일치 | 단일 설정 파일로 통합 |
| 1.4 | `ImageVideoAgent.ts:73` | imageUrl 필드 | 통일된 mediaUrl 스키마 |
| 1.5 | `ProductionFlow.ts:318` | 클립 변환 누락 | imageUrl/url/imagePath 모두 처리 |
| 1.6 | `EditorAgent.ts:30` | 입력 스키마 | mediaUrl 수용하도록 수정 |

### Ralph Loop 프롬프트

```markdown
# Phase 1: Critical API/URL 수정

## 현재 상태 확인
1. `npm run build` 실행하여 현재 빌드 상태 확인
2. 에러 로그 분석

## 수정 작업

### Task 1.1: 절대 URL 생성 (executor.ts)
- `apps/web/src/lib/workflow/executor.ts:729` 수정
- 상대 URL `/api/workflow/agent` → 절대 URL
- `process.env.NEXT_PUBLIC_APP_URL` 또는 `http://localhost:3000` 사용

### Task 1.2: Mock 제어 (agent/route.ts)
- `apps/web/src/app/api/workflow/agent/route.ts:36-61` 수정
- `ALLOW_MOCK_FALLBACK` 환경변수 추가
- production에서는 Mock 비활성화, 에러 전파

### Task 1.3: URL 설정 통합
- `apps/web/src/lib/config.ts` 생성
- `backendUrl`, `appUrl` 중앙 관리
- 기존 파일들이 config 임포트하도록 수정

### Task 1.4-1.6: 클립 스키마 통일
- `ImageClipSchema`에 `mediaUrl` 필드 추가 (imageUrl alias)
- `ProductionFlow`에서 변환 시 모든 가능한 필드 처리
- `EditorAgentInputSchema`가 mediaUrl 수용

## 완료 조건
- [ ] `npm run build` 성공
- [ ] 타입 에러 0개
- [ ] 모든 수정 파일 저장됨

완료되면 출력: <promise>PHASE1 COMPLETE</promise>
```

### 예상 반복: 6회
### 완료 Promise: `PHASE1 COMPLETE`

---

## Phase 2: Pipeline Integrity (데이터 파이프라인 무결성)

### 목표
오디오/자막/렌더링 연결 완성

### 수정 대상 (5개 이슈)

| # | 파일 | 이슈 | 수정 내용 |
|---|------|------|----------|
| 2.1 | `ProductionFlow.ts:192-214` | 오디오 미연결 | Voice 결과 → ImageVideoAgent 전달 |
| 2.2 | `ProductionFlow.ts` | 자막 미연결 | Subtitle 결과 → 영상 합성에 포함 |
| 2.3 | `EditorAgent.ts:47-93` | 렌더링 없음 | composedVideo 활용 또는 렌더 단계 추가 |
| 2.4 | `executor.ts:598` | 비용 추출 불완전 | 다양한 응답 스키마 처리 |
| 2.5 | `BaseAgent.ts:175-214` | postProcess 미호출 | executeCore에서 postProcess 호출 |

### Ralph Loop 프롬프트

```markdown
# Phase 2: Pipeline Integrity 수정

## 선행 조건
- Phase 1 완료 확인 (`npm run build` 성공)

## 수정 작업

### Task 2.1: 오디오 경로 연결
- `ProductionFlow.ts` 수정
- 병렬 실행 구조 재설계:
  1. Stage A: VoiceAgent 먼저 실행
  2. Stage B: 나머지 병렬 (audioPath 전달)
- ImageVideoAgent 호출 시 `audioPath: voiceResult.data.audioUrl` 추가

### Task 2.2: 자막 데이터 연결
- SubtitleAgent 결과를 ImageVideoAgent에 전달
- `subtitleData` 또는 `subtitleEntries` 필드 추가

### Task 2.3: 최종 영상 산출
- 방안 A: ImageVideoAgent의 `composedVideo`를 최종 결과로 지정
- 방안 B: EditorAgent에 FFmpeg 렌더 로직 추가
- ProductionFlow 반환값에 `finalVideo` 필드 추가

### Task 2.4: 비용 추출 개선
- `executor.ts:598` 수정
- `response.cost || response.metrics?.cost || output?.cost || 0`
- 타입 가드 함수 추가

### Task 2.5: postProcess 호출 체인
- `BaseAgent.ts` 수정
- `executeCore` 마지막에 `await this.postProcess(output, input)` 추가
- 기본 postProcess는 output 그대로 반환

## 완료 조건
- [ ] `npm run build` 성공
- [ ] ProductionFlow가 finalVideo 반환
- [ ] 비용이 정상 집계됨

완료되면 출력: <promise>PHASE2 COMPLETE</promise>
```

### 예상 반복: 12회
### 완료 Promise: `PHASE2 COMPLETE`

---

## Phase 3: State Management (상태 관리)

### 목표
동시성 안전 및 외부 상태 저장소 준비

### 수정 대상 (6개 이슈)

| # | 파일 | 이슈 | 수정 내용 |
|---|------|------|----------|
| 3.1 | `execute/route.ts:26` | 메모리 Map | 추상화 레이어 + 인터페이스 |
| 3.2 | `LocalStorageManager.ts` | 전역 currentSession | 세션 ID 명시적 전달 |
| 3.3 | `executor.ts:365-606` | 수정본 저장 미반영 | modifiedOutputs 저장 정책 |
| 3.4 | `executor.ts:484` | Race condition | 결과 수집 후 일괄 업데이트 |
| 3.5 | `executor.ts:548-552` | Pause/Resume 불일치 | Promise reject + 타임아웃 |
| 3.6 | `session-storage.ts` | 로컬 FS 의존 | StorageProvider 추상화 |

### Ralph Loop 프롬프트

```markdown
# Phase 3: State Management 수정

## 수정 작업

### Task 3.1: Executor 저장소 추상화
- `apps/web/src/lib/workflow/executor-store.ts` 생성
- `IExecutorStore` 인터페이스 정의
- `MemoryExecutorStore` 구현 (기존 Map 로직)
- `execute/route.ts`가 store 인터페이스 사용

### Task 3.2: 전역 세션 제거
- `LocalStorageManager` 수정
- `currentSession` 프로퍼티 제거
- 모든 메서드에 `sessionId` 파라미터 필수화
- 호출하는 모든 곳 수정

### Task 3.3: 수정본 저장 정책
- `executor.ts` 수정
- `modifiedOutputs`도 storage에 저장
- rerun 시 clearModifications 옵션 추가

### Task 3.4: Race Condition 해결
- 병렬 실행 시 결과를 임시 배열에 수집
- Promise.all 완료 후 순차적으로 상태 업데이트
- 또는 mutex/lock 패턴 적용

### Task 3.5: Pause/Resume 개선
- `pausePromise` 객체에 resolve/reject 모두 저장
- 타임아웃 설정 (30분)
- cancel 시 reject 호출

### Task 3.6: Storage Provider 추상화
- `IStorageProvider` 인터페이스 생성
- `LocalStorageProvider` 구현
- 추후 CloudStorageProvider 확장 가능

## 완료 조건
- [ ] `npm run build` 성공
- [ ] 동시 실행 테스트 통과 (수동)
- [ ] 세션 충돌 없음

완료되면 출력: <promise>PHASE3 COMPLETE</promise>
```

### 예상 반복: 10회
### 완료 Promise: `PHASE3 COMPLETE`

---

## Phase 4: Security & Error Handling

### 목표
API 보안 및 에러 처리 강화

### 수정 대상 (5개 이슈)

| # | 파일 | 이슈 | 수정 내용 |
|---|------|------|----------|
| 4.1 | API routes 전체 | 인증 없음 | 미들웨어 추가 |
| 4.2 | 컴포넌트 전체 | Error Boundary 없음 | ErrorBoundary 컴포넌트 |
| 4.3 | fetch 호출들 | 타임아웃 없음 | fetchWithTimeout 유틸 |
| 4.4 | `executor.ts:902` | 0 나눔 | totalAgents === 0 처리 |
| 4.5 | `executor.ts:254` | Silent failure | 에러 로깅 및 전파 옵션 |

### Ralph Loop 프롬프트

```markdown
# Phase 4: Security & Error Handling

## 수정 작업

### Task 4.1: API 인증 미들웨어
- `apps/web/src/middleware.ts` 생성/수정
- `/api/*` 경로에 인증 체크
- 개발 환경에서는 bypass 옵션
- `x-api-key` 헤더 또는 세션 쿠키 검증

### Task 4.2: Error Boundary
- `apps/web/src/components/ErrorBoundary.tsx` 생성
- `getDerivedStateFromError` + `componentDidCatch`
- 워크플로우 페이지에 적용

### Task 4.3: Fetch 타임아웃
- `apps/web/src/lib/utils/fetch.ts` 생성
- `fetchWithTimeout(url, options, timeout)` 함수
- AbortController 기반
- 기존 fetch 호출들 교체

### Task 4.4: 0 나눔 방지
- `calculateTotalProgress` 수정
- `if (totalAgents === 0) return 100;`

### Task 4.5: Silent Failure 제거
- storage 저장 실패 시 로깅 + 옵션에 따라 throw
- `throwOnStorageError: boolean` 옵션 추가

## 완료 조건
- [ ] `npm run build` 성공
- [ ] API 인증 작동 확인
- [ ] ErrorBoundary 렌더링 확인

완료되면 출력: <promise>PHASE4 COMPLETE</promise>
```

### 예상 반복: 8회
### 완료 Promise: `PHASE4 COMPLETE`

---

## Phase 5: Optimization & Type Safety

### 목표
성능 최적화 및 타입 안전성 강화

### 수정 대상 (8개 이슈)

| # | 파일 | 이슈 | 수정 내용 |
|---|------|------|----------|
| 5.1 | `executor.ts` | unsafe any (7개) | 타입 가드 및 Zod 활용 |
| 5.2 | Components | Memoization 누락 | useMemo, useCallback, memo |
| 5.3 | `sessions/route.ts` | N+1 쿼리 | 인덱스 파일 또는 캐싱 |
| 5.4 | Agent 파일들 | `as any` 캐스트 | 제네릭 타입 개선 |
| 5.5 | 전체 | Magic numbers | constants 파일로 추출 |
| 5.6 | 전체 | ARIA 누락 | 접근성 속성 추가 |
| 5.7 | `veo.ts`, `imagen.ts` | 미구현 에러 | FeatureNotImplementedError |
| 5.8 | 전체 | 하드코딩 문자열 | i18n 또는 constants |

### Ralph Loop 프롬프트

```markdown
# Phase 5: Optimization & Type Safety

## 수정 작업

### Task 5.1: unsafe any 제거
- `executor.ts`의 7개 any 캐스트 식별
- 타입 가드 함수 생성
- Zod infer 타입 활용

### Task 5.2: React 최적화
- `WorkflowExecutionPanel` memo 적용
- `SessionBrowser` memo 적용
- 콜백 useCallback 래핑
- 계산값 useMemo 래핑

### Task 5.3: N+1 쿼리 개선
- `sessions/index.json` 인덱스 파일 도입
- 또는 LRU 캐시 레이어 추가

### Task 5.4: Agent 타입 개선
- BaseAgent 제네릭 타입 강화
- `inputSchema as any` 제거
- Zod 스키마에서 타입 추론

### Task 5.5: Constants 추출
- `apps/web/src/lib/constants.ts` 생성
- TIMEOUT, MAX_RETRIES 등 이동
- 매직 넘버 참조로 교체

### Task 5.6: 접근성 개선
- 버튼에 aria-label 추가
- role, tabIndex 추가
- 키보드 이벤트 핸들러

### Task 5.7: 미구현 에러 표준화
- `FeatureNotImplementedError` 클래스 생성
- veo.ts, imagen.ts에서 사용

### Task 5.8: 문자열 상수화
- 로그 메시지 패턴화
- 에러 메시지 상수화

## 완료 조건
- [ ] `npm run build` 성공
- [ ] `npm run lint` 경고 최소화
- [ ] TypeScript strict 통과

완료되면 출력: <promise>ALL PHASES COMPLETE</promise>
```

### 예상 반복: 15회
### 완료 Promise: `ALL PHASES COMPLETE`

---

## 실행 명령어

### Phase 1 실행
```bash
/ralph-loop "docs/RALPH_LOOP_PROMPTS/PHASE1_PROMPT.md 파일의 지시사항을 따라 Critical API/URL 이슈를 수정하세요. 완료 시 <promise>PHASE1 COMPLETE</promise> 출력" --max-iterations 10 --completion-promise "PHASE1 COMPLETE"
```

### Phase 2 실행
```bash
/ralph-loop "docs/RALPH_LOOP_PROMPTS/PHASE2_PROMPT.md 파일의 지시사항을 따라 Pipeline Integrity 이슈를 수정하세요. 완료 시 <promise>PHASE2 COMPLETE</promise> 출력" --max-iterations 15 --completion-promise "PHASE2 COMPLETE"
```

### Phase 3 실행
```bash
/ralph-loop "docs/RALPH_LOOP_PROMPTS/PHASE3_PROMPT.md 파일의 지시사항을 따라 State Management 이슈를 수정하세요. 완료 시 <promise>PHASE3 COMPLETE</promise> 출력" --max-iterations 12 --completion-promise "PHASE3 COMPLETE"
```

### Phase 4 실행
```bash
/ralph-loop "docs/RALPH_LOOP_PROMPTS/PHASE4_PROMPT.md 파일의 지시사항을 따라 Security & Error 이슈를 수정하세요. 완료 시 <promise>PHASE4 COMPLETE</promise> 출력" --max-iterations 10 --completion-promise "PHASE4 COMPLETE"
```

### Phase 5 실행
```bash
/ralph-loop "docs/RALPH_LOOP_PROMPTS/PHASE5_PROMPT.md 파일의 지시사항을 따라 Optimization & Types 이슈를 수정하세요. 완료 시 <promise>ALL PHASES COMPLETE</promise> 출력" --max-iterations 20 --completion-promise "ALL PHASES COMPLETE"
```

---

## 검증 체크리스트

### 각 Phase 완료 후
- [ ] `npm run build` 성공
- [ ] `npm run lint` 에러 없음
- [ ] git commit 생성

### 전체 완료 후
- [ ] 모든 Critical 이슈 해결 확인
- [ ] E2E 테스트 실행 (가능 시)
- [ ] 문서 업데이트 (CODEBASE_ISSUES_ANALYSIS.md)

---

## 롤백 전략

각 Phase 시작 전 git tag 생성:
```bash
git tag ralph-phase-1-start
git tag ralph-phase-2-start
...
```

문제 발생 시:
```bash
git reset --hard ralph-phase-N-start
```

---

## 예상 소요 시간

| Phase | 예상 반복 | 예상 시간 |
|-------|----------|----------|
| Phase 1 | 6-10 | 15-25분 |
| Phase 2 | 10-15 | 25-40분 |
| Phase 3 | 8-12 | 20-30분 |
| Phase 4 | 6-10 | 15-25분 |
| Phase 5 | 12-20 | 30-50분 |
| **총계** | **42-67** | **105-170분** |

---

**작성일**: 2026-01-11
**작성자**: Claude Code
