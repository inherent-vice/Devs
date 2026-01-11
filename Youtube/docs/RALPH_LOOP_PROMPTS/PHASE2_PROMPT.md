# Phase 2: Pipeline Integrity (데이터 파이프라인 무결성)

## 목표
오디오, 자막, 영상 렌더링이 올바르게 연결되어 최종 영상이 생성되도록 합니다.

---

## 선행 조건

Phase 1이 완료되어야 합니다. 먼저 확인:

```bash
npm run build
```

빌드 성공 후 진행하세요.

---

## Task 2.1: 오디오 경로 연결

### 파일: `src/flows/ProductionFlow.ts`
### 위치: 병렬 실행 부분 (약 165-232줄)

**현재 문제:**
ImageVideoAgent 호출 시 `audioPath`가 전달되지 않아 무음 영상이 생성됩니다.

**수정 방향 - 2단계 실행 구조:**

```typescript
// Stage 1: Voice 먼저 실행 (오디오 경로 필요)
console.log('[ProductionFlow] Stage 1: Voice generation');
const voiceResult = await voiceAgent.execute(
  {
    script: {
      sections: input.script.sections,
      fullText: input.script.fullText,
      estimatedDuration: input.script.estimatedDuration,
    },
    voice: {
      gender: 'female',
      age: 'middle',
      style: voiceStyle,
    },
    speakingRate: speakingRate,
    pitch: 0,
    outputFormat: 'mp3',
  },
  context
);

if (!voiceResult.success) {
  throw new Error(`Voice generation failed: ${voiceResult.error?.message}`);
}

const audioPath = voiceResult.data?.audioUrl || voiceResult.data?.audioPath;
console.log(`[ProductionFlow] Voice generated: ${audioPath}`);

// Stage 2: 나머지 병렬 실행 (오디오 경로 포함)
console.log('[ProductionFlow] Stage 2: Parallel generation (video, thumbnail, subtitle)');

const parallelTasks = [
  // Video/Image Generation - audioPath 전달
  useImageMode
    ? imageVideoAgent.execute(
        {
          storyboard: {
            ...input.storyboard,
            scenes: input.storyboard.scenes.map(s => ({
              ...s,
              kenBurns: undefined,
            })),
          },
          audioPath: audioPath,  // ✅ 오디오 경로 전달
          resolution: '1080p',
          aspectRatio: input.videoType === 'shorts' ? '9:16' : '16:9',
          imagesPerMinute: 10,
          fps: 30,
          includeSubtitles: true,
          composeVideo: true,
        },
        context
      )
    : videoAgent.execute({...}, context),

  // Thumbnail
  thumbnailAgent.execute({...}, context),
];

// Subtitle 추가
if (input.generateSubtitles !== false) {
  parallelTasks.push(subtitleAgent.execute({...}, context));
}

const parallelResults = await Promise.all(parallelTasks);

// 결과 추출 (voiceResult는 이미 있음)
const videoResult = parallelResults[0];
const thumbnailResult = parallelResults[1];
const subtitleResult = input.generateSubtitles !== false ? parallelResults[2] : null;
```

---

## Task 2.2: 자막 데이터 연결

### 파일: `src/flows/ProductionFlow.ts`

ImageVideoAgent에 자막 데이터도 전달해야 합니다.

**수정:**
```typescript
// 자막이 필요한 경우 먼저 생성
let subtitleData = null;
if (input.generateSubtitles !== false) {
  const subtitleResult = await subtitleAgent.execute({
    script: {
      sections: input.script.sections,
      fullText: input.script.fullText,
      estimatedDuration: input.script.estimatedDuration,
    },
    language: input.language.startsWith('ko') ? 'ko' : 'en',
    // ...
  }, context);

  if (subtitleResult.success) {
    subtitleData = subtitleResult.data;
  }
}

// ImageVideoAgent 호출 시 자막 전달
useImageMode
  ? imageVideoAgent.execute(
      {
        // ... 기존 설정
        audioPath: audioPath,
        subtitleEntries: subtitleData?.entries || [],  // ✅ 자막 데이터 전달
        includeSubtitles: !!subtitleData,
      },
      context
    )
```

### 파일: `src/agents/production/ImageVideoAgent.ts`

입력 스키마에 subtitleEntries 추가:

```typescript
export const ImageVideoInputSchema = z.object({
  // ... 기존 필드
  audioPath: z.string().optional(),
  subtitleEntries: z.array(z.object({
    id: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    text: z.string(),
  })).optional(),
  includeSubtitles: z.boolean().default(true),
});
```

---

## Task 2.3: 최종 영상 산출

### 파일: `src/flows/ProductionFlow.ts`

**방안 A (권장): ImageVideoAgent의 composedVideo 활용**

```typescript
// 반환값에 finalVideo 추가
return {
  sessionId: input.sessionId,
  voice: voiceResult.data,
  video: videoResult.data,
  thumbnails: thumbnailResult.data,
  subtitles: subtitleResult?.data,
  edited: editorResult.data,

  // ✅ 최종 영상 명시
  finalVideo: useImageMode && videoResult.data?.composedVideo
    ? {
        path: videoResult.data.composedVideo.videoPath,
        fileSize: videoResult.data.composedVideo.fileSize,
        hasAudio: videoResult.data.composedVideo.hasAudio,
        hasSubtitles: videoResult.data.composedVideo.hasSubtitles,
        duration: videoResult.data.totalDuration,
      }
    : null,

  metadata: {
    totalDuration,
    totalCost,
    useImageMode,
    hasFinalVideo: !!(useImageMode && videoResult.data?.composedVideo),
    phases,
  },
};
```

### 파일: `src/flows/ProductionFlow.ts` (스키마)

출력 스키마에 finalVideo 추가:

```typescript
export const ProductionFlowOutputSchema = z.object({
  sessionId: z.string(),
  voice: VoiceAgentOutputSchema.optional(),
  video: z.union([VideoAgentOutputSchema, ImageVideoOutputSchema]).optional(),
  thumbnails: ThumbnailAgentOutputSchema.optional(),
  subtitles: SubtitleAgentOutputSchema.optional(),
  edited: EditorAgentOutputSchema.optional(),

  // 새 필드
  finalVideo: z.object({
    path: z.string(),
    fileSize: z.number(),
    hasAudio: z.boolean(),
    hasSubtitles: z.boolean(),
    duration: z.number(),
  }).nullable(),

  metadata: z.object({
    totalDuration: z.number(),
    totalCost: z.number(),
    useImageMode: z.boolean(),
    hasFinalVideo: z.boolean(),
    phases: z.array(z.object({...})),
  }),
});
```

---

## Task 2.4: 비용 추출 개선

### 파일: `apps/web/src/lib/workflow/executor.ts`
### 위치: 약 598줄

**현재 문제:**
```typescript
cost: (output as any)?.cost || 0,  // 단일 경로만 확인
```

**수정:**
```typescript
// 유틸리티 함수 추가 (파일 상단)
function extractCost(output: unknown): number {
  if (typeof output !== 'object' || output === null) return 0;

  const obj = output as Record<string, unknown>;

  // 여러 가능한 경로 확인
  if (typeof obj.cost === 'number') return obj.cost;
  if (typeof obj.metrics === 'object' && obj.metrics !== null) {
    const metrics = obj.metrics as Record<string, unknown>;
    if (typeof metrics.cost === 'number') return metrics.cost;
  }
  if (typeof obj.totalCost === 'number') return obj.totalCost;

  return 0;
}

// executeAgent에서 사용
const result: AgentExecutionResult = {
  agentId: agent.id,
  status: "completed",
  input,
  output: finalOutput,
  duration,
  cost: extractCost(finalOutput),  // ✅ 개선된 추출
};
```

---

## Task 2.5: postProcess 호출 체인

### 파일: `src/agents/base/BaseAgent.ts`
### 위치: executeCore 메서드 (약 175-214줄)

**현재 문제:**
postProcess가 정의되어 있지만 호출되지 않습니다.

**수정:**
```typescript
private async executeCore(
  input: TInput,
  context: AgentContext
): Promise<AgentResult<TOutput>> {
  const prompt = this.buildPrompt(input, context);

  const response = await ai.generate({
    model: this.model,
    prompt,
    config: {
      temperature: this.temperature,
    },
    output: {
      schema: this.outputSchema,
    },
  });

  const outputValidation = this.outputSchema.safeParse(response.output);
  if (!outputValidation.success) {
    throw new Error(`Output validation failed: ${outputValidation.error.message}`);
  }

  // ✅ postProcess 호출 추가
  const processedOutput = await this.postProcess(outputValidation.data, input);

  return {
    success: true,
    data: processedOutput,
    metrics: {
      duration: Date.now() - startTime,
      tokensUsed: response.usage?.totalTokens || 0,
      inputTokens: response.usage?.promptTokens || 0,
      outputTokens: response.usage?.completionTokens || 0,
      cost: this.calculateCost(response.usage),
      retryCount: 0,
    },
  };
}

// 기본 postProcess 구현 (오버라이드 가능)
protected async postProcess(output: TOutput, input: TInput): Promise<TOutput> {
  return output;  // 기본적으로 그대로 반환
}
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
   - `src/flows/ProductionFlow.ts`
   - `src/agents/production/ImageVideoAgent.ts`
   - `apps/web/src/lib/workflow/executor.ts`
   - `src/agents/base/BaseAgent.ts`

---

## 완료 조건

다음 조건이 모두 충족되면 완료:

- [ ] `npm run build` 성공 (에러 0개)
- [ ] VoiceAgent 결과가 ImageVideoAgent에 audioPath로 전달됨
- [ ] 자막 데이터가 영상 합성에 포함됨
- [ ] ProductionFlow가 finalVideo 필드 반환
- [ ] 비용이 여러 경로에서 정상 추출됨
- [ ] postProcess가 executeCore에서 호출됨

**모든 조건 충족 시 아래 출력:**

<promise>PHASE2 COMPLETE</promise>
