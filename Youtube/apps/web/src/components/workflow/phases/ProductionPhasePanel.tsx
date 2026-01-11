"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Mic,
  Video,
  Image,
  Scissors,
  ChevronDown,
  ChevronRight,
  Settings2,
  Type,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  ProductionPhaseConfig,
  VoiceAgentConfig,
  VideoAgentConfig,
  ThumbnailAgentConfig,
  EditorAgentConfig,
  GeminiVoiceStyle,
  GeminiPacePreset,
} from "@/lib/workflow/types";
import { VoiceSelector } from "../VoiceSelector";

// Gemini 스타일 프리셋 라벨
const GEMINI_STYLE_LABELS: Record<GeminiVoiceStyle, { label: string; prompt: string }> = {
  neutral: { label: "중립", prompt: "Speak in a neutral, balanced tone" },
  calm: { label: "차분한", prompt: "Speak in a calm, soothing, relaxed tone" },
  professional: { label: "전문적", prompt: "Speak in a professional, authoritative tone suitable for business content" },
  energetic: { label: "활기찬", prompt: "Speak with energy and enthusiasm, upbeat and engaging" },
  friendly: { label: "친근한", prompt: "Speak in a warm, friendly, approachable tone" },
  serious: { label: "진지한", prompt: "Speak in a serious, thoughtful tone with gravitas" },
  dramatic: { label: "드라마틱", prompt: "Speak with dramatic flair and emotional expression" },
  storytelling: { label: "스토리텔링", prompt: "Speak like a storyteller, engaging and captivating" },
  news: { label: "뉴스", prompt: "Speak like a news anchor, clear and informative" },
  documentary: { label: "다큐멘터리", prompt: "Speak like a documentary narrator, measured and educational" },
};

// Gemini 속도 프리셋 라벨
const GEMINI_PACE_LABELS: Record<GeminiPacePreset, { label: string; tag: string }> = {
  very_slow: { label: "매우 느림", tag: "[very slow]" },
  slow: { label: "느림", tag: "[slow]" },
  medium: { label: "보통", tag: "" },
  fast: { label: "빠름", tag: "[fast]" },
  very_fast: { label: "매우 빠름", tag: "[extremely fast]" },
};

interface ProductionPhasePanelProps {
  config: ProductionPhaseConfig;
}

export function ProductionPhasePanel({ config }: ProductionPhasePanelProps) {
  const { updatePhaseConfig } = useWorkflowStore();
  const [openSections, setOpenSections] = useState<string[]>(["voice", "video", "thumbnail"]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const updateVoice = (updates: Partial<VoiceAgentConfig>) => {
    updatePhaseConfig("production", { voice: { ...config.voice, ...updates } });
  };

  const updateVideo = (updates: Partial<VideoAgentConfig>) => {
    updatePhaseConfig("production", { video: { ...config.video, ...updates } });
  };

  const updateThumbnail = (updates: Partial<ThumbnailAgentConfig>) => {
    updatePhaseConfig("production", { thumbnail: { ...config.thumbnail, ...updates } });
  };

  const updateEditor = (updates: Partial<EditorAgentConfig>) => {
    updatePhaseConfig("production", { editor: { ...config.editor, ...updates } });
  };

  // Gemini 스타일 프리셋 변경 시 프롬프트도 함께 업데이트
  const handleGeminiStyleChange = (preset: GeminiVoiceStyle) => {
    updateVoice({
      geminiConfig: {
        ...config.voice.geminiConfig!,
        stylePreset: preset,
        stylePrompt: GEMINI_STYLE_LABELS[preset].prompt,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Phase Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            단계 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>병렬 실행</Label>
              <p className="text-xs text-muted-foreground">음성/영상/썸네일 동시 생성</p>
            </div>
            <Switch
              checked={config.parallelExecution}
              onCheckedChange={(v) => updatePhaseConfig("production", { parallelExecution: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>자동 진행</Label>
              <p className="text-xs text-muted-foreground">완료 시 다음 단계로 자동 진행</p>
            </div>
            <Switch
              checked={config.autoAdvance}
              onCheckedChange={(v) => updatePhaseConfig("production", { autoAdvance: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>검토 대기</Label>
              <p className="text-xs text-muted-foreground">다음 단계 전 사용자 검토 필요</p>
            </div>
            <Switch
              checked={config.reviewGate}
              onCheckedChange={(v) => updatePhaseConfig("production", { reviewGate: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice Agent */}
      <Collapsible open={openSections.includes("voice")} onOpenChange={() => toggleSection("voice")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Mic className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">음성 생성 에이전트</CardTitle>
                    <CardDescription>TTS를 통한 내레이션 생성</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.voice.enabled ? "default" : "secondary"}>
                    {config.voice.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("voice") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between">
                <Label>에이전트 활성화</Label>
                <Switch
                  checked={config.voice.enabled}
                  onCheckedChange={(v) => updateVoice({ enabled: v })}
                />
              </div>

              {config.voice.enabled && (
                <>
                  <Separator />

                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <Label>TTS 제공자</Label>
                    <Select
                      value={config.voice.provider}
                      onValueChange={(v) => updateVoice({ provider: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini_tts">Gemini TTS (권장)</SelectItem>
                        <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                        <SelectItem value="google_cloud">Google Cloud TTS</SelectItem>
                        <SelectItem value="manual">수동 업로드</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Voice Selection */}
                  <div className="space-y-2">
                    <Label>음성 선택 및 미리듣기</Label>
                    <VoiceSelector
                      selectedVoice={config.voice.voiceName}
                      onSelect={(voiceId) => updateVoice({ voiceName: voiceId })}
                    />
                  </div>

                  <Separator />

                  {/* ============================================ */}
                  {/* Gemini TTS Settings */}
                  {/* ============================================ */}
                  {config.voice.provider === "gemini_tts" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                        <Info className="h-4 w-4" />
                        Gemini TTS 설정
                      </div>

                      {/* Style Preset */}
                      <div className="space-y-2">
                        <Label>스타일 프리셋</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {(Object.keys(GEMINI_STYLE_LABELS) as GeminiVoiceStyle[]).map((style) => (
                            <Button
                              key={style}
                              variant={config.voice.geminiConfig?.stylePreset === style ? "default" : "outline"}
                              size="sm"
                              className="text-xs"
                              onClick={() => handleGeminiStyleChange(style)}
                            >
                              {GEMINI_STYLE_LABELS[style].label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Style Prompt */}
                      <div className="space-y-2">
                        <Label>스타일 프롬프트 (API 직접 전달)</Label>
                        <Textarea
                          placeholder="Speak in a calm, professional tone..."
                          value={config.voice.geminiConfig?.stylePrompt || ""}
                          onChange={(e) =>
                            updateVoice({
                              geminiConfig: { ...config.voice.geminiConfig!, stylePrompt: e.target.value },
                            })
                          }
                          rows={2}
                          className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          자연어로 음성 스타일을 지시합니다. 프리셋 선택 시 자동 입력됩니다.
                        </p>
                      </div>

                      {/* Pace Preset */}
                      <div className="space-y-2">
                        <Label>속도 프리셋</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {(Object.keys(GEMINI_PACE_LABELS) as GeminiPacePreset[]).map((pace) => (
                            <Button
                              key={pace}
                              variant={config.voice.geminiConfig?.pacePreset === pace ? "default" : "outline"}
                              size="sm"
                              className="text-xs"
                              onClick={() =>
                                updateVoice({
                                  geminiConfig: { ...config.voice.geminiConfig!, pacePreset: pace },
                                })
                              }
                            >
                              {GEMINI_PACE_LABELS[pace].label}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          마크업 태그로 변환됩니다: {GEMINI_PACE_LABELS[config.voice.geminiConfig?.pacePreset || "medium"].tag || "(기본)"}
                        </p>
                      </div>

                      {/* Markup Tags */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>마크업 태그 사용</Label>
                          <p className="text-xs text-muted-foreground">
                            [sigh], [laughing], [whispering] 등 비언어적 표현
                          </p>
                        </div>
                        <Switch
                          checked={config.voice.geminiConfig?.useMarkupTags ?? false}
                          onCheckedChange={(v) =>
                            updateVoice({
                              geminiConfig: { ...config.voice.geminiConfig!, useMarkupTags: v },
                            })
                          }
                        />
                      </div>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Gemini TTS는 숫자형 speed/pitch 파라미터를 지원하지 않습니다.
                          대신 자연어 프롬프트와 마크업 태그([slow], [fast] 등)로 제어합니다.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* ============================================ */}
                  {/* ElevenLabs Settings */}
                  {/* ============================================ */}
                  {config.voice.provider === "elevenlabs" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
                        <Info className="h-4 w-4" />
                        ElevenLabs 설정
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>안정성 ({(config.voice.elevenlabs?.stability ?? 0.5).toFixed(2)})</Label>
                          <Slider
                            value={[config.voice.elevenlabs?.stability ?? 0.5]}
                            onValueChange={([v]) =>
                              updateVoice({
                                elevenlabs: { ...config.voice.elevenlabs!, stability: v },
                              })
                            }
                            min={0}
                            max={1}
                            step={0.05}
                          />
                          <p className="text-xs text-muted-foreground">
                            낮으면 감정 변화가 크고, 높으면 일관됩니다
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>유사도 ({(config.voice.elevenlabs?.similarityBoost ?? 0.75).toFixed(2)})</Label>
                          <Slider
                            value={[config.voice.elevenlabs?.similarityBoost ?? 0.75]}
                            onValueChange={([v]) =>
                              updateVoice({
                                elevenlabs: { ...config.voice.elevenlabs!, similarityBoost: v },
                              })
                            }
                            min={0}
                            max={1}
                            step={0.05}
                          />
                          <p className="text-xs text-muted-foreground">
                            원본 음성에 대한 충실도
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>속도 ({(config.voice.elevenlabs?.speed ?? 1.0).toFixed(1)}x)</Label>
                        <Slider
                          value={[config.voice.elevenlabs?.speed ?? 1.0]}
                          onValueChange={([v]) =>
                            updateVoice({
                              elevenlabs: { ...config.voice.elevenlabs!, speed: v },
                            })
                          }
                          min={0.5}
                          max={2.0}
                          step={0.1}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm">스피커 부스트</Label>
                            <p className="text-xs text-muted-foreground">레이턴시 증가</p>
                          </div>
                          <Switch
                            checked={config.voice.elevenlabs?.speakerBoost ?? true}
                            onCheckedChange={(v) =>
                              updateVoice({
                                elevenlabs: { ...config.voice.elevenlabs!, speakerBoost: v },
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>스타일 강조 ({(config.voice.elevenlabs?.styleExaggeration ?? 0).toFixed(2)})</Label>
                          <Slider
                            value={[config.voice.elevenlabs?.styleExaggeration ?? 0]}
                            onValueChange={([v]) =>
                              updateVoice({
                                elevenlabs: { ...config.voice.elevenlabs!, styleExaggeration: v },
                              })
                            }
                            min={0}
                            max={1}
                            step={0.05}
                          />
                        </div>
                      </div>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          ElevenLabs는 pitch 조절을 지원하지 않습니다.
                          모든 설정값은 API에서 직접 지원됩니다.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* ============================================ */}
                  {/* Google Cloud TTS Settings */}
                  {/* ============================================ */}
                  {config.voice.provider === "google_cloud" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                        <Info className="h-4 w-4" />
                        Google Cloud TTS 설정 (SSML)
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>SSML 사용</Label>
                          <p className="text-xs text-muted-foreground">
                            prosody 태그로 rate, pitch, volume 제어
                          </p>
                        </div>
                        <Switch
                          checked={config.voice.googleCloudConfig?.useSSML ?? true}
                          onCheckedChange={(v) =>
                            updateVoice({
                              googleCloudConfig: { ...config.voice.googleCloudConfig!, useSSML: v },
                            })
                          }
                        />
                      </div>

                      {config.voice.googleCloudConfig?.useSSML && (
                        <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                          <h5 className="font-medium text-sm">Prosody 설정</h5>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>속도 (Rate)</Label>
                              <Select
                                value={config.voice.googleCloudConfig?.prosody?.rate ?? "medium"}
                                onValueChange={(v) =>
                                  updateVoice({
                                    googleCloudConfig: {
                                      ...config.voice.googleCloudConfig!,
                                      prosody: { ...config.voice.googleCloudConfig!.prosody!, rate: v as any },
                                    },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="x-slow">매우 느림</SelectItem>
                                  <SelectItem value="slow">느림</SelectItem>
                                  <SelectItem value="medium">보통</SelectItem>
                                  <SelectItem value="fast">빠름</SelectItem>
                                  <SelectItem value="x-fast">매우 빠름</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>피치 (Pitch)</Label>
                              <Select
                                value={config.voice.googleCloudConfig?.prosody?.pitch ?? "medium"}
                                onValueChange={(v) =>
                                  updateVoice({
                                    googleCloudConfig: {
                                      ...config.voice.googleCloudConfig!,
                                      prosody: { ...config.voice.googleCloudConfig!.prosody!, pitch: v as any },
                                    },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="x-low">매우 낮음</SelectItem>
                                  <SelectItem value="low">낮음</SelectItem>
                                  <SelectItem value="medium">보통</SelectItem>
                                  <SelectItem value="high">높음</SelectItem>
                                  <SelectItem value="x-high">매우 높음</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>볼륨 (Volume)</Label>
                              <Select
                                value={config.voice.googleCloudConfig?.prosody?.volume ?? "medium"}
                                onValueChange={(v) =>
                                  updateVoice({
                                    googleCloudConfig: {
                                      ...config.voice.googleCloudConfig!,
                                      prosody: { ...config.voice.googleCloudConfig!.prosody!, volume: v as any },
                                    },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="silent">무음</SelectItem>
                                  <SelectItem value="x-soft">매우 작게</SelectItem>
                                  <SelectItem value="soft">작게</SelectItem>
                                  <SelectItem value="medium">보통</SelectItem>
                                  <SelectItem value="loud">크게</SelectItem>
                                  <SelectItem value="x-loud">매우 크게</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>커스텀 SSML (선택사항)</Label>
                        <Textarea
                          placeholder="<speak><prosody rate='medium'>...</prosody></speak>"
                          value={config.voice.googleCloudConfig?.customSSML || ""}
                          onChange={(e) =>
                            updateVoice({
                              googleCloudConfig: { ...config.voice.googleCloudConfig!, customSSML: e.target.value },
                            })
                          }
                          rows={3}
                          className="font-mono text-xs"
                        />
                      </div>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Google Cloud TTS는 SSML prosody 태그를 통해 rate, pitch, volume을 완전히 지원합니다.
                          피치 조절이 필요하면 이 제공자를 선택하세요.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <Separator />

                  {/* Common Audio Output Settings */}
                  <div className="space-y-4">
                    <h5 className="font-medium text-sm">출력 설정</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>출력 형식</Label>
                        <Select
                          value={config.voice.outputFormat}
                          onValueChange={(v) => updateVoice({ outputFormat: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mp3">MP3</SelectItem>
                            <SelectItem value="wav">WAV</SelectItem>
                            <SelectItem value="ogg">OGG</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>샘플레이트</Label>
                        <Select
                          value={String(config.voice.sampleRate)}
                          onValueChange={(v) => updateVoice({ sampleRate: parseInt(v) as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24000">24000 Hz (권장)</SelectItem>
                            <SelectItem value="44100">44100 Hz</SelectItem>
                            <SelectItem value="48000">48000 Hz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Post-Processing Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-sm">오디오 후처리</h5>
                        <Badge variant="outline" className="text-xs">FFmpeg 필요</Badge>
                      </div>
                      <Switch
                        checked={config.voice.postProcessing?.enabled ?? false}
                        onCheckedChange={(v) =>
                          updateVoice({
                            postProcessing: { ...config.voice.postProcessing!, enabled: v },
                          })
                        }
                      />
                    </div>

                    {config.voice.postProcessing?.enabled && (
                      <>
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            오디오 후처리는 TTS API에서 지원하지 않습니다.
                            서버에 FFmpeg가 설치되어 있어야 하며, 별도 처리 파이프라인이 필요합니다.
                          </AlertDescription>
                        </Alert>

                        <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>LUFS 노멀라이즈</Label>
                              <p className="text-xs text-muted-foreground">
                                일관된 볼륨 레벨로 정규화
                              </p>
                            </div>
                            <Switch
                              checked={config.voice.postProcessing?.normalize?.enabled ?? false}
                              onCheckedChange={(v) =>
                                updateVoice({
                                  postProcessing: {
                                    ...config.voice.postProcessing!,
                                    normalize: { ...config.voice.postProcessing!.normalize!, enabled: v },
                                  },
                                })
                              }
                            />
                          </div>

                          {config.voice.postProcessing?.normalize?.enabled && (
                            <div className="space-y-2">
                              <Label>목표 LUFS ({config.voice.postProcessing?.normalize?.targetLUFS ?? -16})</Label>
                              <Slider
                                value={[config.voice.postProcessing?.normalize?.targetLUFS ?? -16]}
                                onValueChange={([v]) =>
                                  updateVoice({
                                    postProcessing: {
                                      ...config.voice.postProcessing!,
                                      normalize: { ...config.voice.postProcessing!.normalize!, targetLUFS: v },
                                    },
                                  })
                                }
                                min={-23}
                                max={-14}
                                step={1}
                              />
                              <p className="text-xs text-muted-foreground">
                                YouTube 권장: -14 LUFS
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div>
                              <Label>서버 사이드 처리</Label>
                              <p className="text-xs text-muted-foreground">
                                서버에서 FFmpeg 자동 실행
                              </p>
                            </div>
                            <Switch
                              checked={config.voice.postProcessing?.serverSideProcessing ?? false}
                              onCheckedChange={(v) =>
                                updateVoice({
                                  postProcessing: { ...config.voice.postProcessing!, serverSideProcessing: v },
                                })
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Video Agent */}
      <Collapsible open={openSections.includes("video")} onOpenChange={() => toggleSection("video")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Video className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">영상 생성 에이전트</CardTitle>
                    <CardDescription>Veo 또는 Imagen 기반 영상 생성</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.video.enabled ? "default" : "secondary"}>
                    {config.video.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("video") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between">
                <Label>에이전트 활성화</Label>
                <Switch
                  checked={config.video.enabled}
                  onCheckedChange={(v) => updateVideo({ enabled: v })}
                />
              </div>

              {config.video.enabled && (
                <>
                  <Separator />

                  <div className="space-y-2">
                    <Label>영상 생성 모드</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "imagen_slideshow", label: "이미지 슬라이드쇼", desc: "저렴함" },
                        { value: "veo", label: "Veo 3.1", desc: "고품질" },
                        { value: "manual", label: "수동 업로드", desc: "직접 제작" },
                      ].map((mode) => (
                        <div
                          key={mode.value}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            config.video.mode === mode.value
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground"
                          }`}
                          onClick={() => updateVideo({ mode: mode.value as any })}
                        >
                          <p className="font-medium text-sm">{mode.label}</p>
                          <p className="text-xs text-muted-foreground">{mode.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {config.video.mode === "veo" && config.video.veoConfig && (
                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Veo 3.1 설정
                      </h5>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>품질 티어</Label>
                          <Select
                            value={config.video.veoConfig.tier}
                            onValueChange={(v) =>
                              updateVideo({
                                veoConfig: { ...config.video.veoConfig!, tier: v as any },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fast">Fast ($0.15/초)</SelectItem>
                              <SelectItem value="standard">Standard ($0.40/초)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>해상도</Label>
                          <Select
                            value={config.video.veoConfig.resolution}
                            onValueChange={(v) =>
                              updateVideo({
                                veoConfig: { ...config.video.veoConfig!, resolution: v as any },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="720p">720p</SelectItem>
                              <SelectItem value="1080p">1080p</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>FPS</Label>
                          <Select
                            value={String(config.video.veoConfig.fps)}
                            onValueChange={(v) =>
                              updateVideo({
                                veoConfig: { ...config.video.veoConfig!, fps: parseInt(v) as any },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="24">24 fps</SelectItem>
                              <SelectItem value="30">30 fps</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>화면 비율</Label>
                          <Select
                            value={config.video.veoConfig.aspectRatio}
                            onValueChange={(v) =>
                              updateVideo({
                                veoConfig: { ...config.video.veoConfig!, aspectRatio: v as any },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="16:9">16:9 (가로)</SelectItem>
                              <SelectItem value="9:16">9:16 (세로/Shorts)</SelectItem>
                              <SelectItem value="1:1">1:1 (정사각형)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {config.video.mode === "imagen_slideshow" && config.video.imagenConfig && (
                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Imagen 슬라이드쇼 설정
                      </h5>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>분당 이미지 수 ({config.video.imagenConfig.imagesPerMinute})</Label>
                          <Slider
                            value={[config.video.imagenConfig.imagesPerMinute]}
                            onValueChange={([v]) =>
                              updateVideo({
                                imagenConfig: { ...config.video.imagenConfig!, imagesPerMinute: v },
                              })
                            }
                            min={5}
                            max={20}
                            step={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>전환 효과</Label>
                          <Select
                            value={config.video.imagenConfig.transitionStyle}
                            onValueChange={(v) =>
                              updateVideo({
                                imagenConfig: {
                                  ...config.video.imagenConfig!,
                                  transitionStyle: v as any,
                                },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fade">페이드</SelectItem>
                              <SelectItem value="slide">슬라이드</SelectItem>
                              <SelectItem value="zoom">줌</SelectItem>
                              <SelectItem value="ken_burns">켄 번스</SelectItem>
                              <SelectItem value="none">없음</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>이미지 스타일</Label>
                        <Input
                          placeholder="photorealistic, high quality, detailed..."
                          value={config.video.imagenConfig.imageStyle || ""}
                          onChange={(e) =>
                            updateVideo({
                              imagenConfig: {
                                ...config.video.imagenConfig!,
                                imageStyle: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Thumbnail Agent */}
      <Collapsible
        open={openSections.includes("thumbnail")}
        onOpenChange={() => toggleSection("thumbnail")}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <Image className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">썸네일 생성 에이전트</CardTitle>
                    <CardDescription>클릭을 유도하는 썸네일 생성</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.thumbnail.enabled ? "default" : "secondary"}>
                    {config.thumbnail.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("thumbnail") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between">
                <Label>에이전트 활성화</Label>
                <Switch
                  checked={config.thumbnail.enabled}
                  onCheckedChange={(v) => updateThumbnail({ enabled: v })}
                />
              </div>

              {config.thumbnail.enabled && (
                <>
                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>변형 수 ({config.thumbnail.variants}개)</Label>
                      <Slider
                        value={[config.thumbnail.variants]}
                        onValueChange={([v]) => updateThumbnail({ variants: v })}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>스타일</Label>
                      <Select
                        value={config.thumbnail.style}
                        onValueChange={(v) => updateThumbnail({ style: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bold">볼드</SelectItem>
                          <SelectItem value="minimal">미니멀</SelectItem>
                          <SelectItem value="cinematic">시네마틱</SelectItem>
                          <SelectItem value="clickbait">클릭베이트</SelectItem>
                          <SelectItem value="professional">프로페셔널</SelectItem>
                          <SelectItem value="custom">커스텀</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>텍스트 오버레이</Label>
                      <p className="text-xs text-muted-foreground">썸네일에 텍스트 추가</p>
                    </div>
                    <Switch
                      checked={config.thumbnail.includeText}
                      onCheckedChange={(v) => updateThumbnail({ includeText: v })}
                    />
                  </div>

                  {config.thumbnail.includeText && config.thumbnail.textStyle && (
                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        텍스트 스타일
                      </h5>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>크기</Label>
                          <Select
                            value={config.thumbnail.textStyle.size}
                            onValueChange={(v) =>
                              updateThumbnail({
                                textStyle: { ...config.thumbnail.textStyle!, size: v as any },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">작게</SelectItem>
                              <SelectItem value="medium">보통</SelectItem>
                              <SelectItem value="large">크게</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>위치</Label>
                          <Select
                            value={config.thumbnail.textStyle.position}
                            onValueChange={(v) =>
                              updateThumbnail({
                                textStyle: { ...config.thumbnail.textStyle!, position: v as any },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">상단</SelectItem>
                              <SelectItem value="center">중앙</SelectItem>
                              <SelectItem value="bottom">하단</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>색상</Label>
                          <Input
                            type="color"
                            value={config.thumbnail.textStyle.color}
                            onChange={(e) =>
                              updateThumbnail({
                                textStyle: { ...config.thumbnail.textStyle!, color: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Editor Agent */}
      <Collapsible
        open={openSections.includes("editor")}
        onOpenChange={() => toggleSection("editor")}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Scissors className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">편집 에이전트</CardTitle>
                    <CardDescription>영상 편집 및 후처리</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.editor.enabled ? "default" : "secondary"}>
                    {config.editor.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("editor") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between">
                <Label>에이전트 활성화</Label>
                <Switch
                  checked={config.editor.enabled}
                  onCheckedChange={(v) => updateEditor({ enabled: v })}
                />
              </div>

              {config.editor.enabled && (
                <>
                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>전환 스타일</Label>
                      <Select
                        value={config.editor.transitions.style}
                        onValueChange={(v) =>
                          updateEditor({
                            transitions: { ...config.editor.transitions, style: v as any },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cut">컷</SelectItem>
                          <SelectItem value="fade">페이드</SelectItem>
                          <SelectItem value="dissolve">디졸브</SelectItem>
                          <SelectItem value="wipe">와이프</SelectItem>
                          <SelectItem value="zoom">줌</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>전환 빈도</Label>
                      <Select
                        value={config.editor.transitions.frequency}
                        onValueChange={(v) =>
                          updateEditor({
                            transitions: { ...config.editor.transitions, frequency: v as any },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="every_scene">모든 장면</SelectItem>
                          <SelectItem value="key_moments">핵심 순간</SelectItem>
                          <SelectItem value="minimal">최소</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>전환 길이 ({config.editor.transitions.duration}초)</Label>
                      <Slider
                        value={[config.editor.transitions.duration]}
                        onValueChange={([v]) =>
                          updateEditor({
                            transitions: { ...config.editor.transitions, duration: v },
                          })
                        }
                        min={0.1}
                        max={1}
                        step={0.1}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>텍스트 오버레이</Label>
                      <p className="text-xs text-muted-foreground">자막 및 키워드 하이라이트</p>
                    </div>
                    <Switch
                      checked={config.editor.textOverlays.enabled}
                      onCheckedChange={(v) =>
                        updateEditor({
                          textOverlays: { ...config.editor.textOverlays, enabled: v },
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">음향 효과</Label>
                      <Switch
                        checked={config.editor.soundEffects?.enabled ?? false}
                        onCheckedChange={(v) =>
                          updateEditor({
                            soundEffects: { ...config.editor.soundEffects, enabled: v },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">색보정</Label>
                      <Switch
                        checked={config.editor.visualEffects?.colorCorrection ?? true}
                        onCheckedChange={(v) =>
                          updateEditor({
                            visualEffects: { ...config.editor.visualEffects, colorCorrection: v },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">흔들림 보정</Label>
                      <Switch
                        checked={config.editor.visualEffects?.stabilization ?? true}
                        onCheckedChange={(v) =>
                          updateEditor({
                            visualEffects: { ...config.editor.visualEffects, stabilization: v },
                          })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
