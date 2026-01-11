# 멀티 에이전트 프레임워크 상세 비교

> **작성일**: 2026-01-10
> **목적**: Google 생태계 중심 프레임워크 선택 가이드

---

## 1. 프레임워크 개요

### 1.1 Google 생태계

| 프레임워크 | 출시 | 목적 | 상태 |
|-----------|------|------|------|
| **Genkit** | 2024 | 범용 GenAI 앱 구축 | GA (Node.js) |
| **ADK** | 2025.04 | 멀티 에이전트 시스템 | GA |
| **Vertex AI Agent Builder** | 2024 | 엔터프라이즈 에이전트 | GA |

### 1.2 오픈소스 생태계

| 프레임워크 | 특징 | 장점 | 단점 |
|-----------|------|------|------|
| **LangGraph** | 그래프 기반 | 복잡한 상태 관리 | 학습 곡선 |
| **CrewAI** | 역할 기반 | 직관적 | 프로덕션 확장성 |
| **AutoGen** | 대화형 | Microsoft 지원 | 복잡성 |
| **OpenAI Swarm** | 경량 | 심플 | 실험적 |

---

## 2. Google 프레임워크 심층 비교

### 2.1 Genkit vs ADK

```
┌─────────────────────────────────────────────────────────────┐
│                    선택 결정 트리                            │
│                                                             │
│  Q: 멀티 에이전트 협업이 핵심인가?                            │
│     │                                                       │
│     ├─ Yes → ADK 권장                                       │
│     │        - 에이전트 간 통신 네이티브                      │
│     │        - 워크플로우 에이전트 제공                       │
│     │        - A2A 프로토콜 지원                             │
│     │                                                       │
│     └─ No → Genkit 권장                                     │
│             - 더 유연한 구조                                 │
│             - 광범위한 모델 지원                             │
│             - 기존 앱 통합 용이                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 상세 기능 비교

| 기능 | Genkit | ADK |
|------|--------|-----|
| **멀티 에이전트** | 수동 구현 필요 | 네이티브 지원 |
| **워크플로우** | Flow 기반 | Agent 기반 |
| **상태 관리** | 개발자 구현 | 내장 |
| **모델 지원** | 다양 | Gemini 최적화 |
| **배포** | Cloud Run, Firebase | Agent Engine |
| **관찰성** | 개발자 UI | 네이티브 |
| **프로토콜** | 없음 | A2A 지원 |

### 2.3 코드 비교

#### Genkit 방식
```typescript
// genkit-workflow.ts
import { defineFlow, run } from '@genkit-ai/core';
import { gemini15Pro } from '@genkit-ai/googleai';

const researchFlow = defineFlow(
  { name: 'research' },
  async (topic: string) => {
    const trends = await run('analyze-trends', async () => {
      return await gemini15Pro.generate({
        prompt: `Analyze trends for: ${topic}`
      });
    });

    const competitors = await run('analyze-competitors', async () => {
      return await gemini15Pro.generate({
        prompt: `Analyze competitors for: ${topic}`
      });
    });

    return { trends, competitors };
  }
);
```

#### ADK 방식
```python
# adk-workflow.py
from google.adk import Agent, SequentialAgent, ParallelAgent

class TrendAnalysisAgent(Agent):
    name = "trend_analyzer"
    model = "gemini-2.0-flash"

    async def run(self, topic: str):
        return await self.generate(f"Analyze trends for: {topic}")

class CompetitorAgent(Agent):
    name = "competitor_analyzer"
    model = "gemini-2.0-flash"

    async def run(self, topic: str):
        return await self.generate(f"Analyze competitors for: {topic}")

# 오케스트레이션
research_pipeline = ParallelAgent(
    name="research",
    agents=[TrendAnalysisAgent(), CompetitorAgent()]
)
```

---

## 3. 하이브리드 접근 권장

### 3.1 권장 조합

```
┌───────────────────────────────────────────────────────────┐
│                 Recommended Stack                         │
│                                                           │
│   ┌─────────────────────────────────────────────────┐    │
│   │            ADK (Orchestration Layer)             │    │
│   │    - Multi-agent coordination                    │    │
│   │    - Workflow management                         │    │
│   │    - A2A protocol                                │    │
│   └─────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│   ┌─────────────────────────────────────────────────┐    │
│   │            Genkit (Agent Implementation)         │    │
│   │    - Individual agent logic                      │    │
│   │    - Tool definitions                            │    │
│   │    - Flow management within agents               │    │
│   └─────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│   ┌─────────────────────────────────────────────────┐    │
│   │          Vertex AI (Infrastructure)              │    │
│   │    - Model hosting (Gemini)                      │    │
│   │    - Video generation (Veo)                      │    │
│   │    - Agent Engine deployment                     │    │
│   └─────────────────────────────────────────────────┘    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 3.2 통합 예시

```typescript
// hybrid-approach.ts
import { defineAgent, defineTool } from '@genkit-ai/core';
import { ADKOrchestrator } from '@google/adk';

// Genkit으로 개별 에이전트 정의
const scriptWriterAgent = defineAgent({
  name: 'script-writer',
  model: gemini15Pro,
  tools: [
    defineTool({
      name: 'get-viral-hooks',
      description: 'Get viral hook templates',
      handler: async () => { /* ... */ }
    }),
    defineTool({
      name: 'structure-script',
      description: 'Structure video script',
      handler: async () => { /* ... */ }
    })
  ]
});

// ADK로 오케스트레이션
const productionPipeline = new ADKOrchestrator({
  type: 'sequential',
  agents: [
    scriptWriterAgent,
    voiceOverAgent,
    videoGeneratorAgent
  ],
  errorHandling: 'retry-with-fallback'
});
```

---

## 4. 프레임워크별 성능 특성

### 4.1 벤치마크 데이터

| 프레임워크 | 레이턴시 | 토큰 효율성 | 확장성 |
|-----------|---------|------------|--------|
| LangGraph | 최저 | 높음 | 높음 |
| CrewAI | 중간 | 중간 | 중간 |
| ADK | 낮음 | 높음 | 높음 |
| OpenAI Swarm | 낮음 | 중간 | 낮음 |

### 4.2 사용 사례별 적합성

| 사용 사례 | 최적 프레임워크 | 이유 |
|----------|----------------|------|
| 프로토타입/데모 | CrewAI | 빠른 구현 |
| 프로덕션 엔터프라이즈 | ADK + Vertex AI | 확장성, 관리성 |
| 복잡한 상태 관리 | LangGraph | 그래프 기반 상태 |
| Google 생태계 통합 | ADK | 네이티브 지원 |
| 유연한 모델 선택 | Genkit | 다양한 모델 |

---

## 5. 프로젝트 적용 권장사항

### 5.1 YouTube 제작 시스템에 최적 조합

```
Primary: ADK (Python)
├── 이유: 멀티 에이전트 네이티브 지원
├── 이유: Google 생태계 최적화
└── 이유: A2A 프로토콜 지원

Secondary: Genkit (TypeScript)
├── 이유: 타입 안전성
├── 이유: Firebase 통합
└── 이유: 풍부한 도구 생태계

Infrastructure: Vertex AI
├── Agent Engine: 에이전트 배포
├── Veo API: 영상 생성
└── Gemini 2.0: LLM 모델
```

### 5.2 마이그레이션 경로

```
Phase 1: Genkit 단독으로 시작
         ↓
Phase 2: ADK 오케스트레이션 추가
         ↓
Phase 3: Vertex AI Agent Engine 배포
         ↓
Phase 4: A2A 프로토콜로 확장
```

---

## 6. 참고 링크

### 공식 문서
- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [ADK Documentation](https://google.github.io/adk-docs/)
- [Vertex AI Agent Builder](https://cloud.google.com/products/agent-builder)

### 비교 자료
- [Genkit vs ADK (Medium)](https://medium.com/@nozomi-koborinai/genkit-vs-agent-development-kit-adk-choosing-the-right-google-backed-ai-framework-1744b73234ac)
- [Framework Comparison (Turing)](https://www.turing.com/resources/ai-agent-frameworks)
- [CrewAI vs LangGraph (DataCamp)](https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen)
