"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Loader2,
  RotateCcw,
} from "lucide-react";

interface AudioPlayerProps {
  src?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  autoPlay?: boolean;
  loop?: boolean;
  showVolume?: boolean;
  showSpeed?: boolean;
  compact?: boolean;
  className?: string;
}

export function AudioPlayer({
  src,
  onPlay,
  onPause,
  onEnded,
  onError,
  autoPlay = false,
  loop = false,
  showVolume = true,
  showSpeed = false,
  compact = false,
  className,
}: AudioPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when src changes
  React.useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsLoading(!!src);
  }, [src]);

  // Audio event handlers
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      const errorMsg = "오디오를 로드할 수 없습니다";
      setError(errorMsg);
      onError?.(new Error(errorMsg));
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      if (autoPlay) {
        audio.play().catch(() => {});
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [autoPlay, onEnded, onError, onPause, onPlay]);

  // Apply volume changes
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Apply playback rate changes
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const seek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <audio ref={audioRef} src={src} loop={loop} preload="metadata" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={togglePlay}
          disabled={!src || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-[100px]">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={seek}
            disabled={!src || duration === 0}
            className="cursor-pointer"
          />
        </div>

        <span className="text-xs text-muted-foreground min-w-[70px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <audio ref={audioRef} src={src} loop={loop} preload="metadata" />

      {/* Error display */}
      {error && (
        <div className="text-sm text-destructive text-center py-2">
          {error}
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-1">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={seek}
          disabled={!src || duration === 0}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            disabled={!src || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          {/* Stop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={stop}
            disabled={!src || (!isPlaying && currentTime === 0)}
          >
            <Square className="h-4 w-4" />
          </Button>

          {/* Restart */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            disabled={!src}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Speed control */}
          {showSpeed && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">속도</span>
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                className="h-7 text-xs bg-transparent border rounded px-1"
                disabled={!src}
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          )}

          {/* Volume control */}
          {showVolume && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleMute}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={(value) => {
                  setVolume(value[0]);
                  if (value[0] > 0) setIsMuted(false);
                }}
                className="w-20 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact inline player for voice cards
export function AudioPlayerInline({
  src,
  onPlay,
  onEnded,
  className,
}: {
  src?: string;
  onPlay?: () => void;
  onEnded?: () => void;
  className?: string;
}) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    setIsPlaying(false);
    setIsLoading(!!src);
  }, [src]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [onEnded, onPlay]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        // Stop all other audio players
        document.querySelectorAll("audio").forEach((a) => {
          if (a !== audio) a.pause();
        });
        await audio.play();
      }
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  return (
    <div className={cn("inline-flex items-center", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 gap-1"
        onClick={togglePlay}
        disabled={!src || isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
        <span className="text-xs">미리듣기</span>
      </Button>
    </div>
  );
}
