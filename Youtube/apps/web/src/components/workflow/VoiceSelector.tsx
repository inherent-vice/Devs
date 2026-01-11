"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AudioPlayer, AudioPlayerInline } from "@/components/ui/audio-player";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  Volume2,
  Check,
  Loader2,
  RefreshCw,
  Mic,
  User,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// Voice info type
interface VoiceInfo {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  gender: "male" | "female";
  age: "young" | "adult" | "mature";
  style: string;
  language: string;
  provider: string;
  sampleText: string;
  sampleUrl?: string | null;
}

interface VoiceSelectorProps {
  selectedVoice: string;
  onSelect: (voiceId: string) => void;
  speed?: number;
  pitch?: number;
  className?: string;
}

// Default voices (will be replaced by API data)
const DEFAULT_VOICES: VoiceInfo[] = [
  {
    id: "Kore",
    name: "Kore",
    nameKo: "코레",
    description: "Warm and professional, perfect for narration",
    descriptionKo: "따뜻하고 전문적인 음성, 내레이션에 적합",
    gender: "female",
    age: "adult",
    style: "narration",
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "안녕하세요, AI 스튜디오입니다. 오늘도 좋은 하루 되세요.",
  },
  {
    id: "Puck",
    name: "Puck",
    nameKo: "퍽",
    description: "Bright and upbeat, great for energetic content",
    descriptionKo: "밝고 활기찬 음성, 에너지 넘치는 콘텐츠에 적합",
    gender: "male",
    age: "young",
    style: "energetic",
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "안녕하세요! 오늘은 정말 신나는 소식을 전해드릴게요!",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    nameKo: "제퍼",
    description: "Calm and soothing, ideal for relaxing content",
    descriptionKo: "차분하고 편안한 음성, 휴식 콘텐츠에 적합",
    gender: "female",
    age: "adult",
    style: "calm",
    language: "en-US",
    provider: "gemini_tts",
    sampleText: "Welcome to our channel. Let's explore together.",
  },
  {
    id: "Enceladus",
    name: "Enceladus",
    nameKo: "엔셀라두스",
    description: "Deep and authoritative, perfect for news/documentary",
    descriptionKo: "깊고 권위 있는 음성, 뉴스/다큐멘터리에 적합",
    gender: "male",
    age: "mature",
    style: "news",
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "오늘의 주요 뉴스를 전해드리겠습니다.",
  },
  {
    id: "Charon",
    name: "Charon",
    nameKo: "카론",
    description: "Clear and articulate, great for tutorials",
    descriptionKo: "명확하고 또렷한 음성, 튜토리얼에 적합",
    gender: "male",
    age: "adult",
    style: "tutorial",
    language: "en-US",
    provider: "gemini_tts",
    sampleText: "Let me show you how this works step by step.",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    nameKo: "펜리르",
    description: "Dynamic and engaging, perfect for entertainment",
    descriptionKo: "역동적이고 매력적인 음성, 엔터테인먼트에 적합",
    gender: "male",
    age: "young",
    style: "entertainment",
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "자, 그럼 지금부터 시작해볼까요? 재미있을 거예요!",
  },
  {
    id: "Aoede",
    name: "Aoede",
    nameKo: "아오이데",
    description: "Melodic and expressive, ideal for storytelling",
    descriptionKo: "멜로디컬하고 표현력 있는 음성, 스토리텔링에 적합",
    gender: "female",
    age: "young",
    style: "storytelling",
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "옛날 옛적에, 아주 먼 곳에서 이야기가 시작됩니다.",
  },
  {
    id: "Leda",
    name: "Leda",
    nameKo: "레다",
    description: "Friendly and approachable, great for conversational content",
    descriptionKo: "친근하고 편안한 음성, 대화형 콘텐츠에 적합",
    gender: "female",
    age: "adult",
    style: "conversational",
    language: "ko-KR",
    provider: "gemini_tts",
    sampleText: "안녕하세요! 오늘 어떻게 지내세요? 좋은 하루 보내고 계신가요?",
  },
];

const STYLE_LABELS: Record<string, string> = {
  narration: "내레이션",
  energetic: "활기참",
  calm: "차분함",
  news: "뉴스",
  tutorial: "튜토리얼",
  entertainment: "엔터테인먼트",
  storytelling: "스토리텔링",
  conversational: "대화체",
};

const AGE_LABELS: Record<string, string> = {
  young: "젊은",
  adult: "성인",
  mature: "중후한",
};

export function VoiceSelector({
  selectedVoice,
  onSelect,
  speed = 1,
  pitch = 0,
  className,
}: VoiceSelectorProps) {
  const [voices, setVoices] = React.useState<VoiceInfo[]>(DEFAULT_VOICES);
  const [isLoading, setIsLoading] = React.useState(false);
  const [previewText, setPreviewText] = React.useState("안녕하세요, AI 스튜디오입니다.");
  const [previewingVoice, setPreviewingVoice] = React.useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = React.useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = React.useState(false);

  // Fetch voices from API
  React.useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch("/api/preview/voices");
        if (response.ok) {
          const data = await response.json();
          if (data.voices && data.voices.length > 0) {
            setVoices(data.voices);
          }
        }
      } catch (error) {
        console.error("Failed to fetch voices:", error);
      }
    };

    fetchVoices();
  }, []);

  // Generate preview for a voice
  const generatePreview = async (voiceId: string, text?: string) => {
    setIsGeneratingPreview(true);
    setPreviewingVoice(voiceId);
    setPreviewAudioUrl(null);

    try {
      const response = await fetch("/api/preview/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text || previewText,
          voiceName: voiceId,
          speed,
          pitch,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.audioBase64) {
        // Convert base64 to blob URL
        const audioBlob = base64ToBlob(data.audioBase64, "audio/wav");
        const audioUrl = URL.createObjectURL(audioBlob);
        setPreviewAudioUrl(audioUrl);
      } else if (data.audioUrl) {
        setPreviewAudioUrl(data.audioUrl);
      } else {
        toast.error("음성 데이터를 받지 못했습니다");
      }
    } catch (error) {
      console.error("Preview generation error:", error);
      toast.error("미리듣기 생성 중 오류가 발생했습니다");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Cleanup audio URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Voice Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {voices.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            isSelected={selectedVoice === voice.id}
            isPreviewing={previewingVoice === voice.id}
            isGenerating={isGeneratingPreview && previewingVoice === voice.id}
            onSelect={() => onSelect(voice.id)}
            onPreview={() => generatePreview(voice.id, voice.sampleText)}
          />
        ))}
      </div>

      {/* Custom Preview Section */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <Label className="text-sm font-medium">커스텀 텍스트로 미리듣기</Label>
        <div className="flex gap-2">
          <Textarea
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="미리듣기할 텍스트를 입력하세요..."
            className="min-h-[60px] resize-none"
            maxLength={500}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {previewText.length}/500자
          </span>
          <Button
            size="sm"
            onClick={() => generatePreview(selectedVoice)}
            disabled={!selectedVoice || !previewText || isGeneratingPreview}
          >
            {isGeneratingPreview ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            선택한 음성으로 미리듣기
          </Button>
        </div>

        {/* Audio Player */}
        {previewAudioUrl && (
          <div className="pt-2 border-t">
            <AudioPlayer
              src={previewAudioUrl}
              showVolume={true}
              showSpeed={true}
              onEnded={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Voice Card
function VoiceCard({
  voice,
  isSelected,
  isPreviewing,
  isGenerating,
  onSelect,
  onPreview,
}: {
  voice: VoiceInfo;
  isSelected: boolean;
  isPreviewing: boolean;
  isGenerating: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary",
        isPreviewing && "bg-primary/5"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                voice.gender === "female" ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
              )}
            >
              {voice.gender === "female" ? (
                <User className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div>
              <h4 className="font-medium text-sm">{voice.nameKo}</h4>
              <p className="text-xs text-muted-foreground">{voice.name}</p>
            </div>
          </div>
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {voice.gender === "female" ? "여성" : "남성"}
          </Badge>
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {AGE_LABELS[voice.age] || voice.age}
          </Badge>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {STYLE_LABELS[voice.style] || voice.style}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {voice.descriptionKo}
        </p>

        {/* Preview Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Volume2 className="h-3 w-3 mr-1" />
          )}
          미리듣기
        </Button>
      </CardContent>
    </Card>
  );
}

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export { DEFAULT_VOICES, STYLE_LABELS, AGE_LABELS };
export type { VoiceInfo };
