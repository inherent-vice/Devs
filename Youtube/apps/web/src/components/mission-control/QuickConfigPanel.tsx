"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { WorkflowConfig, VideoType } from "@/lib/workflow/types";

interface QuickConfigPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  config: WorkflowConfig;
}

const VIDEO_TYPES: { value: VideoType; label: string }[] = [
  { value: "shorts", label: "Shorts (60초)" },
  { value: "medium", label: "Medium (3-5분)" },
  { value: "longform", label: "Long (10분+)" },
];

const VOICE_OPTIONS = [
  { value: "Kore", label: "Kore (한국어 여성)" },
  { value: "Puck", label: "Puck (영어 남성)" },
  { value: "Zephyr", label: "Zephyr (영어 여성)" },
  { value: "Enceladus", label: "Enceladus (내레이션)" },
];

const STYLE_OPTIONS = [
  { value: "cinematic", label: "시네마틱" },
  { value: "documentary", label: "다큐멘터리" },
  { value: "casual", label: "캐주얼" },
  { value: "educational", label: "교육적" },
  { value: "news", label: "뉴스" },
];

export function QuickConfigPanel({ isOpen, onToggle, config }: QuickConfigPanelProps) {
  const { updateConfig, updatePhaseConfig } = useWorkflowStore();

  const handleTopicChange = (value: string) => {
    updateConfig({ description: value, name: value.slice(0, 50) || "New Mission" });
  };

  const handleVideoTypeChange = (value: VideoType) => {
    updateConfig({ videoType: value });
  };

  const handleVoiceChange = (value: string) => {
    updatePhaseConfig("production", {
      voice: {
        ...config.phases.production.voice,
        voiceName: value,
      },
    });
  };

  const handleStyleChange = (value: string) => {
    updatePhaseConfig("production", {
      video: {
        ...config.phases.production.video,
        visualStyle: {
          ...config.phases.production.video.visualStyle,
          colorGrading: value as "neutral" | "warm" | "cool" | "vintage" | "cinematic" | "teal_orange" | "noir" | "pastel",
        },
      },
    });
  };

  const topic = config.description || config.name || "";
  const currentStyle = config.phases.production.video.visualStyle?.colorGrading || "cinematic";

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-4 h-auto border-b rounded-none hover:bg-accent/50"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">빠른 설정</span>
            <span className="text-sm text-muted-foreground">
              {topic ? `"${topic.slice(0, 30)}..."` : "주제를 입력하세요"}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4 bg-muted/30 border-b space-y-4">
          {/* Topic Input */}
          <div className="space-y-2">
            <Label htmlFor="topic">주제</Label>
            <Input
              id="topic"
              placeholder="영상 주제를 입력하세요 (예: 2026년 AI 트렌드 전망)"
              value={topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="bg-background"
            />
          </div>

          {/* Quick Settings Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Video Type */}
            <div className="space-y-2">
              <Label>영상 길이</Label>
              <Select value={config.videoType} onValueChange={handleVideoTypeChange}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voice */}
            <div className="space-y-2">
              <Label>음성</Label>
              <Select
                value={config.phases.production.voice.voiceName || "Kore"}
                onValueChange={handleVoiceChange}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <Label>스타일</Label>
              <Select
                value={currentStyle}
                onValueChange={handleStyleChange}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <Label>템플릿</Label>
              <Select defaultValue="custom">
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">커스텀</SelectItem>
                  <SelectItem value="quick-shorts">빠른 Shorts</SelectItem>
                  <SelectItem value="standard-medium">표준 중간 길이</SelectItem>
                  <SelectItem value="premium-long">프리미엄 장편</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Settings Link */}
          <div className="flex justify-end">
            <Button variant="link" size="sm" className="text-muted-foreground">
              상세 설정 열기 →
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
