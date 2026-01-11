"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Video,
  Mic,
  Type,
  Settings2,
  Play,
  Download,
  ChevronRight,
  Lightbulb,
  Image,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { useSettingsStore } from "@/lib/store";
import type { VideoType } from "@/lib/workflow/types";

// Presets
const STYLE_PRESETS = [
  { value: "cinematic", label: "시네마틱", description: "영화같은 분위기" },
  { value: "documentary", label: "다큐멘터리", description: "정보 전달 중심" },
  { value: "news", label: "뉴스", description: "공식적이고 신뢰감" },
  { value: "casual", label: "캐주얼", description: "친근하고 편안함" },
  { value: "energetic", label: "에너지틱", description: "역동적이고 활기참" },
];

const VOICE_PRESETS = [
  { value: "Kore", label: "Kore", description: "따뜻하고 전문적" },
  { value: "Puck", label: "Puck", description: "밝고 경쾌함" },
  { value: "Zephyr", label: "Zephyr", description: "차분하고 부드러움" },
  { value: "Charon", label: "Charon", description: "명확하고 또렷함" },
  { value: "Fenrir", label: "Fenrir", description: "역동적이고 매력적" },
];

const VIDEO_FORMATS: { value: VideoType; label: string; duration: string; description: string }[] = [
  { value: "shorts", label: "Shorts", duration: "60초", description: "세로 9:16" },
  { value: "medium", label: "중간 길이", duration: "5분", description: "가로 16:9" },
  { value: "longform", label: "긴 영상", duration: "10-15분", description: "가로 16:9" },
];

const EXAMPLE_TOPICS = [
  { label: "🔥 AI 트렌드", topic: "2026년 AI 기술 트렌드와 미래 전망" },
  { label: "🎮 게임 리뷰", topic: "인기 신작 게임 심층 리뷰" },
  { label: "💰 재테크 팁", topic: "초보자를 위한 재테크 시작 가이드" },
  { label: "🍳 요리 레시피", topic: "5분 안에 만드는 간편 요리" },
];

interface QuickCreateModeProps {
  onOpenDetailedConfig?: () => void;
}

export function QuickCreateMode({ onOpenDetailedConfig }: QuickCreateModeProps) {
  const { currentConfig, updateConfig, updatePhaseConfig } = useWorkflowStore();
  const { settings } = useSettingsStore();

  // Local state for quick config - initialized from Settings store
  const [topic, setTopic] = useState(currentConfig?.description || "");
  const [script, setScript] = useState("");
  const [targetAudience, setTargetAudience] = useState("일반 시청자");
  const [videoFormat, setVideoFormat] = useState<VideoType>(
    currentConfig?.videoType || settings.defaultVideoType || "medium"
  );
  const [stylePreset, setStylePreset] = useState(settings.defaultStyle || "cinematic");
  const [colorTone, setColorTone] = useState("neutral");
  const [voiceName, setVoiceName] = useState(
    currentConfig?.phases?.production?.voice?.voiceName || settings.defaultVoice || "Kore"
  );
  const [voiceSpeed, setVoiceSpeed] = useState(currentConfig?.phases?.production?.voice?.speed || 1.0);
  const [resolution, setResolution] = useState("1080p");
  const [subtitles, setSubtitles] = useState(true);
  const [thumbnailVariants, setThumbnailVariants] = useState(3);
  const [textModel, setTextModel] = useState(settings.defaultModels?.text || "gemini-3-flash");

  // Sync to workflow store
  const syncToStore = useCallback(() => {
    if (!currentConfig) return;

    updateConfig({
      name: topic.slice(0, 50) || "New Mission",
      description: topic,
      videoType: videoFormat,
    });

    updatePhaseConfig("production", {
      voice: {
        ...currentConfig.phases.production.voice,
        voiceName,
        speed: voiceSpeed,
      },
      video: {
        ...currentConfig.phases.production.video,
        visualStyle: {
          ...currentConfig.phases.production.video.visualStyle,
          colorGrading: colorTone as "neutral" | "warm" | "cool" | "vintage" | "cinematic" | "teal_orange" | "noir" | "pastel",
        },
      },
    });
  }, [currentConfig, topic, videoFormat, voiceName, voiceSpeed, colorTone, updateConfig, updatePhaseConfig]);

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    const useFast = textModel === "gemini-3-flash";
    const costs = {
      shorts: { fast: 10.65, standard: 25.65 },
      medium: { fast: 47.25, standard: 122.25 },
      longform: { fast: 138.5, standard: 363.5 },
    };
    const baseCost = costs[videoFormat][useFast ? "fast" : "standard"];
    const thumbnailCost = thumbnailVariants * 0.10;
    return (baseCost + thumbnailCost).toFixed(2);
  }, [videoFormat, textModel, thumbnailVariants]);

  // Cost breakdown
  const costBreakdown = useMemo(() => {
    const useFast = textModel === "gemini-3-flash";
    return {
      research: videoFormat === "shorts" ? "0.15" : videoFormat === "medium" ? "0.25" : "0.50",
      production: useFast
        ? videoFormat === "shorts" ? "9.00" : videoFormat === "medium" ? "45.00" : "135.00"
        : videoFormat === "shorts" ? "24.00" : videoFormat === "medium" ? "120.00" : "360.00",
      quality: videoFormat === "shorts" ? "1.50" : videoFormat === "medium" ? "2.00" : "3.00",
      thumbnails: (thumbnailVariants * 0.10).toFixed(2),
    };
  }, [videoFormat, textModel, thumbnailVariants]);

  const handleTopicChange = (value: string) => {
    setTopic(value);
    syncToStore();
  };

  const handleExampleClick = (exampleTopic: string) => {
    setTopic(exampleTopic);
    syncToStore();
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Topic & Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              주제
            </CardTitle>
            <CardDescription>영상의 주제를 입력하거나 예제를 선택하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="예: 2026년 AI 기술 트렌드와 미래 전망"
                value={topic}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="text-lg h-12"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_TOPICS.map((example) => (
                <Button
                  key={example.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleClick(example.topic)}
                  className="gap-1"
                >
                  {example.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Content & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  영상 형식
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {VIDEO_FORMATS.map((format) => (
                    <div
                      key={format.value}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary ${
                        videoFormat === format.value
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      onClick={() => setVideoFormat(format.value)}
                    >
                      <div className="font-medium">{format.label}</div>
                      <div className="text-sm text-muted-foreground">{format.duration}</div>
                      <div className="text-xs text-muted-foreground mt-1">{format.description}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Style & Voice Tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  스타일 & 설정
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="style" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="style">스타일</TabsTrigger>
                    <TabsTrigger value="voice">음성</TabsTrigger>
                    <TabsTrigger value="output">출력</TabsTrigger>
                  </TabsList>

                  <TabsContent value="style" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>스타일 프리셋</Label>
                      <div className="grid gap-2 md:grid-cols-5">
                        {STYLE_PRESETS.map((preset) => (
                          <div
                            key={preset.value}
                            className={`cursor-pointer rounded-lg border p-3 text-center transition-all hover:border-primary ${
                              stylePreset === preset.value
                                ? "border-primary bg-primary/5"
                                : ""
                            }`}
                            onClick={() => setStylePreset(preset.value)}
                          >
                            <div className="font-medium text-sm">{preset.label}</div>
                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>색감</Label>
                        <Select value={colorTone} onValueChange={setColorTone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="warm">따뜻한 톤</SelectItem>
                            <SelectItem value="cool">차가운 톤</SelectItem>
                            <SelectItem value="neutral">중립</SelectItem>
                            <SelectItem value="vibrant">선명한</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="voice" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>음성 선택</Label>
                      <div className="grid gap-2 md:grid-cols-5">
                        {VOICE_PRESETS.map((voice) => (
                          <div
                            key={voice.value}
                            className={`cursor-pointer rounded-lg border p-3 text-center transition-all hover:border-primary ${
                              voiceName === voice.value
                                ? "border-primary bg-primary/5"
                                : ""
                            }`}
                            onClick={() => setVoiceName(voice.value)}
                          >
                            <div className="font-medium text-sm">{voice.label}</div>
                            <div className="text-xs text-muted-foreground">{voice.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>말하기 속도</Label>
                          <span className="text-sm text-muted-foreground">
                            {voiceSpeed.toFixed(1)}x
                          </span>
                        </div>
                        <Slider
                          value={[voiceSpeed]}
                          onValueChange={([v]) => setVoiceSpeed(v)}
                          min={0.8}
                          max={1.2}
                          step={0.1}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="output" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>해상도</Label>
                        <Select value={resolution} onValueChange={setResolution}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="720p">720p HD</SelectItem>
                            <SelectItem value="1080p">1080p Full HD</SelectItem>
                            <SelectItem value="4K">4K Ultra HD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>썸네일 변형</Label>
                          <span className="text-sm text-muted-foreground">
                            {thumbnailVariants}개
                          </span>
                        </div>
                        <Slider
                          value={[thumbnailVariants]}
                          onValueChange={([v]) => setThumbnailVariants(v)}
                          min={1}
                          max={5}
                          step={1}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="subtitles"
                        checked={subtitles}
                        onChange={(e) => setSubtitles(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="subtitles">자막 포함</Label>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Script (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  스크립트 (선택)
                </CardTitle>
                <CardDescription>
                  직접 스크립트를 입력하거나, 비워두면 AI가 자동 생성합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="스크립트를 직접 작성하거나 비워두세요..."
                  className="min-h-[120px]"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Models & Cost */}
          <div className="space-y-6">
            {/* AI Model Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI 모델
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    텍스트 모델
                  </Label>
                  <Select value={textModel} onValueChange={setTextModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-3-flash">Gemini 3 Flash (빠름)</SelectItem>
                      <SelectItem value="gemini-3-pro">Gemini 3 Pro (고품질)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    비디오 모델
                  </Label>
                  <Select defaultValue="veo-3.1-fast">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veo-3.1-fast">Veo 3.1 Fast</SelectItem>
                      <SelectItem value="veo-3.1-standard">Veo 3.1 Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    썸네일 모델
                  </Label>
                  <Select defaultValue="nano-banana-pro">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nano-banana-pro">Nano Banana Pro</SelectItem>
                      <SelectItem value="imagen-3">Imagen 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>비용 상세</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">리서치</span>
                    <span>${costBreakdown.research}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">프로덕션</span>
                    <span>${costBreakdown.production}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">품질 평가</span>
                    <span>${costBreakdown.quality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">썸네일 ({thumbnailVariants}개)</span>
                    <span>${costBreakdown.thumbnails}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>총 예상 비용</span>
                    <span className="text-primary">${estimatedCost}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Open Detailed Config */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    더 세밀한 설정이 필요하신가요?
                  </p>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={onOpenDetailedConfig}
                  >
                    <Settings2 className="h-4 w-4" />
                    상세 설정 열기
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
