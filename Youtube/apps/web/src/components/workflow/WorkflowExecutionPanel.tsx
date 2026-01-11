/**
 * Workflow Execution Panel
 *
 * Main component that integrates all workflow execution features:
 * - Execution mode selection
 * - Progress visualization
 * - Agent detail views
 * - Reference sources
 * - Template management
 *
 * This panel provides transparent visibility into all workflow steps
 * and allows intervention at each stage.
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Circle,
  Loader2,
  AlertTriangle,
  Save,
  Image,
  FileText,
} from "lucide-react";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { ExecutionModeSelector } from "./ExecutionModeSelector";
import { AgentDetailPanel } from "./AgentDetailPanel";
import { ReferenceSourcePanel, ReferenceSource } from "./ReferenceSourcePanel";
import { TemplateManagerPanel } from "./TemplateManagerPanel";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { WorkflowConfig, WorkflowPhase, AgentStatus } from "@/lib/workflow/types";
import type { ExecutionMode } from "@/lib/workflow/executor";

// Phase and agent definitions
const PHASES: { id: WorkflowPhase; name: string; agents: string[] }[] = [
  { id: "research", name: "리서치", agents: ["trend", "topic", "script"] },
  { id: "production", name: "프로덕션", agents: ["voice", "video", "thumbnail", "editor"] },
  { id: "quality", name: "품질 검증", agents: ["critic", "artEvaluator", "revision"] },
  { id: "publishing", name: "게시", agents: ["publisher"] },
];

interface WorkflowExecutionPanelProps {
  config?: WorkflowConfig;
  onConfigChange?: (config: WorkflowConfig) => void;
  onComplete?: (result: unknown) => void;
}

export function WorkflowExecutionPanel({
  config: propConfig,
  onConfigChange,
  onComplete,
}: WorkflowExecutionPanelProps) {
  // Execution state
  const [executionState, executionActions] = useWorkflowExecution();
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("step");
  const [expandedPhases, setExpandedPhases] = useState<Set<WorkflowPhase>>(new Set(["research"]));
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  // Reference sources state
  const [referenceSources, setReferenceSources] = useState<ReferenceSource[]>([]);

  // Store
  const { currentConfig, loadTemplate, saveAsTemplate } = useWorkflowStore();
  const config = propConfig || currentConfig;

  // Active panel state
  const [activePanel, setActivePanel] = useState<"execution" | "references" | "templates">("execution");

  // Toggle phase expansion
  const togglePhase = useCallback((phase: WorkflowPhase) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  }, []);

  // Toggle agent expansion
  const toggleAgent = useCallback((agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  // Get agent status
  const getAgentStatus = useCallback((agentId: string): AgentStatus => {
    const result = executionState.progress?.agentResults[agentId];
    if (result) return result.status;
    if (executionState.progress?.currentAgent === agentId) return "running";
    return "pending";
  }, [executionState.progress]);

  // Get phase status
  const getPhaseStatus = useCallback((phaseId: WorkflowPhase): AgentStatus => {
    const phase = PHASES.find((p) => p.id === phaseId);
    if (!phase) return "pending";

    const agentStatuses = phase.agents.map(getAgentStatus);

    if (agentStatuses.every((s) => s === "completed")) return "completed";
    if (agentStatuses.some((s) => s === "failed")) return "failed";
    if (agentStatuses.some((s) => s === "running")) return "running";
    if (agentStatuses.some((s) => s === "completed")) return "running";
    return "pending";
  }, [getAgentStatus]);

  // Start execution
  const handleStart = async () => {
    if (!config) {
      alert("워크플로우 설정을 먼저 구성해주세요.");
      return;
    }

    await executionActions.start(config, { mode: executionMode });
  };

  // Handle template selection
  const handleSelectTemplate = useCallback((templateId: string) => {
    const newConfig = loadTemplate(templateId);
    if (newConfig && onConfigChange) {
      onConfigChange(newConfig);
    }
  }, [loadTemplate, onConfigChange]);

  // Handle reference source add
  const handleAddReferenceSource = useCallback((source: Omit<ReferenceSource, "id" | "createdAt">) => {
    const newSource: ReferenceSource = {
      ...source,
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setReferenceSources((prev) => [...prev, newSource]);
  }, []);

  // Handle reference source remove
  const handleRemoveReferenceSource = useCallback((id: string) => {
    setReferenceSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Handle reference source apply to agent
  const handleApplyReferenceSource = useCallback((sourceId: string, agentId: string) => {
    setReferenceSources((prev) =>
      prev.map((s) =>
        s.id === sourceId
          ? { ...s, appliedTo: [...(s.appliedTo || []), agentId] }
          : s
      )
    );
  }, []);

  // Handle reference source remove from agent
  const handleRemoveReferenceApplication = useCallback((sourceId: string, agentId: string) => {
    setReferenceSources((prev) =>
      prev.map((s) =>
        s.id === sourceId
          ? { ...s, appliedTo: (s.appliedTo || []).filter((a) => a !== agentId) }
          : s
      )
    );
  }, []);

  // Progress bar component
  const ProgressBar = () => {
    const progress = executionState.progress?.totalProgress || 0;
    return (
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  // Phase timeline component
  const PhaseTimeline = () => (
    <div className="flex items-center justify-between mb-4">
      {PHASES.map((phase, idx) => {
        const status = getPhaseStatus(phase.id);
        const isActive = executionState.progress?.currentPhase === phase.id;

        return (
          <React.Fragment key={phase.id}>
            {idx > 0 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  status === "completed" ? "bg-green-500" : "bg-muted"
                }`}
              />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${status === "completed" ? "bg-green-500 text-white" : ""}
                  ${status === "running" ? "bg-primary text-primary-foreground" : ""}
                  ${status === "failed" ? "bg-red-500 text-white" : ""}
                  ${status === "pending" ? "bg-muted text-muted-foreground" : ""}
                  ${isActive ? "ring-2 ring-primary ring-offset-2" : ""}
                `}
              >
                {status === "completed" && <CheckCircle className="w-4 h-4" />}
                {status === "running" && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === "failed" && <AlertTriangle className="w-4 h-4" />}
                {status === "pending" && <Circle className="w-4 h-4" />}
              </div>
              <span className="text-xs mt-1 text-muted-foreground">{phase.name}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">워크플로우 실행</h2>
          <div className="flex items-center gap-2">
            {/* Panel Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setActivePanel("execution")}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  activePanel === "execution" ? "bg-background shadow" : "text-muted-foreground"
                }`}
              >
                실행
              </button>
              <button
                onClick={() => setActivePanel("references")}
                className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1 ${
                  activePanel === "references" ? "bg-background shadow" : "text-muted-foreground"
                }`}
              >
                <Image className="w-3 h-3" />
                참조
              </button>
              <button
                onClick={() => setActivePanel("templates")}
                className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1 ${
                  activePanel === "templates" ? "bg-background shadow" : "text-muted-foreground"
                }`}
              >
                <FileText className="w-3 h-3" />
                템플릿
              </button>
            </div>
          </div>
        </div>

        {/* Execution Mode Selector */}
        {activePanel === "execution" && !executionState.isRunning && (
          <ExecutionModeSelector
            selectedMode={executionMode}
            onModeChange={setExecutionMode}
            disabled={executionState.isRunning}
            compact
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {activePanel === "execution" && (
          <>
            {/* Progress Timeline */}
            {executionState.isRunning && (
              <div className="mb-6">
                <PhaseTimeline />
                <ProgressBar />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>진행률: {executionState.progress?.totalProgress || 0}%</span>
                  <span>
                    현재: {executionState.progress?.currentAgent || "대기 중"}
                  </span>
                </div>
              </div>
            )}

            {/* Agent Details */}
            <div className="space-y-3">
              {PHASES.map((phase) => {
                const phaseStatus = getPhaseStatus(phase.id);
                const isExpanded = expandedPhases.has(phase.id);

                return (
                  <div key={phase.id} className="border rounded-lg">
                    {/* Phase Header */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => togglePhase(phase.id)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium">{phase.name}</span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            phaseStatus === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : phaseStatus === "running"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : phaseStatus === "failed"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {phaseStatus === "completed" && "완료"}
                          {phaseStatus === "running" && "진행 중"}
                          {phaseStatus === "failed" && "실패"}
                          {phaseStatus === "pending" && "대기"}
                          {phaseStatus === "paused" && "일시정지"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {phase.agents.length}개 에이전트
                      </span>
                    </div>

                    {/* Agent List */}
                    {isExpanded && (
                      <div className="p-3 pt-0 space-y-2">
                        {phase.agents.map((agentId) => (
                          <AgentDetailPanel
                            key={agentId}
                            agentId={agentId}
                            status={getAgentStatus(agentId)}
                            result={executionState.progress?.agentResults[agentId]}
                            logs={executionState.logs.filter((l) => l.agent === agentId)}
                            isExpanded={expandedAgents.has(agentId)}
                            isEditable={executionState.isPaused || executionMode === "step"}
                            onToggleExpand={() => toggleAgent(agentId)}
                            onModify={(output) => executionActions.modifyOutput(agentId, output)}
                            onRerun={(input) => executionActions.rerunAgent(agentId, input)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activePanel === "references" && (
          <ReferenceSourcePanel
            sources={referenceSources}
            onAdd={handleAddReferenceSource}
            onRemove={handleRemoveReferenceSource}
            onApply={handleApplyReferenceSource}
            onRemoveApplication={handleRemoveReferenceApplication}
            disabled={executionState.isRunning}
          />
        )}

        {activePanel === "templates" && (
          <TemplateManagerPanel
            onSelectTemplate={handleSelectTemplate}
            disabled={executionState.isRunning}
          />
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between">
          {/* Status */}
          <div className="text-sm text-muted-foreground">
            {executionState.hasError && (
              <span className="text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                오류: {executionState.error}
              </span>
            )}
            {executionState.isCompleted && (
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                완료됨
              </span>
            )}
            {executionState.isPaused && (
              <span className="text-yellow-500 flex items-center gap-1">
                <Pause className="w-4 h-4" />
                일시정지됨 - 검토 후 계속하세요
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!executionState.isRunning && !executionState.isCompleted && (
              <button
                onClick={handleStart}
                disabled={!config}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                실행 시작
              </button>
            )}

            {executionState.isRunning && !executionState.isPaused && (
              <button
                onClick={executionActions.pause}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                <Pause className="w-4 h-4" />
                일시정지
              </button>
            )}

            {executionState.isPaused && (
              <button
                onClick={executionActions.resume}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <Play className="w-4 h-4" />
                계속하기
              </button>
            )}

            {executionState.isRunning && (
              <button
                onClick={executionActions.cancel}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                <Square className="w-4 h-4" />
                취소
              </button>
            )}

            {(executionState.isCompleted || executionState.isCancelled) && (
              <button
                onClick={executionActions.reset}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted"
              >
                <RotateCcw className="w-4 h-4" />
                다시 시작
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkflowExecutionPanel;
