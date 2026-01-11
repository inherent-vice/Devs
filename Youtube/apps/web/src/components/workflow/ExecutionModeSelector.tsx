/**
 * Execution Mode Selector
 *
 * Allows users to select between three execution modes:
 * - auto: Run entire workflow automatically
 * - step: Pause after each agent for review
 * - manual: Execute agents individually
 */

"use client";

import React from "react";
import { Play, StepForward, Hand, Info } from "lucide-react";
import type { ExecutionMode } from "@/lib/workflow/executor";

interface ModeOption {
  id: ExecutionMode;
  name: string;
  icon: React.ElementType;
  description: string;
  features: string[];
}

const MODES: ModeOption[] = [
  {
    id: "auto",
    name: "자동 실행",
    icon: Play,
    description: "전체 워크플로우를 자동으로 실행합니다",
    features: [
      "모든 에이전트 순차 실행",
      "결과만 확인 가능",
      "가장 빠른 완료",
    ],
  },
  {
    id: "step",
    name: "단계별 실행",
    icon: StepForward,
    description: "각 에이전트 실행 후 검토 및 수정 가능",
    features: [
      "단계별 일시정지",
      "중간 결과 검토/수정",
      "에이전트 재실행 가능",
    ],
  },
  {
    id: "manual",
    name: "수동 모드",
    icon: Hand,
    description: "에이전트를 개별적으로 실행합니다",
    features: [
      "완전한 제어",
      "입력 직접 지정",
      "고급 사용자용",
    ],
  },
];

interface ExecutionModeSelectorProps {
  selectedMode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
  showFeatures?: boolean;
  compact?: boolean;
}

export function ExecutionModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
  showFeatures = true,
  compact = false,
}: ExecutionModeSelectorProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => !disabled && onModeChange(mode.id)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${isSelected
                  ? "bg-background shadow text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              title={mode.description}
            >
              <Icon className="w-4 h-4" />
              <span>{mode.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">실행 모드</h3>
        <div className="group relative">
          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
          <div className="absolute left-0 top-6 w-64 p-2 bg-popover border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <p className="text-xs text-muted-foreground">
              워크플로우 실행 방식을 선택하세요. 단계별 실행 모드에서는 각 에이전트의 결과를 검토하고 수정할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => !disabled && onModeChange(mode.id)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}

              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`
                    p-2 rounded-lg
                    ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
                  `}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-medium">{mode.name}</h4>
              </div>

              <p className="text-xs text-muted-foreground mb-3">{mode.description}</p>

              {showFeatures && (
                <ul className="space-y-1">
                  {mode.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className={`
                        text-xs flex items-center gap-1.5
                        ${isSelected ? "text-primary" : "text-muted-foreground"}
                      `}
                    >
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ExecutionModeSelector;
