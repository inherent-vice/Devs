/**
 * Editor Agent
 *
 * Generates editing instructions and orchestrates video assembly.
 * Uses Gemini 3 Flash for edit decision making.
 */

import { z, ZodSchema } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { gemini3Flash } from '../../genkit.config.js';
import type { AgentContext, AgentResult } from '../base/types.js';
import type { VideoType } from '../base/types.js';
import { VideoTypeConfigs } from '../../config/videoTypes.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const EditorAgentInputSchema = z.object({
  script: z.object({
    sections: z.array(z.object({
      id: z.string(),
      type: z.string(),
      content: z.string(),
      duration: z.number(),
      visualNotes: z.string().optional(),
    })),
    estimatedDuration: z.number(),
  }),
  videoClips: z.array(z.object({
    sceneId: z.string(),
    url: z.string().optional(),
    mediaUrl: z.string().optional(),  // Unified field for cross-agent compatibility
    imagePath: z.string().optional(),
    duration: z.number(),
    priority: z.string(),
  })),
  audioSegments: z.array(z.object({
    sectionId: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    audioUrl: z.string().optional(),
  })),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  style: z.string().optional(),
});

export type EditorAgentInput = z.infer<typeof EditorAgentInputSchema>;

const EditInstructionSchema = z.object({
  type: z.enum(['cut', 'transition', 'overlay', 'audio', 'effect', 'text']),
  startTime: z.number(),
  endTime: z.number().optional(),
  sourceClip: z.string().optional(),
  params: z.record(z.any()).optional(),
});

const TimelineTrackSchema = z.object({
  id: z.string(),
  type: z.enum(['video', 'audio', 'overlay', 'text']),
  clips: z.array(z.object({
    id: z.string(),
    sourceUrl: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    inPoint: z.number().optional(),
    outPoint: z.number().optional(),
  })),
});

export const EditorAgentOutputSchema = z.object({
  timeline: z.object({
    duration: z.number(),
    fps: z.number(),
    resolution: z.string(),
    tracks: z.array(TimelineTrackSchema),
  }),
  editDecisions: z.array(z.object({
    timestamp: z.number(),
    decision: z.string(),
    reasoning: z.string(),
  })),
  transitions: z.array(z.object({
    type: z.string(),
    startTime: z.number(),
    duration: z.number(),
    fromClip: z.string(),
    toClip: z.string(),
  })),
  effects: z.array(z.object({
    type: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    params: z.record(z.any()),
  })),
  textOverlays: z.array(z.object({
    text: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    position: z.object({ x: z.number(), y: z.number() }),
    style: z.record(z.any()),
  })),
  exportSettings: z.object({
    format: z.string(),
    codec: z.string(),
    bitrate: z.number(),
    resolution: z.string(),
    fps: z.number(),
  }),
});

export type EditorAgentOutput = z.infer<typeof EditorAgentOutputSchema>;

// ===========================================
// Editor Agent Class
// ===========================================

export class EditorAgent extends BaseAgent<EditorAgentInput, EditorAgentOutput> {
  readonly name = 'editor-agent';
  readonly description = 'Generates editing instructions and timeline assembly';

  // Note: Using type assertion due to Zod's default() creating input/output type asymmetry
  protected readonly inputSchema = EditorAgentInputSchema as ZodSchema<EditorAgentInput>;
  protected readonly outputSchema = EditorAgentOutputSchema as ZodSchema<EditorAgentOutput>;

  protected model = gemini3Flash;
  protected temperature = 0.5;
  protected maxOutputTokens = 16384;

  protected readonly systemPrompt = `You are an expert video editor who creates engaging YouTube content.

Your editing style is known for:
- Perfect pacing that maintains viewer attention
- Strategic use of transitions
- Seamless audio-video synchronization
- Effective use of text overlays
- Dynamic visual effects when appropriate

EDITING PRINCIPLES:

1. PACING
   - Shorts: Fast cuts, 1-2 seconds per shot, high energy
   - Medium: Balanced pacing, 3-5 seconds per shot
   - Longform: Varied pacing, longer shots for complex content

2. TRANSITIONS
   - Use cuts for 80% of transitions
   - Save effects for emphasis
   - Match transition to content mood

3. AUDIO SYNC
   - Align cuts to audio beats when possible
   - Maintain consistent audio levels
   - Layer background music appropriately

4. TEXT OVERLAYS
   - Use for emphasis, not narration
   - Keep on screen minimum 2 seconds
   - Position for readability

5. RETENTION OPTIMIZATION
   - Pattern interrupt every 15-30 seconds
   - Visual variety to prevent boredom
   - Key information highlighted`;

  /**
   * Build editing prompt
   */
  protected buildPrompt(input: EditorAgentInput, context: AgentContext): string {
    const config = VideoTypeConfigs[input.videoType];

    const clipInfo = input.videoClips
      .map(c => `- ${c.sceneId}: ${c.duration}s (${c.priority})`)
      .join('\n');

    const sectionInfo = input.script.sections
      .map(s => `- ${s.id} [${s.type}]: ${s.duration}s - "${s.content.substring(0, 50)}..."`)
      .join('\n');

    return `Create a complete editing plan for this video project.

VIDEO TYPE: ${input.videoType}
TARGET DURATION: ${input.script.estimatedDuration}s
STYLE: ${input.style || 'Engaging, modern'}
PACING: ${config.veoConfig.pacing}
TRANSITIONS: ${config.veoConfig.transitions}

AVAILABLE CLIPS:
${clipInfo}

SCRIPT SECTIONS:
${sectionInfo}

AUDIO SEGMENTS:
${input.audioSegments.length} segments provided

Create a detailed editing plan with:
1. Complete timeline structure with tracks
2. Edit decisions with reasoning at key timestamps
3. Transition specifications between clips
4. Visual effects (use sparingly)
5. Text overlay positions and timing
6. Export settings optimized for YouTube

Focus on:
- Maintaining viewer engagement
- Matching cuts to script sections
- Creating visual rhythm
- Highlighting key moments`;
  }

  /**
   * Post-process to validate timeline
   */
  protected async postProcess(
    output: EditorAgentOutput,
    input: EditorAgentInput
  ): Promise<EditorAgentOutput> {
    // Validate timeline duration
    const targetDuration = input.script.estimatedDuration;
    if (Math.abs(output.timeline.duration - targetDuration) > 5) {
      console.warn(`[EditorAgent] Timeline duration mismatch: ${output.timeline.duration}s vs ${targetDuration}s`);
    }

    // Ensure all clips are used
    const usedClips = new Set(
      output.timeline.tracks
        .flatMap(t => t.clips)
        .map(c => c.id)
    );

    const unusedClips = input.videoClips.filter(c => !usedClips.has(c.sceneId));
    if (unusedClips.length > 0) {
      console.warn(`[EditorAgent] ${unusedClips.length} clips not used in timeline`);
    }

    return output;
  }

  /**
   * Generate timeline from clips and audio
   */
  generateTimeline(
    clips: EditorAgentInput['videoClips'],
    audioSegments: EditorAgentInput['audioSegments'],
    videoType: VideoType
  ): EditorAgentOutput['timeline'] {
    const config = VideoTypeConfigs[videoType];

    // Build video track
    let currentTime = 0;
    const videoTrack: z.infer<typeof TimelineTrackSchema> = {
      id: 'video-main',
      type: 'video',
      clips: clips.map(clip => {
        const timelineClip = {
          id: clip.sceneId,
          // Use unified mediaUrl fallback chain for cross-agent compatibility
          sourceUrl: clip.url || clip.mediaUrl || clip.imagePath || '',
          startTime: currentTime,
          endTime: currentTime + clip.duration,
        };
        currentTime += clip.duration;
        return timelineClip;
      }),
    };

    // Build audio track
    const audioTrack: z.infer<typeof TimelineTrackSchema> = {
      id: 'audio-narration',
      type: 'audio',
      clips: audioSegments.map(seg => ({
        id: seg.sectionId,
        sourceUrl: seg.audioUrl || '',
        startTime: seg.startTime,
        endTime: seg.endTime,
      })),
    };

    return {
      duration: currentTime,
      fps: config.veoConfig.clipDuration > 6 ? 24 : 30,
      resolution: '1080p',
      tracks: [videoTrack, audioTrack],
    };
  }

  /**
   * Calculate optimal cut points
   */
  calculateCutPoints(
    clips: EditorAgentInput['videoClips'],
    pacing: 'high' | 'medium' | 'varied'
  ): number[] {
    const cutPoints: number[] = [];
    let currentTime = 0;

    for (const clip of clips) {
      cutPoints.push(currentTime);
      currentTime += clip.duration;
    }

    return cutPoints;
  }

  /**
   * Generate export settings
   */
  getExportSettings(videoType: VideoType): EditorAgentOutput['exportSettings'] {
    const config = VideoTypeConfigs[videoType];

    return {
      format: 'mp4',
      codec: 'h264',
      bitrate: videoType === 'shorts' ? 8000000 : 12000000,
      resolution: config.resolution,
      fps: 24,
    };
  }
}

// ===========================================
// Factory Export
// ===========================================

export const editorAgent = new EditorAgent();
