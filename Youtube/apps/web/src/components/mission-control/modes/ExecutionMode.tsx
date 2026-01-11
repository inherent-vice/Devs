"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, DollarSign } from "lucide-react";

import { PipelineGraph } from "../PipelineGraph";
import { AgentTimelineCard } from "../AgentTimelineCard";
import { useMissionControlStore } from "@/lib/mission-control/store";
import type { WorkflowPhase } from "@/lib/workflow/types";

// Agent definitions for each phase
const PHASE_AGENTS: Record<WorkflowPhase, string[]> = {
  research: ["trend", "topic", "script"],
  production: ["voice", "video", "thumbnail", "editor"],
  quality: ["critic", "artEvaluator", "revision"],
  publishing: ["publisher"],
};

const AGENT_NAMES: Record<string, string> = {
  trend: "Trend Agent",
  topic: "Topic Agent",
  script: "Script Agent",
  voice: "Voice Agent",
  video: "Video Agent",
  thumbnail: "Thumbnail Agent",
  editor: "Editor Agent",
  critic: "Critic Agent",
  artEvaluator: "Art Evaluator",
  revision: "Revision Agent",
  publisher: "Publisher Agent",
};

const PHASE_NAMES: Record<WorkflowPhase, string> = {
  research: "Research",
  production: "Production",
  quality: "Quality",
  publishing: "Publishing",
};

interface ExecutionModeProps {
  // Execution state from parent
  isExecuting: boolean;
  isPaused: boolean;
  currentPhase: WorkflowPhase | null;
  currentAgent: string | null;
  sessionId: string | null;
  agentStatuses: Record<string, "pending" | "running" | "completed" | "error" | "paused">;
  agentResults: Record<string, { input: unknown; output: unknown; logs: string[]; duration: number; cost: number }>;

  // Callbacks
  onModifyOutput: (agentId: string, output: unknown) => Promise<void>;
  onRerun: (agentId: string, input?: unknown) => Promise<void>;
  onSkip: (agentId: string) => Promise<void>;
}

export function ExecutionMode({
  isExecuting,
  isPaused,
  currentPhase,
  currentAgent,
  sessionId,
  agentStatuses,
  agentResults,
  onModifyOutput,
  onRerun,
  onSkip,
}: ExecutionModeProps) {
  const {
    viewMode,
    setViewMode,
    expandedAgents,
    toggleAgent,
    selectedAgent,
    selectAgent,
  } = useMissionControlStore();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Pipeline Graph */}
      <div className="p-4 border-b bg-muted/30">
        <PipelineGraph
          phases={["research", "production", "quality", "publishing"]}
          agentStatuses={agentStatuses}
          currentAgent={currentAgent}
          currentPhase={currentPhase}
          onAgentClick={selectAgent}
        />
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "timeline" | "graph" | "split")} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 border-b shrink-0">
          <TabsList>
            <TabsTrigger value="timeline">타임라인</TabsTrigger>
            <TabsTrigger value="split">분할 뷰</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeline" className="flex-1 overflow-auto p-4 mt-0">
          <div className="space-y-4">
            {(["research", "production", "quality", "publishing"] as WorkflowPhase[]).map(
              (phase) => (
                <Card key={phase}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {currentPhase === phase && (
                          <Activity className="h-4 w-4 text-primary animate-pulse" />
                        )}
                        {PHASE_NAMES[phase]} Phase
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        $
                        {PHASE_AGENTS[phase]
                          .reduce((sum, agent) => sum + (agentResults[agent]?.cost || 0), 0)
                          .toFixed(4)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {PHASE_AGENTS[phase].map((agentId) => (
                      <AgentTimelineCard
                        key={agentId}
                        agentId={agentId}
                        agentName={AGENT_NAMES[agentId]}
                        phase={phase}
                        status={agentStatuses[agentId] || "pending"}
                        input={agentResults[agentId]?.input}
                        output={agentResults[agentId]?.output}
                        logs={agentResults[agentId]?.logs || []}
                        duration={agentResults[agentId]?.duration || 0}
                        cost={agentResults[agentId]?.cost || 0}
                        isExpanded={expandedAgents.has(agentId)}
                        isEditable={isPaused || agentStatuses[agentId] === "completed"}
                        onToggle={() => toggleAgent(agentId)}
                        onModifyOutput={(output) => onModifyOutput(agentId, output)}
                        onRerun={(input) => onRerun(agentId, input)}
                        onSkip={() => onSkip(agentId)}
                      />
                    ))}
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="split" className="flex-1 overflow-hidden mt-0">
          <div className="flex h-full">
            {/* Left: Pipeline Graph */}
            <div className="w-1/3 border-r p-4 overflow-auto">
              <h3 className="font-semibold mb-4">파이프라인</h3>
              <PipelineGraph
                phases={["research", "production", "quality", "publishing"]}
                agentStatuses={agentStatuses}
                currentAgent={currentAgent}
                currentPhase={currentPhase}
                onAgentClick={selectAgent}
                layout="vertical"
              />
            </div>

            {/* Right: Selected Agent Detail */}
            <div className="flex-1 p-4 overflow-auto">
              {selectedAgent ? (
                <AgentTimelineCard
                  agentId={selectedAgent}
                  agentName={AGENT_NAMES[selectedAgent]}
                  phase={
                    Object.entries(PHASE_AGENTS).find(([_, agents]) =>
                      agents.includes(selectedAgent)
                    )?.[0] as WorkflowPhase
                  }
                  status={agentStatuses[selectedAgent] || "pending"}
                  input={agentResults[selectedAgent]?.input}
                  output={agentResults[selectedAgent]?.output}
                  logs={agentResults[selectedAgent]?.logs || []}
                  duration={agentResults[selectedAgent]?.duration || 0}
                  cost={agentResults[selectedAgent]?.cost || 0}
                  isExpanded={true}
                  isEditable={isPaused || agentStatuses[selectedAgent] === "completed"}
                  onToggle={() => {}}
                  onModifyOutput={(output) => onModifyOutput(selectedAgent, output)}
                  onRerun={(input) => onRerun(selectedAgent, input)}
                  onSkip={() => onSkip(selectedAgent)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  왼쪽에서 에이전트를 선택하세요
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
