"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, Square, Clock, DollarSign } from "lucide-react";
import type { ExecutionMode } from "@/lib/workflow/types";

interface ExecutionControlBarProps {
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  isExecuting: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  totalProgress: number;
  totalCost: number;
  costLimit: number;
  elapsedTime: string;
}

export function ExecutionControlBar({
  mode,
  onModeChange,
  isExecuting,
  isPaused,
  onStart,
  onPause,
  onResume,
  onCancel,
  totalProgress,
  totalCost,
  costLimit,
  elapsedTime,
}: ExecutionControlBarProps) {
  const costPercentage = (totalCost / costLimit) * 100;
  const isOverBudget = costPercentage > 100;

  return (
    <div className="flex items-center gap-4 p-4 border-b bg-background">
      {/* Execution Mode Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">모드:</span>
        <Select
          value={mode}
          onValueChange={(v) => onModeChange(v as ExecutionMode)}
          disabled={isExecuting}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">자동 실행</SelectItem>
            <SelectItem value="step">단계별 실행</SelectItem>
            <SelectItem value="manual">수동 모드</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {!isExecuting ? (
          <Button onClick={onStart} className="gap-2">
            <Play className="h-4 w-4" />
            실행 시작
          </Button>
        ) : isPaused ? (
          <Button onClick={onResume} variant="outline" className="gap-2">
            <Play className="h-4 w-4" />
            재개
          </Button>
        ) : (
          <Button onClick={onPause} variant="outline" className="gap-2">
            <Pause className="h-4 w-4" />
            일시정지
          </Button>
        )}

        {isExecuting && (
          <Button onClick={onCancel} variant="destructive" size="icon">
            <Square className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>진행률</span>
          <span>{totalProgress.toFixed(0)}%</span>
        </div>
        <Progress value={totalProgress} className="h-2" />
      </div>

      {/* Cost Meter */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <DollarSign className={`h-4 w-4 ${isOverBudget ? "text-destructive" : "text-muted-foreground"}`} />
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className={isOverBudget ? "text-destructive font-medium" : "text-muted-foreground"}>
              ${totalCost.toFixed(2)}
            </span>
            <span className="text-muted-foreground">/ ${costLimit.toFixed(2)}</span>
          </div>
          <Progress
            value={Math.min(costPercentage, 100)}
            className={`h-1.5 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
          />
        </div>
      </div>

      {/* Elapsed Time */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="font-mono">{elapsedTime}</span>
      </div>
    </div>
  );
}
