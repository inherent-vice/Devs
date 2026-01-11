"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Save,
  Download,
  Upload,
  Settings2,
  Sparkles,
  FileText,
  Mic,
  Video,
  Image,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Plus,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkflowStore, PRESET_TEMPLATES } from "@/lib/workflow/store";
import {
  WorkflowConfig,
  WorkflowPhase,
  VideoType,
  WorkflowTemplate,
} from "@/lib/workflow/types";
import { TemplateSelector } from "./TemplateSelector";
import { ResearchPhasePanel } from "./phases/ResearchPhasePanel";
import { ProductionPhasePanel } from "./phases/ProductionPhasePanel";
import { QualityPhasePanel } from "./phases/QualityPhasePanel";
import { PublishingPhasePanel } from "./phases/PublishingPhasePanel";
import { WorkflowPreview } from "./WorkflowPreview";
import { WorkflowExecutionPanel } from "./WorkflowExecutionPanel";

const PHASES: { id: WorkflowPhase; label: string; icon: React.ReactNode }[] = [
  { id: "research", label: "리서치", icon: <Sparkles className="h-4 w-4" /> },
  { id: "production", label: "제작", icon: <Video className="h-4 w-4" /> },
  { id: "quality", label: "품질", icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: "publishing", label: "게시", icon: <Upload className="h-4 w-4" /> },
];

interface WorkflowWizardProps {
  initialConfig?: WorkflowConfig;
  onComplete?: (config: WorkflowConfig) => void;
  onCancel?: () => void;
}

export function WorkflowWizard({ initialConfig, onComplete, onCancel }: WorkflowWizardProps) {
  const {
    currentConfig,
    currentState,
    createConfig,
    loadConfig,
    updateConfig,
    saveConfig,
    loadTemplate,
    saveAsTemplate,
    initializeState,
    updateState,
  } = useWorkflowStore();

  const [step, setStep] = useState<"template" | "configure" | "preview" | "execute">("template");
  const [activePhase, setActivePhase] = useState<WorkflowPhase>("research");
  const [showPreview, setShowPreview] = useState(false);

  // Initialize with config if provided
  useEffect(() => {
    if (initialConfig) {
      loadConfig(initialConfig);
      setStep("configure");
    }
  }, [initialConfig, loadConfig]);

  const handleSelectTemplate = (template: WorkflowTemplate | null, videoType?: VideoType) => {
    if (template) {
      loadTemplate(template.id);
    } else if (videoType) {
      createConfig(videoType, "새 워크플로우");
    }
    setStep("configure");
  };

  const handleStartFromScratch = (videoType: VideoType) => {
    createConfig(videoType);
    setStep("configure");
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
    toast.success("워크플로우가 저장되었습니다");
  };

  const handleStartExecution = () => {
    if (!currentConfig) return;
    saveConfig(currentConfig);
    setStep("execute");
    // Note: Execution is now managed by WorkflowExecutionPanel
  };

  const getPhaseProgress = () => {
    const phaseIndex = PHASES.findIndex((p) => p.id === activePhase);
    return ((phaseIndex + 1) / PHASES.length) * 100;
  };

  if (!currentConfig && step !== "template") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">워크플로우를 먼저 선택해주세요</p>
          <Button onClick={() => setStep("template")}>템플릿 선택</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          {step !== "template" && (
            <Button variant="ghost" size="sm" onClick={() => setStep("template")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              템플릿
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {step === "template" && "템플릿 선택"}
              {step === "configure" && (
                <>
                  <Settings2 className="h-5 w-5" />
                  {currentConfig?.name || "워크플로우 설정"}
                </>
              )}
              {step === "preview" && "미리보기"}
              {step === "execute" && "실행 중"}
            </h2>
            {currentConfig && step === "configure" && (
              <p className="text-sm text-muted-foreground">
                {currentConfig.videoType === "shorts" && "Shorts (60초)"}
                {currentConfig.videoType === "medium" && "중간 길이 (5분)"}
                {currentConfig.videoType === "longform" && "긴 영상 (15분)"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step === "configure" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="h-4 w-4 mr-1" />
                {showPreview ? "숨기기" : "미리보기"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveTemplate}>
                <LayoutTemplate className="h-4 w-4 mr-1" />
                템플릿 저장
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveConfig}>
                <Save className="h-4 w-4 mr-1" />
                저장
              </Button>
              <Button onClick={handleStartExecution}>
                <Play className="h-4 w-4 mr-1" />
                실행
              </Button>
            </>
          )}
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              취소
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "template" && (
            <motion.div
              key="template"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-auto"
            >
              <TemplateSelector
                onSelect={handleSelectTemplate}
                onStartFromScratch={handleStartFromScratch}
              />
            </motion.div>
          )}

          {step === "configure" && currentConfig && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex"
            >
              {/* Main Configuration Area */}
              <div className={`flex flex-col min-h-0 ${showPreview ? "w-2/3" : "w-full"}`}>
                {/* Phase Progress */}
                <div className="flex-shrink-0 p-4 border-b bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">진행 단계</span>
                    <span className="text-sm text-muted-foreground">
                      {PHASES.findIndex((p) => p.id === activePhase) + 1} / {PHASES.length}
                    </span>
                  </div>
                  <Progress value={getPhaseProgress()} className="h-2" />
                </div>

                {/* Phase Tabs */}
                <Tabs
                  value={activePhase}
                  onValueChange={(v) => setActivePhase(v as WorkflowPhase)}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div className="flex-shrink-0 px-4 pt-2 bg-background border-b">
                    <TabsList className="grid grid-cols-4 w-full">
                      {PHASES.map((phase) => (
                        <TabsTrigger key={phase.id} value={phase.id} className="gap-2">
                          {phase.icon}
                          {phase.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full">
                      <TabsContent value="research" className="m-0 p-4 data-[state=active]:block">
                        <ResearchPhasePanel config={currentConfig.phases.research} />
                      </TabsContent>

                      <TabsContent value="production" className="m-0 p-4 data-[state=active]:block">
                        <ProductionPhasePanel config={currentConfig.phases.production} />
                      </TabsContent>

                      <TabsContent value="quality" className="m-0 p-4 data-[state=active]:block">
                        <QualityPhasePanel config={currentConfig.phases.quality} />
                      </TabsContent>

                      <TabsContent value="publishing" className="m-0 p-4 data-[state=active]:block">
                        <PublishingPhasePanel config={currentConfig.phases.publishing} />
                      </TabsContent>
                    </ScrollArea>
                  </div>
                </Tabs>

                {/* Phase Navigation */}
                <div className="flex-shrink-0 p-4 border-t bg-background flex justify-between">
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
                  <WorkflowPreview config={currentConfig} />
                </div>
              )}
            </motion.div>
          )}

          {step === "execute" && currentConfig && (
            <motion.div
              key="execute"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <WorkflowExecutionPanel
                config={currentConfig}
                onConfigChange={loadConfig}
                onComplete={(result) => {
                  toast.success("워크플로우 실행이 완료되었습니다");
                  onComplete?.(currentConfig);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Note: ExecutionPanel has been replaced by WorkflowExecutionPanel
