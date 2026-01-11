"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Sparkles,
  Video,
  Clock,
  FileVideo,
  Trash2,
  Star,
  Copy,
  Eye,
} from "lucide-react";
import { useWorkflowStore, PRESET_TEMPLATES } from "@/lib/workflow/store";
import { WorkflowTemplate, VideoType } from "@/lib/workflow/types";

interface TemplateSelectorProps {
  onSelect: (template: WorkflowTemplate | null, videoType?: VideoType) => void;
  onStartFromScratch: (videoType: VideoType) => void;
}

const VIDEO_TYPE_INFO = {
  shorts: {
    label: "Shorts",
    duration: "60초",
    icon: <Sparkles className="h-8 w-8" />,
    description: "빠르고 임팩트 있는 짧은 영상",
    color: "bg-pink-500/10 text-pink-500",
  },
  medium: {
    label: "중간 길이",
    duration: "5분",
    icon: <Video className="h-8 w-8" />,
    description: "일반적인 YouTube 영상",
    color: "bg-blue-500/10 text-blue-500",
  },
  longform: {
    label: "긴 영상",
    duration: "10-15분",
    icon: <FileVideo className="h-8 w-8" />,
    description: "심층적인 콘텐츠",
    color: "bg-purple-500/10 text-purple-500",
  },
};

export function TemplateSelector({ onSelect, onStartFromScratch }: TemplateSelectorProps) {
  const { customTemplates, deleteTemplate, savedConfigs } = useWorkflowStore();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<VideoType | "all">("all");
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  const allTemplates = [...PRESET_TEMPLATES, ...customTemplates];
  const filteredTemplates = allTemplates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === "all" || t.videoType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <>
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Start From Scratch */}
        <div>
          <h3 className="text-lg font-semibold mb-4">새로 시작하기</h3>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(VIDEO_TYPE_INFO) as VideoType[]).map((type) => {
              const info = VIDEO_TYPE_INFO[type];
              return (
                <Card
                  key={type}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onStartFromScratch(type)}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex p-4 rounded-full ${info.color} mb-4`}>
                      {info.icon}
                    </div>
                    <h4 className="font-semibold">{info.label}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{info.duration}</p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Templates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">템플릿 선택</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="템플릿 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>

          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as VideoType | "all")}>
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="shorts">Shorts</TabsTrigger>
              <TabsTrigger value="medium">중간 길이</TabsTrigger>
              <TabsTrigger value="longform">긴 영상</TabsTrigger>
            </TabsList>

            <TabsContent value={filterType} className="mt-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => onSelect(template)}
                    onPreview={() => setPreviewTemplate(template)}
                    onDelete={
                      template.category === "custom"
                        ? () => deleteTemplate(template.id)
                        : undefined
                    }
                  />
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    검색 결과가 없습니다
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Saved Configs */}
        {savedConfigs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">저장된 워크플로우</h3>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {savedConfigs.slice(0, 5).map((config) => (
                <Card
                  key={config.id}
                  className="min-w-[200px] flex-shrink-0 cursor-pointer hover:border-primary transition-colors"
                  onClick={() =>
                    onSelect({
                      id: config.id,
                      name: config.name,
                      description: config.description || "",
                      category: "custom",
                      videoType: config.videoType,
                      tags: [],
                      config,
                      createdAt: config.createdAt,
                      updatedAt: config.updatedAt,
                    })
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{config.videoType}</Badge>
                    </div>
                    <h4 className="font-medium truncate">{config.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(config.updatedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>

    {/* Preview Dialog */}
    <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{previewTemplate?.name}</DialogTitle>
          <DialogDescription>{previewTemplate?.description}</DialogDescription>
        </DialogHeader>
        {previewTemplate && <TemplatePreview template={previewTemplate} />}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
            닫기
          </Button>
          <Button
            onClick={() => {
              onSelect(previewTemplate);
              setPreviewTemplate(null);
            }}
          >
            이 템플릿 사용
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function TemplateCard({
  template,
  onSelect,
  onPreview,
  onDelete,
}: {
  template: WorkflowTemplate;
  onSelect: () => void;
  onPreview: () => void;
  onDelete?: () => void;
}) {
  const info = VIDEO_TYPE_INFO[template.videoType];

  return (
    <Card className="group hover:border-primary transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${info.color}`}>{info.icon}</div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPreview}>
              <Eye className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardTitle className="text-base">{template.name}</CardTitle>
        <CardDescription className="text-xs line-clamp-2">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="secondary" className="text-xs">
            {info.label}
          </Badge>
          {template.category === "preset" && (
            <Badge variant="outline" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              기본
            </Badge>
          )}
          {template.category === "custom" && (
            <Badge variant="outline" className="text-xs">
              내 템플릿
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <Button className="w-full mt-3" size="sm" onClick={onSelect}>
          사용하기
        </Button>
      </CardContent>
    </Card>
  );
}

function TemplatePreview({ template }: { template: WorkflowTemplate }) {
  const config = template.config;

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 pr-4">
        {/* Research Phase */}
        <div>
          <h4 className="font-medium mb-2">리서치 단계</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">트렌드 분석</span>
              <p className="font-medium">
                {config.phases.research.trend.enabled ? "활성화" : "비활성화"}
              </p>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">스크립트 스타일</span>
              <p className="font-medium">{config.phases.research.script.style}</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">목표 길이</span>
              <p className="font-medium">{config.phases.research.script.targetDuration}초</p>
            </div>
          </div>
        </div>

        {/* Production Phase */}
        <div>
          <h4 className="font-medium mb-2">제작 단계</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">음성</span>
              <p className="font-medium">{config.phases.production.voice.voiceName}</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">영상 모드</span>
              <p className="font-medium">{config.phases.production.video.mode}</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">썸네일 변형</span>
              <p className="font-medium">{config.phases.production.thumbnail.variants}개</p>
            </div>
          </div>
        </div>

        {/* Quality Phase */}
        <div>
          <h4 className="font-medium mb-2">품질 단계</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">통과 기준</span>
              <p className="font-medium">
                {(config.phases.quality.critic.passThreshold * 100).toFixed(0)}%
              </p>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">최대 반복</span>
              <p className="font-medium">{config.phases.quality.maxQualityLoops}회</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">자동 수정</span>
              <p className="font-medium">
                {config.phases.quality.revision.autoRevise ? "활성화" : "비활성화"}
              </p>
            </div>
          </div>
        </div>

        {/* Publishing Phase */}
        <div>
          <h4 className="font-medium mb-2">게시 단계</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">플랫폼</span>
              <p className="font-medium">{config.phases.publishing.publisher.platform}</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">SEO 최적화</span>
              <p className="font-medium">
                {config.phases.publishing.publisher.seoOptimization ? "활성화" : "비활성화"}
              </p>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="text-muted-foreground">자동 게시</span>
              <p className="font-medium">
                {config.phases.publishing.autoPublish ? "활성화" : "비활성화"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
