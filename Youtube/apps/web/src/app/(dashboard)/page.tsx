"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Video,
  Clock,
  DollarSign,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Loader2,
  XCircle,
  FileText,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useProjectStore, useBillingStore, type Project } from "@/lib/store";
import { formatDistanceToNow, formatCurrency, formatDuration } from "@/lib/utils";

const statusConfig = {
  draft: { label: "초안", icon: FileText, color: "text-gray-500" },
  processing: { label: "생성 중", icon: Loader2, color: "text-blue-500" },
  completed: { label: "완료", icon: CheckCircle2, color: "text-green-500" },
  failed: { label: "실패", icon: XCircle, color: "text-red-500" },
};

const templates = [
  { id: "shorts", label: "YouTube Shorts", duration: "60초", description: "세로 9:16", href: "/create?template=shorts" },
  { id: "explainer", label: "설명 영상", duration: "5분", description: "가로 16:9", href: "/create?template=explainer" },
  { id: "news", label: "뉴스 스타일", duration: "10분", description: "가로 16:9", href: "/create?template=news" },
  { id: "tutorial", label: "튜토리얼", duration: "15분", description: "가로 16:9", href: "/create?template=tutorial" },
];

export default function DashboardPage() {
  const { projects, addProject } = useProjectStore();
  const { getMonthlyTotal, monthlyBudget } = useBillingStore();

  // Load existing sessions from backend on first render
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await fetch("/api/sessions");
        const data = await response.json();

        if (data.success && data.sessions) {
          // Only add sessions that don't already exist
          const existingIds = new Set(projects.map((p) => p.id));
          data.sessions.forEach((session: any) => {
            if (!existingIds.has(session.id)) {
              addProject(session);
            }
          });
        }
      } catch (error) {
        console.error("Failed to load sessions:", error);
      }
    };

    loadSessions();
  }, []);

  // Calculate stats
  const totalVideos = projects.filter((p) => p.status === "completed").length;
  const processingCount = projects.filter((p) => p.status === "processing").length;
  const monthlyTotal = getMonthlyTotal();
  const budgetUsage = (monthlyTotal / monthlyBudget) * 100;

  const avgDuration = projects
    .filter((p) => p.result?.duration)
    .reduce((sum, p, _, arr) => sum + (p.result?.duration || 0) / arr.length, 0);

  const recentProjects = projects.slice(0, 5);

  const stats = [
    {
      name: "완료된 영상",
      value: totalVideos.toString(),
      icon: Video,
      change: `+${projects.filter((p) => {
        const date = new Date(p.createdAt);
        const now = new Date();
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 30 && p.status === "completed";
      }).length}`,
      description: "이번 달",
    },
    {
      name: "이번 달 비용",
      value: formatCurrency(monthlyTotal),
      icon: DollarSign,
      change: `${budgetUsage.toFixed(0)}%`,
      description: `예산 ${formatCurrency(monthlyBudget)} 중`,
      alert: budgetUsage > 80,
    },
    {
      name: "평균 생성 시간",
      value: avgDuration > 0 ? formatDuration(avgDuration) : "-",
      icon: Clock,
      change: "-",
      description: "영상 길이",
    },
    {
      name: "진행 중",
      value: processingCount.toString(),
      icon: Loader2,
      change: "",
      description: "생성 중인 영상",
      animate: processingCount > 0,
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">대시보드</h1>
          <p className="text-muted-foreground">AI로 YouTube 영상을 만들어보세요</p>
        </div>
        <Link href="/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            새 영상 만들기
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className={stat.alert ? "border-yellow-500" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.animate ? "animate-spin" : ""}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change && (
                  <span className={stat.alert ? "text-yellow-500" : stat.change.startsWith("+") ? "text-green-500" : ""}>
                    {stat.change}
                  </span>
                )}
                {stat.change && " "}
                {stat.description}
              </p>
              {stat.alert && (
                <Progress value={budgetUsage} className="mt-2 h-1 [&>div]:bg-yellow-500" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent Projects */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              빠른 시작
            </CardTitle>
            <CardDescription>템플릿으로 빠르게 시작하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.map((template) => (
              <Link key={template.id} href={template.href} className="block">
                <Button variant="outline" className="w-full justify-between group">
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">{template.duration}</Badge>
                    {template.label}
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>최근 프로젝트</CardTitle>
              <CardDescription>최근 작업한 영상들</CardDescription>
            </div>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                모두 보기
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>아직 프로젝트가 없습니다</p>
                <Link href="/create">
                  <Button className="mt-4" variant="outline">
                    첫 영상 만들기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProjects.map((project) => {
                  const StatusIcon = statusConfig[project.status].icon;
                  return (
                    <Link
                      key={project.id}
                      href={`/editor/${project.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-16 rounded-lg bg-accent flex items-center justify-center overflow-hidden">
                          {project.result?.thumbnails?.[0] ? (
                            <img
                              src={project.result.thumbnails[0]}
                              alt={project.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Video className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{project.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(project.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {project.result?.cost && (
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(project.result.cost)}
                          </span>
                        )}
                        <Badge
                          variant={
                            project.status === "completed"
                              ? "default"
                              : project.status === "processing"
                              ? "secondary"
                              : project.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                          className="flex items-center gap-1"
                        >
                          <StatusIcon className={`h-3 w-3 ${project.status === "processing" ? "animate-spin" : ""}`} />
                          {statusConfig[project.status].label}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="flex items-center gap-6 py-6">
          <div className="p-3 rounded-full bg-primary/10">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Pro 팁: Fast 모드로 비용 절감</h3>
            <p className="text-sm text-muted-foreground">
              Gemini 3 Flash 모델을 사용하면 비용을 최대 62% 절감할 수 있습니다.
              품질과 속도의 균형이 필요한 경우 추천합니다.
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline">설정에서 변경</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
