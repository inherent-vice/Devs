/**
 * Agent Detail Panel
 *
 * Shows detailed input/output for each agent in the workflow.
 * Features:
 * - Collapsible input/output views
 * - JSON editor for output modification
 * - Re-run button
 * - Status indicator
 * - Log display
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Edit2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { AgentStatus } from "@/lib/workflow/types";
import type { AgentExecutionResult, LogEntry } from "@/lib/workflow/executor";

// Agent metadata for display
const AGENT_META: Record<string, { name: string; icon: string; description: string }> = {
  trend: { name: "트렌드 분석", icon: "TrendingUp", description: "트렌드 데이터를 수집하고 분석합니다" },
  topic: { name: "주제 선정", icon: "Lightbulb", description: "최적의 주제를 선정합니다" },
  script: { name: "스크립트 작성", icon: "FileText", description: "영상 스크립트를 작성합니다" },
  voice: { name: "음성 생성", icon: "Mic", description: "내레이션 음성을 생성합니다" },
  video: { name: "영상 생성", icon: "Video", description: "영상 클립을 생성합니다" },
  thumbnail: { name: "썸네일 생성", icon: "Image", description: "썸네일 이미지를 생성합니다" },
  editor: { name: "영상 편집", icon: "Scissors", description: "최종 영상을 편집합니다" },
  critic: { name: "품질 평가", icon: "Star", description: "콘텐츠 품질을 평가합니다" },
  artEvaluator: { name: "예술성 평가", icon: "Palette", description: "시각적 품질을 평가합니다" },
  revision: { name: "수정 제안", icon: "RefreshCw", description: "개선 사항을 적용합니다" },
  publisher: { name: "게시 준비", icon: "Upload", description: "게시 메타데이터를 생성합니다" },
};

interface AgentDetailPanelProps {
  agentId: string;
  status: AgentStatus;
  result?: AgentExecutionResult;
  logs?: LogEntry[];
  isExpanded?: boolean;
  isEditable?: boolean;
  onToggleExpand?: () => void;
  onModify?: (output: unknown) => void;
  onRerun?: (input?: unknown) => void;
}

export function AgentDetailPanel({
  agentId,
  status,
  result,
  logs = [],
  isExpanded = false,
  isEditable = false,
  onToggleExpand,
  onModify,
  onRerun,
}: AgentDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedOutput, setEditedOutput] = useState<string>("");
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  const meta = AGENT_META[agentId] || { name: agentId, icon: "Box", description: "" };

  // Format output for editing
  const formattedOutput = useMemo((): string => {
    if (!result?.output) return "";
    try {
      return JSON.stringify(result.output, null, 2);
    } catch {
      return String(result.output);
    }
  }, [result?.output]);

  // Format input for display
  const formattedInput = useMemo((): string => {
    if (!result?.input) return "";
    try {
      return JSON.stringify(result.input, null, 2);
    } catch {
      return String(result.input);
    }
  }, [result?.input]);

  // Get error message
  const errorMessage: string = result?.error || "";

  // Status icon and color
  const statusConfig = useMemo(() => {
    switch (status) {
      case "completed":
        return { icon: CheckCircle, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" };
      case "running":
        return { icon: Loader2, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", spin: true };
      case "failed":
        return { icon: XCircle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" };
      case "paused":
        return { icon: Pause, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30" };
      case "skipped":
        return { icon: AlertTriangle, color: "text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" };
      default:
        return { icon: Clock, color: "text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" };
    }
  }, [status]);

  const StatusIcon = statusConfig.icon;

  // Handle save edited output
  const handleSave = () => {
    if (!onModify) return;

    try {
      const parsed = JSON.parse(editedOutput);
      onModify(parsed);
      setIsEditing(false);
    } catch {
      alert("Invalid JSON format");
    }
  };

  // Start editing
  const handleStartEdit = () => {
    setEditedOutput(formattedOutput);
    setIsEditing(true);
  };

  // Filter logs for this agent
  const agentLogs = logs.filter((log) => log.agent === agentId);

  return (
    <div className={`border rounded-lg overflow-hidden ${statusConfig.bg}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}

          <StatusIcon className={`w-5 h-5 ${statusConfig.color} ${statusConfig.spin ? "animate-spin" : ""}`} />

          <div>
            <h4 className="font-medium text-sm">{meta.name}</h4>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {result?.duration && (
            <span className="text-xs text-muted-foreground">
              {(result.duration / 1000).toFixed(1)}s
            </span>
          )}
          {result?.cost !== undefined && result.cost > 0 && (
            <span className="text-xs text-muted-foreground">
              ${result.cost.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditable && status === "completed" && !isEditing && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
              >
                <Edit2 className="w-3 h-3" />
                수정
              </button>
            )}

            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                >
                  <Save className="w-3 h-3" />
                  저장
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="w-3 h-3" />
                  취소
                </button>
              </>
            )}

            {onRerun && status === "completed" && (
              <button
                onClick={() => onRerun()}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                <RotateCcw className="w-3 h-3" />
                재실행
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 border-b pb-2">
            <button
              onClick={() => setShowInput(!showInput)}
              className={`text-xs px-2 py-1 rounded ${showInput ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              입력
            </button>
            <button
              onClick={() => setShowOutput(!showOutput)}
              className={`text-xs px-2 py-1 rounded ${showOutput ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              출력
            </button>
            {agentLogs.length > 0 && (
              <button
                onClick={() => setShowLogs(!showLogs)}
                className={`text-xs px-2 py-1 rounded ${showLogs ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                로그 ({agentLogs.length})
              </button>
            )}
          </div>

          {/* Input Section */}
          {showInput && formattedInput && (
            <div className="space-y-1">
              <h5 className="text-xs font-medium text-muted-foreground">입력</h5>
              <pre className="text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-auto max-h-48">
                {formattedInput}
              </pre>
            </div>
          )}

          {/* Output Section */}
          {showOutput && (
            <div className="space-y-1">
              <h5 className="text-xs font-medium text-muted-foreground">출력</h5>
              {isEditing ? (
                <textarea
                  value={editedOutput}
                  onChange={(e) => setEditedOutput(e.target.value)}
                  className="w-full h-64 text-xs font-mono bg-black/5 dark:bg-white/5 p-2 rounded border focus:ring-2 focus:ring-primary"
                />
              ) : result?.output ? (
                <pre className="text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-auto max-h-64">
                  {formattedOutput}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground italic">출력 대기 중...</p>
              )}
            </div>
          )}

          {/* Error Section */}
          {errorMessage && (
            <div className="space-y-1">
              <h5 className="text-xs font-medium text-red-500">오류</h5>
              <p className="text-xs text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Logs Section */}
          {showLogs && agentLogs.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-xs font-medium text-muted-foreground">로그</h5>
              <div className="text-xs bg-black/5 dark:bg-white/5 p-2 rounded max-h-32 overflow-auto space-y-1">
                {agentLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={
                        log.level === "error"
                          ? "text-red-500"
                          : log.level === "warn"
                          ? "text-yellow-500"
                          : "text-foreground"
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AgentDetailPanel;
