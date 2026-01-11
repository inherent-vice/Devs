/**
 * Production Flow
 *
 * Orchestrates the production phase with parallel execution:
 * Voice + Video + Thumbnail in parallel → Editor
 *
 * Updated for Genkit 1.27+ API
 */

import { z } from 'zod';
import { ai } from '../genkit.config.js';
import { voiceAgent } from '../agents/production/VoiceAgent.js';
import { videoAgent } from '../agents/production/VideoAgent.js';
import { imageVideoAgent } from '../agents/production/ImageVideoAgent.js';
import { thumbnailAgent } from '../agents/production/ThumbnailAgent.js';
import { editorAgent } from '../agents/production/EditorAgent.js';
import { subtitleAgent } from '../agents/production/SubtitleAgent.js';
import type { AgentContext, VideoType } from '../agents/base/types.js';
import { VideoTypeConfigs } from '../config/videoTypes.js';

// ===========================================
// Flow Input/Output Schemas
// ===========================================

export const ProductionFlowInputSchema = z.object({
  sessionId: z.string(),
  script: z.object({
    title: z.string(),
    hook: z.string(),
    sections: z.array(z.object({
      id: z.string(),
      type: z.string(),
      content: z.string(),
      duration: z.number(),
      visualNotes: z.string().optional(),
      audioNotes: z.string().optional(),
    })),
    callToAction: z.string(),
    estimatedDuration: z.number(),
    fullText: z.string(),
    keywords: z.array(z.string()),
  }),
  storyboard: z.object({
    scenes: z.array(z.object({
      id: z.string(),
      description: z.string(),
      prompt: z.string(),
      duration: z.number(),
      priority: z.enum(['hero', 'standard', 'b-roll']),
      visualStyle: z.string().optional(),
    })),
    totalDuration: z.number(),
    videoType: z.enum(['shorts', 'medium', 'longform']),
    style: z.string().optional(),
  }),
  topic: z.object({
    title: z.string(),
    hook: z.string(),
    angle: z.string(),
  }),
  thumbnailConcepts: z.array(z.object({
    description: z.string(),
    textOverlay: z.string().optional(),
    emotionalTrigger: z.string(),
  })).optional(),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  language: z.string().default('ko-KR'),
  useFastGeneration: z.boolean().default(true),
  // New options for image-based video and subtitles
  useImageMode: z.boolean().default(true), // Use images + Ken Burns instead of Veo
  generateSubtitles: z.boolean().default(true), // Generate subtitles
  subtitleStyle: z.object({
    fontSize: z.enum(['small', 'medium', 'large']).default('large'),
    position: z.enum(['bottom', 'center', 'top']).default('center'),
    animation: z.enum(['none', 'fade', 'pop', 'typewriter']).default('pop'),
  }).optional(),
  // Voice settings from user configuration
  voiceSettings: z.object({
    voiceName: z.string(),
    speakingRate: z.number().min(0.5).max(2.0),
    stylePrompt: z.string().optional(),
  }).optional(),
  // Output settings
  thumbnailVariants: z.number().min(1).max(5).default(3),
  resolution: z.string().default('1080p'),
  productionStyle: z.string().optional(),
});

export type ProductionFlowInput = z.infer<typeof ProductionFlowInputSchema>;

export const ProductionFlowOutputSchema = z.object({
  sessionId: z.string(),
  voice: z.any(),
  video: z.any(),
  thumbnails: z.any(),
  subtitles: z.any().optional(),
  edited: z.any(),
  // Final composed video (when using image mode with composition)
  finalVideo: z.object({
    path: z.string(),
    fileSize: z.number(),
    duration: z.number(),
    hasAudio: z.boolean(),
    hasSubtitles: z.boolean(),
  }).nullable(),
  metadata: z.object({
    totalDuration: z.number(),
    totalCost: z.number(),
    useImageMode: z.boolean(),
    hasFinalVideo: z.boolean(),
    phases: z.array(z.object({
      name: z.string(),
      duration: z.number(),
      cost: z.number(),
      parallel: z.boolean(),
    })),
  }),
});

export type ProductionFlowOutput = z.infer<typeof ProductionFlowOutputSchema>;

// ===========================================
// Production Flow Definition
// ===========================================

export const productionFlow = ai.defineFlow(
  {
    name: 'production-flow',
    inputSchema: ProductionFlowInputSchema,
    outputSchema: ProductionFlowOutputSchema,
  },
  async (input: ProductionFlowInput): Promise<ProductionFlowOutput> => {
    console.log(`[ProductionFlow] Starting for session ${input.sessionId}`);
    const startTime = Date.now();
    const phases: { name: string; duration: number; cost: number; parallel: boolean }[] = [];
    let totalCost = 0;

    // Create agent context
    const context: AgentContext = {
      sessionId: input.sessionId,
      phase: 'production',
      videoType: input.videoType,
      maxCost: 100.0,
    };

    // ===========================================
    // Stage 1: Voice Generation (Sequential - needed for audio path)
    // ===========================================
    const useImageMode = input.useImageMode !== false; // Default to true
    console.log(`[ProductionFlow] Starting 2-stage production (${useImageMode ? 'Image Mode' : 'Veo Mode'})`);

    // Extract voice settings (use user settings or defaults)
    const voiceName = input.voiceSettings?.voiceName || 'Kore';
    const speakingRate = input.voiceSettings?.speakingRate || 1.0;
    const voiceStylePrompt = input.voiceSettings?.stylePrompt || '';

    // Map style prompt to enum value (VoiceAgent expects specific enum values)
    const getStyleEnum = (prompt: string): 'narration' | 'conversational' | 'news' | 'energetic' => {
      const lower = prompt.toLowerCase();
      if (lower.includes('news') || lower.includes('anchor') || lower.includes('뉴스')) return 'news';
      if (lower.includes('conversation') || lower.includes('friendly') || lower.includes('친근')) return 'conversational';
      if (lower.includes('calm') || lower.includes('professional') || lower.includes('narrat') || lower.includes('전문')) return 'narration';
      return 'energetic'; // Default
    };
    const voiceStyle = getStyleEnum(voiceStylePrompt);

    console.log(`[ProductionFlow] Stage 1: Voice generation (${voiceName}, ${speakingRate}x, ${voiceStyle})`);
    const voiceStart = Date.now();

    // Stage 1: Voice Generation FIRST (to get audioPath for video composition)
    const voiceResult = await voiceAgent.execute(
      {
        script: {
          fullText: input.script.fullText,
          sections: input.script.sections.map(s => ({
            id: s.id,
            content: s.content,
            duration: s.duration,
            audioNotes: s.audioNotes,
          })),
        },
        language: input.language,
        voicePreference: {
          voiceName: voiceName,
          gender: 'neutral',
          age: 'middle',
          style: voiceStyle,
        },
        speakingRate: speakingRate,
        pitch: 0,
        outputFormat: 'mp3',
      },
      context
    );

    if (!voiceResult.success) {
      throw new Error(`Voice generation failed: ${voiceResult.error?.message}`);
    }

    const voiceDuration = Date.now() - voiceStart;
    const voiceCost = voiceResult.metrics?.cost || 0;
    phases.push({ name: 'voice-generation', duration: voiceDuration, cost: voiceCost, parallel: false });
    totalCost += voiceCost;

    // Extract audio URL for video composition (VoiceAgent returns audioUrl)
    const audioPath = voiceResult.data?.audioUrl;
    console.log(`[ProductionFlow] Voice generated: ${audioPath} (${voiceDuration}ms, $${voiceCost.toFixed(4)})`);

    // ===========================================
    // Stage 2: Parallel Generation (Video/Images + Thumbnail + Subtitles)
    // Now with audioPath available for video composition
    // ===========================================
    console.log('[ProductionFlow] Stage 2: Parallel generation (Video/Images + Thumbnail + Subtitles)');
    const parallelStart = Date.now();

    // Build parallel tasks (without Voice - already done)
    const parallelTasks: Promise<any>[] = [
      // Video/Image Generation - NOW WITH audioPath
      useImageMode
        ? imageVideoAgent.execute(
            {
              sessionId: context.sessionId,  // Required for storage operations
              storyboard: {
                ...input.storyboard,
                scenes: input.storyboard.scenes.map(s => ({
                  ...s,
                  kenBurns: undefined, // Auto-select Ken Burns effect
                })),
              },
              audioPath: audioPath,  // ✅ Pass audio path for composition
              resolution: '1080p',
              aspectRatio: input.videoType === 'shorts' ? '9:16' : '16:9',
              imagesPerMinute: 10,
              fps: 30,
              includeSubtitles: true,
              composeVideo: true,
            },
            context
          )
        : videoAgent.execute(
            {
              storyboard: input.storyboard,
              resolution: '1080p',
              fps: 24,
              useNativeAudio: false,
              useFastGeneration: input.useFastGeneration,
            },
            context
          ),

      // Thumbnail Generation
      thumbnailAgent.execute(
        {
          topic: input.topic,
          thumbnailConcepts: input.thumbnailConcepts,
          videoType: input.videoType,
          includeTextOverlay: input.videoType !== 'shorts',
          variantCount: input.thumbnailVariants || (input.videoType === 'shorts' ? 2 : 3),
        },
        context
      ),
    ];

    // Add subtitle generation if enabled
    if (input.generateSubtitles !== false) {
      parallelTasks.push(
        subtitleAgent.execute(
          {
            script: {
              sections: input.script.sections,
              fullText: input.script.fullText,
              estimatedDuration: input.script.estimatedDuration,
            },
            language: input.language.startsWith('ko') ? 'ko' : 'en',
            style: input.subtitleStyle ? {
              ...input.subtitleStyle,
              color: '#FFFFFF',
              backgroundColor: '#000000',
              backgroundOpacity: 0.8,
              fontFamily: 'Pretendard',
              outline: true,
            } : undefined,
            maxCharsPerLine: input.videoType === 'shorts' ? 15 : 25,
            maxLinesPerSubtitle: 2,
            wordsPerMinute: 180,
          },
          context
        )
      );
    }

    const parallelResults = await Promise.all(parallelTasks);

    // Extract results (voiceResult already available from Stage 1)
    const videoResult = parallelResults[0];
    const thumbnailResult = parallelResults[1];
    const subtitleResult = input.generateSubtitles !== false ? parallelResults[2] : null;

    const parallelDuration = Date.now() - parallelStart;

    // Validate parallel results
    if (!voiceResult.success) {
      throw new Error(`Voice generation failed: ${voiceResult.error?.message}`);
    }
    if (!videoResult.success) {
      throw new Error(`Video generation failed: ${videoResult.error?.message}`);
    }
    if (!thumbnailResult.success) {
      throw new Error(`Thumbnail generation failed: ${thumbnailResult.error?.message}`);
    }

    const parallelCost =
      (voiceResult.metrics?.cost || 0) +
      (videoResult.metrics?.cost || 0) +
      (thumbnailResult.metrics?.cost || 0) +
      (subtitleResult?.metrics?.cost || 0);

    phases.push({
      name: 'parallel-generation',
      duration: parallelDuration,
      cost: parallelCost,
      parallel: true,
    });
    totalCost += parallelCost;

    console.log(`[ProductionFlow] Parallel phase complete in ${parallelDuration}ms`);
    console.log(`  - Voice: ${voiceResult.data?.duration?.toFixed(1) || 0}s`);
    console.log(`  - ${useImageMode ? 'Images' : 'Video'}: ${videoResult.data?.clips?.length || 0} ${useImageMode ? 'images' : 'clips'}`);
    console.log(`  - Thumbnails: ${thumbnailResult.data?.thumbnails?.length || 0} variants`);
    if (subtitleResult) {
      console.log(`  - Subtitles: ${subtitleResult.data?.metadata?.totalCues || 0} cues`);
    }
    console.log(`  - Cost: $${parallelCost.toFixed(4)} (${useImageMode ? '98% savings vs Veo!' : 'Veo'})`);

    // ===========================================
    // Sequential Phase: Editor
    // ===========================================
    console.log('[ProductionFlow] Starting editing phase');
    const editStart = Date.now();

    const editorResult = await editorAgent.execute(
      {
        script: {
          sections: input.script.sections,
          estimatedDuration: input.script.estimatedDuration,
        },
        videoClips: videoResult.data!.clips.map((c: any) => ({
          sceneId: c.sceneId,
          // Handle all possible URL field names for cross-agent compatibility
          url: c.url || c.mediaUrl || c.imageUrl || c.imagePath,
          mediaUrl: c.mediaUrl || c.imageUrl || c.url || c.imagePath,
          imagePath: c.imagePath || c.imageUrl || c.mediaUrl,
          duration: c.duration,
          priority: c.priority,
        })),
        audioSegments: voiceResult.data!.segments,
        videoType: input.videoType,
        style: input.storyboard.style,
      },
      context
    );

    if (!editorResult.success) {
      throw new Error(`Editing failed: ${editorResult.error?.message}`);
    }

    const editDuration = Date.now() - editStart;
    const editCost = editorResult.metrics?.cost || 0;

    phases.push({
      name: 'editing',
      duration: editDuration,
      cost: editCost,
      parallel: false,
    });
    totalCost += editCost;

    console.log(`[ProductionFlow] Editing complete in ${editDuration}ms`);

    const totalDuration = Date.now() - startTime;
    console.log(`[ProductionFlow] Complete in ${totalDuration}ms, cost: $${totalCost.toFixed(2)}`);

    // Build finalVideo from ImageVideoAgent's composedVideo (if available)
    const composedVideo = useImageMode ? videoResult.data?.composedVideo : null;
    const finalVideo = composedVideo ? {
      path: composedVideo.videoPath,
      fileSize: composedVideo.fileSize,
      duration: videoResult.data?.totalDuration || 0,
      hasAudio: composedVideo.hasAudio,
      hasSubtitles: composedVideo.hasSubtitles,
    } : null;

    if (finalVideo) {
      console.log(`[ProductionFlow] Final video: ${finalVideo.path} (${finalVideo.fileSize} bytes, audio: ${finalVideo.hasAudio}, subtitles: ${finalVideo.hasSubtitles})`);
    }

    return {
      sessionId: input.sessionId,
      voice: voiceResult.data,
      video: videoResult.data,
      thumbnails: thumbnailResult.data,
      subtitles: subtitleResult?.data,
      edited: editorResult.data,
      finalVideo,
      metadata: {
        totalDuration,
        totalCost,
        useImageMode,
        hasFinalVideo: !!finalVideo,
        phases,
      },
    };
  }
);

// ===========================================
// Helper Functions
// ===========================================

/**
 * Estimate production cost before execution
 */
export function estimateProductionCost(
  storyboard: ProductionFlowInput['storyboard'],
  thumbnailCount: number,
  useFast: boolean,
  useImageMode: boolean = true
): { total: number; breakdown: Record<string, number> } {
  // Video/Image cost
  let videoCost = 0;
  if (useImageMode) {
    // Image mode: $0.04 per image
    videoCost = storyboard.scenes.length * 0.04;
  } else {
    // Veo mode: $0.15-0.40 per second
    for (const scene of storyboard.scenes) {
      const rate = scene.priority === 'hero' ? 0.40 : (useFast ? 0.15 : 0.40);
      videoCost += scene.duration * rate;
    }
  }

  // Thumbnail cost
  const thumbnailCost = thumbnailCount * 0.04;

  // Voice cost (TTS is very cheap)
  const voiceCost = (storyboard.totalDuration / 60) * 0.02;

  // Subtitle cost (local processing, no API cost)
  const subtitleCost = 0;

  // LLM cost for editor
  const editorCost = 0.05;

  const total = videoCost + thumbnailCost + voiceCost + subtitleCost + editorCost;

  return {
    total,
    breakdown: {
      video: videoCost,
      thumbnail: thumbnailCost,
      voice: voiceCost,
      subtitle: subtitleCost,
      editor: editorCost,
    },
  };
}

/**
 * Compare cost between Image Mode and Veo Mode
 */
export function compareCostModes(
  storyboard: ProductionFlowInput['storyboard'],
  thumbnailCount: number = 3
): { imageMode: number; veoFast: number; veoStandard: number; savings: string } {
  const imageMode = estimateProductionCost(storyboard, thumbnailCount, true, true).total;
  const veoFast = estimateProductionCost(storyboard, thumbnailCount, true, false).total;
  const veoStandard = estimateProductionCost(storyboard, thumbnailCount, false, false).total;

  const savingsPercent = ((veoFast - imageMode) / veoFast * 100).toFixed(0);

  return {
    imageMode,
    veoFast,
    veoStandard,
    savings: `${savingsPercent}% savings vs Veo Fast`,
  };
}

// ===========================================
// Export
// ===========================================

export default productionFlow;
