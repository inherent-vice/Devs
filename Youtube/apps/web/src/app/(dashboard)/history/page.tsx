"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Search,
  History,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  FlaskConical,
  Clapperboard,
  Award,
  Trash2,
  Download,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useHistoryStore, type GenerationLog } from "@/lib/store";
import { formatDistanceToNow, formatDuration, formatCurrency } from "@/lib/utils";

// Phase configuration
const phaseConfig = {
  research: {
    label: "리서치",
    icon: FlaskConical,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  production: {
    label: "프로덕션",
    icon: Clapperboard,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  quality: {
    label: "품질 평가",
    icon: Award,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  complete: {
    label: "완료",
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  error: {
    label: "오류",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

export default function HistoryPage() {
  const { logs, addLog, clearLogs } = useHistoryStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [clearDialogOpen, setClearDialogOpen] = useState(false);


  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPhase = phaseFilter === "all" || log.phase === phaseFilter;
    return matchesSearch && matchesPhase;
  });

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = new Date(log.timestamp).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, GenerationLog[]>);

  const toggleExpand = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const handleClearLogs = () => {
    clearLogs();
    toast.success("모든 로그가 삭제되었습니다");
    setClearDialogOpen(false);
  };

  const exportLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `youtube-ai-logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("로그가 내보내졌습니다");
  };

  // Stats
  const stats = {
    total: logs.length,
    completed: logs.filter((l) => l.phase === "complete").length,
    errors: logs.filter((l) => l.phase === "error").length,
    totalCost: logs.reduce((sum, l) => sum + (l.cost || 0), 0),
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            히스토리
          </h1>
          <p className="text-muted-foreground">영상 생성 작업 이력을 확인합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
          <Button variant="outline" onClick={() => setClearDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            전체 삭제
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">완료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.errors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 비용</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="로그 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="단계" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 단계</SelectItem>
            <SelectItem value="research">리서치</SelectItem>
            <SelectItem value="production">프로덕션</SelectItem>
            <SelectItem value="quality">품질 평가</SelectItem>
            <SelectItem value="complete">완료</SelectItem>
            <SelectItem value="error">오류</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log List */}
      {filteredLogs.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">히스토리가 없습니다</p>
            <p className="text-sm">영상을 생성하면 작업 이력이 여기에 표시됩니다</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2">
                {date}
              </h3>
              <Card>
                <div className="divide-y">
                  {dateLogs.map((log) => {
                    const config = phaseConfig[log.phase];
                    const PhaseIcon = config.icon;
                    const isExpanded = expandedLogs.has(log.id);

                    return (
                      <div key={log.id} className="p-4">
                        <div
                          className="flex items-center gap-4 cursor-pointer"
                          onClick={() => toggleExpand(log.id)}
                        >
                          {/* Phase Icon */}
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <PhaseIcon className={`h-4 w-4 ${config.color}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{log.projectTitle}</span>
                              <Badge variant="outline" className="text-xs">
                                {config.label}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {log.message}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
                            {log.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(log.duration / 1000)}
                              </div>
                            )}
                            {log.cost && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(log.cost)}
                              </div>
                            )}
                            <div className="w-20 text-right">
                              {new Date(log.timestamp).toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && log.details && (
                          <div className="mt-4 ml-12 p-4 bg-muted rounded-lg">
                            <pre className="text-xs overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>히스토리 삭제</DialogTitle>
            <DialogDescription>
              모든 히스토리 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleClearLogs}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
