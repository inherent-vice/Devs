"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle2,
  Palette,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Settings2,
  Target,
  Gauge,
  Shield,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  QualityPhaseConfig,
  CriticAgentConfig,
  ArtEvaluatorConfig,
  RevisionAgentConfig,
} from "@/lib/workflow/types";

interface QualityPhasePanelProps {
  config: QualityPhaseConfig;
}

export function QualityPhasePanel({ config }: QualityPhasePanelProps) {
  const { updatePhaseConfig } = useWorkflowStore();
  const [openSections, setOpenSections] = useState<string[]>(["critic", "art", "revision"]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const updateCritic = (updates: Partial<CriticAgentConfig>) => {
    updatePhaseConfig("quality", { critic: { ...config.critic, ...updates } });
  };

  const updateArt = (updates: Partial<ArtEvaluatorConfig>) => {
    updatePhaseConfig("quality", { artEvaluator: { ...config.artEvaluator, ...updates } });
  };

  const updateRevision = (updates: Partial<RevisionAgentConfig>) => {
    updatePhaseConfig("quality", { revision: { ...config.revision, ...updates } });
  };

  const updateDimension = (
    dim: keyof CriticAgentConfig["dimensions"],
    updates: Partial<CriticAgentConfig["dimensions"][typeof dim]>
  ) => {
    updateCritic({
      dimensions: {
        ...config.critic.dimensions,
        [dim]: { ...config.critic.dimensions[dim], ...updates },
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>최대 반복 횟수 ({config.maxQualityLoops}회)</Label>
              <Slider
                value={[config.maxQualityLoops]}
                onValueChange={([v]) => updatePhaseConfig("quality", { maxQualityLoops: v })}
                min={1}
                max={10}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>조기 종료 임계값 ({(config.earlyStopThreshold * 100).toFixed(0)}%)</Label>
              <Slider
                value={[config.earlyStopThreshold]}
                onValueChange={([v]) => updatePhaseConfig("quality", { earlyStopThreshold: v })}
                min={0.7}
                max={0.99}
                step={0.01}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>자동 진행</Label>
              <p className="text-xs text-muted-foreground">완료 시 다음 단계로 자동 진행</p>
            </div>
            <Switch
              checked={config.autoAdvance}
              onCheckedChange={(v) => updatePhaseConfig("quality", { autoAdvance: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>검토 대기</Label>
              <p className="text-xs text-muted-foreground">다음 단계 전 사용자 검토 필요</p>
            </div>
            <Switch
              checked={config.reviewGate}
              onCheckedChange={(v) => updatePhaseConfig("quality", { reviewGate: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Critic Agent */}
      <Collapsible
        open={openSections.includes("critic")}
        onOpenChange={() => toggleSection("critic")}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">크리틱 에이전트</CardTitle>
                    <CardDescription>5차원 품질 평가 시스템</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.critic.enabled ? "default" : "secondary"}>
                    {config.critic.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("critic") ? (
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
                  checked={config.critic.enabled}
                  onCheckedChange={(v) => updateCritic({ enabled: v })}
                />
              </div>

              {config.critic.enabled && (
                <>
                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>통과 기준 ({(config.critic.passThreshold * 100).toFixed(0)}%)</Label>
                      <Slider
                        value={[config.critic.passThreshold]}
                        onValueChange={([v]) => updateCritic({ passThreshold: v })}
                        min={0.5}
                        max={0.99}
                        step={0.01}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>엄격 모드</Label>
                        <p className="text-xs text-muted-foreground">모든 차원이 최소 기준 충족 필수</p>
                      </div>
                      <Switch
                        checked={config.critic.strictMode}
                        onCheckedChange={(v) => updateCritic({ strictMode: v })}
                      />
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div className="space-y-3">
                    <h5 className="font-medium text-sm flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      평가 차원 설정
                    </h5>

                    {(
                      [
                        { key: "technical", label: "기술적 품질", icon: "⚙️" },
                        { key: "narrative", label: "서사 구조", icon: "📖" },
                        { key: "engagement", label: "참여도", icon: "🎯" },
                        { key: "originality", label: "독창성", icon: "💡" },
                        { key: "ethical", label: "윤리성", icon: "🛡️" },
                      ] as const
                    ).map((dim) => {
                      const dimension = config.critic.dimensions[dim.key];
                      return (
                        <div
                          key={dim.key}
                          className="p-3 bg-muted/30 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{dim.icon}</span>
                              <Label className="text-sm">{dim.label}</Label>
                            </div>
                            <Switch
                              checked={dimension.enabled}
                              onCheckedChange={(v) => updateDimension(dim.key, { enabled: v })}
                            />
                          </div>
                          {dimension.enabled && (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div className="space-y-1">
                                <Label className="text-xs">
                                  가중치 ({(dimension.weight * 100).toFixed(0)}%)
                                </Label>
                                <Slider
                                  value={[dimension.weight]}
                                  onValueChange={([v]) => updateDimension(dim.key, { weight: v })}
                                  min={0}
                                  max={0.5}
                                  step={0.05}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">
                                  최소 점수 ({(dimension.minScore * 100).toFixed(0)}%)
                                </Label>
                                <Slider
                                  value={[dimension.minScore]}
                                  onValueChange={([v]) => updateDimension(dim.key, { minScore: v })}
                                  min={0.3}
                                  max={0.99}
                                  step={0.05}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <Label>커스텀 평가 기준</Label>
                    <Textarea
                      placeholder="추가 평가 기준을 입력하세요..."
                      value={config.critic.customPrompt || ""}
                      onChange={(e) => updateCritic({ customPrompt: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>AI 모델</Label>
                      <Select
                        value={config.critic.model}
                        onValueChange={(v) => updateCritic({ model: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-3-pro">Gemini 3 Pro (권장)</SelectItem>
                          <SelectItem value="gemini-3-flash">Gemini 3 Flash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature ({config.critic.temperature})</Label>
                      <Slider
                        value={[config.critic.temperature]}
                        onValueChange={([v]) => updateCritic({ temperature: v })}
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

      {/* Art Evaluator */}
      <Collapsible open={openSections.includes("art")} onOpenChange={() => toggleSection("art")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <Palette className="h-5 w-5 text-rose-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">아트 평가자</CardTitle>
                    <CardDescription>시각적/청각적 예술성 평가</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.artEvaluator.enabled ? "default" : "secondary"}>
                    {config.artEvaluator.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("art") ? (
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
                  checked={config.artEvaluator.enabled}
                  onCheckedChange={(v) => updateArt({ enabled: v })}
                />
              </div>

              {config.artEvaluator.enabled && (
                <>
                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">시각 평가</Label>
                      <Switch
                        checked={config.artEvaluator.evaluateVisuals}
                        onCheckedChange={(v) => updateArt({ evaluateVisuals: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">썸네일 평가</Label>
                      <Switch
                        checked={config.artEvaluator.evaluateThumbnail}
                        onCheckedChange={(v) => updateArt({ evaluateThumbnail: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">오디오 평가</Label>
                      <Switch
                        checked={config.artEvaluator.evaluateAudio}
                        onCheckedChange={(v) => updateArt({ evaluateAudio: v })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>미적 기준</Label>
                    <Select
                      value={config.artEvaluator.aestheticStandard}
                      onValueChange={(v) => updateArt({ aestheticStandard: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube_optimized">YouTube 최적화</SelectItem>
                        <SelectItem value="cinematic">시네마틱</SelectItem>
                        <SelectItem value="professional">프로페셔널</SelectItem>
                        <SelectItem value="casual">캐주얼</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>커스텀 기준</Label>
                    <Textarea
                      placeholder="추가 예술성 평가 기준..."
                      value={config.artEvaluator.customCriteria || ""}
                      onChange={(e) => updateArt({ customCriteria: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>AI 모델</Label>
                      <Select
                        value={config.artEvaluator.model}
                        onValueChange={(v) => updateArt({ model: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-3-pro">Gemini 3 Pro</SelectItem>
                          <SelectItem value="gemini-3-flash">Gemini 3 Flash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature ({config.artEvaluator.temperature})</Label>
                      <Slider
                        value={[config.artEvaluator.temperature]}
                        onValueChange={([v]) => updateArt({ temperature: v })}
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

      {/* Revision Agent */}
      <Collapsible
        open={openSections.includes("revision")}
        onOpenChange={() => toggleSection("revision")}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/10">
                    <RefreshCw className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">수정 에이전트</CardTitle>
                    <CardDescription>피드백 기반 자동 수정</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.revision.enabled ? "default" : "secondary"}>
                    {config.revision.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("revision") ? (
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
                  checked={config.revision.enabled}
                  onCheckedChange={(v) => updateRevision({ enabled: v })}
                />
              </div>

              {config.revision.enabled && (
                <>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>자동 수정</Label>
                      <p className="text-xs text-muted-foreground">피드백 기반 자동 수정 수행</p>
                    </div>
                    <Switch
                      checked={config.revision.autoRevise}
                      onCheckedChange={(v) => updateRevision({ autoRevise: v })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>최대 반복 ({config.revision.maxIterations}회)</Label>
                      <Slider
                        value={[config.revision.maxIterations]}
                        onValueChange={([v]) => updateRevision({ maxIterations: v })}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        수렴 임계값 ({(config.revision.convergenceThreshold * 100).toFixed(0)}%)
                      </Label>
                      <Slider
                        value={[config.revision.convergenceThreshold]}
                        onValueChange={([v]) => updateRevision({ convergenceThreshold: v })}
                        min={0.01}
                        max={0.1}
                        step={0.01}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>수정 범위</Label>
                    <div className="flex flex-wrap gap-2">
                      {["script", "video", "thumbnail", "audio"].map((scope) => (
                        <Badge
                          key={scope}
                          variant={
                            config.revision.revisionScope.includes(scope as any)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => {
                            const scopes = config.revision.revisionScope.includes(scope as any)
                              ? config.revision.revisionScope.filter((s) => s !== scope)
                              : [...config.revision.revisionScope, scope as any];
                            updateRevision({ revisionScope: scopes });
                          }}
                        >
                          {scope === "script" && "스크립트"}
                          {scope === "video" && "영상"}
                          {scope === "thumbnail" && "썸네일"}
                          {scope === "audio" && "오디오"}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>커스텀 수정 지시</Label>
                    <Textarea
                      placeholder="수정 시 적용할 추가 지시사항..."
                      value={config.revision.customInstructions || ""}
                      onChange={(e) => updateRevision({ customInstructions: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>AI 모델</Label>
                      <Select
                        value={config.revision.model}
                        onValueChange={(v) => updateRevision({ model: v })}
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
                      <Label>Temperature ({config.revision.temperature})</Label>
                      <Slider
                        value={[config.revision.temperature]}
                        onValueChange={([v]) => updateRevision({ temperature: v })}
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
    </div>
  );
}
