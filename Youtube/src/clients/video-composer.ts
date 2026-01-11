/**
 * Video Composer Client
 *
 * FFmpeg-based video composition for stitching images with audio and subtitles.
 * Creates final video from:
 * - Scene images (from Nano Banana Pro)
 * - Narration audio (from Gemini TTS)
 * - Subtitles (from script sections)
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { getLocalStorage, type LocalStorageManager } from '../storage/LocalStorageManager.js';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ===========================================
// Types
// ===========================================

export interface SceneImage {
  id: string;
  imagePath: string;
  duration: number; // seconds
  transition?: 'fade' | 'dissolve' | 'none';
  transitionDuration?: number; // seconds
}

export interface SubtitleEntry {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
  style?: SubtitleStyle;
}

export interface SubtitleStyle {
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  position?: 'bottom' | 'top' | 'center';
  fontName?: string;
}

export interface VideoCompositionRequest {
  sessionId: string; // Required for storage operations
  scenes: SceneImage[];
  audioPath?: string;
  subtitles?: SubtitleEntry[];
  outputFilename?: string;
  resolution?: { width: number; height: number };
  fps?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  format?: 'mp4' | 'webm' | 'mov';
}

export interface VideoCompositionResult {
  videoPath: string;
  duration: number;
  fileSize: number;
  resolution: { width: number; height: number };
  hasAudio: boolean;
  hasSubtitles: boolean;
}

// ===========================================
// Subtitle Generator
// ===========================================

export function generateSRT(subtitles: SubtitleEntry[]): string {
  return subtitles
    .map((sub, index) => {
      const startTime = formatSRTTime(sub.startTime);
      const endTime = formatSRTTime(sub.endTime);
      return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
    })
    .join('\n');
}

export function generateASS(subtitles: SubtitleEntry[], style?: SubtitleStyle): string {
  const defaultStyle = {
    fontSize: 24,
    fontColor: '&HFFFFFF',
    backgroundColor: '&H80000000',
    fontName: 'Arial',
    ...style,
  };

  const header = `[Script Info]
Title: YouTube Video Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
Timer: 100.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${defaultStyle.fontName},${defaultStyle.fontSize},${defaultStyle.fontColor},&H000000FF,&H00000000,${defaultStyle.backgroundColor},0,0,0,0,100,100,0,0,1,2,1,2,10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = subtitles
    .map((sub) => {
      const startTime = formatASSTime(sub.startTime);
      const endTime = formatASSTime(sub.endTime);
      // Clean text for ASS format
      const cleanText = sub.text.replace(/\n/g, '\\N');
      return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${cleanText}`;
    })
    .join('\n');

  return header + events;
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
}

function formatASSTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${pad(minutes, 2)}:${secs.toFixed(2).padStart(5, '0')}`;
}

function pad(num: number, size: number): string {
  return num.toString().padStart(size, '0');
}

// ===========================================
// YouTube-Optimized Subtitle Settings
// ===========================================

/**
 * YouTube 최적화 자막 설정 (한국어 기준)
 *
 * CPL (Characters Per Line): 16-18자 - 모바일에서 가독성 확보
 * CPS (Characters Per Second): 6-12자 - 읽기 속도 최적화
 * Duration: 1.5-7초 - 시청자 집중도 유지
 * Lead Time: 0.1-0.2초 - 음성보다 살짝 먼저 표시
 */
export const YOUTUBE_SUBTITLE_CONFIG = {
  korean: {
    maxCharsPerLine: 18,        // 한국어 16-18자 권장
    maxLinesPerSubtitle: 2,     // 최대 2줄
    minCPS: 6,                  // 초당 최소 6자 (느린 읽기)
    maxCPS: 12,                 // 초당 최대 12자 (빠른 읽기)
    targetCPS: 9,               // 기본 9자/초
    minDuration: 1.5,           // 최소 1.5초
    maxDuration: 7.0,           // 최대 7초
    leadTime: 0.15,             // 음성보다 0.15초 먼저
    gapBetweenSubtitles: 0.1,   // 자막 사이 최소 갭
  },
  english: {
    maxCharsPerLine: 42,        // 영어 37-42자 권장
    maxLinesPerSubtitle: 2,
    minCPS: 10,
    maxCPS: 20,
    targetCPS: 15,
    minDuration: 1.0,
    maxDuration: 7.0,
    leadTime: 0.15,
    gapBetweenSubtitles: 0.1,
  },
};

// 한국어 자연스러운 끊기 포인트 (조사, 어미 등)
const KOREAN_BREAK_PATTERNS = [
  /([을를이가은는도만])\s/g,      // 조사 뒤
  /([다요죠네요])\s/g,            // 종결어미 뒤
  /(하고|그리고|그러나|그래서|때문에|에서|에게)\s/g,  // 접속사/부사 뒤
  /([,，、])\s*/g,                // 쉼표 뒤
];

// ===========================================
// Script to Subtitles Converter
// ===========================================

export interface ScriptSection {
  id: string;
  content: string;
  duration: number;
}

export interface SubtitleOptions {
  language?: 'korean' | 'english';
  maxCharsPerLine?: number;
  maxLinesPerSubtitle?: number;
  targetCPS?: number;
}

export function scriptToSubtitles(
  sections: ScriptSection[],
  options?: SubtitleOptions
): SubtitleEntry[] {
  const lang = options?.language || 'korean';
  const config = YOUTUBE_SUBTITLE_CONFIG[lang];

  const maxChars = options?.maxCharsPerLine || config.maxCharsPerLine;
  const maxLines = options?.maxLinesPerSubtitle || config.maxLinesPerSubtitle;
  const targetCPS = options?.targetCPS || config.targetCPS;

  const subtitles: SubtitleEntry[] = [];
  let currentTime = 0;

  for (const section of sections) {
    const sectionStartTime = currentTime;
    const sectionEndTime = sectionStartTime + section.duration;

    // 자연스러운 끊기로 문장 분할
    const chunks = splitKoreanText(section.content, maxChars, maxLines);

    // 각 청크의 duration 계산 (CPS 기반)
    const totalChars = chunks.reduce((sum, c) => sum + c.replace(/\n/g, '').length, 0);
    const avgTimePerChar = section.duration / totalChars;

    for (const chunk of chunks) {
      const chunkLength = chunk.replace(/\n/g, '').length;

      // CPS 기반 duration 계산
      let duration = chunkLength / targetCPS;

      // min/max duration 적용
      duration = Math.max(duration, config.minDuration);
      duration = Math.min(duration, config.maxDuration);

      // CPS 검증 및 조정
      const actualCPS = chunkLength / duration;
      if (actualCPS > config.maxCPS) {
        duration = chunkLength / config.maxCPS;
      } else if (actualCPS < config.minCPS && duration > config.minDuration) {
        duration = Math.max(chunkLength / config.minCPS, config.minDuration);
      }

      // Lead time 적용 (첫 자막은 살짝 빠르게)
      const startTime = subtitles.length === 0
        ? Math.max(0, currentTime - config.leadTime)
        : currentTime;

      const endTime = Math.min(startTime + duration, sectionEndTime - 0.05);

      if (endTime > startTime) {
        subtitles.push({
          id: `sub_${subtitles.length + 1}`,
          startTime: parseFloat(startTime.toFixed(2)),
          endTime: parseFloat(endTime.toFixed(2)),
          text: chunk,
        });
      }

      currentTime = endTime + config.gapBetweenSubtitles;
    }

    // 섹션 경계 맞추기
    currentTime = sectionEndTime;
  }

  return subtitles;
}

/**
 * 한국어 텍스트를 자연스러운 끊기로 분할
 */
function splitKoreanText(text: string, maxChars: number, maxLines: number): string[] {
  const chunks: string[] = [];

  // 먼저 문장 단위로 분할
  const sentences = splitIntoSentences(text);

  for (const sentence of sentences) {
    if (sentence.length <= maxChars * maxLines) {
      // 짧은 문장은 그대로
      const formatted = formatKoreanLines(sentence, maxChars);
      chunks.push(formatted);
    } else {
      // 긴 문장은 자연스러운 포인트에서 분할
      const parts = splitAtNaturalBreaks(sentence, maxChars * maxLines);
      for (const part of parts) {
        const formatted = formatKoreanLines(part, maxChars);
        chunks.push(formatted);
      }
    }
  }

  return chunks;
}

/**
 * 자연스러운 끊기 포인트에서 텍스트 분할
 */
function splitAtNaturalBreaks(text: string, maxLength: number): string[] {
  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // maxLength 내에서 가장 좋은 끊기 포인트 찾기
    let bestBreak = maxLength;

    // 자연스러운 끊기 패턴 검색 (역순으로)
    for (const pattern of KOREAN_BREAK_PATTERNS) {
      const substring = remaining.substring(0, maxLength);
      const matches = [...substring.matchAll(pattern)];

      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const breakPoint = lastMatch.index! + lastMatch[0].length;

        if (breakPoint > maxLength * 0.5 && breakPoint < bestBreak) {
          bestBreak = breakPoint;
        }
      }
    }

    // 공백에서 끊기 (패턴 못 찾은 경우)
    if (bestBreak === maxLength) {
      const lastSpace = remaining.substring(0, maxLength).lastIndexOf(' ');
      if (lastSpace > maxLength * 0.5) {
        bestBreak = lastSpace + 1;
      }
    }

    parts.push(remaining.substring(0, bestBreak).trim());
    remaining = remaining.substring(bestBreak).trim();
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }

  return parts;
}

/**
 * 한국어 텍스트를 줄바꿈으로 포맷
 */
function formatKoreanLines(text: string, maxCharsPerLine: number): string {
  if (text.length <= maxCharsPerLine) {
    return text;
  }

  // 중간 지점에서 자연스러운 끊기 찾기
  const midPoint = Math.floor(text.length / 2);
  let breakPoint = midPoint;

  // 중간 근처에서 끊기 포인트 찾기
  for (let i = 0; i < midPoint; i++) {
    // 뒤쪽 먼저 검사
    if (midPoint + i < text.length && /[\s,，、을를이가은는]/.test(text[midPoint + i])) {
      breakPoint = midPoint + i + 1;
      break;
    }
    // 앞쪽 검사
    if (midPoint - i > 0 && /[\s,，、을를이가은는]/.test(text[midPoint - i])) {
      breakPoint = midPoint - i + 1;
      break;
    }
  }

  const line1 = text.substring(0, breakPoint).trim();
  const line2 = text.substring(breakPoint).trim();

  // 두 줄 다 maxCharsPerLine 초과하지 않도록
  if (line1.length > maxCharsPerLine || line2.length > maxCharsPerLine) {
    // 강제로 반으로 자르기
    return text.substring(0, maxCharsPerLine) + '\n' + text.substring(maxCharsPerLine);
  }

  return `${line1}\n${line2}`;
}

function splitIntoSentences(text: string): string[] {
  // Split by Korean/English sentence endings
  return text
    .split(/(?<=[.!?。！？])\s*/)
    .filter((s) => s.trim().length > 0);
}

// ===========================================
// Video Composer
// ===========================================

export class VideoComposer {
  private storage: LocalStorageManager;
  private tempDir: string;

  constructor() {
    this.storage = getLocalStorage();
    this.tempDir = path.join(process.cwd(), 'output', 'temp');
    this.ensureDir(this.tempDir);
  }

  /**
   * Compose video from images, audio, and subtitles
   */
  async compose(request: VideoCompositionRequest): Promise<VideoCompositionResult> {
    const {
      sessionId,
      scenes,
      audioPath,
      subtitles,
      resolution = { width: 1920, height: 1080 },
      fps = 30,
      videoBitrate = '5000k',
      audioBitrate = '192k',
      format = 'mp4',
    } = request;

    if (!sessionId) {
      throw new Error('sessionId is required for video composition');
    }

    console.log(`[VideoComposer] Starting composition with ${scenes.length} scenes`);

    // Generate subtitle file if provided
    let subtitlePath: string | undefined;
    if (subtitles && subtitles.length > 0) {
      subtitlePath = await this.createSubtitleFile(sessionId, subtitles);
      console.log(`[VideoComposer] Created subtitle file: ${subtitlePath}`);
    }

    // Create concat file for images
    const concatFilePath = await this.createConcatFile(scenes, fps);
    console.log(`[VideoComposer] Created concat file: ${concatFilePath}`);

    // Generate output filename
    const outputFilename = request.outputFilename || `video-${Date.now()}.${format}`;
    const outputPath = path.join(this.storage.getSessionDir(sessionId), 'video', outputFilename);
    this.ensureDir(path.dirname(outputPath));

    // Compose video
    await this.runFFmpeg({
      concatFilePath,
      audioPath,
      subtitlePath,
      outputPath,
      resolution,
      fps,
      videoBitrate,
      audioBitrate,
      format,
    });

    // Get file stats
    const stats = fs.statSync(outputPath);
    const duration = scenes.reduce((acc, s) => acc + s.duration, 0);

    // Register asset with explicit sessionId
    this.storage.saveMetadata(
      sessionId,
      {
        type: 'video',
        filename: outputFilename,
        duration,
        resolution,
        hasAudio: !!audioPath,
        hasSubtitles: !!subtitles,
        sceneCount: scenes.length,
      },
      'video-metadata.json'
    );

    console.log(`[VideoComposer] Video created: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    // Cleanup temp files
    this.cleanup([concatFilePath, subtitlePath].filter(Boolean) as string[]);

    return {
      videoPath: outputPath,
      duration,
      fileSize: stats.size,
      resolution,
      hasAudio: !!audioPath,
      hasSubtitles: !!subtitles && subtitles.length > 0,
    };
  }

  /**
   * Create concat file for FFmpeg
   */
  private async createConcatFile(scenes: SceneImage[], fps: number): Promise<string> {
    const concatPath = path.join(this.tempDir, `concat-${Date.now()}.txt`);
    const lines: string[] = [];

    for (const scene of scenes) {
      // FFmpeg concat format: file 'path' + duration
      const escapedPath = scene.imagePath.replace(/\\/g, '/').replace(/'/g, "'\\''");
      lines.push(`file '${escapedPath}'`);
      lines.push(`duration ${scene.duration}`);
    }

    // Add last file again (FFmpeg concat demuxer quirk)
    if (scenes.length > 0) {
      const lastScene = scenes[scenes.length - 1];
      const escapedPath = lastScene.imagePath.replace(/\\/g, '/').replace(/'/g, "'\\''");
      lines.push(`file '${escapedPath}'`);
    }

    fs.writeFileSync(concatPath, lines.join('\n'), 'utf-8');
    return concatPath;
  }

  /**
   * Create ASS subtitle file
   */
  private async createSubtitleFile(sessionId: string, subtitles: SubtitleEntry[]): Promise<string> {
    const assPath = path.join(this.tempDir, `subtitles-${Date.now()}.ass`);
    const assContent = generateASS(subtitles, {
      fontSize: 28,
      fontColor: '&HFFFFFF',
      backgroundColor: '&H80000000',
      fontName: 'Arial',
    });
    fs.writeFileSync(assPath, assContent, 'utf-8');

    // Also save SRT to session with explicit sessionId
    const srtContent = generateSRT(subtitles);
    this.storage.saveSubtitle(sessionId, srtContent, 'subtitles.srt');

    return assPath;
  }

  /**
   * Run FFmpeg composition
   */
  private runFFmpeg(options: {
    concatFilePath: string;
    audioPath?: string;
    subtitlePath?: string;
    outputPath: string;
    resolution: { width: number; height: number };
    fps: number;
    videoBitrate: string;
    audioBitrate: string;
    format: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg()
        .input(options.concatFilePath)
        .inputOptions(['-f', 'concat', '-safe', '0']);

      // Add audio if provided
      if (options.audioPath && fs.existsSync(options.audioPath)) {
        command = command.input(options.audioPath);
      }

      // Build filter complex for subtitles
      const filters: string[] = [];

      // Scale to target resolution
      filters.push(`scale=${options.resolution.width}:${options.resolution.height}:force_original_aspect_ratio=decrease`);
      filters.push(`pad=${options.resolution.width}:${options.resolution.height}:(ow-iw)/2:(oh-ih)/2`);

      // Add subtitles if provided
      if (options.subtitlePath && fs.existsSync(options.subtitlePath)) {
        const escapedSubPath = options.subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
        filters.push(`ass='${escapedSubPath}'`);
      }

      command
        .videoFilters(filters)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-b:v', options.videoBitrate,
          '-r', options.fps.toString(),
          '-pix_fmt', 'yuv420p',
        ]);

      // Audio options
      if (options.audioPath && fs.existsSync(options.audioPath)) {
        command.outputOptions([
          '-c:a', 'aac',
          '-b:a', options.audioBitrate,
          '-shortest', // End when shortest stream ends
        ]);
      } else {
        command.noAudio();
      }

      command
        .output(options.outputPath)
        .on('start', (cmd: string) => {
          console.log(`[VideoComposer] FFmpeg command: ${cmd.substring(0, 200)}...`);
        })
        .on('progress', (progress: { percent?: number }) => {
          if (progress.percent) {
            process.stdout.write(`\r[VideoComposer] Progress: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('\n[VideoComposer] FFmpeg completed');
          resolve();
        })
        .on('error', (err: Error) => {
          console.error('\n[VideoComposer] FFmpeg error:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Create a simple test image for debugging
   */
  async createTestImage(
    text: string,
    outputPath: string,
    options?: { width?: number; height?: number; bgColor?: string }
  ): Promise<string> {
    const { width = 1920, height = 1080, bgColor = 'black' } = options || {};

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`color=c=${bgColor}:s=${width}x${height}:d=1`)
        .inputOptions(['-f', 'lavfi'])
        .videoFilters([
          `drawtext=text='${text.replace(/'/g, "\\'")}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
        ])
        .outputOptions(['-frames:v', '1'])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private cleanup(files: string[]): void {
    for (const file of files) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// ===========================================
// Singleton Export
// ===========================================

let composerInstance: VideoComposer | null = null;

export function getVideoComposer(): VideoComposer {
  if (!composerInstance) {
    composerInstance = new VideoComposer();
  }
  return composerInstance;
}
