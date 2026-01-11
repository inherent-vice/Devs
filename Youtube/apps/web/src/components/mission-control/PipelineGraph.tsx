"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2, AlertCircle, PauseCircle } from "lucide-react";
import type { WorkflowPhase } from "@/lib/workflow/types";

type AgentStatus = "pending" | "running" | "completed" | "error" | "paused";

const PHASE_AGENTS: Record<WorkflowPhase, string[]> = {
  research: ["trend", "topic", "script"],
  production: ["voice", "video", "thumbnail", "editor"],
  quality: ["critic", "artEvaluator", "revision"],
  publishing: ["publisher"],
};

const AGENT_NAMES: Record<string, string> = {
  trend: "Trend",
  topic: "Topic",
  script: "Script",
  voice: "Voice",
  video: "Video",
  thumbnail: "Thumb",
  editor: "Editor",
  critic: "Critic",
  artEvaluator: "Art",
  revision: "Revision",
  publisher: "Publisher",
};

const PHASE_NAMES: Record<WorkflowPhase, string> = {
  research: "Research",
  production: "Production",
  quality: "Quality",
  publishing: "Publishing",
};

interface PipelineGraphProps {
  phases: WorkflowPhase[];
  agentStatuses: Record<string, AgentStatus>;
  currentAgent: string | null;
  currentPhase: WorkflowPhase | null;
  onAgentClick?: (agentId: string) => void;
  layout?: "horizontal" | "vertical";
}

function StatusIcon({ status, isActive }: { status: AgentStatus; isActive: boolean }) {
  const baseClass = "h-4 w-4";

  switch (status) {
    case "completed":
      return <CheckCircle2 className={cn(baseClass, "text-green-500")} />;
    case "running":
      return <Loader2 className={cn(baseClass, "text-primary animate-spin")} />;
    case "error":
      return <AlertCircle className={cn(baseClass, "text-destructive")} />;
    case "paused":
      return <PauseCircle className={cn(baseClass, "text-yellow-500")} />;
    default:
      return <Circle className={cn(baseClass, isActive ? "text-primary" : "text-muted-foreground/40")} />;
  }
}

function AgentNode({
  agentId,
  status,
  isActive,
  onClick,
}: {
  agentId: string;
  status: AgentStatus;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
        "border",
        status === "running" && "border-primary bg-primary/10",
        status === "completed" && "border-green-500/50 bg-green-500/10",
        status === "error" && "border-destructive/50 bg-destructive/10",
        status === "paused" && "border-yellow-500/50 bg-yellow-500/10",
        status === "pending" && "border-muted-foreground/20 bg-muted/50",
        isActive && status === "pending" && "border-primary/50",
        "hover:bg-accent/50 cursor-pointer"
      )}
    >
      <StatusIcon status={status} isActive={isActive} />
      <span className={cn(
        status === "pending" && !isActive && "text-muted-foreground"
      )}>
        {AGENT_NAMES[agentId] || agentId}
      </span>
    </button>
  );
}

function PhaseNode({
  phase,
  isActive,
  isCompleted,
}: {
  phase: WorkflowPhase;
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold",
        "border-2",
        isCompleted && "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
        isActive && !isCompleted && "border-primary bg-primary/10 text-primary",
        !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
      )}
    >
      {isCompleted && <CheckCircle2 className="h-4 w-4 mr-2" />}
      {isActive && !isCompleted && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {PHASE_NAMES[phase]}
    </div>
  );
}

export function PipelineGraph({
  phases,
  agentStatuses,
  currentAgent,
  currentPhase,
  onAgentClick,
  layout = "horizontal",
}: PipelineGraphProps) {
  const isPhaseCompleted = (phase: WorkflowPhase) => {
    const agents = PHASE_AGENTS[phase];
    return agents.every((a) => agentStatuses[a] === "completed");
  };

  if (layout === "vertical") {
    return (
      <div className="space-y-4">
        {phases.map((phase, phaseIdx) => {
          const agents = PHASE_AGENTS[phase];
          const isActive = currentPhase === phase;
          const isCompleted = isPhaseCompleted(phase);

          return (
            <div key={phase} className="space-y-2">
              <PhaseNode phase={phase} isActive={isActive} isCompleted={isCompleted} />

              <div className="ml-4 pl-4 border-l-2 border-muted space-y-1">
                {agents.map((agentId, agentIdx) => (
                  <div key={agentId} className="flex items-center gap-2">
                    <AgentNode
                      agentId={agentId}
                      status={agentStatuses[agentId] || "pending"}
                      isActive={currentAgent === agentId}
                      onClick={() => onAgentClick?.(agentId)}
                    />
                    {agentIdx < agents.length - 1 && (
                      <div className="h-4 w-px bg-muted-foreground/20" />
                    )}
                  </div>
                ))}
              </div>

              {phaseIdx < phases.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="h-4 w-px bg-muted-foreground/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className="space-y-4">
      {/* Phase level */}
      <div className="flex items-center justify-between gap-4">
        {phases.map((phase, idx) => {
          const isActive = currentPhase === phase;
          const isCompleted = isPhaseCompleted(phase);

          return (
            <div key={phase} className="flex items-center gap-4 flex-1">
              <PhaseNode phase={phase} isActive={isActive} isCompleted={isCompleted} />
              {idx < phases.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5",
                  isCompleted ? "bg-green-500" : "bg-muted-foreground/20"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Agent level */}
      <div className="flex items-start gap-4">
        {phases.map((phase) => {
          const agents = PHASE_AGENTS[phase];

          return (
            <div key={phase} className="flex-1 flex flex-wrap gap-1 justify-center">
              {agents.map((agentId, idx) => (
                <div key={agentId} className="flex items-center gap-1">
                  <AgentNode
                    agentId={agentId}
                    status={agentStatuses[agentId] || "pending"}
                    isActive={currentAgent === agentId}
                    onClick={() => onAgentClick?.(agentId)}
                  />
                  {idx < agents.length - 1 && (
                    <div className="w-2 h-px bg-muted-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
