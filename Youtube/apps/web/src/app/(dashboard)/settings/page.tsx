"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Zap,
  Key,
  Globe,
  DollarSign,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useSettingsStore, type UserSettings } from "@/lib/store";
import { checkHealth } from "@/lib/backend";

interface EnvStatus {
  googleAI: boolean;
  googleCloud: boolean;
  googleCloudLocation: string | null;
  youtube: boolean;
}

const stylePresets = [
  { value: "cinematic", label: "시네마틱" },
  { value: "documentary", label: "다큐멘터리" },
  { value: "news", label: "뉴스" },
  { value: "casual", label: "캐주얼" },
  { value: "energetic", label: "에너지틱" },
];

const voicePresets = [
  { value: "Kore", label: "Kore" },
  { value: "Puck", label: "Puck" },
  { value: "Zephyr", label: "Zephyr" },
  { value: "Charon", label: "Charon" },
  { value: "Fenrir", label: "Fenrir" },
];

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [envStatusLoading, setEnvStatusLoading] = useState(true);
  const [envStatusMessage, setEnvStatusMessage] = useState("");
  const [testingApiKey, setTestingApiKey] = useState<string | null>(null);

  // Test API Key
  const testApiKey = async (type: "googleAI" | "youtube") => {
    const apiKey = type === "googleAI" ? localSettings.apiKeys.googleAI : localSettings.apiKeys.youtube;
    if (!apiKey?.trim()) {
      toast.error("API 키를 입력해주세요");
      return;
    }

    setTestingApiKey(type);
    try {
      const res = await fetch("/api/test-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, apiKey }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message, {
          description: data.details,
        });
      }
    } catch (error) {
      toast.error("API 키 테스트 실패");
    } finally {
      setTestingApiKey(null);
    }
  };

  // Fetch environment status
  const fetchEnvStatus = useCallback(async () => {
    setEnvStatusLoading(true);
    try {
      const res = await fetch("/api/env-status");
      const data = await res.json();
      if (data.success) {
        setEnvStatus(data.status);
        setEnvStatusMessage(data.message);
      }
    } catch (error) {
      console.error("Failed to fetch env status:", error);
      setEnvStatusMessage("환경변수 상태 확인 실패");
    } finally {
      setEnvStatusLoading(false);
    }
  }, []);

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await checkHealth();
        setBackendStatus(health.status === "healthy" ? "online" : "offline");
      } catch {
        setBackendStatus("offline");
      }
    };
    checkBackend();
    fetchEnvStatus();
  }, [fetchEnvStatus]);

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(localSettings) !== JSON.stringify(settings));
  }, [localSettings, settings]);

  const updateLocalSettings = (updates: Partial<UserSettings>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

  const updateNestedSettings = <K extends keyof UserSettings>(
    key: K,
    updates: Partial<UserSettings[K]>
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: { ...(prev[key] as object), ...updates },
    }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    toast.success("설정이 저장되었습니다");
    setHasChanges(false);
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings(settings);
    toast.success("설정이 초기화되었습니다");
    setResetDialogOpen(false);
    setHasChanges(false);
  };

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKey((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            설정
          </h1>
          <p className="text-muted-foreground">애플리케이션 설정을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="outline" className="mr-2">
              저장되지 않은 변경사항
            </Badge>
          )}
          <Button variant="outline" onClick={() => setResetDialogOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            초기화
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      {/* Backend Status */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-full ${
              backendStatus === "online" ? "bg-green-500/10" :
              backendStatus === "offline" ? "bg-red-500/10" : "bg-yellow-500/10"
            }`}>
              {backendStatus === "checking" ? (
                <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
              ) : backendStatus === "online" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div>
              <p className="font-medium">백엔드 서버</p>
              <p className="text-sm text-muted-foreground">
                {backendStatus === "checking" ? "연결 확인 중..." :
                 backendStatus === "online" ? "Genkit 서버가 정상 작동 중입니다" :
                 "백엔드 서버에 연결할 수 없습니다"}
              </p>
            </div>
          </div>
          <Badge variant={backendStatus === "online" ? "default" : "destructive"}>
            {backendStatus === "online" ? "연결됨" : backendStatus === "offline" ? "오프라인" : "확인 중"}
          </Badge>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="defaults" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="defaults" className="gap-2">
            <Zap className="h-4 w-4" />
            기본값
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            알림
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-2">
            <DollarSign className="h-4 w-4" />
            비용
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API 키
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Shield className="h-4 w-4" />
            고급
          </TabsTrigger>
        </TabsList>

        {/* Defaults Tab */}
        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle>기본 설정</CardTitle>
              <CardDescription>새 프로젝트 생성 시 사용되는 기본값입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Default Video Type */}
                <div className="space-y-2">
                  <Label>기본 영상 유형</Label>
                  <Select
                    value={localSettings.defaultVideoType}
                    onValueChange={(v) => updateLocalSettings({ defaultVideoType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shorts">Shorts (60초)</SelectItem>
                      <SelectItem value="medium">중간 길이 (5분)</SelectItem>
                      <SelectItem value="longform">긴 영상 (10-15분)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Style */}
                <div className="space-y-2">
                  <Label>기본 스타일</Label>
                  <Select
                    value={localSettings.defaultStyle}
                    onValueChange={(v) => updateLocalSettings({ defaultStyle: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stylePresets.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Voice */}
                <div className="space-y-2">
                  <Label>기본 음성</Label>
                  <Select
                    value={localSettings.defaultVoice}
                    onValueChange={(v) => updateLocalSettings({ defaultVoice: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {voicePresets.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label>언어</Label>
                  <Select
                    value={localSettings.language}
                    onValueChange={(v) => updateLocalSettings({ language: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Default Models */}
              <div className="space-y-4">
                <h4 className="font-medium">기본 AI 모델</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>텍스트 모델</Label>
                    <Select
                      value={localSettings.defaultModels.text}
                      onValueChange={(v) => updateNestedSettings("defaultModels", { text: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-3-flash">Gemini 3 Flash (빠름)</SelectItem>
                        <SelectItem value="gemini-3-pro">Gemini 3 Pro (고품질)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>이미지 모델</Label>
                    <Select
                      value={localSettings.defaultModels.image}
                      onValueChange={(v) => updateNestedSettings("defaultModels", { image: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-3-pro-image">Gemini 3 Pro Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>TTS 모델</Label>
                    <Select
                      value={localSettings.defaultModels.tts}
                      onValueChange={(v) => updateNestedSettings("defaultModels", { tts: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.5-flash-tts">Gemini 2.5 Flash TTS</SelectItem>
                        <SelectItem value="gemini-2.5-pro-tts">Gemini 2.5 Pro TTS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>알림 수신 방법을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>완료 알림</Label>
                  <p className="text-sm text-muted-foreground">
                    영상 생성이 완료되면 알림을 받습니다
                  </p>
                </div>
                <Switch
                  checked={localSettings.notifications.onComplete}
                  onCheckedChange={(v) => updateNestedSettings("notifications", { onComplete: v })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>오류 알림</Label>
                  <p className="text-sm text-muted-foreground">
                    생성 중 오류가 발생하면 알림을 받습니다
                  </p>
                </div>
                <Switch
                  checked={localSettings.notifications.onError}
                  onCheckedChange={(v) => updateNestedSettings("notifications", { onError: v })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>이메일 알림</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={localSettings.notifications.email || ""}
                  onChange={(e) => updateNestedSettings("notifications", { email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  중요 알림을 이메일로도 받으려면 이메일 주소를 입력하세요
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>비용 제한</CardTitle>
              <CardDescription>API 사용 비용 제한을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>영상당 최대 비용 (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={localSettings.costLimits.perVideo}
                      onChange={(e) => updateNestedSettings("costLimits", { perVideo: parseFloat(e.target.value) || 0 })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>월간 최대 비용 (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={localSettings.costLimits.monthly}
                      onChange={(e) => updateNestedSettings("costLimits", { monthly: parseFloat(e.target.value) || 0 })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>경고 임계값 (%)</Label>
                  <Input
                    type="number"
                    value={localSettings.costLimits.alertThreshold}
                    onChange={(e) => updateNestedSettings("costLimits", { alertThreshold: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                비용 제한에 도달하면 새 영상 생성이 차단됩니다. 경고 임계값에 도달하면 알림을 받습니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api">
          <div className="space-y-6">
            {/* Environment Variables Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      환경 변수 상태
                    </CardTitle>
                    <CardDescription>서버에 설정된 환경 변수 현황입니다 (.env 파일)</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchEnvStatus} disabled={envStatusLoading}>
                    <RefreshCw className={`h-4 w-4 ${envStatusLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {envStatusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : envStatus ? (
                  <>
                    {/* Status Message */}
                    <div className={`mb-4 p-3 rounded-lg ${
                      envStatus.googleAI ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                    }`}>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {envStatus.googleAI ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {envStatusMessage}
                      </p>
                    </div>

                    <div className="grid gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Key className={`h-4 w-4 ${envStatus.googleAI ? "text-green-500" : "text-muted-foreground"}`} />
                          <div>
                            <p className="font-medium text-sm">GOOGLE_AI_API_KEY</p>
                            <p className="text-xs text-muted-foreground">Gemini, Veo, Imagen API (필수)</p>
                          </div>
                        </div>
                        <Badge variant={envStatus.googleAI ? "default" : "destructive"}>
                          {envStatus.googleAI ? "설정됨" : "미설정"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Globe className={`h-4 w-4 ${envStatus.googleCloud ? "text-green-500" : "text-muted-foreground"}`} />
                          <div>
                            <p className="font-medium text-sm">GOOGLE_CLOUD_PROJECT</p>
                            <p className="text-xs text-muted-foreground">
                              Vertex AI 프로젝트
                              {envStatus.googleCloudLocation && (
                                <span className="ml-1">({envStatus.googleCloudLocation})</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge variant={envStatus.googleCloud ? "default" : "secondary"}>
                          {envStatus.googleCloud ? "설정됨" : "미설정"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Zap className={`h-4 w-4 ${envStatus.youtube ? "text-green-500" : "text-muted-foreground"}`} />
                          <div>
                            <p className="font-medium text-sm">YOUTUBE_API_KEY</p>
                            <p className="text-xs text-muted-foreground">YouTube Data API</p>
                          </div>
                        </div>
                        <Badge variant={envStatus.youtube ? "default" : "secondary"}>
                          {envStatus.youtube ? "설정됨" : "미설정"}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    환경 변수 상태를 가져올 수 없습니다
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  환경 변수는 서버 재시작 시 적용됩니다. 아래에서 UI 설정으로 API 키를 관리할 수도 있습니다.
                </p>
              </CardContent>
            </Card>

            {/* API Keys Input */}
            <Card>
              <CardHeader>
                <CardTitle>API 키 설정</CardTitle>
                <CardDescription>외부 서비스 연동을 위한 API 키를 관리합니다 (UI 설정)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Google AI API Key */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="text-red-500">*</span>
                    Google AI API 키 (필수)
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey.googleAI ? "text" : "password"}
                        placeholder="AIzaSy..."
                        value={localSettings.apiKeys.googleAI || ""}
                        onChange={(e) => updateNestedSettings("apiKeys", { googleAI: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleApiKeyVisibility("googleAI")}
                    >
                      {showApiKey.googleAI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testApiKey("googleAI")}
                      disabled={testingApiKey === "googleAI" || !localSettings.apiKeys.googleAI?.trim()}
                    >
                      {testingApiKey === "googleAI" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "테스트"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Gemini, Veo, Imagen API 사용에 필요합니다.
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 ml-1"
                    >
                      AI Studio에서 생성
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>

                <Separator />

                {/* YouTube API Key */}
                <div className="space-y-2">
                  <Label>YouTube Data API 키</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey.youtube ? "text" : "password"}
                        placeholder="AIza..."
                        value={localSettings.apiKeys.youtube || ""}
                        onChange={(e) => updateNestedSettings("apiKeys", { youtube: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleApiKeyVisibility("youtube")}
                    >
                      {showApiKey.youtube ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testApiKey("youtube")}
                      disabled={testingApiKey === "youtube" || !localSettings.apiKeys.youtube?.trim()}
                    >
                      {testingApiKey === "youtube" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "테스트"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    YouTube 트렌드 분석 및 업로드에 필요합니다.
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 ml-1"
                    >
                      Cloud Console에서 생성
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>

                <Separator />

                {/* Google Cloud Settings */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Google Cloud 프로젝트 ID</Label>
                    <Input
                      placeholder="my-project-id"
                      value={localSettings.apiKeys.googleCloud || ""}
                      onChange={(e) => updateNestedSettings("apiKeys", { googleCloud: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Vertex AI 사용 시 필요합니다
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Google Cloud 리전</Label>
                    <Select
                      value={localSettings.apiKeys.googleCloudLocation || "us-central1"}
                      onValueChange={(v) => updateNestedSettings("apiKeys", { googleCloudLocation: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-central1">us-central1 (아이오와)</SelectItem>
                        <SelectItem value="us-east1">us-east1 (사우스캐롤라이나)</SelectItem>
                        <SelectItem value="us-west1">us-west1 (오레곤)</SelectItem>
                        <SelectItem value="europe-west1">europe-west1 (벨기에)</SelectItem>
                        <SelectItem value="asia-northeast1">asia-northeast1 (도쿄)</SelectItem>
                        <SelectItem value="asia-northeast3">asia-northeast3 (서울)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Vertex AI 모델 배포 리전
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Key Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">API 키 설정 가이드</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">1</Badge>
                  <p>
                    <strong>Google AI API 키</strong>: AI Studio에서 무료로 생성 가능.
                    Gemini, Imagen (이미지), Veo (영상) 모두 이 키로 사용합니다.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">2</Badge>
                  <p>
                    <strong>YouTube API 키</strong>: 트렌드 분석에만 필요. 없어도 영상 생성 가능.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">3</Badge>
                  <p>
                    <strong>Google Cloud</strong>: Vertex AI 사용 시에만 필요. AI Studio 사용 시 불필요.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>고급 설정</CardTitle>
              <CardDescription>고급 사용자를 위한 설정입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>자동 저장</Label>
                  <p className="text-sm text-muted-foreground">
                    프로젝트 편집 시 자동으로 저장합니다
                  </p>
                </div>
                <Switch
                  checked={localSettings.autoSave}
                  onCheckedChange={(v) => updateLocalSettings({ autoSave: v })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-destructive">위험 구역</Label>
                <p className="text-sm text-muted-foreground">
                  아래 작업은 되돌릴 수 없습니다
                </p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => {
                    localStorage.clear();
                    toast.success("모든 로컬 데이터가 삭제되었습니다");
                    window.location.reload();
                  }}>
                    로컬 데이터 삭제
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>설정 초기화</DialogTitle>
            <DialogDescription>
              모든 설정을 기본값으로 되돌리시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              초기화
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
