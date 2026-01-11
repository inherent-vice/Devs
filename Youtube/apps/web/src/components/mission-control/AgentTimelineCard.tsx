"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  PauseCircle,
  Circle,
  Clock,
  DollarSign,
  Edit2,
  RotateCcw,
  SkipForward,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowPhase } from "@/lib/workflow/types";

type AgentStatus = "pending" | "running" | "completed" | "error" | "paused";

interface AgentTimelineCardProps {
  agentId: string;
  agentName: string;
  phase: WorkflowPhase;
  status: AgentStatus;
  input?: unknown;
  output?: unknown;
  logs?: string[];
  duration?: number;
  cost?: number;
  isExpanded: boolean;
  isEditable: boolean;
  onToggle: () => void;
  onModifyOutput?: (output: unknown) => void;
  onRerun?: (input?: unknown) => void;
  onSkip?: () => void;
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const config = {
    pending: { label: "대기중", variant: "secondary" as const, icon: Circle },
    running: { label: "실행중", variant: "default" as const, icon: Loader2 },
    completed: { label: "완료", variant: "default" as const, icon: CheckCircle2 },
    error: { label: "오류", variant: "destructive" as const, icon: AlertCircle },
    paused: { label: "일시정지", variant: "secondary" as const, icon: PauseCircle },
  };

  const { label, variant, icon: Icon } = config[status];

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {label}
    </Badge>
  );
}

function JsonViewer({ data, title }: { data: unknown; title: string }) {
  if (!data) {
    return (
      <div className="text-sm text-muted-foreground italic">
        데이터 없음
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[200px] whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function LogViewer({ logs }: { logs: string[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        로그 없음
      </div>
    );
  }

  return (
    <div className="space-y-1 font-mono text-xs">
      {logs.map((log, idx) => (
        <div key={idx} className="text-muted-foreground">
          {log}
        </div>
      ))}
    </div>
  );
}

export function AgentTimelineCard({
  agentId,
  agentName,
  phase,
  status,
  input,
  output,
  logs = [],
  duration = 0,
  cost = 0,
  isExpanded,
  isEditable,
  onToggle,
  onModifyOutput,
  onRerun,
  onSkip,
}: AgentTimelineCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedOutput, setEditedOutput] = useState("");

  const handleStartEdit = () => {
    setEditedOutput(JSON.stringify(output, null, 2));
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(editedOutput);
      onModifyOutput?.(parsed);
      setIsEditing(false);
    } catch {
      // Invalid JSON - could show toast
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedOutput("");
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className={cn(
      "transition-all",
      status === "running" && "ring-2 ring-primary",
      status === "error" && "ring-2 ring-destructive"
    )}>
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{agentName}</span>
          <StatusBadge status={status} />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {(status === "completed" || status === "running") && (
            <>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${cost.toFixed(4)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(duration)}
              </div>
            </>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          <Tabs defaultValue="output" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="input">입력</TabsTrigger>
              <TabsTrigger value="output">출력</TabsTrigger>
              <TabsTrigger value="logs">로그 ({logs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="mt-3">
              <JsonViewer data={input} title="입력 데이터" />
            </TabsContent>

            <TabsContent value="output" className="mt-3 space-y-3">
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedOutput}
                    onChange={(e) => setEditedOutput(e.target.value)}
                    className="font-mono text-xs min-h-[200px]"
                    placeholder="JSON 형식으로 출력을 수정하세요"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                      <Save className="h-3 w-3" />
                      저장
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1">
                      <X className="h-3 w-3" />
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <JsonViewer data={output} title="출력 데이터" />

                  {/* Action Buttons */}
                  {isEditable && status !== "pending" && (
                    <div className="flex gap-2 pt-2 border-t">
                      {onModifyOutput && (
                        <Button size="sm" variant="outline" onClick={handleStartEdit} className="gap-1">
                          <Edit2 className="h-3 w-3" />
                          수정
                        </Button>
                      )}
                      {onRerun && (
                        <Button size="sm" variant="outline" onClick={() => onRerun()} className="gap-1">
                          <RotateCcw className="h-3 w-3" />
                          재실행
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Skip button for pending agents */}
                  {status === "pending" && onSkip && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="ghost" onClick={onSkip} className="gap-1 text-muted-foreground">
                        <SkipForward className="h-3 w-3" />
                        건너뛰기
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="logs" className="mt-3">
              <div className="bg-muted p-3 rounded-md max-h-[200px] overflow-auto">
                <LogViewer logs={logs} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
