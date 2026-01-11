# Production Deployment Design

> **작성일**: 2026-01-11
> **목표**: 프로덕션 배포 수준의 완성도 달성
> **인프라**: 로컬 우선 (Docker Compose + Redis)
> **비디오 전략**: ImageVideoAgent 우선 (AI Studio Imagen + FFmpeg)

---

## Executive Summary

YouTube Agentic AI Workflow System을 프로덕션 배포 수준으로 완성하기 위한 7단계 계획.

**현재 상태**: 62/100 (단일 인스턴스 MVP 수준)
**목표 상태**: 90/100 (프로덕션 배포 가능)

---

## Phase 1: Critical 버그 수정

### 수정 대상 (우선순위 순)

| # | 이슈 | 파일 | 설명 |
|---|------|------|------|
| C3 | 스키마 불일치 | `ImageVideoAgent.ts`, `EditorAgent.ts` | 클립 포맷 불일치 |
| C4 | Audio/Subtitle 미연결 | `ProductionFlow.ts` | 오디오가 비디오에 합성 안됨 |
| C5 | Editor 렌더링 누락 | `EditorAgent.ts` | 메타데이터만 반환, 실제 렌더링 없음 |
| C1 | 상대 URL SSR 실패 | `apps/web/src/lib/workflow/executor.ts` | fetch에서 상대 URL 사용 |
| C2 | Mock 폴백 우회 | `apps/web/src/app/api/workflow/agent/route.ts` | 항상 mock으로 폴백 |
| H1 | Settings 미반영 | `apps/web/src/app/(dashboard)/create/page.tsx` | useSettingsStore 미사용 |
| C6 | 비용 추적 불완전 | 다수 파일 | 응답에서 비용 추출 누락 |
| H2 | API 인증 없음 | 모든 API 라우트 | 인증 미들웨어 없음 |

### 수정 순서

```
C3 (스키마) → C4 (연결) → C5 (렌더링) → C1 (URL) → C2 (Mock) → H1 (Settings) → C6 (비용) → H2 (인증)
```

---

## Phase 2: 로컬 프로덕션 환경

### 아키텍처

```
┌─────────────────────────────────────────────────┐
│                 Local Development                │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐          │
│  │ Next.js      │────▶│ Genkit       │          │
│  │ localhost:3000│     │ localhost:3100│         │
│  └──────────────┘     └──────────────┘          │
│         │                    │                   │
│         ▼                    ▼                   │
│  ┌──────────────────────────────────────────┐   │
│  │         Redis (Docker)                    │   │
│  │         localhost:6379                    │   │
│  └──────────────────────────────────────────┘   │
│         │                    │                   │
│         ▼                    ▼                   │
│  ┌──────────────┐     ┌──────────────┐          │
│  │ SQLite       │     │ Local FS     │          │
│  │ 메타데이터    │     │ output/      │          │
│  └──────────────┘     └──────────────┘          │
└─────────────────────────────────────────────────┘
```

### 파일 변경

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

---

## Phase 3: 분산 환경 지원

### 세션 저장소 마이그레이션

```
src/state/
├── SessionStore.ts        → 인터페이스로 추상화
├── InMemoryStore.ts       → 개발용 (현재 코드)
├── RedisStore.ts          → 프로덕션용 (신규)
└── index.ts               → 환경에 따라 자동 선택
```

### 작업 큐 시스템

```
src/queue/
├── VideoQueue.ts          → BullMQ 큐 정의
├── worker.ts              → 작업 처리 워커
└── index.ts               → 큐 매니저
```

### 데이터베이스

```
src/db/
├── schema.ts              → Drizzle ORM 스키마
├── client.ts              → SQLite 클라이언트
└── migrations/            → 마이그레이션 파일
```

---

## Phase 4: 보안 및 인증

### 인증 구조

| 용도 | 방식 | 구현 |
|------|------|------|
| 웹 UI | NextAuth.js | Google OAuth / 이메일 |
| API 호출 | API Key | X-API-Key 헤더 |
| 내부 통신 | Service Token | 서비스 간 인증 |

### 파일 추가

```
apps/web/src/
├── lib/auth.ts                              → NextAuth 설정
├── middleware.ts                            → 라우트 보호
└── app/api/auth/[...nextauth]/route.ts      → 인증 API

src/auth/
└── apiKey.ts                                → API 키 검증
```

### 환경 변수

```bash
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
```

---

## Phase 5: 모니터링 및 관측성

### 모니터링 스택

| 영역 | 도구 | 용도 |
|------|------|------|
| 로깅 | Pino | 구조화된 JSON 로그 |
| 에러 추적 | Sentry | 에러 수집, 알림 |
| 메트릭 | 커스텀 | 에이전트 성능, 비용 |
| 헬스체크 | /api/health | 서비스 상태 |

### 추적 메트릭

- `agent.duration` - 에이전트 실행 시간
- `agent.cost` - API 호출 비용
- `agent.success_rate` - 성공/실패 비율
- `flow.total_duration` - 전체 파이프라인 소요 시간
- `queue.pending_jobs` - 대기 작업 수
- `queue.failed_jobs` - 실패 작업 수

### 파일 추가

```
src/lib/
├── logger.ts              → Pino 로거
└── metrics.ts             → 메트릭 수집기

apps/web/src/
├── lib/sentry.ts          → Sentry 설정
└── app/api/health/route.ts → 헬스체크
```

---

## Phase 6: 테스트

### 테스트 전략

```
          ┌─────────┐
          │  E2E    │  ← Playwright (핵심 플로우)
         ┌┴─────────┴┐
         │Integration │  ← Vitest + MSW
        ┌┴───────────┴┐
        │    Unit     │  ← Vitest (Mock)
        └─────────────┘
```

### 테스트 구조

```
tests/
├── unit/
│   ├── agents/            → 에이전트 단위 테스트
│   ├── flows/             → 플로우 단위 테스트
│   └── utils/             → 유틸리티 테스트
├── integration/
│   ├── api/               → API 통합 테스트
│   └── flows/             → 플로우 통합 테스트
├── e2e/
│   ├── create-video.spec.ts
│   └── settings.spec.ts
└── mocks/
    ├── gemini.ts          → AI 응답 Mock
    └── handlers.ts        → MSW 핸들러
```

### 실행 명령

```bash
npm run test          # Mock 사용 (CI용, 빠름)
npm run test:live     # 실제 API (배포 전 검증)
```

---

## Phase 7: 최종 통합 및 검증

### 통합 체크리스트

- [ ] 아이디어 입력 → 영상 출력 E2E 동작
- [ ] 서버 재시작 후 세션 유지
- [ ] 여러 영상 동시 생성 처리
- [ ] 중간 실패 시 재시도/복구
- [ ] 실제 API 비용 vs 추정치 일치

### 배포 준비 산출물

```
├── docker-compose.yml       # 로컬 실행 환경
├── .env.example             # 환경변수 템플릿
├── scripts/
│   ├── setup.sh             # 초기 설정
│   └── health-check.sh      # 헬스체크
└── docs/
    ├── DEPLOYMENT.md        # 배포 가이드
    └── API.md               # API 문서
```

---

## 실행 순서

```
Phase 1 (버그수정)
    │
    ▼
Phase 2 (로컬환경) ──▶ Phase 3 (분산지원)
                            │
                            ▼
                      Phase 4 (인증)
                            │
                            ▼
                      Phase 5 (모니터링)
                            │
                            ▼
                      Phase 6 (테스트)
                            │
                            ▼
                      Phase 7 (통합검증)
```

---

## 기술 스택 요약

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js, TypeScript, Tailwind, shadcn/ui |
| 백엔드 | Genkit, TypeScript, Express |
| AI | Gemini 3 Flash/Pro, AI Studio Imagen |
| 비디오 | ImageVideoAgent + FFmpeg |
| 세션 | Redis (ioredis) |
| 큐 | BullMQ |
| DB | SQLite (Drizzle ORM) |
| 인증 | NextAuth.js |
| 로깅 | Pino |
| 에러 | Sentry |
| 테스트 | Vitest, Playwright, MSW |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-01-11 | 최초 작성 |
