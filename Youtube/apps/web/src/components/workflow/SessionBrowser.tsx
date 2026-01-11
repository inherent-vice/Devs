/**
 * Session Browser Component
 *
 * Displays all workflow sessions with detailed views:
 * - Session list with status and metadata
 * - Per-agent input/output/logs viewer
 * - Media file browser
 * - Session timeline visualization
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  FileJson,
  Image,
  Video,
  Music,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Loader2,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  Play,
} from "lucide-react";
import type { WorkflowPhase } from "@/lib/workflow/types";

// ===========================================
// Types
// ===========================================

interface SessionMetadata {
  sessionId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  videoType: string;
  totalDuration?: number;
  totalCost?: number;
  currentPhase?: string;
  currentAgent?: string;
  completedAgents: string[];
  error?: string;
}

interface AgentExecution {
  agentId: string;
  phase: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  cost?: number;
  error?: string;
  inputFile: string;
  outputFile: string;
  mediaFiles: string[];
}

interface SessionSummary {
  sessionId: string;
  metadata: SessionMetadata;
  phases: Record<string, {
    status: string;
    duration: number;
    cost: number;
    agents: Record<string, {
      status: string;
      duration: number;
      cost: number;
      hasOutput: boolean;
      mediaCount: number;
    }>;
  }>;
  timeline: Array<{
    timestamp: string;
    event: string;
    agent?: string;
    phase?: string;
  }>;
}

// ===========================================
// Phase/Agent Definitions
// ===========================================

const PHASES: { id: WorkflowPhase; name: string; agents: { id: string; name: string }[] }[] = [
  {
    id: "research",
    name: "리서치",
    agents: [
      { id: "trend", name: "트렌드 분석" },
      { id: "topic", name: "주제 선정" },
      { id: "script", name: "스크립트 작성" },
    ],
  },
  {
    id: "production",
    name: "프로덕션",
    agents: [
      { id: "voice", name: "음성 생성" },
      { id: "video", name: "영상 생성" },
      { id: "thumbnail", name: "썸네일 생성" },
      { id: "editor", name: "영상 편집" },
    ],
  },
  {
    id: "quality",
    name: "품질 검증",
    agents: [
      { id: "critic", name: "품질 평가" },
      { id: "artEvaluator", name: "예술성 평가" },
      { id: "revision", name: "수정 제안" },
    ],
  },
  {
    id: "publishing",
    name: "게시",
    agents: [{ id: "publisher", name: "게시 준비" }],
  },
];

// ===========================================
// Memoized Sub-Components
// ===========================================

/**
 * Status icon with memoization
 */
const StatusIcon = memo(function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "running":
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "paused":
      return <Pause className="w-4 h-4 text-yellow-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
});

/**
 * Session list item with memoization
 */
const SessionItem = memo(function SessionItem({
  session,
  isSelected,
  onSelect,
  onResume,
  formatDate,
}: {
  session: SessionMetadata;
  isSelected: boolean;
  onSelect: (sessionId: string) => void;
  onResume?: (sessionId: string) => void;
  formatDate: (dateStr: string) => string;
}) {
  const handleClick = useCallback(() => {
    onSelect(session.sessionId);
  }, [session.sessionId, onSelect]);

  const handleResume = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onResume?.(session.sessionId);
  }, [session.sessionId, onResume]);

  return (
    <div
      className={`
        p-3 rounded-lg cursor-pointer transition-colors
        ${isSelected
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted"
        }
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-selected={isSelected}
      aria-label={`세션: ${session.name}`}
    >
      <div className="flex items-start gap-2">
        <StatusIcon status={session.status} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{session.name}</h4>
          <p className="text-xs text-muted-foreground">
            {session.videoType} · {formatDate(session.createdAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.completedAgents?.length || 0}개 에이전트 완료
          </p>
        </div>
      </div>

      {session.status === "paused" && onResume && (
        <button
          onClick={handleResume}
          className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          aria-label="이어서 실행"
        >
          <Play className="w-3 h-3" aria-hidden="true" />
          이어서 실행
        </button>
      )}
    </div>
  );
});

// ===========================================
// Main Component
// ===========================================

interface SessionBrowserProps {
  onSelectSession?: (sessionId: string) => void;
  onResumeSession?: (sessionId: string) => void;
}

export const SessionBrowser = memo(function SessionBrowser({ onSelectSession, onResumeSession }: SessionBrowserProps) {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<{ phase: string; agentId: string } | null>(null);
  const [agentData, setAgentData] = useState<{ input: Record<string, unknown> | null; output: Record<string, unknown> | null; execution: AgentExecution | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sessions list
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions?source=workflow");
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions);
      } else {
        setError(data.error || "세션 목록을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      setError("세션 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load session summary
  const loadSessionSummary = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/_data/summary`);
      const data = await response.json();

      if (data.success) {
        setSessionSummary(data.data);
      }
    } catch (err) {
      console.error("Failed to load session summary:", err);
    }
  }, []);

  // Load agent data
  const loadAgentData = useCallback(async (sessionId: string, phase: string, agentId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/_data/agent/${phase}/${agentId}`);
      const data = await response.json();

      if (data.success) {
        setAgentData(data.data);
      }
    } catch (err) {
      console.error("Failed to load agent data:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load summary when session selected
  useEffect(() => {
    if (selectedSession) {
      loadSessionSummary(selectedSession);
    }
  }, [selectedSession, loadSessionSummary]);

  // Load agent data when agent selected
  useEffect(() => {
    if (selectedSession && selectedAgent) {
      loadAgentData(selectedSession, selectedAgent.phase, selectedAgent.agentId);
    }
  }, [selectedSession, selectedAgent, loadAgentData]);

  // Handle session selection
  const handleSelectSession = (sessionId: string) => {
    setSelectedSession(sessionId);
    setSelectedAgent(null);
    setAgentData(null);
    onSelectSession?.(sessionId);
  };

  // Toggle phase expansion
  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  // Handle agent selection
  const handleSelectAgent = useCallback((phase: string, agentId: string) => {
    setSelectedAgent({ phase, agentId });
  }, []);

  // Memoized format functions
  const formatDuration = useCallback((ms?: number) => {
    if (!ms) return "-";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}분 ${seconds % 60}초`;
    }
    return `${seconds}초`;
  }, []);

  const formatCost = useCallback((cost?: number) => {
    if (!cost) return "-";
    return `$${cost.toFixed(4)}`;
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Memoized sorted sessions
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [sessions]);

  return (
    <div className="h-full flex">
      {/* Sessions List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">세션 목록</h3>
            <button
              onClick={loadSessions}
              className="p-1.5 rounded hover:bg-muted"
              title="새로고침"
              aria-label="세션 목록 새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {sessions.length}개의 세션
          </p>
        </div>

        <div className="flex-1 overflow-auto">
          {error && (
            <div className="p-4 text-sm text-red-500">{error}</div>
          )}

          {sessions.length === 0 && !loading && !error && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              저장된 세션이 없습니다.
            </div>
          )}

          <div className="p-2 space-y-1">
            {sortedSessions.map((session) => (
              <SessionItem
                key={session.sessionId}
                session={session}
                isSelected={selectedSession === session.sessionId}
                onSelect={handleSelectSession}
                onResume={onResumeSession}
                formatDate={formatDate}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Session Detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedSession && sessionSummary ? (
          <>
            {/* Session Header */}
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{sessionSummary.metadata.name}</h2>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(sessionSummary.metadata.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(sessionSummary.metadata.totalDuration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatCost(sessionSummary.metadata.totalCost)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 rounded hover:bg-muted"
                    title="다운로드"
                    aria-label="세션 다운로드"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    className="p-2 rounded hover:bg-muted text-red-500"
                    title="삭제"
                    aria-label="세션 삭제"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* Phase Tree */}
            <div className="flex-1 flex min-h-0">
              {/* Left: Phase/Agent Tree */}
              <div className="w-72 border-r overflow-auto">
                <div className="p-2 space-y-1">
                  {PHASES.map((phase) => {
                    const phaseData = sessionSummary.phases[phase.id];
                    const isExpanded = expandedPhases.has(phase.id);

                    return (
                      <div key={phase.id}>
                        {/* Phase Header */}
                        <div
                          className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted"
                          onClick={() => togglePhase(phase.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          {isExpanded ? (
                            <FolderOpen className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Folder className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="flex-1 font-medium text-sm">{phase.name}</span>
                          {phaseData && (
                            <StatusIcon status={phaseData.status} />
                          )}
                        </div>

                        {/* Agent List */}
                        {isExpanded && (
                          <div className="ml-6 space-y-0.5">
                            {phase.agents.map((agent) => {
                              const agentSummary = phaseData?.agents[agent.id];
                              const isSelected =
                                selectedAgent?.phase === phase.id &&
                                selectedAgent?.agentId === agent.id;

                              return (
                                <div
                                  key={agent.id}
                                  className={`
                                    flex items-center gap-2 p-2 rounded cursor-pointer
                                    ${isSelected ? "bg-primary/10" : "hover:bg-muted"}
                                  `}
                                  onClick={() => handleSelectAgent(phase.id, agent.id)}
                                >
                                  <FileJson className="w-4 h-4 text-blue-500" />
                                  <span className="flex-1 text-sm">{agent.name}</span>
                                  {agentSummary && (
                                    <>
                                      <StatusIcon status={agentSummary.status} />
                                      {agentSummary.mediaCount > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          {agentSummary.mediaCount}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Agent Detail */}
              <div className="flex-1 overflow-auto">
                {selectedAgent && agentData ? (
                  <div className="p-4 space-y-4">
                    {/* Agent Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {PHASES.find((p) => p.id === selectedAgent.phase)
                          ?.agents.find((a) => a.id === selectedAgent.agentId)?.name}
                      </h3>
                      {agentData.execution && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatDuration(agentData.execution.duration)}</span>
                          <span>{formatCost(agentData.execution.cost)}</span>
                        </div>
                      )}
                    </div>

                    {/* Input */}
                    {agentData.input && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          입력 (Input)
                        </h4>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                          {(() => {
                            try {
                              return JSON.stringify(agentData.input, null, 2);
                            } catch {
                              return String(agentData.input);
                            }
                          })()}
                        </pre>
                      </div>
                    )}

                    {/* Output */}
                    {agentData.output && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <FileJson className="w-4 h-4" />
                          출력 (Output)
                        </h4>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                          {(() => {
                            try {
                              return JSON.stringify(agentData.output, null, 2);
                            } catch {
                              return String(agentData.output);
                            }
                          })()}
                        </pre>
                      </div>
                    )}

                    {/* Media Files */}
                    {agentData.execution?.mediaFiles && agentData.execution.mediaFiles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          미디어 파일
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {agentData.execution.mediaFiles.map((file, idx) => {
                            const isImage = file.match(/\.(png|jpg|jpeg|gif)$/i);
                            const isVideo = file.match(/\.(mp4|webm)$/i);
                            const isAudio = file.match(/\.(mp3|wav|ogg)$/i);
                            const fileUrl = `/api/sessions/${selectedSession}/${file}`;

                            return (
                              <div
                                key={idx}
                                className="aspect-video bg-muted rounded flex items-center justify-center overflow-hidden"
                              >
                                {isImage && (
                                  <img src={fileUrl} alt={file} className="w-full h-full object-cover" />
                                )}
                                {isVideo && (
                                  <video src={fileUrl} controls className="w-full h-full" />
                                )}
                                {isAudio && (
                                  <audio src={fileUrl} controls className="w-full" />
                                )}
                                {!isImage && !isVideo && !isAudio && (
                                  <FileText className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {agentData.execution?.error && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-red-500">오류</h4>
                        <p className="text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded">
                          {agentData.execution.error}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>에이전트를 선택하여 상세 정보를 확인하세요</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>세션을 선택하여 상세 정보를 확인하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default SessionBrowser;

