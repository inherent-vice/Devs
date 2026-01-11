# YouTube 에이전틱 AI 시스템 구현 로드맵

> **작성일**: 2026-01-10
> **프로젝트**: Genkit 기반 YouTube 자동 제작 시스템

---

## 1. 프로젝트 개요

### 1.1 목표
사람이 제작한 결과물보다 우수한 품질의 YouTube 영상을 자동 생산하는 에이전틱 AI 워크플로우 시스템

### 1.2 핵심 원칙
- **Google 생태계 중심**: Genkit, ADK, Vertex AI, Gemini
- **세션 기반 작업**: 점진적 구현
- **품질 우선**: 자기 개선 루프 필수

---

## 2. 세션별 구현 계획

### Phase 1: Foundation (세션 1-3)

#### 세션 1: 프로젝트 초기화
```
[ ] 프로젝트 구조 생성
[ ] TypeScript/Node.js 환경 설정
[ ] Genkit 초기 설정
[ ] 기본 의존성 설치
```

**예상 결과물**:
```
youtube-agent/
├── src/
│   ├── agents/
│   ├── tools/
│   ├── flows/
│   └── config/
├── package.json
├── tsconfig.json
└── genkit.config.ts
```

#### 세션 2: Genkit 기본 설정
```
[ ] Gemini 모델 연결
[ ] 기본 Flow 정의
[ ] 개발자 UI 설정
[ ] 환경 변수 구성
```

#### 세션 3: 기본 에이전트 정의
```
[ ] Agent 인터페이스 설계
[ ] 기본 도구(Tool) 정의
[ ] 에이전트 등록 시스템
[ ] 테스트 프레임워크 설정
```

---

### Phase 2: Core Agents (세션 4-8)

#### 세션 4: Research Agent
```
[ ] 트렌드 분석 도구
[ ] 경쟁 영상 분석 도구
[ ] 주제 선정 로직
[ ] YouTube API 통합
```

**에이전트 구조**:
```typescript
const researchAgent = defineAgent({
  name: 'researcher',
  description: 'Analyzes trends and selects topics',
  tools: [trendTool, competitorTool, topicTool],
  model: gemini20Flash
});
```

#### 세션 5: Script Agent
```
[ ] 후크 생성 도구
[ ] 스토리 구조 도구
[ ] 대본 템플릿 시스템
[ ] 바이럴 공식 적용
```

#### 세션 6: Voice Agent
```
[ ] Google TTS 통합
[ ] ElevenLabs 통합 (선택)
[ ] 음성 스타일 선택
[ ] 타이밍 조절
```

#### 세션 7: Video Agent
```
[ ] Veo API 통합
[ ] 영상 템플릿 시스템
[ ] 씬 생성 로직
[ ] 트랜지션 처리
```

#### 세션 8: Thumbnail Agent
```
[ ] Imagen 통합
[ ] 클릭 유도 디자인 원칙
[ ] A/B 테스트 변형 생성
[ ] 텍스트 오버레이
```

---

### Phase 3: Quality System (세션 9-12)

#### 세션 9: Critic Agent
```
[ ] 콘텐츠 품질 평가
[ ] 기술적 품질 검사
[ ] 피드백 생성
[ ] 점수화 시스템
```

**평가 차원**:
```typescript
interface QualityScore {
  technical: number;      // 기술적 품질
  narrative: number;      // 스토리텔링
  engagement: number;     // 참여 유도력
  originality: number;    // 독창성
  ethical: number;        // 윤리적 안전성
  overall: number;        // 종합 점수
}
```

#### 세션 10: Art Evaluator Agent
```
[ ] 시각적 미학 평가
[ ] 브랜드 일관성
[ ] 창의성 점수
[ ] 트렌드 적합성
```

#### 세션 11: Self-Improvement Loop
```
[ ] Evaluator-Optimizer 패턴 구현
[ ] 반복 개선 로직
[ ] 품질 임계값 설정
[ ] 최대 반복 횟수 제한
```

**루프 구조**:
```typescript
const qualityLoop = defineFlow({
  name: 'quality-improvement',
  async run(content: Content) {
    let improved = content;
    let score = await evaluate(improved);

    while (score.overall < QUALITY_THRESHOLD && iterations < MAX_ITER) {
      const feedback = await critic.analyze(improved);
      improved = await revise(improved, feedback);
      score = await evaluate(improved);
      iterations++;
    }

    return improved;
  }
});
```

#### 세션 12: Human-in-the-Loop
```
[ ] 승인 워크플로우
[ ] 피드백 수집 인터페이스
[ ] 수동 개입 포인트
[ ] 학습 데이터 수집
```

---

### Phase 4: Integration (세션 13-16)

#### 세션 13: 파이프라인 통합
```
[ ] Sequential Pipeline 구성
[ ] Parallel Pipeline 구성
[ ] 에러 핸들링
[ ] 재시도 로직
```

**전체 파이프라인**:
```typescript
const productionPipeline = defineFlow({
  name: 'youtube-production',
  async run(idea: string) {
    // Phase 1: Research (Sequential)
    const research = await researchPipeline.run(idea);

    // Phase 2: Production (Parallel)
    const [script, voice, video, thumbnail] = await Promise.all([
      scriptAgent.run(research),
      voiceAgent.run(research),
      videoAgent.run(research),
      thumbnailAgent.run(research)
    ]);

    // Phase 3: Assembly
    const assembled = await assembleVideo(script, voice, video);

    // Phase 4: Quality Loop
    const final = await qualityLoop.run(assembled);

    return { video: final, thumbnail, metadata };
  }
});
```

#### 세션 14: ADK 오케스트레이션 추가
```
[ ] ADK 설치 및 설정
[ ] SequentialAgent 적용
[ ] ParallelAgent 적용
[ ] LoopAgent 적용
```

#### 세션 15: A2A 프로토콜 통합
```
[ ] Agent Card 정의
[ ] 에이전트 등록
[ ] 에이전트 간 통신
[ ] 외부 에이전트 연결
```

#### 세션 16: 테스트 및 최적화
```
[ ] 단위 테스트
[ ] 통합 테스트
[ ] 성능 최적화
[ ] 비용 최적화
```

---

### Phase 5: Deployment (세션 17-20)

#### 세션 17: Cloud Run 배포
```
[ ] Docker 이미지 생성
[ ] Cloud Run 설정
[ ] 환경 변수 관리
[ ] 시크릿 관리
```

#### 세션 18: Agent Engine 배포
```
[ ] Vertex AI 설정
[ ] Agent Engine 배포
[ ] 스케일링 설정
[ ] 모니터링 연결
```

#### 세션 19: 모니터링 및 관찰성
```
[ ] Cloud Logging 설정
[ ] Cloud Monitoring 대시보드
[ ] 알림 설정
[ ] 비용 추적
```

#### 세션 20: 프로덕션 최적화
```
[ ] 부하 테스트
[ ] 비용 분석
[ ] 성능 튜닝
[ ] 문서화 완료
```

---

## 3. 기술 스택 상세

### 3.1 핵심 기술

| 계층 | 기술 | 버전 |
|------|------|------|
| Runtime | Node.js | 20 LTS |
| Language | TypeScript | 5.x |
| Framework | Genkit | 1.x |
| Orchestration | ADK | Latest |
| AI Model | Gemini 2.0 | Flash/Pro |
| Video | Veo 3 | Preview |
| TTS | Google TTS | v1 |
| Image | Imagen 3 | Latest |

### 3.2 인프라

| 서비스 | 용도 |
|--------|------|
| Cloud Run | 에이전트 호스팅 |
| Agent Engine | 관리형 에이전트 |
| Cloud Storage | 미디어 저장 |
| Cloud Pub/Sub | 이벤트 처리 |
| Cloud Scheduler | 스케줄링 |

### 3.3 외부 API

| API | 용도 | 필수 여부 |
|-----|------|----------|
| YouTube Data API | 업로드, 분석 | 필수 |
| ElevenLabs | 음성 합성 | 선택 |
| Creatomate | 영상 렌더링 | 선택 |

---

## 4. 품질 목표

### 4.1 품질 메트릭

| 메트릭 | 목표 | 측정 방법 |
|--------|------|----------|
| 기술 품질 | > 0.9 | 자동 평가 |
| 스토리텔링 | > 0.85 | LLM 평가 |
| 참여 유도 | > 0.8 | 예측 모델 |
| 독창성 | > 0.75 | 유사도 분석 |
| 전체 점수 | > 0.85 | 가중 평균 |

### 4.2 성능 목표

| 메트릭 | 목표 |
|--------|------|
| 전체 제작 시간 | < 30분 |
| 비용/영상 | < $5 |
| 성공률 | > 95% |
| 재시도 필요 | < 10% |

---

## 5. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| API 비용 초과 | 높음 | 비용 상한 설정, 캐싱 |
| 품질 불일치 | 높음 | 엄격한 평가 루프 |
| API 장애 | 중간 | 폴백, 재시도 |
| 모델 환각 | 중간 | 사실 검증 에이전트 |
| 저작권 문제 | 높음 | 원본 콘텐츠만 생성 |

---

## 6. 다음 단계

### 즉시 실행
1. 프로젝트 디렉토리 구조 생성
2. package.json 초기화
3. Genkit 설치 및 설정
4. 첫 번째 테스트 에이전트 구현

### 첫 세션 목표
- 기본 프로젝트 구조 완성
- Genkit 개발자 UI 실행
- Gemini 연결 테스트
- 간단한 텍스트 생성 Flow 구현
