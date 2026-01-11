"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Save,
  LayoutTemplate,
  Settings,
  Sparkles,
  Video,
  CheckCircle2,
  Upload,
  AlertCircle,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { WorkflowPhase, VideoType, WorkflowTemplate } from "@/lib/workflow/types";
import { createDefaultWorkflowConfig } from "@/lib/workflow/types";
import { TemplateSelector } from "@/components/workflow/TemplateSelector";
import { ResearchPhasePanel } from "@/components/workflow/phases/ResearchPhasePanel";
import { ProductionPhasePanel } from "@/components/workflow/phases/ProductionPhasePanel";
import { QualityPhasePanel } from "@/components/workflow/phases/QualityPhasePanel";
import { PublishingPhasePanel } from "@/components/workflow/phases/PublishingPhasePanel";
import { WorkflowPreview } from "@/components/workflow/WorkflowPreview";

const PHASES: { id: WorkflowPhase; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "research", label: "리서치", icon: <Sparkles className="h-4 w-4" />, description: "트렌드 분석, 주제 선택, 스크립트 생성" },
  { id: "production", label: "제작", icon: <Video className="h-4 w-4" />, description: "음성, 영상, 썸네일, 편집" },
  { id: "quality", label: "품질", icon: <CheckCircle2 className="h-4 w-4" />, description: "품질 평가 및 수정" },
  { id: "publishing", label: "게시", icon: <Upload className="h-4 w-4" />, description: "플랫폼 게시 설정" },
];

interface DetailedConfigModeProps {
  onBackToQuick?: () => void;
}

export function DetailedConfigMode({ onBackToQuick }: DetailedConfigModeProps) {
  const {
    currentConfig,
    createConfig,
    loadConfig,
    updateConfig,
    saveConfig,
    loadTemplate,
    saveAsTemplate,
  } = useWorkflowStore();

  const [showTemplateSelector, setShowTemplateSelector] = useState(!currentConfig);
  const [activePhase, setActivePhase] = useState<WorkflowPhase>("research");
  const [showPreview, setShowPreview] = useState(false);

  // Create default config if none exists
  useEffect(() => {
    if (!currentConfig && !showTemplateSelector) {
      createConfig("medium", "새 워크플로우");
    }
  }, [currentConfig, showTemplateSelector, createConfig]);

  const config = currentConfig ?? createDefaultWorkflowConfig("medium");

  const handleSelectTemplate = (template: WorkflowTemplate | null, videoType?: VideoType) => {
    if (template) {
      loadTemplate(template.id);
    } else if (videoType) {
      createConfig(videoType, "새 워크플로우");
    }
    setShowTemplateSelector(false);
  };

  const handleStartFromScratch = (videoType: VideoType) => {
    createConfig(videoType, "새 워크플로우");
    setShowTemplateSelector(false);
  };

  const handleSaveTemplate = () => {
    if (!currentConfig) return;
    const name = prompt("템플릿 이름을 입력하세요:", currentConfig.name);
    if (!name) return;
    const description = prompt("템플릿 설명을 입력하세요:", "") || "";
    saveAsTemplate(name, description, [currentConfig.videoType]);
    toast.success("템플릿이 저장되었습니다");
  };

  const handleSaveConfig = () => {
    if (!currentConfig) return;
    saveConfig(currentConfig);
    toast.success("설정이 저장되었습니다");
  };

  const getPhaseProgress = () => {
    const phaseIndex = PHASES.findIndex((p) => p.id === activePhase);
    return ((phaseIndex + 1) / PHASES.length) * 100;
  };

  // Template selector view
  if (showTemplateSelector) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-4 border-b bg-background flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              템플릿 선택
            </h2>
            <p className="text-sm text-muted-foreground">
              프리셋 템플릿을 선택하거나 새로 시작하세요
            </p>
          </div>
          {currentConfig && (
            <Button variant="outline" onClick={() => setShowTemplateSelector(false)}>
              현재 설정으로 돌아가기
            </Button>
          )}
        </div>
        <TemplateSelector
          onSelect={handleSelectTemplate}
          onStartFromScratch={handleStartFromScratch}
        />
      </div>
    );
  }

  // Main configuration view
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background shrink-0">
        <div className="flex items-center gap-4">
          {onBackToQuick && (
            <Button variant="ghost" size="sm" onClick={onBackToQuick}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              빠른 설정
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {config.name || "워크플로우 설정"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {config.videoType === "shorts" && "Shorts (60초)"}
              {config.videoType === "medium" && "중간 길이 (5분)"}
              {config.videoType === "longform" && "긴 영상 (15분)"}
              {" • "}
              12개 에이전트 상세 설정
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateSelector(true)}
          >
            <LayoutTemplate className="h-4 w-4 mr-1" />
            템플릿
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-1" />
            {showPreview ? "숨기기" : "미리보기"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveTemplate}>
            <Save className="h-4 w-4 mr-1" />
            템플릿 저장
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveConfig}>
            <Save className="h-4 w-4 mr-1" />
            저장
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Main Configuration Area */}
        <div className={`flex flex-col min-h-0 ${showPreview ? "w-2/3" : "w-full"}`}>
          {/* Phase Progress */}
          <div className="shrink-0 p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                {PHASES.map((phase, index) => (
                  <button
                    key={phase.id}
                    onClick={() => setActivePhase(phase.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      activePhase === phase.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {phase.icon}
                    {phase.label}
                    {index < PHASES.length - 1 && (
                      <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {PHASES.findIndex((p) => p.id === activePhase) + 1} / {PHASES.length}
              </span>
            </div>
            <Progress value={getPhaseProgress()} className="h-1.5" />
          </div>

          {/* Phase Tabs */}
          <Tabs
            value={activePhase}
            onValueChange={(v) => setActivePhase(v as WorkflowPhase)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="shrink-0 px-4 pt-2 bg-background border-b">
              <TabsList className="grid grid-cols-4 w-full">
                {PHASES.map((phase) => (
                  <TabsTrigger key={phase.id} value={phase.id} className="gap-2">
                    {phase.icon}
                    <span className="hidden sm:inline">{phase.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <TabsContent value="research" className="m-0 p-4 data-[state=active]:block">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Research Phase</h3>
                  <p className="text-sm text-muted-foreground">
                    트렌드 분석, 주제 선택, 스크립트 생성 에이전트 설정
                  </p>
                </div>
                <ResearchPhasePanel config={config.phases.research} />
              </TabsContent>

              <TabsContent value="production" className="m-0 p-4 data-[state=active]:block">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Production Phase</h3>
                  <p className="text-sm text-muted-foreground">
                    음성, 영상, 썸네일, 편집 에이전트 설정
                  </p>
                </div>
                <ProductionPhasePanel config={config.phases.production} />
              </TabsContent>

              <TabsContent value="quality" className="m-0 p-4 data-[state=active]:block">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Quality Phase</h3>
                  <p className="text-sm text-muted-foreground">
                    품질 평가 및 수정 에이전트 설정
                  </p>
                </div>
                <QualityPhasePanel config={config.phases.quality} />
              </TabsContent>

              <TabsContent value="publishing" className="m-0 p-4 data-[state=active]:block">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Publishing Phase</h3>
                  <p className="text-sm text-muted-foreground">
                    플랫폼 게시 에이전트 설정
                  </p>
                </div>
                <PublishingPhasePanel config={config.phases.publishing} />
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Phase Navigation */}
          <div className="shrink-0 p-4 border-t bg-background flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                const currentIndex = PHASES.findIndex((p) => p.id === activePhase);
                if (currentIndex > 0) {
                  setActivePhase(PHASES[currentIndex - 1].id);
                }
              }}
              disabled={activePhase === "research"}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전 단계
            </Button>

            <Button
              onClick={() => {
                const currentIndex = PHASES.findIndex((p) => p.id === activePhase);
                if (currentIndex < PHASES.length - 1) {
                  setActivePhase(PHASES[currentIndex + 1].id);
                }
              }}
              disabled={activePhase === "publishing"}
            >
              다음 단계
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/3 border-l overflow-auto">
            <WorkflowPreview config={config} />
          </div>
        )}
      </div>
    </div>
  );
}
