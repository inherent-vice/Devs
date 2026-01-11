"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Search,
  Save,
  RotateCcw,
  History,
} from "lucide-react";
import { toast } from "sonner";
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

type StatusFilter = "all" | "completed" | "failed" | "paused" | "running";
type VideoTypeFilter = "all" | "shorts" | "medium" | "longform";

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
// Helper Components
// ===========================================

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

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    running: "secondary",
    failed: "destructive",
    paused: "outline",
    pending: "outline",
  };

  const labels: Record<string, string> = {
    completed: "완료",
    running: "실행 중",
    failed: "실패",
    paused: "일시정지",
    pending: "대기 중",
  };

  return (
    <Badge variant={variants[status] || "outline"}>
      {labels[status] || status}
    </Badge>
  );
});

// ===========================================
// Main Component
// ===========================================

interface SessionHistoryModeProps {
  onRerunSession?: (sessionId: string) => void;
  onSaveAsTemplate?: (sessionId: string) => void;
}

export function SessionHistoryMode({ onRerunSession, onSaveAsTemplate }: SessionHistoryModeProps) {
  // State
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<{ phase: string; agentId: string } | null>(null);
  const [agentData, setAgentData] = useState<{
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    execution: AgentExecution | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [videoTypeFilter, setVideoTypeFilter] = useState<VideoTypeFilter>("all");

  // Active tab for detail view
  const [activeTab, setActiveTab] = useState<"overview" | "agents" | "media" | "timeline">("overview");

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
    } catch {
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

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("세션이 삭제되었습니다.");
        loadSessions();
        if (selectedSession === sessionId) {
          setSelectedSession(null);
          setSessionSummary(null);
        }
      } else {
        toast.error(data.error || "세션 삭제에 실패했습니다.");
      }
    } catch {
      toast.error("세션 삭제에 실패했습니다.");
    }
  }, [loadSessions, selectedSession]);

  // Initial load
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load summary when session selected
  useEffect(() => {
    if (selectedSession) {
      loadSessionSummary(selectedSession);
      setExpandedPhases(new Set(PHASES.map((p) => p.id)));
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
    setActiveTab("overview");
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
    setActiveTab("agents");
  }, []);

  // Format functions
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
    return `$${cost.toFixed(2)}`;
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

  const formatFullDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, []);

  // Filtered and sorted sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        // Search filter
        if (searchQuery && !session.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        // Status filter
        if (statusFilter !== "all" && session.status !== statusFilter) {
          return false;
        }
        // Video type filter
        if (videoTypeFilter !== "all" && session.videoType !== videoTypeFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, searchQuery, statusFilter, videoTypeFilter]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-background shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <h2 className="text-lg font-semibold">세션 기록</h2>
            <Badge variant="secondary">{sessions.length}개</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={loadSessions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="세션 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="running">실행 중</SelectItem>
              <SelectItem value="paused">일시정지</SelectItem>
              <SelectItem value="failed">실패</SelectItem>
            </SelectContent>
          </Select>
          <Select value={videoTypeFilter} onValueChange={(v) => setVideoTypeFilter(v as VideoTypeFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="영상 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 유형</SelectItem>
              <SelectItem value="shorts">Shorts</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="longform">Longform</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sessions List */}
        <div className="w-80 border-r flex flex-col shrink-0">
          <ScrollArea className="flex-1">
            {error && (
              <div className="p-4 text-sm text-red-500">{error}</div>
            )}

            {filteredSessions.length === 0 && !loading && !error && (
              <div className="p-8 text-center text-muted-foreground">
                <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>저장된 세션이 없습니다.</p>
              </div>
            )}

            <div className="p-2 space-y-1">
              {filteredSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-colors
                    ${selectedSession === session.sessionId
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted"
                    }
                  `}
                  onClick={() => handleSelectSession(session.sessionId)}
                >
                  <div className="flex items-start gap-2">
                    <StatusIcon status={session.status} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{session.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {session.videoType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(session.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {session.totalCost && (
                          <span>${session.totalCost.toFixed(2)}</span>
                        )}
                        <span>{session.completedAgents?.length || 0}개 에이전트</span>
                      </div>
                    </div>
                  </div>

                  {session.status === "paused" && onRerunSession && (
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRerunSession(session.sessionId);
                      }}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      이어서 실행
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Session Detail */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedSession && sessionSummary ? (
            <>
              {/* Session Header */}
              <div className="p-4 border-b bg-muted/30 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-lg">{sessionSummary.metadata.name}</h2>
                      <StatusBadge status={sessionSummary.metadata.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatFullDate(sessionSummary.metadata.createdAt)}
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
                    {onRerunSession && (
                      <Button variant="outline" size="sm" onClick={() => onRerunSession(selectedSession)}>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        재실행
                      </Button>
                    )}
                    {onSaveAsTemplate && (
                      <Button variant="outline" size="sm" onClick={() => onSaveAsTemplate(selectedSession)}>
                        <Save className="w-4 h-4 mr-1" />
                        템플릿 저장
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      내보내기
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>세션 삭제</DialogTitle>
                          <DialogDescription>
                            이 세션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">취소</Button>
                          <Button
                            variant="destructive"
                            onClick={() => deleteSession(selectedSession)}
                          >
                            삭제
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-4 mt-2 shrink-0">
                  <TabsTrigger value="overview">개요</TabsTrigger>
                  <TabsTrigger value="agents">에이전트</TabsTrigger>
                  <TabsTrigger value="media">미디어</TabsTrigger>
                  <TabsTrigger value="timeline">타임라인</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="flex-1 m-0 p-4 overflow-auto">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Phase Summary Cards */}
                    {PHASES.map((phase) => {
                      const phaseData = sessionSummary.phases[phase.id];
                      return (
                        <Card key={phase.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{phase.name}</CardTitle>
                              {phaseData && <StatusBadge status={phaseData.status} />}
                            </div>
                          </CardHeader>
                          <CardContent>
                            {phaseData ? (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">시간</span>
                                  <span>{formatDuration(phaseData.duration)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">비용</span>
                                  <span>{formatCost(phaseData.cost)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">에이전트</span>
                                  <span>
                                    {Object.values(phaseData.agents).filter((a) => a.status === "completed").length}
                                    /
                                    {phase.agents.length}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">실행되지 않음</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Error Display */}
                  {sessionSummary.metadata.error && (
                    <Card className="mt-4 border-red-200 dark:border-red-900">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-red-500">오류</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {sessionSummary.metadata.error}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Agents Tab */}
                <TabsContent value="agents" className="flex-1 m-0 overflow-hidden">
                  <div className="h-full flex">
                    {/* Phase/Agent Tree */}
                    <div className="w-64 border-r overflow-auto">
                      <div className="p-2 space-y-1">
                        {PHASES.map((phase) => {
                          const phaseData = sessionSummary.phases[phase.id];
                          const isExpanded = expandedPhases.has(phase.id);

                          return (
                            <div key={phase.id}>
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
                                {phaseData && <StatusIcon status={phaseData.status} />}
                              </div>

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

                    {/* Agent Detail */}
                    <div className="flex-1 overflow-auto">
                      {selectedAgent && agentData ? (
                        <div className="p-4 space-y-4">
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

                          {agentData.input && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                입력 (Input)
                              </h4>
                              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                                {JSON.stringify(agentData.input, null, 2)}
                              </pre>
                            </div>
                          )}

                          {agentData.output && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <FileJson className="w-4 h-4" />
                                출력 (Output)
                              </h4>
                              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                                {JSON.stringify(agentData.output, null, 2)}
                              </pre>
                            </div>
                          )}

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
                </TabsContent>

                {/* Media Tab */}
                <TabsContent value="media" className="flex-1 m-0 p-4 overflow-auto">
                  <div className="grid grid-cols-4 gap-4">
                    {PHASES.flatMap((phase) => {
                      const phaseData = sessionSummary.phases[phase.id];
                      if (!phaseData) return [];

                      return phase.agents
                        .filter((agent) => {
                          const agentSummary = phaseData.agents[agent.id];
                          return agentSummary && agentSummary.mediaCount > 0;
                        })
                        .map((agent) => (
                          <Card
                            key={`${phase.id}-${agent.id}`}
                            className="cursor-pointer hover:border-primary"
                            onClick={() => handleSelectAgent(phase.id, agent.id)}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">{agent.name}</CardTitle>
                              <CardDescription>{phase.name}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="aspect-video bg-muted rounded flex items-center justify-center">
                                {agent.id === "voice" ? (
                                  <Music className="w-8 h-8 text-muted-foreground" />
                                ) : agent.id === "video" || agent.id === "editor" ? (
                                  <Video className="w-8 h-8 text-muted-foreground" />
                                ) : (
                                  <Image className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 text-center">
                                {phaseData.agents[agent.id]?.mediaCount || 0}개 파일
                              </p>
                            </CardContent>
                          </Card>
                        ));
                    })}
                  </div>

                  {PHASES.every((phase) => {
                    const phaseData = sessionSummary.phases[phase.id];
                    if (!phaseData) return true;
                    return phase.agents.every((agent) => {
                      const agentSummary = phaseData.agents[agent.id];
                      return !agentSummary || agentSummary.mediaCount === 0;
                    });
                  }) && (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>생성된 미디어 파일이 없습니다</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="flex-1 m-0 p-4 overflow-auto">
                  <div className="space-y-2">
                    {sessionSummary.timeline && sessionSummary.timeline.length > 0 ? (
                      sessionSummary.timeline.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2 hover:bg-muted rounded">
                          <div className="w-1 h-full bg-primary/30 rounded" />
                          <div className="flex-1">
                            <p className="text-sm">{event.event}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFullDate(event.timestamp)}
                              {event.phase && ` · ${event.phase}`}
                              {event.agent && ` · ${event.agent}`}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>타임라인 이벤트가 없습니다</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
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
    </div>
  );
}
