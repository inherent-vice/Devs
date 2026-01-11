"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Settings, Radio, History } from "lucide-react";
import { cn } from "@/lib/utils";

export type MissionControlMode = "quick-create" | "detailed-config" | "execution" | "session-history";

interface ModeSelectorProps {
  currentMode: MissionControlMode;
  onModeChange: (mode: MissionControlMode) => void;
  isExecuting?: boolean;
  className?: string;
}

const MODE_CONFIG: Record<MissionControlMode, { label: string; icon: React.ElementType; description: string }> = {
  "quick-create": {
    label: "빠른 생성",
    icon: Rocket,
    description: "주제만 입력하면 바로 영상 생성",
  },
  "detailed-config": {
    label: "상세 설정",
    icon: Settings,
    description: "12개 에이전트 개별 설정",
  },
  "execution": {
    label: "실행 중",
    icon: Radio,
    description: "실시간 진행 상황 모니터링",
  },
  "session-history": {
    label: "세션 기록",
    icon: History,
    description: "과거 실행 기록 조회",
  },
};

export function ModeSelector({ currentMode, onModeChange, isExecuting, className }: ModeSelectorProps) {
  return (
    <div className={cn("w-full border-b bg-background", className)}>
      <Tabs value={currentMode} onValueChange={(v) => onModeChange(v as MissionControlMode)}>
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none">
          {Object.entries(MODE_CONFIG).map(([mode, config]) => {
            const Icon = config.icon;
            const isActive = currentMode === mode;
            const isExecutionMode = mode === "execution";

            return (
              <TabsTrigger
                key={mode}
                value={mode}
                disabled={isExecutionMode && !isExecuting && currentMode !== "execution"}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent",
                  "data-[state=active]:border-primary data-[state=active]:bg-transparent",
                  "hover:bg-muted/50 transition-colors",
                  isExecutionMode && isExecuting && "animate-pulse"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4",
                  isActive && "text-primary",
                  isExecutionMode && isExecuting && "text-green-500"
                )} />
                <span className={cn(
                  "font-medium",
                  isActive && "text-primary"
                )}>
                  {config.label}
                </span>
                {isExecutionMode && isExecuting && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
