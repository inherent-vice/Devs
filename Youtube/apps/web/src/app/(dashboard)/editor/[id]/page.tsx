"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
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
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Upload,
  Share2,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  FileText,
  Image,
  Music,
  Film,
  Clock,
  DollarSign,
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Subtitles,
  Settings,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useProjectStore, type Project } from "@/lib/store";
import { formatDuration, formatDistanceToNow, formatCurrency } from "@/lib/utils";

const statusConfig = {
  draft: { label: "초안", variant: "outline" as const, icon: FileText },
  processing: { label: "생성 중", variant: "secondary" as const, icon: Loader2 },
  completed: { label: "완료", variant: "default" as const, icon: CheckCircle2 },
  failed: { label: "실패", variant: "destructive" as const, icon: XCircle },
};

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { projects, getProjectById, updateProject, deleteProject } = useProjectStore();
  const [project, setProject] = useState<Project | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Load project from store or API
  useEffect(() => {
    const loadProject = async () => {
      // First try to get from store
      let found = getProjectById(projectId);

      // If not found in store, try to fetch from API
      if (!found) {
        try {
          const response = await fetch("/api/sessions");
          const data = await response.json();

          if (data.success && data.sessions) {
            // Find the session matching our ID
            const session = data.sessions.find((s: any) => s.id === projectId);
            if (session) {
              // Add to store
              useProjectStore.getState().addProject(session);
              found = session;
            }
          }
        } catch (error) {
          console.error("Failed to load project from API:", error);
        }
      }

      if (found) {
        setProject(found);
        setEditedTitle(found.title);
        setEditedDescription(found.description || "");
        if (found.result?.duration) {
          setDuration(found.result.duration);
        }
      } else {
        setNotFound(true);
      }
    };

    loadProject();
  }, [projectId]);

  if (notFound) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-4">요청한 프로젝트가 존재하지 않거나 삭제되었습니다.</p>
          <Link href="/projects">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              프로젝트 목록으로
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const StatusIcon = statusConfig[project.status].icon;

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleSaveEdit = () => {
    updateProject(project.id, {
      title: editedTitle,
      description: editedDescription,
    });
    setProject({ ...project, title: editedTitle, description: editedDescription });
    setIsEditing(false);
    toast.success("프로젝트가 업데이트되었습니다");
  };

  const handleDelete = () => {
    deleteProject(project.id);
    toast.success("프로젝트가 삭제되었습니다");
    router.push("/projects");
  };

  const handleDuplicate = () => {
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
    useProjectStore.getState().addProject(newProject);
    toast.success("프로젝트가 복제되었습니다");
    router.push(`/editor/${newProject.id}`);
  };

  const handleDownload = () => {
    if (project.result?.videoUrl) {
      const a = document.createElement("a");
      a.href = project.result.videoUrl;
      a.download = `${project.title}.mp4`;
      a.click();
      toast.success("다운로드가 시작됩니다");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-xl font-bold h-8"
                />
              ) : (
                <h1 className="text-xl font-bold">{project.title}</h1>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusConfig[project.status].variant}>
                  <StatusIcon className={`h-3 w-3 mr-1 ${project.status === "processing" ? "animate-spin" : ""}`} />
                  {statusConfig[project.status].label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(project.updatedAt)} 수정됨
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  취소
                </Button>
                <Button onClick={handleSaveEdit}>저장</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  편집
                </Button>
                {project.status === "completed" && project.result?.videoUrl && (
                  <>
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      다운로드
                    </Button>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      YouTube 업로드
                    </Button>
                  </>
                )}
                {(project.status === "draft" || project.status === "failed") && (
                  <Button onClick={() => setRegenerateDialogOpen(true)}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    생성하기
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="h-4 w-4 mr-2" />
                      복제
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      공유
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="grid lg:grid-cols-3 h-full">
          {/* Video Player */}
          <div className="lg:col-span-2 flex flex-col bg-black">
            {/* Video */}
            <div className="flex-1 flex items-center justify-center relative">
              {project.result?.videoUrl ? (
                <video
                  ref={videoRef}
                  src={project.result.videoUrl}
                  className="max-h-full max-w-full"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onEnded={() => setIsPlaying(false)}
                />
              ) : project.status === "processing" ? (
                <div className="text-center text-white">
                  <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4" />
                  <p className="text-lg">영상 생성 중...</p>
                  {project.progress && (
                    <div className="mt-4 w-64">
                      <Progress value={project.progress.percentage} className="h-2" />
                      <p className="text-sm mt-2">{project.progress.message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white/50">
                  <Film className="h-16 w-16 mx-auto mb-4" />
                  <p>영상이 아직 생성되지 않았습니다</p>
                </div>
              )}
            </div>

            {/* Video Controls */}
            {project.result?.videoUrl && (
              <div className="p-4 bg-black/80">
                {/* Progress */}
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="mb-4"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-white" onClick={handlePlayPause}>
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white">
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white">
                      <SkipForward className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-white ml-2">
                      {formatDuration(currentTime)} / {formatDuration(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-white" onClick={toggleMute}>
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="w-24"
                    />
                    <Button variant="ghost" size="icon" className="text-white">
                      <Subtitles className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white">
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="border-l overflow-auto">
            <Tabs defaultValue="details" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-3 m-4">
                <TabsTrigger value="details">상세</TabsTrigger>
                <TabsTrigger value="thumbnails">썸네일</TabsTrigger>
                <TabsTrigger value="script">스크립트</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="flex-1 overflow-auto px-4 pb-4 m-0">
                <div className="space-y-6">
                  {/* Description */}
                  <div className="space-y-2">
                    <Label>설명</Label>
                    {isEditing ? (
                      <Textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="min-h-[100px]"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {project.description || "설명 없음"}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">영상 유형</Label>
                      <p className="font-medium">
                        {project.videoType === "shorts" ? "Shorts" : project.videoType === "medium" ? "중간 길이" : "긴 영상"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">스타일</Label>
                      <p className="font-medium">{project.config.style}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">음성</Label>
                      <p className="font-medium">{project.config.voice}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">길이</Label>
                      <p className="font-medium">
                        {project.result?.duration ? formatDuration(project.result.duration) : "-"}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Result Info */}
                  {project.result && (
                    <div className="space-y-4">
                      <h4 className="font-medium">생성 결과</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(project.result.cost || 0)}</p>
                            <p className="text-xs text-muted-foreground">비용</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {project.result.qualityScore ? `${(project.result.qualityScore * 100).toFixed(0)}%` : "-"}
                            </p>
                            <p className="text-xs text-muted-foreground">품질 점수</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* AI Models */}
                  <div className="space-y-4">
                    <h4 className="font-medium">사용된 모델</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">텍스트</span>
                        <span>{project.config.models.text}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">이미지</span>
                        <span>{project.config.models.image}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TTS</span>
                        <span>{project.config.models.tts}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Timestamps */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">생성일</span>
                      <span>{new Date(project.createdAt).toLocaleString("ko-KR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">수정일</span>
                      <span>{new Date(project.updatedAt).toLocaleString("ko-KR")}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Thumbnails Tab */}
              <TabsContent value="thumbnails" className="flex-1 overflow-auto px-4 pb-4 m-0">
                <div className="space-y-4">
                  {project.result?.thumbnails && project.result.thumbnails.length > 0 ? (
                    <>
                      {/* Selected Thumbnail */}
                      <div className="aspect-video bg-accent rounded-lg overflow-hidden">
                        <img
                          src={project.result.thumbnails[selectedThumbnail]}
                          alt={`Thumbnail ${selectedThumbnail + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Thumbnail Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {project.result.thumbnails.map((thumb, i) => (
                          <div
                            key={i}
                            className={`aspect-video rounded cursor-pointer overflow-hidden border-2 transition-colors ${
                              selectedThumbnail === i ? "border-primary" : "border-transparent"
                            }`}
                            onClick={() => setSelectedThumbnail(i)}
                          >
                            <img
                              src={thumb}
                              alt={`Thumbnail ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          다운로드
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          재생성
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>썸네일이 아직 생성되지 않았습니다</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Script Tab */}
              <TabsContent value="script" className="flex-1 overflow-auto px-4 pb-4 m-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>주제</Label>
                    <p className="text-sm p-3 bg-muted rounded-lg">{project.config.topic}</p>
                  </div>

                  {project.config.script && (
                    <div className="space-y-2">
                      <Label>스크립트</Label>
                      <div className="text-sm p-3 bg-muted rounded-lg whitespace-pre-wrap max-h-[400px] overflow-auto">
                        {project.config.script}
                      </div>
                    </div>
                  )}

                  {project.result?.subtitlesUrl && (
                    <Button variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      자막 다운로드 (SRT)
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로젝트 삭제</DialogTitle>
            <DialogDescription>
              "{project.title}" 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>영상 생성</DialogTitle>
            <DialogDescription>
              이 프로젝트의 설정으로 영상을 생성하시겠습니까? 비용이 발생할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={() => {
              toast.info("영상 생성 기능은 곧 지원됩니다");
              setRegenerateDialogOpen(false);
            }}>
              생성 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
