# 핵심 GitHub 레포지토리 카탈로그

> **작성일**: 2026-01-10
> **목적**: 프로젝트 참고용 레포지토리 정리

---

## 1. 영상 제작 특화 레포지토리

### 1.1 ViMax - Agentic Video Generation

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/HKUDS/ViMax |
| **설명** | Director, Screenwriter, Producer, Video Generator All-in-One |
| **핵심 기능** | 아이디어 → 완전한 비디오 스토리 자동 변환 |
| **기술** | Multi-agent workflow, 스토리텔링 자동화 |

**참고 가치**:
- 멀티 에이전트 영상 제작 파이프라인 설계
- 역할별 에이전트 분리 패턴
- 스토리보드 생성 로직

### 1.2 VideoAgent - All-in-One Framework

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/HKUDS/VideoAgent |
| **설명** | 비디오 이해, 편집, 리메이킹 통합 프레임워크 |
| **핵심 기능** | 그래프 구조 가이던스, 셀프 리플렉션 |
| **성과** | Audio/Video 데이터셋에서 베이스라인 능가 |

**참고 가치**:
- 자기 평가 피드백 루프 구현
- 멀티모달 처리 패턴
- 비디오 분석 및 편집 자동화

---

## 2. Google 생태계 레포지토리

### 2.1 Firebase Genkit

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/firebase/genkit |
| **설명** | Google의 AI 앱 구축 오픈소스 프레임워크 |
| **언어** | JavaScript, Go, Python |
| **상태** | Node.js GA, Go Beta, Python Alpha |

**핵심 디렉토리 구조**:
```
genkit/
├── js/                    # JavaScript SDK
│   ├── core/              # 코어 기능
│   ├── ai/                # AI 관련 기능
│   └── plugins/           # 플러그인들
├── go/                    # Go SDK
├── python/                # Python SDK (Alpha)
└── docs/                  # 문서
```

### 2.2 ADK Samples

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/google/adk-samples |
| **설명** | Google ADK 공식 샘플 에이전트 |
| **언어** | Python, TypeScript, Go, Java |
| **범위** | 간단한 챗봇 ~ 복잡한 멀티에이전트 |

**주요 샘플**:
- 기본 대화형 에이전트
- 여행 계획 멀티 에이전트
- 도구 사용 에이전트
- A2A 프로토콜 예제

### 2.3 A2A AgentKit

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/ssdeanx/a2a-agentkit |
| **설명** | A2A 프로토콜 구현 샘플 에이전트 |
| **통합** | Genkit + Gemini |
| **구조** | 독립 Express 서버로 실행되는 에이전트들 |

**참고 가치**:
- A2A 프로토콜 실제 구현
- Genkit과 A2A 통합 패턴
- 에이전트 간 통신 설계

---

## 3. 에이전틱 워크플로우 플랫폼

### 3.1 Sim Studio

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/simstudioai/sim |
| **설명** | AI 에이전트 워크플로우 구축 오픈소스 플랫폼 |
| **특징** | 비주얼 캔버스 기반 설계 |

**참고 가치**:
- 워크플로우 시각화 UI 설계
- 에이전트/도구/블록 연결 패턴
- 즉시 실행 가능한 워크플로우

### 3.2 CrewAI

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/crewAIInc/crewAI |
| **Stars** | 20k+ |
| **설명** | 역할 기반 자율 AI 에이전트 오케스트레이션 |

**핵심 개념**:
```python
from crewai import Agent, Task, Crew, Process

# 역할 기반 에이전트 정의
researcher = Agent(
    role='Research Analyst',
    goal='Find trending topics',
    backstory='Expert in trend analysis'
)

writer = Agent(
    role='Content Writer',
    goal='Create engaging scripts',
    backstory='Viral content specialist'
)

# Crew 구성
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential
)
```

### 3.3 LangGraph

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/langchain-ai/langgraph |
| **설명** | 그래프 기반 에이전트 워크플로우 |
| **특징** | 복잡한 상태 관리, 조건부 분기 |

**핵심 패턴**:
```python
from langgraph.graph import StateGraph

# 그래프 기반 워크플로우
workflow = StateGraph(State)
workflow.add_node("research", research_node)
workflow.add_node("write", write_node)
workflow.add_node("review", review_node)

workflow.add_edge("research", "write")
workflow.add_conditional_edges(
    "review",
    decide_next,
    {"revise": "write", "approve": END}
)
```

---

## 4. 연구 및 리소스 레포지토리

### 4.1 500-AI-Agents-Projects

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/ashishpatel26/500-AI-Agents-Projects |
| **설명** | 산업별 AI 에이전트 사용 사례 큐레이션 |
| **범위** | 헬스케어, 금융, 교육, 리테일 등 |

**참고 가치**:
- 다양한 산업별 에이전트 패턴
- 오픈소스 구현 링크
- 사용 사례 영감

### 4.2 Awesome-Agent-Papers

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/luo-junyu/Awesome-Agent-Papers |
| **설명** | LLM 에이전트 논문 큐레이션 |
| **업데이트** | 정기적 |

### 4.3 Autonomous-Agents

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/tmgthb/Autonomous-Agents |
| **설명** | 자율 에이전트 연구 논문 |
| **업데이트** | 매일 |

---

## 5. 영상 자동화 도구

### 5.1 n8n 워크플로우 템플릿

| 항목 | 내용 |
|------|------|
| **URL** | https://n8n.io/workflows/3442 |
| **설명** | AI 영상 생성 및 멀티플랫폼 배포 |
| **파이프라인** | 컨셉 → 스크립트 → 영상 → 배포 |

### 5.2 StoryLLM

| 항목 | 내용 |
|------|------|
| **URL** | https://storyllm.com/ |
| **설명** | 로컬/클라우드 AI 영상 생성 |
| **파이프라인** | Script → Audio → Images → Video → Upload |

---

## 6. 참고할 아키텍처 패턴

### 6.1 실제 구현 예시 (arXiv 논문)

> **출처**: A Practical Guide for Designing, Developing, and Deploying Production-Grade Agentic AI Workflows

```
Feed Discovery → Topic Filtering → Content Extraction →
Multi-LLM Script Generation → Audio/Video Synthesis →
GitHub Publishing
```

### 6.2 GitHub Agentic Workflows

| 항목 | 내용 |
|------|------|
| **URL** | https://github.com/PR-Pilot-AI/smart-workflows |
| **설명** | 자연어로 작성하는 워크플로우 |
| **실행** | GitHub Actions 통합 |

---

## 7. 빠른 참조 테이블

| 용도 | 레포지토리 | 우선순위 |
|------|-----------|----------|
| 영상 제작 파이프라인 | HKUDS/ViMax | 높음 |
| 셀프 평가 루프 | HKUDS/VideoAgent | 높음 |
| Google 통합 | firebase/genkit | 높음 |
| 멀티 에이전트 샘플 | google/adk-samples | 높음 |
| A2A 프로토콜 | ssdeanx/a2a-agentkit | 중간 |
| 역할 기반 에이전트 | crewAIInc/crewAI | 중간 |
| 그래프 워크플로우 | langchain-ai/langgraph | 중간 |
| 비주얼 빌더 | simstudioai/sim | 낮음 |

---

## 8. 클론 및 분석 스크립트

```bash
# 핵심 레포지토리 클론
mkdir -p ~/ai-agents-reference && cd ~/ai-agents-reference

# 영상 제작 관련
git clone https://github.com/HKUDS/ViMax.git
git clone https://github.com/HKUDS/VideoAgent.git

# Google 생태계
git clone https://github.com/firebase/genkit.git
git clone https://github.com/google/adk-samples.git
git clone https://github.com/ssdeanx/a2a-agentkit.git

# 프레임워크
git clone https://github.com/crewAIInc/crewAI.git
git clone https://github.com/langchain-ai/langgraph.git
```
