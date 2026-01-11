# YouTube AI Studio - 기능 개선 로드맵

> **작성일**: 2026-01-10
> **우선순위**: P0 (긴급) → P1 (높음) → P2 (중간) → P3 (낮음)

---

## 즉시 수정 목록 (P0 - 긴급)

### 1. Settings → Create 연동

**현재 문제**: Settings 페이지에서 설정한 기본값이 Create 페이지에서 무시됨

| 파일 | 라인 | 수정 내용 |
|------|------|-----------|
| `apps/web/src/app/(dashboard)/create/page.tsx` | 35 | `useSettingsStore` import 추가 |
| `apps/web/src/app/(dashboard)/create/page.tsx` | 115 | Settings 기본값으로 초기화 |

**수정 코드**:
```typescript
// Line 35 수정
import {
  useProjectStore,
  useHistoryStore,
  useBillingStore,
  useSettingsStore  // 추가
} from "@/lib/store";

// Line 45 추가
const { settings } = useSettingsStore();

// Line 115 수정
const [config, setConfig] = useState<GenerationConfig>(() => ({
  topic: "",
  videoFormat: settings.defaultVideoType || "medium",
  targetAudience: "",
  language: "ko",
  style: {
    preset: settings.defaultStyle || "cinematic",
    colorTone: "vibrant",
    pacing: "medium",
    stylePrompt: "",
  },
  models: settings.defaultModels || {
    text: "gemini-3-flash",
    image: "gemini-3-pro-image",
    tts: "gemini-2.5-flash-tts",
  },
  voice: {
    name: settings.defaultVoice || "Kore",
    speed: 1.0,
    pitch: 0,
  },
  output: {
    resolution: "1080p",
    fps: 30,
    format: "mp4",
  },
}));
```

---

### 2. Backend 설정 전달

**현재 문제**: `configToFlowInput()`에서 음성/스타일/언어 설정이 전달되지 않음

| 파일 | 라인 | 수정 내용 |
|------|------|-----------|
| `apps/web/src/lib/backend.ts` | 74-89 | 설정값 전체 전달 |

**수정 코드**:
```typescript
export function configToFlowInput(config: GenerationConfig): MasterFlowInput {
  return {
    idea: config.topic,
    videoType: config.videoFormat,
    targetAudience: config.targetAudience || undefined,
    style: config.style.preset,
    language: config.language || "ko",

    // 추가: 음성 설정
    voicePreference: {
      name: config.voice.name,
      speed: config.voice.speed,
      pitch: config.voice.pitch,
    },

    // 추가: 스타일 상세
    styleOptions: {
      colorTone: config.style.colorTone,
      pacing: config.style.pacing,
      stylePrompt: config.style.stylePrompt,
    },

    // 추가: 출력 설정
    outputOptions: {
      resolution: config.output.resolution,
      fps: config.output.fps,
      format: config.output.format,
    },
  };
}
```

---

### 3. MasterFlow 설정 전달

**현재 문제**: ProductionFlow 호출 시 음성/스타일 미전달

| 파일 | 라인 | 수정 내용 |
|------|------|-----------|
| `src/flows/MasterFlow.ts` | 174-183 | voicePreference, style 추가 |

**수정 코드**:
```typescript
productionOutput = await productionFlow({
  sessionId,
  script: researchOutput.script,
  storyboard: researchOutput.storyboard,
  useFastGeneration: options.useFastGeneration ?? true,

  // 추가
  voicePreference: input.voicePreference,
  styleOptions: input.styleOptions,
  outputOptions: input.outputOptions,
} as ProductionFlowInput);
```

---

### 4. 비용 계산 통일

**현재 문제**: 프론트엔드/백엔드 비용 계산 최대 8% 불일치

**해결 방안**: API 엔드포인트로 통일

**새 파일**: `apps/web/src/app/api/estimate-cost/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { quickEstimate } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const config = await request.json();

  const estimate = quickEstimate({
    videoType: config.videoFormat,
    useFastGeneration: config.useFastGeneration ?? true,
  });

  return NextResponse.json({
    success: true,
    estimate: {
      total: estimate.total,
      breakdown: estimate.breakdown,
      currency: "USD",
    },
  });
}
```

**Create 페이지 수정**:
```typescript
const [estimatedCost, setEstimatedCost] = useState<CostEstimate | null>(null);

useEffect(() => {
  const fetchEstimate = async () => {
    const response = await fetch('/api/estimate-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await response.json();
    if (data.success) {
      setEstimatedCost(data.estimate);
    }
  };

  fetchEstimate();
}, [config.videoFormat, config.style.preset]);
```

---

## 높은 우선순위 (P1)

### 5. Veo API 실제 구현

**현재 문제**: `veo.ts:272`에서 에러 throw

**구현 방향**:
```typescript
// src/clients/veo.ts
private async callVeoAPI(request: VeoRequest): Promise<VeoResponse> {
  const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  });

  const generativeModel = vertexAI.getGenerativeModel({
    model: 'veo-3.1',
  });

  const response = await generativeModel.generateVideo({
    prompt: request.prompt,
    config: {
      duration: request.duration,
      resolution: request.resolution,
      aspectRatio: request.aspectRatio,
      fps: request.fps,
    },
  });

  return {
    videoUrl: response.videoUri,
    duration: response.duration,
    metadata: response.metadata,
  };
}
```

---

### 6. Imagen API 실제 구현

**현재 문제**: `imagen.ts`에서 에러 throw

**구현 방향**:
```typescript
// src/clients/imagen.ts
export class ImagenClient {
  private vertexAI: VertexAI;

  async generate(prompt: string, options: ImageOptions): Promise<GeneratedImage> {
    const model = this.vertexAI.getGenerativeModel({
      model: 'imagegeneration@006',
    });

    const response = await model.generateImages({
      prompt,
      numberOfImages: options.count || 1,
      aspectRatio: options.aspectRatio || '16:9',
      negativePrompt: options.negativePrompt,
    });

    return {
      images: response.images.map(img => ({
        url: img.uri,
        width: img.width,
        height: img.height,
      })),
    };
  }
}
```

---

### 7. 다국어 지원 확장 (ElevenLabs 연동)

**새 파일**: `src/clients/elevenlabs.ts`
```typescript
import { ElevenLabsClient } from 'elevenlabs';

export interface ElevenLabsConfig {
  apiKey: string;
  defaultVoiceId?: string;
}

export class ElevenLabsVoiceClient {
  private client: ElevenLabsClient;

  constructor(config: ElevenLabsConfig) {
    this.client = new ElevenLabsClient({
      apiKey: config.apiKey,
    });
  }

  async synthesize(text: string, options: {
    voiceId: string;
    language?: string;
    stability?: number;
    similarityBoost?: number;
  }): Promise<Buffer> {
    const audio = await this.client.generate({
      text,
      voice_id: options.voiceId,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: options.stability || 0.5,
        similarity_boost: options.similarityBoost || 0.75,
      },
    });

    return Buffer.from(audio);
  }

  async listVoices(): Promise<Voice[]> {
    const response = await this.client.voices.getAll();
    return response.voices;
  }

  async cloneVoice(name: string, samples: Buffer[]): Promise<string> {
    const response = await this.client.voices.add({
      name,
      files: samples.map(s => new Blob([s])),
    });
    return response.voice_id;
  }
}
```

**지원 언어 목록** (29개):
```typescript
export const SUPPORTED_LANGUAGES = [
  'en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'it', 'pt', 'ru',
  'ar', 'hi', 'bn', 'pa', 'id', 'ms', 'th', 'vi', 'tr', 'pl',
  'nl', 'sv', 'no', 'da', 'fi', 'cs', 'ro', 'hu', 'el'
];
```

---

## 중간 우선순위 (P2)

### 8. URL→영상 변환

**새 파일**: `src/agents/research/ContentExtractor.ts`
```typescript
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ExtractedContent {
  title: string;
  content: string;
  summary: string;
  images: string[];
  metadata: {
    author?: string;
    publishDate?: string;
    siteName?: string;
  };
}

export class ContentExtractor {
  async extractFromUrl(url: string): Promise<ExtractedContent> {
    const response = await fetch(url);
    const html = await response.text();

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to extract content from URL');
    }

    // 이미지 추출
    const images = this.extractImages(dom.window.document);

    // Gemini로 요약
    const summary = await this.summarize(article.textContent);

    return {
      title: article.title,
      content: article.textContent,
      summary,
      images,
      metadata: {
        author: article.byline,
        siteName: article.siteName,
      },
    };
  }

  private extractImages(doc: Document): string[] {
    const images: string[] = [];
    const imgElements = doc.querySelectorAll('article img, .content img, main img');

    imgElements.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.includes('icon') && !src.includes('logo')) {
        images.push(src);
      }
    });

    return images.slice(0, 10); // 최대 10개
  }

  private async summarize(content: string): Promise<string> {
    // Gemini 3 Flash로 요약
    const result = await generate({
      model: gemini3Flash,
      prompt: `Summarize this article in 3-5 sentences:\n\n${content.slice(0, 10000)}`,
    });
    return result.text;
  }
}
```

**ScriptAgent 수정**:
```typescript
// src/agents/research/ScriptAgent.ts
export class ScriptAgent extends BaseAgent<ScriptInput, ScriptOutput> {
  private contentExtractor = new ContentExtractor();

  async generateFromUrl(url: string, options?: ScriptOptions): Promise<ScriptOutput> {
    const content = await this.contentExtractor.extractFromUrl(url);

    return this.execute({
      topic: content.title,
      sourceContent: content.content,
      summary: content.summary,
      referenceImages: content.images,
      ...options,
    });
  }
}
```

---

### 9. 자막 시스템

**새 파일**: `src/services/SubtitleService.ts`
```typescript
import OpenAI from 'openai';

export interface Subtitle {
  index: number;
  start: number;
  end: number;
  text: string;
}

export class SubtitleService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async generateFromAudio(audioBuffer: Buffer, language: string = 'ko'): Promise<Subtitle[]> {
    const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

    const transcription = await this.openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    return transcription.segments.map((seg, i) => ({
      index: i + 1,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
    }));
  }

  toSRT(subtitles: Subtitle[]): string {
    return subtitles.map(sub =>
      `${sub.index}\n${this.formatTime(sub.start)} --> ${this.formatTime(sub.end)}\n${sub.text}\n`
    ).join('\n');
  }

  toVTT(subtitles: Subtitle[]): string {
    const header = 'WEBVTT\n\n';
    const body = subtitles.map(sub =>
      `${this.formatTimeVTT(sub.start)} --> ${this.formatTimeVTT(sub.end)}\n${sub.text}\n`
    ).join('\n');
    return header + body;
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private formatTimeVTT(seconds: number): string {
    return this.formatTime(seconds).replace(',', '.');
  }
}
```

---

### 10. 음성 클론

**새 파일**: `src/services/VoiceCloneService.ts`
```typescript
import { ElevenLabsVoiceClient } from '../clients/elevenlabs';

export interface VoiceProfile {
  id: string;
  name: string;
  sampleCount: number;
  createdAt: Date;
}

export class VoiceCloneService {
  private client: ElevenLabsVoiceClient;

  constructor(apiKey: string) {
    this.client = new ElevenLabsVoiceClient({ apiKey });
  }

  async createProfile(name: string, audioSamples: Buffer[]): Promise<VoiceProfile> {
    if (audioSamples.length < 1) {
      throw new Error('At least 1 audio sample required');
    }

    const voiceId = await this.client.cloneVoice(name, audioSamples);

    return {
      id: voiceId,
      name,
      sampleCount: audioSamples.length,
      createdAt: new Date(),
    };
  }

  async synthesize(text: string, profileId: string): Promise<Buffer> {
    return this.client.synthesize(text, {
      voiceId: profileId,
      stability: 0.5,
      similarityBoost: 0.8,
    });
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.client.client.voices.delete(profileId);
  }
}
```

---

## 낮은 우선순위 (P3)

### 11. 워크플로우 템플릿

**새 파일**: `src/templates/index.ts`
```typescript
export interface WorkflowTemplate {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  category: 'shorts' | 'explainer' | 'news' | 'tutorial' | 'marketing';
  steps: WorkflowStep[];
  defaultConfig: Partial<GenerationConfig>;
  estimatedCost: {
    fast: number;
    standard: number;
  };
  estimatedTime: number; // minutes
}

export const templates: WorkflowTemplate[] = [
  {
    id: 'blog-to-shorts',
    name: 'Blog to Shorts',
    nameKo: '블로그 → Shorts',
    description: 'Convert blog posts into engaging YouTube Shorts',
    descriptionKo: '블로그 글을 매력적인 YouTube Shorts로 변환',
    category: 'shorts',
    steps: [
      { type: 'extract', source: 'url' },
      { type: 'summarize', maxWords: 100 },
      { type: 'script', format: 'shorts' },
      { type: 'voice', preset: 'energetic' },
      { type: 'video', style: 'dynamic' },
      { type: 'thumbnail', variants: 3 },
    ],
    defaultConfig: {
      videoFormat: 'shorts',
      style: { preset: 'dynamic', pacing: 'fast' },
    },
    estimatedCost: { fast: 10.65, standard: 25.65 },
    estimatedTime: 5,
  },
  {
    id: 'news-explainer',
    name: 'News Explainer',
    nameKo: '뉴스 설명',
    description: 'Create explainer videos from news articles',
    descriptionKo: '뉴스 기사를 설명 영상으로 제작',
    category: 'news',
    steps: [
      { type: 'extract', source: 'url' },
      { type: 'research', depth: 'medium' },
      { type: 'script', format: 'explainer' },
      { type: 'voice', preset: 'professional' },
      { type: 'video', style: 'news' },
      { type: 'thumbnail', variants: 5 },
    ],
    defaultConfig: {
      videoFormat: 'medium',
      style: { preset: 'news', pacing: 'medium' },
    },
    estimatedCost: { fast: 47.25, standard: 122.25 },
    estimatedTime: 15,
  },
  {
    id: 'product-demo',
    name: 'Product Demo',
    nameKo: '제품 데모',
    description: 'Create product demonstration videos',
    descriptionKo: '제품 데모 영상 제작',
    category: 'marketing',
    steps: [
      { type: 'input', fields: ['productName', 'features', 'targetAudience'] },
      { type: 'script', format: 'demo' },
      { type: 'voice', preset: 'friendly' },
      { type: 'video', style: 'clean' },
      { type: 'thumbnail', variants: 3 },
    ],
    defaultConfig: {
      videoFormat: 'medium',
      style: { preset: 'clean', pacing: 'medium' },
    },
    estimatedCost: { fast: 35.00, standard: 90.00 },
    estimatedTime: 12,
  },
];
```

---

### 12. Analytics 피드백 루프

**새 파일**: `src/services/AnalyticsService.ts`
```typescript
import { google } from 'googleapis';

export interface VideoAnalytics {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeMinutes: number;
  averageViewDuration: number;
  averageViewPercentage: number;
  ctr: number; // Click-through rate
  impressions: number;
}

export interface PerformanceInsights {
  overallScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  comparisons: {
    metric: string;
    value: number;
    benchmark: number;
    percentile: number;
  }[];
}

export class AnalyticsService {
  private youtube: any;

  constructor(credentials: any) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: credentials,
    });
  }

  async getVideoAnalytics(videoId: string): Promise<VideoAnalytics> {
    const [stats, analytics] = await Promise.all([
      this.youtube.videos.list({
        part: ['statistics'],
        id: [videoId],
      }),
      this.youtube.reports.query({
        ids: 'channel==MINE',
        metrics: 'views,averageViewDuration,averageViewPercentage,annotationClickThroughRate',
        filters: `video==${videoId}`,
        dimensions: 'video',
      }),
    ]);

    return {
      videoId,
      views: parseInt(stats.data.items[0].statistics.viewCount),
      likes: parseInt(stats.data.items[0].statistics.likeCount),
      comments: parseInt(stats.data.items[0].statistics.commentCount),
      shares: 0, // Not directly available
      watchTimeMinutes: analytics.data.rows?.[0]?.[1] || 0,
      averageViewDuration: analytics.data.rows?.[0]?.[2] || 0,
      averageViewPercentage: analytics.data.rows?.[0]?.[3] || 0,
      ctr: analytics.data.rows?.[0]?.[4] || 0,
      impressions: 0,
    };
  }

  async generateInsights(analytics: VideoAnalytics): Promise<PerformanceInsights> {
    // Gemini로 인사이트 생성
    const prompt = `
      Analyze this YouTube video performance and provide insights:

      Views: ${analytics.views}
      Likes: ${analytics.likes}
      Comments: ${analytics.comments}
      Average View Duration: ${analytics.averageViewDuration}s
      Average View Percentage: ${analytics.averageViewPercentage}%
      CTR: ${analytics.ctr}%

      Provide:
      1. Overall score (0-100)
      2. Top 3 strengths
      3. Top 3 weaknesses
      4. Top 5 actionable recommendations
    `;

    // ... Gemini 호출 및 결과 파싱

    return {
      overallScore: 75,
      strengths: [],
      weaknesses: [],
      recommendations: [],
      comparisons: [],
    };
  }
}
```

---

### 13. 배치 처리 시스템

**새 파일**: `src/services/BatchProcessor.ts`
```typescript
import { EventEmitter } from 'events';

export interface BatchJob {
  id: string;
  config: GenerationConfig;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class BatchProcessor extends EventEmitter {
  private queue: BatchJob[] = [];
  private processing = false;
  private concurrency = 2;
  private activeJobs = 0;

  addJob(config: GenerationConfig, priority: 'high' | 'normal' | 'low' = 'normal'): string {
    const job: BatchJob = {
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      config,
      priority,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    // 우선순위에 따라 삽입
    if (priority === 'high') {
      this.queue.unshift(job);
    } else {
      this.queue.push(job);
    }

    this.emit('job:added', job);
    this.processNext();

    return job.id;
  }

  private async processNext(): Promise<void> {
    if (this.activeJobs >= this.concurrency) return;

    const job = this.queue.find(j => j.status === 'pending');
    if (!job) return;

    this.activeJobs++;
    job.status = 'processing';
    job.startedAt = new Date();
    this.emit('job:started', job);

    try {
      const result = await this.executeJob(job);
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      this.emit('job:completed', job);
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      this.emit('job:failed', job);
    } finally {
      this.activeJobs--;
      this.processNext();
    }
  }

  private async executeJob(job: BatchJob): Promise<any> {
    // MasterFlow 실행
    const input = configToFlowInput(job.config);

    return runMasterFlow(input, {
      onProgress: (progress) => {
        job.progress = progress;
        this.emit('job:progress', job);
      },
    });
  }

  getQueue(): BatchJob[] {
    return [...this.queue];
  }

  getJob(id: string): BatchJob | undefined {
    return this.queue.find(j => j.id === id);
  }

  cancelJob(id: string): boolean {
    const job = this.queue.find(j => j.id === id);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      this.emit('job:cancelled', job);
      return true;
    }
    return false;
  }

  estimateTotalCost(): number {
    return this.queue
      .filter(j => j.status === 'pending')
      .reduce((sum, job) => {
        const estimate = quickEstimate({
          videoType: job.config.videoFormat,
          useFastGeneration: true,
        });
        return sum + estimate.total;
      }, 0);
  }
}
```

---

## 체크리스트

### P0 (즉시)
- [ ] Settings → Create 연동
- [ ] Backend 설정 전달
- [ ] MasterFlow 설정 전달
- [ ] 비용 계산 통일

### P1 (높음)
- [ ] Veo API 실제 구현
- [ ] Imagen API 실제 구현
- [ ] 다국어 지원 (ElevenLabs)

### P2 (중간)
- [ ] URL→영상 변환
- [ ] 자막 시스템
- [ ] 음성 클론

### P3 (낮음)
- [ ] 워크플로우 템플릿
- [ ] Analytics 피드백
- [ ] 배치 처리 시스템

---

## 예상 일정

| Phase | 기간 | 내용 |
|-------|------|------|
| P0 | 1-2주 | 즉시 수정 |
| P1 | 2-4주 | API 구현 + 다국어 |
| P2 | 4-6주 | URL→영상, 자막, 음성 클론 |
| P3 | 6-10주 | 템플릿, Analytics, 배치 |

---

## 담당자 할당 (권장)

| 영역 | 우선순위 | 난이도 |
|------|----------|--------|
| Frontend 연동 | P0 | 낮음 |
| Backend API | P1 | 높음 |
| 외부 서비스 통합 | P1-P2 | 중간 |
| 새 기능 개발 | P3 | 중간-높음 |
