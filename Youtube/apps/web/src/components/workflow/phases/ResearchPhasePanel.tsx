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
  TrendingUp,
  Lightbulb,
  FileText,
  ChevronDown,
  ChevronRight,
  Settings2,
  Sparkles,
  Zap,
  Target,
  Clock,
  MessageSquare,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  ResearchPhaseConfig,
  TrendAgentConfig,
  TopicAgentConfig,
  ScriptAgentConfig,
} from "@/lib/workflow/types";

interface ResearchPhasePanelProps {
  config: ResearchPhaseConfig;
}

export function ResearchPhasePanel({ config }: ResearchPhasePanelProps) {
  const { updatePhaseConfig } = useWorkflowStore();
  const [openSections, setOpenSections] = useState<string[]>(["trend", "topic", "script"]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const updateTrend = (updates: Partial<TrendAgentConfig>) => {
    updatePhaseConfig("research", { trend: { ...config.trend, ...updates } });
  };

  const updateTopic = (updates: Partial<TopicAgentConfig>) => {
    updatePhaseConfig("research", { topic: { ...config.topic, ...updates } });
  };

  const updateScript = (updates: Partial<ScriptAgentConfig>) => {
    updatePhaseConfig("research", { script: { ...config.script, ...updates } });
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
              <Label>자동 진행</Label>
              <p className="text-xs text-muted-foreground">완료 시 다음 단계로 자동 진행</p>
            </div>
            <Switch
              checked={config.autoAdvance}
              onCheckedChange={(v) => updatePhaseConfig("research", { autoAdvance: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>검토 대기</Label>
              <p className="text-xs text-muted-foreground">다음 단계 전 사용자 검토 필요</p>
            </div>
            <Switch
              checked={config.reviewGate}
              onCheckedChange={(v) => updatePhaseConfig("research", { reviewGate: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trend Agent */}
      <Collapsible open={openSections.includes("trend")} onOpenChange={() => toggleSection("trend")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">트렌드 분석 에이전트</CardTitle>
                    <CardDescription>실시간 트렌드 분석 및 주제 발굴</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.trend.enabled ? "default" : "secondary"}>
                    {config.trend.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("trend") ? (
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
                  checked={config.trend.enabled}
                  onCheckedChange={(v) => updateTrend({ enabled: v })}
                />
              </div>

              {config.trend.enabled && (
                <>
                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>데이터 소스</Label>
                      <div className="flex flex-wrap gap-2">
                        {["youtube", "google_trends", "twitter", "reddit"].map((source) => (
                          <Badge
                            key={source}
                            variant={
                              config.trend.sources.includes(source as any)
                                ? "default"
                                : "outline"
                            }
                            className="cursor-pointer"
                            onClick={() => {
                              const sources = config.trend.sources.includes(source as any)
                                ? config.trend.sources.filter((s) => s !== source)
                                : [...config.trend.sources, source as any];
                              updateTrend({ sources });
                            }}
                          >
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>시간 범위</Label>
                      <Select
                        value={config.trend.timeRange}
                        onValueChange={(v) => updateTrend({ timeRange: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1h">최근 1시간</SelectItem>
                          <SelectItem value="24h">최근 24시간</SelectItem>
                          <SelectItem value="7d">최근 7일</SelectItem>
                          <SelectItem value="30d">최근 30일</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>지역</Label>
                      <Select
                        value={config.trend.region}
                        onValueChange={(v) => updateTrend({ region: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KR">한국</SelectItem>
                          <SelectItem value="US">미국</SelectItem>
                          <SelectItem value="JP">일본</SelectItem>
                          <SelectItem value="GB">영국</SelectItem>
                          <SelectItem value="global">전세계</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>최대 트렌드 수</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[config.trend.maxTrends]}
                          onValueChange={([v]) => updateTrend({ maxTrends: v })}
                          min={5}
                          max={30}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm w-8">{config.trend.maxTrends}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>커스텀 프롬프트 (선택)</Label>
                    <Textarea
                      placeholder="특정 지시사항이나 제약 조건을 입력하세요..."
                      value={config.trend.customPrompt || ""}
                      onChange={(e) => updateTrend({ customPrompt: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>AI 모델</Label>
                      <Select
                        value={config.trend.model}
                        onValueChange={(v) => updateTrend({ model: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-3-flash">Gemini 3 Flash (빠름)</SelectItem>
                          <SelectItem value="gemini-3-pro">Gemini 3 Pro (정확)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature ({config.trend.temperature})</Label>
                      <Slider
                        value={[config.trend.temperature]}
                        onValueChange={([v]) => updateTrend({ temperature: v })}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Topic Agent */}
      <Collapsible open={openSections.includes("topic")} onOpenChange={() => toggleSection("topic")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">주제 선정 에이전트</CardTitle>
                    <CardDescription>최적의 콘텐츠 주제 및 앵글 결정</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.topic.enabled ? "default" : "secondary"}>
                    {config.topic.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("topic") ? (
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
                  checked={config.topic.enabled}
                  onCheckedChange={(v) => updateTopic({ enabled: v })}
                />
              </div>

              {config.topic.enabled && (
                <>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI 자동 선정</Label>
                      <p className="text-xs text-muted-foreground">
                        비활성화 시 수동으로 주제 입력
                      </p>
                    </div>
                    <Switch
                      checked={config.topic.useAISelection}
                      onCheckedChange={(v) => updateTopic({ useAISelection: v })}
                    />
                  </div>

                  {!config.topic.useAISelection && (
                    <div className="space-y-2">
                      <Label>주제 직접 입력</Label>
                      <Input
                        placeholder="콘텐츠 주제를 입력하세요"
                        value={config.topic.manualTopic || ""}
                        onChange={(e) => updateTopic({ manualTopic: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>타겟 오디언스</Label>
                      <Input
                        placeholder="예: 20-30대 직장인"
                        value={config.topic.targetAudience}
                        onChange={(e) => updateTopic({ targetAudience: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>콘텐츠 목표</Label>
                      <Select
                        value={config.topic.contentGoal}
                        onValueChange={(v) => updateTopic({ contentGoal: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entertain">재미 (Entertain)</SelectItem>
                          <SelectItem value="educate">교육 (Educate)</SelectItem>
                          <SelectItem value="inspire">영감 (Inspire)</SelectItem>
                          <SelectItem value="inform">정보 전달 (Inform)</SelectItem>
                          <SelectItem value="persuade">설득 (Persuade)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>경쟁사 분석</Label>
                      <p className="text-xs text-muted-foreground">
                        유사 콘텐츠 분석 후 차별화 포인트 도출
                      </p>
                    </div>
                    <Switch
                      checked={config.topic.competitorAnalysis}
                      onCheckedChange={(v) => updateTopic({ competitorAnalysis: v })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>차별화 앵글 프롬프트 (선택)</Label>
                    <Textarea
                      placeholder="특정 관점이나 차별화 포인트를 지정하세요..."
                      value={config.topic.uniqueAnglePrompt || ""}
                      onChange={(e) => updateTopic({ uniqueAnglePrompt: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>AI 모델</Label>
                      <Select
                        value={config.topic.model}
                        onValueChange={(v) => updateTopic({ model: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-3-flash">Gemini 3 Flash</SelectItem>
                          <SelectItem value="gemini-3-pro">Gemini 3 Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature ({config.topic.temperature})</Label>
                      <Slider
                        value={[config.topic.temperature]}
                        onValueChange={([v]) => updateTopic({ temperature: v })}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Script Agent */}
      <Collapsible
        open={openSections.includes("script")}
        onOpenChange={() => toggleSection("script")}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">스크립트 생성 에이전트</CardTitle>
                    <CardDescription>바이럴 대본 작성 및 스토리보드 생성</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.script.enabled ? "default" : "secondary"}>
                    {config.script.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("script") ? (
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
                  checked={config.script.enabled}
                  onCheckedChange={(v) => updateScript({ enabled: v })}
                />
              </div>

              {config.script.enabled && (
                <>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>수동 스크립트 사용</Label>
                      <p className="text-xs text-muted-foreground">직접 작성한 스크립트 사용</p>
                    </div>
                    <Switch
                      checked={config.script.useManualScript}
                      onCheckedChange={(v) => updateScript({ useManualScript: v })}
                    />
                  </div>

                  {config.script.useManualScript ? (
                    <div className="space-y-2">
                      <Label>스크립트 입력</Label>
                      <Textarea
                        placeholder="스크립트 내용을 입력하세요..."
                        value={config.script.manualScript || ""}
                        onChange={(e) => updateScript({ manualScript: e.target.value })}
                        rows={10}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>스타일</Label>
                          <Select
                            value={config.script.style}
                            onValueChange={(v) => updateScript({ style: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="conversational">대화체</SelectItem>
                              <SelectItem value="formal">격식체</SelectItem>
                              <SelectItem value="storytelling">스토리텔링</SelectItem>
                              <SelectItem value="educational">교육적</SelectItem>
                              <SelectItem value="comedic">코믹</SelectItem>
                              <SelectItem value="dramatic">드라마틱</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>톤</Label>
                          <Select
                            value={config.script.tone}
                            onValueChange={(v) => updateScript({ tone: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="friendly">친근한</SelectItem>
                              <SelectItem value="professional">전문적</SelectItem>
                              <SelectItem value="enthusiastic">열정적</SelectItem>
                              <SelectItem value="calm">차분한</SelectItem>
                              <SelectItem value="urgent">긴급한</SelectItem>
                              <SelectItem value="mysterious">미스터리</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>훅 스타일</Label>
                          <Select
                            value={config.script.hookStyle}
                            onValueChange={(v) => updateScript({ hookStyle: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="question">질문</SelectItem>
                              <SelectItem value="statistic">통계</SelectItem>
                              <SelectItem value="story">이야기</SelectItem>
                              <SelectItem value="controversy">논쟁</SelectItem>
                              <SelectItem value="promise">약속</SelectItem>
                              <SelectItem value="shock">충격</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>페이싱</Label>
                          <Select
                            value={config.script.pacing}
                            onValueChange={(v) => updateScript({ pacing: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fast">빠름</SelectItem>
                              <SelectItem value="medium">보통</SelectItem>
                              <SelectItem value="slow">느림</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>목표 길이 ({config.script.targetDuration}초)</Label>
                          <Slider
                            value={[config.script.targetDuration]}
                            onValueChange={([v]) => updateScript({ targetDuration: v })}
                            min={30}
                            max={1200}
                            step={30}
                          />
                        </div>
                      </div>

                      {/* Structure Settings */}
                      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                        <h5 className="font-medium text-sm">구조 설정</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">인트로 포함</Label>
                            <Switch
                              checked={config.script.structure.hasIntro}
                              onCheckedChange={(v) =>
                                updateScript({
                                  structure: { ...config.script.structure, hasIntro: v },
                                })
                              }
                            />
                          </div>
                          {config.script.structure.hasIntro && (
                            <div className="space-y-1">
                              <Label className="text-xs">인트로 길이 (초)</Label>
                              <Input
                                type="number"
                                value={config.script.structure.introLength}
                                onChange={(e) =>
                                  updateScript({
                                    structure: {
                                      ...config.script.structure,
                                      introLength: parseInt(e.target.value) || 10,
                                    },
                                  })
                                }
                                min={5}
                                max={60}
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">아웃트로 포함</Label>
                            <Switch
                              checked={config.script.structure.hasOutro}
                              onCheckedChange={(v) =>
                                updateScript({
                                  structure: { ...config.script.structure, hasOutro: v },
                                })
                              }
                            />
                          </div>
                          {config.script.structure.hasOutro && (
                            <div className="space-y-1">
                              <Label className="text-xs">아웃트로 길이 (초)</Label>
                              <Input
                                type="number"
                                value={config.script.structure.outroLength}
                                onChange={(e) =>
                                  updateScript({
                                    structure: {
                                      ...config.script.structure,
                                      outroLength: parseInt(e.target.value) || 15,
                                    },
                                  })
                                }
                                min={5}
                                max={60}
                              />
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm">CTA 위치</Label>
                            <Select
                              value={config.script.structure.ctaPosition}
                              onValueChange={(v) =>
                                updateScript({
                                  structure: {
                                    ...config.script.structure,
                                    ctaPosition: v as any,
                                  },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="middle">중간</SelectItem>
                                <SelectItem value="end">끝</SelectItem>
                                <SelectItem value="both">중간 + 끝</SelectItem>
                                <SelectItem value="none">없음</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {config.script.structure.ctaPosition !== "none" && (
                            <div className="space-y-2">
                              <Label className="text-sm">CTA 텍스트</Label>
                              <Input
                                placeholder="구독과 좋아요 부탁드립니다!"
                                value={config.script.structure.ctaText || ""}
                                onChange={(e) =>
                                  updateScript({
                                    structure: {
                                      ...config.script.structure,
                                      ctaText: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>B-Roll 지시 포함</Label>
                          <p className="text-xs text-muted-foreground">
                            영상 삽입 지점 자동 표시
                          </p>
                        </div>
                        <Switch
                          checked={config.script.includeB_Roll}
                          onCheckedChange={(v) => updateScript({ includeB_Roll: v })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>커스텀 프롬프트 (선택)</Label>
                        <Textarea
                          placeholder="추가 지시사항을 입력하세요..."
                          value={config.script.customPrompt || ""}
                          onChange={(e) => updateScript({ customPrompt: e.target.value })}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>AI 모델</Label>
                          <Select
                            value={config.script.model}
                            onValueChange={(v) => updateScript({ model: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gemini-3-flash">Gemini 3 Flash</SelectItem>
                              <SelectItem value="gemini-3-pro">Gemini 3 Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Temperature ({config.script.temperature})</Label>
                          <Slider
                            value={[config.script.temperature]}
                            onValueChange={([v]) => updateScript({ temperature: v })}
                            min={0}
                            max={1}
                            step={0.1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>최대 토큰</Label>
                          <Input
                            type="number"
                            value={config.script.maxTokens}
                            onChange={(e) =>
                              updateScript({ maxTokens: parseInt(e.target.value) || 8192 })
                            }
                            min={1024}
                            max={32768}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
