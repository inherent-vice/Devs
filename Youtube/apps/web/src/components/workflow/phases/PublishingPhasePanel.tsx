"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Upload,
  Youtube,
  ChevronDown,
  ChevronRight,
  Settings2,
  Hash,
  Calendar,
  Eye,
  MessageSquare,
  ListVideo,
  Globe,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { PublishingPhaseConfig, PublisherAgentConfig } from "@/lib/workflow/types";

interface PublishingPhasePanelProps {
  config: PublishingPhaseConfig;
}

export function PublishingPhasePanel({ config }: PublishingPhasePanelProps) {
  const { updatePhaseConfig } = useWorkflowStore();
  const [openSections, setOpenSections] = useState<string[]>(["publisher"]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const updatePublisher = (updates: Partial<PublisherAgentConfig>) => {
    updatePhaseConfig("publishing", { publisher: { ...config.publisher, ...updates } });
  };

  const updateYouTube = (updates: Partial<NonNullable<PublisherAgentConfig["youtube"]>>) => {
    updatePublisher({
      youtube: { ...config.publisher.youtube!, ...updates },
    });
  };

  return (
    <div className="space-y-4">
      {/* Phase Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            단계 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>자동 게시</Label>
              <p className="text-xs text-muted-foreground">품질 통과 시 자동으로 업로드</p>
            </div>
            <Switch
              checked={config.autoPublish}
              onCheckedChange={(v) => updatePhaseConfig("publishing", { autoPublish: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>검토 대기</Label>
              <p className="text-xs text-muted-foreground">게시 전 사용자 확인 필요</p>
            </div>
            <Switch
              checked={config.reviewGate}
              onCheckedChange={(v) => updatePhaseConfig("publishing", { reviewGate: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Publisher Agent */}
      <Collapsible
        open={openSections.includes("publisher")}
        onOpenChange={() => toggleSection("publisher")}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Upload className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">게시 에이전트</CardTitle>
                    <CardDescription>메타데이터 최적화 및 업로드</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.publisher.enabled ? "default" : "secondary"}>
                    {config.publisher.enabled ? "활성화" : "비활성화"}
                  </Badge>
                  {openSections.includes("publisher") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between">
                <Label>에이전트 활성화</Label>
                <Switch
                  checked={config.publisher.enabled}
                  onCheckedChange={(v) => updatePublisher({ enabled: v })}
                />
              </div>

              {config.publisher.enabled && (
                <>
                  <Separator />

                  <div className="space-y-2">
                    <Label>플랫폼</Label>
                    <Select
                      value={config.publisher.platform}
                      onValueChange={(v) => updatePublisher({ platform: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="all">모든 플랫폼</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>SEO 최적화</Label>
                        <p className="text-xs text-muted-foreground">제목/설명 검색 최적화</p>
                      </div>
                      <Switch
                        checked={config.publisher.seoOptimization}
                        onCheckedChange={(v) => updatePublisher({ seoOptimization: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>해시태그 생성</Label>
                        <p className="text-xs text-muted-foreground">자동 해시태그 추가</p>
                      </div>
                      <Switch
                        checked={config.publisher.hashtagGeneration}
                        onCheckedChange={(v) => updatePublisher({ hashtagGeneration: v })}
                      />
                    </div>
                  </div>

                  {/* YouTube Settings */}
                  {(config.publisher.platform === "youtube" ||
                    config.publisher.platform === "all") &&
                    config.publisher.youtube && (
                      <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                        <h5 className="font-medium text-sm flex items-center gap-2">
                          <Youtube className="h-4 w-4 text-red-500" />
                          YouTube 설정
                        </h5>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>제목 최적화</Label>
                            <p className="text-xs text-muted-foreground">AI 기반 제목 개선</p>
                          </div>
                          <Switch
                            checked={config.publisher.youtube.titleOptimization}
                            onCheckedChange={(v) => updateYouTube({ titleOptimization: v })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>설명 템플릿</Label>
                          <Textarea
                            placeholder="영상 설명 템플릿을 입력하세요... {title}, {keywords} 등 변수 사용 가능"
                            value={config.publisher.youtube.descriptionTemplate || ""}
                            onChange={(e) =>
                              updateYouTube({ descriptionTemplate: e.target.value })
                            }
                            rows={4}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>카테고리</Label>
                            <Select
                              value={config.publisher.youtube.category}
                              onValueChange={(v) => updateYouTube({ category: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Entertainment">엔터테인먼트</SelectItem>
                                <SelectItem value="Education">교육</SelectItem>
                                <SelectItem value="Science & Technology">과학/기술</SelectItem>
                                <SelectItem value="Gaming">게임</SelectItem>
                                <SelectItem value="News & Politics">뉴스/정치</SelectItem>
                                <SelectItem value="Howto & Style">노하우/스타일</SelectItem>
                                <SelectItem value="People & Blogs">인물/블로그</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              공개 설정
                            </Label>
                            <Select
                              value={config.publisher.youtube.visibility}
                              onValueChange={(v) => updateYouTube({ visibility: v as any })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">공개</SelectItem>
                                <SelectItem value="unlisted">일부 공개</SelectItem>
                                <SelectItem value="private">비공개</SelectItem>
                                <SelectItem value="scheduled">예약 게시</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {config.publisher.youtube.visibility === "scheduled" && (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              예약 시간
                            </Label>
                            <Input
                              type="datetime-local"
                              value={config.publisher.youtube.scheduledTime || ""}
                              onChange={(e) => updateYouTube({ scheduledTime: e.target.value })}
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <ListVideo className="h-4 w-4" />
                            재생목록
                          </Label>
                          <Input
                            placeholder="추가할 재생목록 이름 (선택)"
                            value={config.publisher.youtube.playlist || ""}
                            onChange={(e) => updateYouTube({ playlist: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            기본 태그
                          </Label>
                          <Input
                            placeholder="쉼표로 구분된 태그들"
                            value={config.publisher.youtube.tags.join(", ")}
                            onChange={(e) =>
                              updateYouTube({
                                tags: e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">최종 화면</Label>
                            <Switch
                              checked={config.publisher.youtube.endScreen}
                              onCheckedChange={(v) => updateYouTube({ endScreen: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">카드</Label>
                            <Switch
                              checked={config.publisher.youtube.cards}
                              onCheckedChange={(v) => updateYouTube({ cards: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              댓글 허용
                            </Label>
                            <Switch
                              checked={config.publisher.youtube.commentsEnabled}
                              onCheckedChange={(v) => updateYouTube({ commentsEnabled: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">어린이용</Label>
                            <Switch
                              checked={config.publisher.youtube.madeForKids}
                              onCheckedChange={(v) => updateYouTube({ madeForKids: v })}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="space-y-2">
                    <Label>AI 모델</Label>
                    <Select
                      value={config.publisher.model}
                      onValueChange={(v) => updatePublisher({ model: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-3-flash">Gemini 3 Flash</SelectItem>
                        <SelectItem value="gemini-3-pro">Gemini 3 Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
