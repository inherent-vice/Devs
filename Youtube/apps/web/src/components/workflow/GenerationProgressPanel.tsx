"use client";

import { useState, useEffect, useRef } from "react";
import { POLLING } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  FileText,
  Mic,
  Image,
  Video,
  Sparkles,
  AlertCircle,
  Clock,
  DollarSign,
  Layers,
} from "lucide-react";

// ===========================================
// Types
// ===========================================

export interface PhaseProgress {
  name: string;
  status: "pending" | "running" | "completed" | "error";
  progress: number;
  message?: string;
  startTime?: number;
  endTime?: number;
  cost?: number;
  details?: Record<string, unknown>;
}

export interface GenerationProgress {
  sessionId: string;
  status: "idle" | "running" | "completed" | "error";
  totalProgress: number;
  currentPhase: string;
  currentStep: string;
  estimatedCost: number;
  actualCost: number;
  phases: {
    research: PhaseProgress & {
      trends?: Array<{ title: string; score: number }>;
      selectedTopic?: string;
      scriptSections?: Array<{ title: string; duration: number }>;
      scriptPreview?: string;
    };
    production: PhaseProgress & {
      voiceStatus?: string;
      voiceDuration?: number;
      imagesGenerated?: number;
      totalImages?: number;
      thumbnailsGenerated?: number;
    };
    quality: PhaseProgress & {
      scores?: Record<string, number>;
      verdict?: string;
      iterations?: number;
    };
  };
  logs: Array<{
    timestamp: string;
    level: "info" | "warn" | "error";
    message: string;
    phase?: string;
  }>;
}

interface GenerationProgressPanelProps {
  progress: GenerationProgress | null;
  isGenerating: boolean;
}

// ===========================================
// Component
// ===========================================

export function GenerationProgressPanel({
  progress,
  isGenerating,
}: GenerationProgressPanelProps) {
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    research: true,
    production: true,
    quality: true,
    logs: false,
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current && expandedPhases.logs) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [progress?.logs?.length, expandedPhases.logs]);

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }));
  };

  const getStatusIcon = (status: PhaseProgress["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "research":
        return <TrendingUp className="h-4 w-4" />;
      case "production":
        return <Video className="h-4 w-4" />;
      case "quality":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  if (!isGenerating && !progress) {
    return null;
  }

  const phases = progress?.phases;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            생성 진행 상황
          </CardTitle>
          {progress && (
            <div className="flex items-center gap-4 text-sm">
              <Badge variant={progress.status === "running" ? "default" : "secondary"}>
                {progress.status === "running" ? "진행 중" :
                 progress.status === "completed" ? "완료" :
                 progress.status === "error" ? "오류" : "대기"}
              </Badge>
              <span className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                ${progress.actualCost?.toFixed(4) || "0.00"} / ${progress.estimatedCost?.toFixed(2) || "0.00"}
              </span>
            </div>
          )}
        </div>
        {progress && (
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{progress.currentStep || "준비 중..."}</span>
              <span className="font-medium">{progress.totalProgress}%</span>
            </div>
            <Progress value={progress.totalProgress} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Research Phase */}
        <Collapsible open={expandedPhases.research} onOpenChange={() => togglePhase("research")}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer p-2 hover:bg-accent rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                {getStatusIcon(phases?.research?.status || "pending")}
                <span className="font-medium flex items-center gap-2">
                  {getPhaseIcon("research")} 리서치 단계
                </span>
                {phases?.research?.status === "completed" && (
                  <Badge variant="outline" className="text-xs">
                    {formatDuration((phases.research.endTime || 0) - (phases.research.startTime || 0))}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {phases?.research?.cost !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    ${phases.research.cost.toFixed(4)}
                  </span>
                )}
                {expandedPhases.research ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-10 pr-2 py-2 space-y-3">
            {phases?.research && (
              <>
                {/* Trends */}
                {phases.research.trends && phases.research.trends.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      발견된 트렌드 ({phases.research.trends.length}개)
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {phases.research.trends.slice(0, 6).map((trend, i) => (
                        <div key={i} className="text-xs p-2 bg-accent rounded flex justify-between">
                          <span className="truncate">{trend.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {trend.score.toFixed(0)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Topic */}
                {phases.research.selectedTopic && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">선택된 주제</h4>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm font-medium">{phases.research.selectedTopic}</p>
                    </div>
                  </div>
                )}

                {/* Script Sections */}
                {phases.research.scriptSections && phases.research.scriptSections.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      스크립트 ({phases.research.scriptSections.length} 섹션)
                    </h4>
                    <div className="space-y-1">
                      {phases.research.scriptSections.map((section, i) => (
                        <div key={i} className="flex justify-between text-xs p-2 bg-accent rounded">
                          <span>{i + 1}. {section.title}</span>
                          <span className="text-muted-foreground">{section.duration}s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Script Preview */}
                {phases.research.scriptPreview && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">스크립트 미리보기</h4>
                    <ScrollArea className="h-32 w-full rounded-md border p-3">
                      <pre className="text-xs whitespace-pre-wrap">{phases.research.scriptPreview}</pre>
                    </ScrollArea>
                  </div>
                )}

                {phases.research.status === "running" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {phases.research.message || "분석 중..."}
                  </div>
                )}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Production Phase */}
        <Collapsible open={expandedPhases.production} onOpenChange={() => togglePhase("production")}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer p-2 hover:bg-accent rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                {getStatusIcon(phases?.production?.status || "pending")}
                <span className="font-medium flex items-center gap-2">
                  {getPhaseIcon("production")} 프로덕션 단계
                </span>
                {phases?.production?.status === "completed" && (
                  <Badge variant="outline" className="text-xs">
                    {formatDuration((phases.production.endTime || 0) - (phases.production.startTime || 0))}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {phases?.production?.cost !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    ${phases.production.cost.toFixed(4)}
                  </span>
                )}
                {expandedPhases.production ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-10 pr-2 py-2 space-y-3">
            {phases?.production && (
              <>
                {/* Voice Generation */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    음성 생성
                  </h4>
                  <div className="flex items-center gap-4">
                    <Badge variant={phases.production.voiceStatus === "completed" ? "default" : "secondary"}>
                      {phases.production.voiceStatus || "대기"}
                    </Badge>
                    {phases.production.voiceDuration !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        {phases.production.voiceDuration.toFixed(1)}초
                      </span>
                    )}
                  </div>
                </div>

                {/* Image Generation */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    이미지 생성
                  </h4>
                  {phases.production.totalImages !== undefined && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {phases.production.imagesGenerated || 0} / {phases.production.totalImages} 이미지
                        </span>
                        <span>
                          {Math.round(((phases.production.imagesGenerated || 0) / phases.production.totalImages) * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={((phases.production.imagesGenerated || 0) / phases.production.totalImages) * 100}
                        className="h-1.5"
                      />
                    </>
                  )}
                </div>

                {/* Thumbnail Generation */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    썸네일 생성
                  </h4>
                  <Badge variant={phases.production.thumbnailsGenerated ? "default" : "secondary"}>
                    {phases.production.thumbnailsGenerated || 0}개 생성됨
                  </Badge>
                </div>

                {phases.production.status === "running" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {phases.production.message || "생성 중..."}
                  </div>
                )}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Quality Phase */}
        <Collapsible open={expandedPhases.quality} onOpenChange={() => togglePhase("quality")}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer p-2 hover:bg-accent rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                {getStatusIcon(phases?.quality?.status || "pending")}
                <span className="font-medium flex items-center gap-2">
                  {getPhaseIcon("quality")} 품질 검증 단계
                </span>
                {phases?.quality?.status === "completed" && (
                  <Badge variant="outline" className="text-xs">
                    {formatDuration((phases.quality.endTime || 0) - (phases.quality.startTime || 0))}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {phases?.quality?.cost !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    ${phases.quality.cost.toFixed(4)}
                  </span>
                )}
                {expandedPhases.quality ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-10 pr-2 py-2 space-y-3">
            {phases?.quality && (
              <>
                {/* Quality Scores */}
                {phases.quality.scores && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">품질 점수</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(phases.quality.scores).map(([key, score]) => (
                        <div key={key} className="flex justify-between text-xs p-2 bg-accent rounded">
                          <span className="capitalize">{key}</span>
                          <Badge
                            variant={score >= 0.8 ? "default" : score >= 0.6 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {(score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verdict */}
                {phases.quality.verdict && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">최종 판정</h4>
                    <Badge
                      variant={phases.quality.verdict === "approved" ? "default" : "secondary"}
                      className="text-sm"
                    >
                      {phases.quality.verdict === "approved" ? "승인됨" : phases.quality.verdict}
                    </Badge>
                  </div>
                )}

                {/* Iterations */}
                {phases.quality.iterations !== undefined && (
                  <div className="text-sm text-muted-foreground">
                    반복 횟수: {phases.quality.iterations}회
                  </div>
                )}

                {phases.quality.status === "running" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {phases.quality.message || "검증 중..."}
                  </div>
                )}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Logs */}
        <Collapsible open={expandedPhases.logs} onOpenChange={() => togglePhase("logs")}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer p-2 hover:bg-accent rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">실시간 로그</span>
                {progress?.logs && (
                  <Badge variant="outline" className="text-xs">
                    {progress.logs.length}개
                  </Badge>
                )}
              </div>
              {expandedPhases.logs ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-10 pr-2 py-2">
            <ScrollArea className="h-48 w-full rounded-md border">
              <div className="p-3 space-y-1">
                {progress?.logs?.map((log, i) => (
                  <div
                    key={i}
                    className={`text-xs font-mono ${
                      log.level === "error" ? "text-red-500" :
                      log.level === "warn" ? "text-yellow-500" : "text-muted-foreground"
                    }`}
                  >
                    <span className="opacity-50">
                      {new Date(log.timestamp).toLocaleTimeString("ko-KR")}
                    </span>
                    {log.phase && (
                      <Badge variant="outline" className="mx-1 text-xs">
                        {log.phase}
                      </Badge>
                    )}
                    <span>{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ===========================================
// Hook for progress updates
// ===========================================

export function useGenerationProgress(sessionId: string | null) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setProgress(null);
      return;
    }

    // For now, use polling. TODO: Replace with SSE
    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/progress/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setProgress(data);
        }
      } catch (error) {
        console.error("Failed to fetch progress:", error);
      }
    };

    pollProgress();
    const interval = setInterval(pollProgress, POLLING.PROGRESS_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [sessionId]);

  return progress;
}

export default GenerationProgressPanel;
