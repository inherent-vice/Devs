"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Lightbulb,
  FileText,
  Mic,
  Video,
  Image,
  Scissors,
  CheckCircle2,
  Palette,
  RefreshCw,
  Upload,
  DollarSign,
  Clock,
  Sparkles,
} from "lucide-react";
import { WorkflowConfig } from "@/lib/workflow/types";

interface WorkflowPreviewProps {
  config: WorkflowConfig;
}

export function WorkflowPreview({ config }: WorkflowPreviewProps) {
  // Estimate costs
  const estimateCost = () => {
    const durations = { shorts: 60, medium: 300, longform: 900 };
    const duration = durations[config.videoType];
    const durationMinutes = duration / 60;

    let cost = 0;

    // Research phase
    if (config.phases.research.trend.enabled) cost += 0.05;
    if (config.phases.research.topic.enabled) cost += 0.05;
    if (config.phases.research.script.enabled) cost += 0.10;

    // Production phase
    if (config.phases.production.voice.enabled) cost += durationMinutes * 0.02;
    if (config.phases.production.video.enabled) {
      if (config.phases.production.video.mode === "veo") {
        const rate = config.phases.production.video.veoConfig?.tier === "fast" ? 0.15 : 0.40;
        cost += duration * rate;
      } else {
        const images = durationMinutes * (config.phases.production.video.imagenConfig?.imagesPerMinute || 10);
        cost += images * 0.04;
      }
    }
    if (config.phases.production.thumbnail.enabled) {
      cost += config.phases.production.thumbnail.variants * 0.04;
    }

    // Quality phase
    if (config.phases.quality.critic.enabled) {
      cost += config.phases.quality.maxQualityLoops * 1.0;
    }

    return cost;
  };

  const agents = [
    {
      phase: "research",
      agents: [
        {
          key: "trend",
          name: "트렌드 분석",
          icon: <TrendingUp className="h-4 w-4" />,
          enabled: config.phases.research.trend.enabled,
          model: config.phases.research.trend.model,
        },
        {
          key: "topic",
          name: "주제 선정",
          icon: <Lightbulb className="h-4 w-4" />,
          enabled: config.phases.research.topic.enabled,
          model: config.phases.research.topic.model,
        },
        {
          key: "script",
          name: "스크립트 생성",
          icon: <FileText className="h-4 w-4" />,
          enabled: config.phases.research.script.enabled,
          model: config.phases.research.script.model,
        },
      ],
    },
    {
      phase: "production",
      agents: [
        {
          key: "voice",
          name: "음성 생성",
          icon: <Mic className="h-4 w-4" />,
          enabled: config.phases.production.voice.enabled,
          model: config.phases.production.voice.model,
          detail: config.phases.production.voice.voiceName,
        },
        {
          key: "video",
          name: "영상 생성",
          icon: <Video className="h-4 w-4" />,
          enabled: config.phases.production.video.enabled,
          model: config.phases.production.video.model,
          detail: config.phases.production.video.mode,
        },
        {
          key: "thumbnail",
          name: "썸네일 생성",
          icon: <Image className="h-4 w-4" />,
          enabled: config.phases.production.thumbnail.enabled,
          model: config.phases.production.thumbnail.model,
          detail: `${config.phases.production.thumbnail.variants}개 변형`,
        },
        {
          key: "editor",
          name: "편집",
          icon: <Scissors className="h-4 w-4" />,
          enabled: config.phases.production.editor.enabled,
          model: config.phases.production.editor.model,
        },
      ],
    },
    {
      phase: "quality",
      agents: [
        {
          key: "critic",
          name: "품질 평가",
          icon: <CheckCircle2 className="h-4 w-4" />,
          enabled: config.phases.quality.critic.enabled,
          model: config.phases.quality.critic.model,
          detail: `${(config.phases.quality.critic.passThreshold * 100).toFixed(0)}% 기준`,
        },
        {
          key: "art",
          name: "아트 평가",
          icon: <Palette className="h-4 w-4" />,
          enabled: config.phases.quality.artEvaluator.enabled,
          model: config.phases.quality.artEvaluator.model,
        },
        {
          key: "revision",
          name: "자동 수정",
          icon: <RefreshCw className="h-4 w-4" />,
          enabled: config.phases.quality.revision.enabled,
          model: config.phases.quality.revision.model,
          detail: `최대 ${config.phases.quality.revision.maxIterations}회`,
        },
      ],
    },
    {
      phase: "publishing",
      agents: [
        {
          key: "publisher",
          name: "게시",
          icon: <Upload className="h-4 w-4" />,
          enabled: config.phases.publishing.publisher.enabled,
          model: config.phases.publishing.publisher.model,
          detail: config.phases.publishing.publisher.platform,
        },
      ],
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">워크플로우 미리보기</h3>
        <p className="text-sm text-muted-foreground">{config.name}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Overview */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">영상 유형:</span>
                  <span className="font-medium">
                    {config.videoType === "shorts" && "Shorts (60초)"}
                    {config.videoType === "medium" && "중간 (5분)"}
                    {config.videoType === "longform" && "긴 영상 (15분)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">예상 비용:</span>
                  <span className="font-medium">${estimateCost().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Pipeline */}
          {agents.map((phase, phaseIndex) => (
            <div key={phase.phase}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {phaseIndex + 1}
                </Badge>
                <span className="text-sm font-medium capitalize">
                  {phase.phase === "research" && "리서치"}
                  {phase.phase === "production" && "제작"}
                  {phase.phase === "quality" && "품질"}
                  {phase.phase === "publishing" && "게시"}
                </span>
              </div>

              <div className="space-y-2 ml-4">
                {phase.agents.map((agent) => (
                  <div
                    key={agent.key}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      agent.enabled ? "bg-background" : "bg-muted/30 opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1 rounded ${
                          agent.enabled ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {agent.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        {agent.detail && (
                          <p className="text-xs text-muted-foreground">{agent.detail}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={agent.enabled ? "secondary" : "outline"} className="text-xs">
                      {agent.enabled ? agent.model.replace("gemini-", "G") : "OFF"}
                    </Badge>
                  </div>
                ))}
              </div>

              {phaseIndex < agents.length - 1 && (
                <div className="flex justify-center my-2">
                  <div className="w-0.5 h-4 bg-border" />
                </div>
              )}
            </div>
          ))}

          {/* Settings Summary */}
          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">주요 설정</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">스크립트 스타일:</span>
                <p className="font-medium">{config.phases.research.script.style}</p>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">훅 스타일:</span>
                <p className="font-medium">{config.phases.research.script.hookStyle}</p>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">영상 모드:</span>
                <p className="font-medium">{config.phases.production.video.mode}</p>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">품질 기준:</span>
                <p className="font-medium">
                  {(config.phases.quality.critic.passThreshold * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Review Gates */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">검토 게이트</h4>
            <div className="flex flex-wrap gap-2">
              {config.phases.research.reviewGate && (
                <Badge variant="outline">리서치 후</Badge>
              )}
              {config.phases.production.reviewGate && (
                <Badge variant="outline">제작 후</Badge>
              )}
              {config.phases.quality.reviewGate && (
                <Badge variant="outline">품질 검토 후</Badge>
              )}
              {config.phases.publishing.reviewGate && (
                <Badge variant="outline">게시 전</Badge>
              )}
              {!config.phases.research.reviewGate &&
                !config.phases.production.reviewGate &&
                !config.phases.quality.reviewGate &&
                !config.phases.publishing.reviewGate && (
                  <span className="text-xs text-muted-foreground">자동 진행 (검토 없음)</span>
                )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
