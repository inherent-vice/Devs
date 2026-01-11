/**
 * Subtitle Agent
 *
 * Generates subtitles/captions from script content.
 * Supports SRT, VTT, and styled ASS formats.
 */

import { z, ZodSchema } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { gemini3Flash } from '../../genkit.config.js';
import type { AgentContext, AgentResult } from '../base/types.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const SubtitleInputSchema = z.object({
  script: z.object({
    sections: z.array(z.object({
      id: z.string(),
      content: z.string(),
      duration: z.number(),
      type: z.string().optional(),
    })),
    fullText: z.string().optional(),
    estimatedDuration: z.number(),
  }),
  language: z.enum(['ko', 'en', 'ja', 'zh']),
  style: z.object({
    fontSize: z.enum(['small', 'medium', 'large']).default('large'),
    position: z.enum(['bottom', 'center', 'top']).default('bottom'),
    color: z.string().default('#FFFFFF'),
    backgroundColor: z.string().default('#000000'),
    backgroundOpacity: z.number().min(0).max(1).default(0.7),
    fontFamily: z.string().default('Pretendard'),
    outline: z.boolean().default(true),
    animation: z.enum(['none', 'fade', 'pop', 'typewriter']).default('pop'),
  }).optional(),
  maxCharsPerLine: z.number().min(10).max(50).default(20),
  maxLinesPerSubtitle: z.number().min(1).max(3).default(2),
  wordsPerMinute: z.number().min(100).max(300).default(180),
});

export type SubtitleInput = z.infer<typeof SubtitleInputSchema>;

export const SubtitleCueSchema = z.object({
  id: z.number(),
  startTime: z.number(), // milliseconds
  endTime: z.number(),
  text: z.string(),
  style: z.object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    color: z.string().optional(),
    position: z.string().optional(),
  }).optional(),
});

export const SubtitleOutputSchema = z.object({
  cues: z.array(SubtitleCueSchema),
  srt: z.string(),
  vtt: z.string(),
  ass: z.string(),
  metadata: z.object({
    totalCues: z.number(),
    totalDuration: z.number(),
    averageCueDuration: z.number(),
    language: z.string(),
    wordsPerMinute: z.number(),
  }),
  // FFmpeg filter for burning subtitles
  ffmpegFilter: z.string(),
});

export type SubtitleOutput = z.infer<typeof SubtitleOutputSchema>;

// ===========================================
// Subtitle Styles
// ===========================================

const SUBTITLE_STYLES = {
  youtube_shorts: {
    fontSize: 'large',
    position: 'center',
    color: '#FFFFFF',
    backgroundColor: '#000000',
    backgroundOpacity: 0.8,
    fontFamily: 'Pretendard',
    outline: true,
    animation: 'pop',
  },
  documentary: {
    fontSize: 'medium',
    position: 'bottom',
    color: '#FFFFFF',
    backgroundColor: '#000000',
    backgroundOpacity: 0.6,
    fontFamily: 'Pretendard',
    outline: true,
    animation: 'fade',
  },
  minimal: {
    fontSize: 'small',
    position: 'bottom',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    backgroundOpacity: 0,
    fontFamily: 'Pretendard',
    outline: true,
    animation: 'none',
  },
};

// ===========================================
// Subtitle Agent Class
// ===========================================

export class SubtitleAgent extends BaseAgent<SubtitleInput, SubtitleOutput> {
  readonly name = 'subtitle-agent';
  readonly description = 'Generates subtitles/captions from script';

  // Note: Using type assertion due to Zod's default() creating input/output type asymmetry
  protected readonly inputSchema = SubtitleInputSchema as ZodSchema<SubtitleInput>;
  protected readonly outputSchema = SubtitleOutputSchema as ZodSchema<SubtitleOutput>;

  protected model = gemini3Flash;
  protected temperature = 0.3; // Low temperature for consistent timing
  protected maxRetries = 2;

  protected readonly systemPrompt = `You are an expert subtitle creator for YouTube videos.

Your subtitles are:
- Perfectly timed for readability
- Split at natural speech breaks
- Never too long (max 2 lines, 20 chars per line for Shorts)
- Synchronized with visual content

KOREAN SUBTITLE RULES:
- Use natural Korean sentence breaks
- Keep particles (은/는/이/가) with their words
- Break at commas and periods
- Emphasis words can be isolated for impact`;

  /**
   * Execute subtitle generation
   */
  async execute(
    input: SubtitleInput,
    context: AgentContext
  ): Promise<AgentResult<SubtitleOutput>> {
    const startTime = Date.now();

    try {
      console.log(`[SubtitleAgent] Generating subtitles for ${input.script.sections.length} sections`);

      // Generate subtitle cues from script
      const cues = this.generateCues(input);

      // Generate different formats
      const srt = this.generateSRT(cues);
      const vtt = this.generateVTT(cues);
      const ass = this.generateASS(cues, input.style);

      // Generate FFmpeg filter
      const ffmpegFilter = this.generateFFmpegFilter(input.style);

      const totalDuration = cues.length > 0
        ? cues[cues.length - 1].endTime
        : input.script.estimatedDuration * 1000;

      console.log(`[SubtitleAgent] Generated ${cues.length} cues, ${(totalDuration / 1000).toFixed(1)}s`);

      return this.createSuccessResult(
        {
          cues,
          srt,
          vtt,
          ass,
          metadata: {
            totalCues: cues.length,
            totalDuration,
            averageCueDuration: cues.length > 0 ? totalDuration / cues.length : 0,
            language: input.language,
            wordsPerMinute: input.wordsPerMinute,
          },
          ffmpegFilter,
        },
        {
          duration: Date.now() - startTime,
          tokensUsed: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          retryCount: 0,
        }
      );
    } catch (error) {
      return this.createErrorResult(
        {
          type: 'api', // Changed from 'processing' to valid type
          message: error instanceof Error ? error.message : 'Subtitle generation failed',
          retryable: true,
        },
        startTime,
        0
      );
    }
  }

  /**
   * Generate subtitle cues from script sections
   */
  private generateCues(input: SubtitleInput): z.infer<typeof SubtitleCueSchema>[] {
    const cues: z.infer<typeof SubtitleCueSchema>[] = [];
    let currentTime = 0;
    let cueId = 1;

    for (const section of input.script.sections) {
      const sectionDuration = section.duration * 1000; // Convert to ms
      const text = section.content;

      // Split text into subtitle-sized chunks
      const chunks = this.splitTextIntoChunks(text, input.maxCharsPerLine, input.maxLinesPerSubtitle);

      // Calculate time per chunk based on text length
      const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
      if (totalChars === 0) {
        currentTime += sectionDuration;
        continue;
      }
      const charsPerMs = totalChars / sectionDuration;

      let sectionTime = currentTime;

      for (const chunk of chunks) {
        const chunkDuration = Math.max(1000, chunk.length / charsPerMs); // Min 1 second
        const endTime = Math.min(sectionTime + chunkDuration, currentTime + sectionDuration);

        cues.push({
          id: cueId++,
          startTime: Math.round(sectionTime),
          endTime: Math.round(endTime),
          text: chunk,
        });

        sectionTime = endTime;
      }

      currentTime += sectionDuration;
    }

    return cues;
  }

  /**
   * Split text into subtitle-sized chunks
   */
  private splitTextIntoChunks(
    text: string,
    maxCharsPerLine: number,
    maxLines: number
  ): string[] {
    const chunks: string[] = [];
    const maxCharsPerChunk = maxCharsPerLine * maxLines;

    // Split by sentences first
    const sentences = text.split(/(?<=[.!?])\s+/);

    let currentChunk = '';

    for (const sentence of sentences) {
      // If sentence fits in current chunk
      if ((currentChunk + ' ' + sentence).trim().length <= maxCharsPerChunk) {
        currentChunk = (currentChunk + ' ' + sentence).trim();
      } else {
        // Save current chunk if not empty
        if (currentChunk) {
          chunks.push(this.formatChunk(currentChunk, maxCharsPerLine));
        }

        // If sentence is too long, split it further
        if (sentence.length > maxCharsPerChunk) {
          const words = sentence.split(/\s+/);
          currentChunk = '';

          for (const word of words) {
            if ((currentChunk + ' ' + word).trim().length <= maxCharsPerChunk) {
              currentChunk = (currentChunk + ' ' + word).trim();
            } else {
              if (currentChunk) {
                chunks.push(this.formatChunk(currentChunk, maxCharsPerLine));
              }
              currentChunk = word;
            }
          }
        } else {
          currentChunk = sentence;
        }
      }
    }

    // Add remaining chunk
    if (currentChunk) {
      chunks.push(this.formatChunk(currentChunk, maxCharsPerLine));
    }

    return chunks;
  }

  /**
   * Format chunk with line breaks
   */
  private formatChunk(text: string, maxCharsPerLine: number): string {
    if (text.length <= maxCharsPerLine) {
      return text;
    }

    // Find best break point near middle
    const words = text.split(/\s+/);
    let line1 = '';
    let line2 = '';

    for (const word of words) {
      if ((line1 + ' ' + word).trim().length <= maxCharsPerLine && !line2) {
        line1 = (line1 + ' ' + word).trim();
      } else {
        line2 = (line2 + ' ' + word).trim();
      }
    }

    return line2 ? `${line1}\n${line2}` : line1;
  }

  /**
   * Generate SRT format
   */
  private generateSRT(cues: z.infer<typeof SubtitleCueSchema>[]): string {
    return cues.map(cue => {
      const start = this.formatTimeSRT(cue.startTime);
      const end = this.formatTimeSRT(cue.endTime);
      return `${cue.id}\n${start} --> ${end}\n${cue.text}\n`;
    }).join('\n');
  }

  /**
   * Generate VTT format
   */
  private generateVTT(cues: z.infer<typeof SubtitleCueSchema>[]): string {
    const header = 'WEBVTT\n\n';
    const body = cues.map(cue => {
      const start = this.formatTimeVTT(cue.startTime);
      const end = this.formatTimeVTT(cue.endTime);
      return `${cue.id}\n${start} --> ${end}\n${cue.text}\n`;
    }).join('\n');

    return header + body;
  }

  /**
   * Generate ASS format with styling
   */
  private generateASS(
    cues: z.infer<typeof SubtitleCueSchema>[],
    style?: SubtitleInput['style']
  ): string {
    const s = style || SUBTITLE_STYLES.youtube_shorts;

    const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${s.fontFamily || 'Pretendard'},${this.getFontSize(s.fontSize)},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,0,${this.getAlignment(s.position)},50,50,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const events = cues.map(cue => {
      const start = this.formatTimeASS(cue.startTime);
      const end = this.formatTimeASS(cue.endTime);
      const text = cue.text.replace(/\n/g, '\\N');
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    }).join('\n');

    return header + events;
  }

  /**
   * Generate FFmpeg filter for subtitle overlay
   */
  private generateFFmpegFilter(style?: SubtitleInput['style']): string {
    const s = style || SUBTITLE_STYLES.youtube_shorts;

    const fontSize = this.getFontSize(s.fontSize);
    const position = s.position === 'center' ? '(h-text_h)/2' :
                     s.position === 'top' ? '50' : 'h-text_h-50';

    return `subtitles=subtitles.ass:force_style='FontSize=${fontSize},FontName=${s.fontFamily || 'Pretendard'},PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=3,Outline=2,Shadow=0,Alignment=2'`;
  }

  // Time formatting helpers
  private formatTimeSRT(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }

  private formatTimeVTT(ms: number): string {
    return this.formatTimeSRT(ms).replace(',', '.');
  }

  private formatTimeASS(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }

  private getFontSize(size?: string): number {
    switch (size) {
      case 'small': return 48;
      case 'medium': return 64;
      case 'large': return 80;
      default: return 64;
    }
  }

  private getAlignment(position?: string): number {
    switch (position) {
      case 'top': return 8;
      case 'center': return 5;
      case 'bottom': return 2;
      default: return 2;
    }
  }

  protected buildPrompt(input: SubtitleInput, context: AgentContext): string {
    return '';
  }
}

// ===========================================
// Factory Export
// ===========================================

export const subtitleAgent = new SubtitleAgent();
