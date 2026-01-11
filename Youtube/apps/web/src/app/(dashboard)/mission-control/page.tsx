"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, Save, Settings } from "lucide-react";

import {
  ModeSelector,
  ActionFooter,
  QuickCreateMode,
  DetailedConfigMode,
  ExecutionMode,
  SessionHistoryMode,
  ExecutionControlBar,
} from "@/components/mission-control";
import type { MissionControlMode } from "@/components/mission-control";
import { useMissionControlStore } from "@/lib/mission-control/store";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { WorkflowPhase, ExecutionMode as ExecMode } from "@/lib/workflow/types";
import { createDefaultWorkflowConfig } from "@/lib/workflow/types";

// Agent definitions for each phase
const PHASE_AGENTS: Record<WorkflowPhase, string[]> = {
  research: ["trend", "topic", "script"],
  production: ["voice", "video", "thumbnail", "editor"],
  quality: ["critic", "artEvaluator", "revision"],
  publishing: ["publisher"],
};

export default function MissionControlPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Store state
  const {
    currentMode,
    setMode,
  } = useMissionControlStore();

  const { currentConfig, createConfig } = useWorkflowStore();

  // Sync URL query param with store
  useEffect(() => {
    const modeParam = searchParams.get("mode") as MissionControlMode | null;
    if (modeParam && ["quick-create", "detailed-config", "execution", "session-history"].includes(modeParam)) {
      setMode(modeParam);
    }
  }, [searchParams, setMode]);

  // Update URL when mode changes
  const handleModeChange = useCallback((newMode: MissionControlMode) => {
    setMode(newMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", newMode);
    router.push(`/mission-control?${params.toString()}`, { scroll: false });
  }, [setMode, router, searchParams]);

  // Create default config if none exists
  useEffect(() => {
    if (!currentConfig) {
      createConfig("medium", "New Mission");
    }
  }, [currentConfig, createConfig]);

  // Use current config or a default for rendering
  const config = currentConfig ?? createDefaultWorkflowConfig("medium");

  // Execution state
  const [executionMode, setExecutionMode] = useState<ExecMode>("auto");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<WorkflowPhase | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [totalProgress, setTotalProgress] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Agent results and status
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, "pending" | "running" | "completed" | "error" | "paused">
  >({});
  const [agentResults, setAgentResults] = useState<
    Record<string, { input: unknown; output: unknown; logs: string[]; duration: number; cost: number }>
  >({});

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExecuting && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isExecuting, isPaused]);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate estimated cost based on config
  const estimatedCost = 12.5; // TODO: Calculate from config

  // SSE Event handler
  const handleSSEEvent = useCallback((event: { type: string; data: unknown }) => {
    switch (event.type) {
      case "connected":
        setSessionId((event.data as { sessionId: string }).sessionId);
        break;
      case "agent_start":
        const startData = event.data as { agentId: string };
        setCurrentAgent(startData.agentId);
        setAgentStatuses((prev) => ({ ...prev, [startData.agentId]: "running" }));
        break;
      case "agent_complete":
        const completeData = event.data as {
          agentId: string;
          result: { output: unknown; cost: number; duration: number };
        };
        setAgentStatuses((prev) => ({ ...prev, [completeData.agentId]: "completed" }));
        setAgentResults((prev) => ({
          ...prev,
          [completeData.agentId]: {
            input: {},
            output: completeData.result.output,
            logs: [],
            duration: completeData.result.duration,
            cost: completeData.result.cost,
          },
        }));
        setTotalCost((prev) => prev + (completeData.result.cost || 0));
        break;
      case "phase_start":
        const phaseData = event.data as { phase: WorkflowPhase };
        setCurrentPhase(phaseData.phase);
        break;
      case "progress":
        const progressData = event.data as { totalProgress: number };
        setTotalProgress(progressData.totalProgress);
        break;
      case "paused":
        setIsPaused(true);
        break;
      case "resumed":
        setIsPaused(false);
        break;
      case "complete":
        setIsExecuting(false);
        setCurrentAgent(null);
        setTotalProgress(100);
        // Auto-transition to session history mode on completion
        handleModeChange("session-history");
        break;
      case "error":
        const errorData = event.data as { agent?: string };
        if (errorData.agent) {
          setAgentStatuses((prev) => ({ ...prev, [errorData.agent!]: "error" }));
        }
        break;
    }
  }, [handleModeChange]);

  // Execution handlers
  const handleStart = useCallback(async () => {
    setIsExecuting(true);
    setIsPaused(false);
    setElapsedTime(0);
    setTotalProgress(0);
    setTotalCost(0);

    // Initialize agent statuses
    const initialStatuses: Record<string, "pending"> = {};
    Object.values(PHASE_AGENTS).flat().forEach((agent) => {
      initialStatuses[agent] = "pending";
    });
    setAgentStatuses(initialStatuses);

    // Auto-transition to execution mode
    handleModeChange("execution");

    // Start SSE connection for execution
    try {
      const response = await fetch("/api/workflow/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: config,
          mode: executionMode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start execution");
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            handleSSEEvent(data);
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error("Execution error:", error);
      setIsExecuting(false);
    }
  }, [config, executionMode, handleSSEEvent, handleModeChange]);

  const handlePause = useCallback(async () => {
    if (!sessionId) return;
    await fetch("/api/workflow/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "pause" }),
    });
    setIsPaused(true);
  }, [sessionId]);

  const handleResume = useCallback(async () => {
    if (!sessionId) return;
    await fetch("/api/workflow/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "resume" }),
    });
    setIsPaused(false);
  }, [sessionId]);

  const handleCancel = useCallback(async () => {
    if (!sessionId) return;
    await fetch("/api/workflow/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "cancel" }),
    });
    setIsExecuting(false);
    setIsPaused(false);
    setCurrentAgent(null);
  }, [sessionId]);

  const handleModifyOutput = useCallback(
    async (agentId: string, output: unknown) => {
      if (!sessionId) return;
      await fetch("/api/workflow/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "modify",
          agentId,
          modifiedOutput: output,
        }),
      });
    },
    [sessionId]
  );

  const handleRerun = useCallback(
    async (agentId: string, input?: unknown) => {
      if (!sessionId) return;
      await fetch("/api/workflow/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "rerun",
          agentId,
          modifiedInput: input,
        }),
      });
    },
    [sessionId]
  );

  const handleSkip = useCallback(
    async (agentId: string) => {
      if (!sessionId) return;
      await fetch("/api/workflow/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "skip",
          agentId,
        }),
      });
      setAgentStatuses((prev) => ({ ...prev, [agentId]: "completed" }));
    },
    [sessionId]
  );

  const handleSaveTemplate = useCallback(() => {
    // TODO: Implement save template modal
    console.log("Save template clicked");
  }, []);

  // Render content based on current mode
  const renderModeContent = () => {
    switch (currentMode) {
      case "quick-create":
        return (
          <QuickCreateMode
            onOpenDetailedConfig={() => handleModeChange("detailed-config")}
          />
        );
      case "detailed-config":
        return <DetailedConfigMode />;
      case "execution":
        return (
          <>
            {/* Execution Control Bar */}
            <ExecutionControlBar
              mode={executionMode}
              onModeChange={setExecutionMode}
              isExecuting={isExecuting}
              isPaused={isPaused}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              totalProgress={totalProgress}
              totalCost={totalCost}
              costLimit={50}
              elapsedTime={formatTime(elapsedTime)}
            />
            <ExecutionMode
              isExecuting={isExecuting}
              isPaused={isPaused}
              currentPhase={currentPhase}
              currentAgent={currentAgent}
              sessionId={sessionId}
              agentStatuses={agentStatuses}
              agentResults={agentResults}
              onModifyOutput={handleModifyOutput}
              onRerun={handleRerun}
              onSkip={handleSkip}
            />
          </>
        );
      case "session-history":
        return <SessionHistoryMode />;
      default:
        return <QuickCreateMode />;
    }
  };

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Mission Control</h1>
          {isExecuting && (
            <Badge variant={isPaused ? "secondary" : "default"}>
              {isPaused ? "일시정지" : "실행 중"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveTemplate}>
            <Save className="h-4 w-4 mr-2" />
            템플릿 저장
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mode Selector */}
      <ModeSelector
        currentMode={currentMode}
        onModeChange={handleModeChange}
        isExecuting={isExecuting}
      />

      {/* Dynamic Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderModeContent()}
      </div>

      {/* Action Footer (fixed at bottom) */}
      <ActionFooter
        estimatedCost={estimatedCost}
        currentCost={totalCost}
        costLimit={50}
        isExecuting={isExecuting}
        isPaused={isPaused}
        executionMode={executionMode}
        elapsedTime={formatTime(elapsedTime)}
        progress={totalProgress}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
        onSaveTemplate={handleSaveTemplate}
        onExecutionModeChange={setExecutionMode}
      />
    </div>
  );
}
