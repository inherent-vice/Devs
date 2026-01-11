"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, Square, Save, DollarSign, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutionMode } from "@/lib/workflow/types";

interface ActionFooterProps {
  // Cost
  estimatedCost: number;
  currentCost?: number;
  costLimit?: number;

  // Execution state
  isExecuting: boolean;
  isPaused: boolean;
  executionMode: ExecutionMode;
  elapsedTime?: string;
  progress?: number;

  // Templates
  selectedTemplate?: string;
  templates?: { id: string; name: string }[];

  // Callbacks
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onSaveTemplate: () => void;
  onTemplateChange?: (templateId: string) => void;
  onExecutionModeChange: (mode: ExecutionMode) => void;

  className?: string;
}

const EXECUTION_MODES: { value: ExecutionMode; label: string; description: string }[] = [
  { value: "auto", label: "자동 실행", description: "전체 자동 완료" },
  { value: "step", label: "단계별 실행", description: "각 단계 확인 후 진행" },
  { value: "manual", label: "수동 실행", description: "개별 에이전트 호출" },
];

export function ActionFooter({
  estimatedCost,
  currentCost = 0,
  costLimit = 50,
  isExecuting,
  isPaused,
  executionMode,
  elapsedTime,
  progress,
  selectedTemplate,
  templates = [],
  onStart,
  onPause,
  onResume,
  onCancel,
  onSaveTemplate,
  onTemplateChange,
  onExecutionModeChange,
  className,
}: ActionFooterProps) {
  const costPercentage = (currentCost / costLimit) * 100;
  const isOverBudget = currentCost > costLimit;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      "bg-background border-t shadow-lg",
      "px-4 py-3",
      className
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Cost Information */}
        <div className="flex items-center gap-6">
          {/* Estimated/Current Cost */}
          <div className="flex items-center gap-2">
            <DollarSign className={cn(
              "h-4 w-4",
              isOverBudget ? "text-destructive" : "text-muted-foreground"
            )} />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                {isExecuting ? "현재 비용" : "예상 비용"}
              </span>
              <span className={cn(
                "font-semibold",
                isOverBudget && "text-destructive"
              )}>
                ${isExecuting ? currentCost.toFixed(2) : estimatedCost.toFixed(2)}
                <span className="text-xs text-muted-foreground font-normal">
                  {" "}/ ${costLimit.toFixed(2)}
                </span>
              </span>
            </div>
          </div>

          {/* Elapsed Time (when executing) */}
          {isExecuting && elapsedTime && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">경과 시간</span>
                <span className="font-semibold">{elapsedTime}</span>
              </div>
            </div>
          )}

          {/* Progress (when executing) */}
          {isExecuting && progress !== undefined && (
            <div className="flex flex-col gap-1 min-w-32">
              <span className="text-xs text-muted-foreground">진행률</span>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-right">{progress}%</span>
            </div>
          )}
        </div>

        {/* Center: Execution Controls */}
        <div className="flex items-center gap-3">
          {/* Execution Mode Select */}
          <Select
            value={executionMode}
            onValueChange={(v) => onExecutionModeChange(v as ExecutionMode)}
            disabled={isExecuting}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXECUTION_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div className="flex flex-col">
                    <span>{mode.label}</span>
                    <span className="text-xs text-muted-foreground">{mode.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          {!isExecuting ? (
            <Button onClick={onStart} size="lg" className="gap-2">
              <Play className="h-4 w-4" />
              실행 시작
            </Button>
          ) : isPaused ? (
            <>
              <Button onClick={onResume} variant="default" className="gap-2">
                <Play className="h-4 w-4" />
                재개
              </Button>
              <Button onClick={onCancel} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" />
                취소
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onPause} variant="secondary" className="gap-2">
                <Pause className="h-4 w-4" />
                일시정지
              </Button>
              <Button onClick={onCancel} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" />
                취소
              </Button>
            </>
          )}
        </div>

        {/* Right: Template Controls */}
        <div className="flex items-center gap-3">
          {/* Template Selector */}
          {templates.length > 0 && onTemplateChange && (
            <Select
              value={selectedTemplate}
              onValueChange={onTemplateChange}
              disabled={isExecuting}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="템플릿 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">커스텀</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Save Template Button */}
          <Button
            variant="outline"
            onClick={onSaveTemplate}
            disabled={isExecuting}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            템플릿 저장
          </Button>
        </div>
      </div>
    </div>
  );
}
