"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Video,
  Clock,
  DollarSign,
  Trash2,
  Edit,
  Copy,
  Play,
  Download,
  ExternalLink,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { useProjectStore, type Project } from "@/lib/store";
import { formatDistanceToNow } from "@/lib/utils";

// Status badge configuration
const statusConfig = {
  draft: { label: "초안", variant: "outline" as const, icon: FileText },
  processing: { label: "생성 중", variant: "secondary" as const, icon: Loader2 },
  completed: { label: "완료", variant: "default" as const, icon: CheckCircle2 },
  failed: { label: "실패", variant: "destructive" as const, icon: XCircle },
};

const videoTypeLabels = {
  shorts: "Shorts",
  medium: "중간 길이",
  longform: "긴 영상",
};

export default function ProjectsPage() {
  const { projects, addProject, deleteProject, setLoading } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);


  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.config.topic.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesType = typeFilter === "all" || project.videoType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDelete = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id);
      toast.success(`"${projectToDelete.title}" 프로젝트가 삭제되었습니다`);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleDuplicate = (project: Project) => {
    const newProject: Project = {
      ...project,
      id: `proj-${Date.now()}`,
      title: `${project.title} (복사본)`,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: undefined,
      progress: undefined,
    };
    addProject(newProject);
    toast.success("프로젝트가 복제되었습니다");
  };

  // Stats
  const stats = {
    total: projects.length,
    completed: projects.filter((p) => p.status === "completed").length,
    processing: projects.filter((p) => p.status === "processing").length,
    draft: projects.filter((p) => p.status === "draft").length,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8" />
            프로젝트
          </h1>
          <p className="text-muted-foreground">모든 영상 프로젝트를 관리합니다</p>
        </div>
        <Link href="/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            새 프로젝트
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">생성 중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">초안</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="draft">초안</SelectItem>
            <SelectItem value="processing">생성 중</SelectItem>
            <SelectItem value="completed">완료</SelectItem>
            <SelectItem value="failed">실패</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 유형</SelectItem>
            <SelectItem value="shorts">Shorts</SelectItem>
            <SelectItem value="medium">중간 길이</SelectItem>
            <SelectItem value="longform">긴 영상</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Project List */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">프로젝트가 없습니다</p>
            <p className="text-sm">새 프로젝트를 만들어 시작하세요</p>
            <Link href="/create">
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                새 프로젝트 만들기
              </Button>
            </Link>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const StatusIcon = statusConfig[project.status].icon;
            return (
              <Card key={project.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{project.title}</CardTitle>
                      <CardDescription className="truncate">
                        {project.config.topic}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/editor/${project.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            편집
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(project)}>
                          <Copy className="h-4 w-4 mr-2" />
                          복제
                        </DropdownMenuItem>
                        {project.result?.videoUrl && (
                          <>
                            <DropdownMenuItem>
                              <Play className="h-4 w-4 mr-2" />
                              재생
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              다운로드
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(project)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Thumbnail or Placeholder */}
                  <div className="aspect-video bg-accent rounded-lg flex items-center justify-center overflow-hidden">
                    {project.result?.thumbnails?.[0] ? (
                      <img
                        src={project.result.thumbnails[0]}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video className="h-8 w-8 text-muted-foreground opacity-50" />
                    )}
                  </div>

                  {/* Progress for processing */}
                  {project.status === "processing" && project.progress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>{project.progress.message}</span>
                        <span>{project.progress.percentage}%</span>
                      </div>
                      <Progress value={project.progress.percentage} className="h-1" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig[project.status].variant}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${project.status === "processing" ? "animate-spin" : ""}`} />
                        {statusConfig[project.status].label}
                      </Badge>
                      <Badge variant="outline">{videoTypeLabels[project.videoType]}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(project.updatedAt)}
                    </div>
                    {project.result?.cost && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${project.result.cost.toFixed(2)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filteredProjects.map((project) => {
              const StatusIcon = statusConfig[project.status].icon;
              return (
                <div
                  key={project.id}
                  className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-14 bg-accent rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                    {project.result?.thumbnails?.[0] ? (
                      <img
                        src={project.result.thumbnails[0]}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video className="h-5 w-5 text-muted-foreground opacity-50" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.title}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {project.config.topic}
                    </div>
                  </div>

                  {/* Status */}
                  <Badge variant={statusConfig[project.status].variant} className="flex-shrink-0">
                    <StatusIcon className={`h-3 w-3 mr-1 ${project.status === "processing" ? "animate-spin" : ""}`} />
                    {statusConfig[project.status].label}
                  </Badge>

                  {/* Type */}
                  <Badge variant="outline" className="flex-shrink-0">
                    {videoTypeLabels[project.videoType]}
                  </Badge>

                  {/* Date */}
                  <div className="text-sm text-muted-foreground flex-shrink-0 w-24">
                    {formatDistanceToNow(project.updatedAt)}
                  </div>

                  {/* Cost */}
                  <div className="text-sm flex-shrink-0 w-16 text-right">
                    {project.result?.cost ? `$${project.result.cost.toFixed(2)}` : "-"}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/editor/${project.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          편집
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(project)}>
                        <Copy className="h-4 w-4 mr-2" />
                        복제
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(project)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로젝트 삭제</DialogTitle>
            <DialogDescription>
              "{projectToDelete?.title}" 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
