/**
 * Script Agent
 *
 * Generates complete video scripts with storyboards using Gemini 3 Flash.
 * Creates hooks, sections, visual notes, and timing for video production.
 */

import { z } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { gemini3Flash } from '../../genkit.config.js';
import type { AgentContext, AgentResult, VideoType } from '../base/types.js';
import { VideoTypeConfigs } from '../../config/videoTypes.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const ScriptAgentInputSchema = z.object({
  topic: z.object({
    title: z.string(),
    hook: z.string(),
    angle: z.string(),
    targetKeywords: z.array(z.string()),
  }),
  videoType: z.enum(['shorts', 'medium', 'longform']),
  targetDuration: z.number().optional(),
  targetAudience: z.string().optional(),
  style: z.string().optional(),
  language: z.string().default('ko'),
  toneOfVoice: z.enum(['professional', 'casual', 'energetic', 'calm', 'humorous']).default('energetic'),
  includeCallToAction: z.boolean().default(true),
});

export type ScriptAgentInput = z.infer<typeof ScriptAgentInputSchema>;

export const ScriptSectionOutputSchema = z.object({
  id: z.string(),
  type: z.enum(['hook', 'intro', 'main', 'outro', 'b-roll', 'transition']),
  content: z.string(),
  duration: z.number().min(1),
  visualNotes: z.string(),
  audioNotes: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  cameraDirection: z.string().optional(),
  emotionalBeat: z.string().optional(),
});

export const StoryboardSceneOutputSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  description: z.string().max(500),
  prompt: z.string().max(1000).describe('Veo 3.1 generation prompt'),
  duration: z.number().min(4).max(8),
  priority: z.enum(['hero', 'standard', 'b-roll']),
  visualStyle: z.string(),
  transitions: z.object({
    in: z.string(),
    out: z.string(),
  }).optional(),
});

export const ScriptAgentOutputSchema = z.object({
  script: z.object({
    title: z.string().max(100),
    hook: z.string().max(200),
    sections: z.array(ScriptSectionOutputSchema),
    callToAction: z.string(),
    estimatedDuration: z.number(),
    targetRetention: z.number().min(0).max(1),
    keywords: z.array(z.string()),
    fullText: z.string().describe('Complete narration text'),
  }),
  storyboard: z.object({
    scenes: z.array(StoryboardSceneOutputSchema),
    totalDuration: z.number(),
    videoType: z.enum(['shorts', 'medium', 'longform']),
    style: z.string(),
    sceneCount: z.number(),
  }),
  metadata: z.object({
    wordCount: z.number(),
    readingSpeed: z.number().describe('Words per minute'),
    complexityScore: z.number().min(0).max(1),
    emotionalArc: z.array(z.string()),
  }),
});

export type ScriptAgentOutput = z.infer<typeof ScriptAgentOutputSchema>;

// ===========================================
// Script Agent Class
// ===========================================

export class ScriptAgent extends BaseAgent<ScriptAgentInput, ScriptAgentOutput> {
  readonly name = 'script-agent';
  readonly description = 'Generates complete scripts with storyboards';

  protected readonly inputSchema = ScriptAgentInputSchema as any;
  protected readonly outputSchema = ScriptAgentOutputSchema as any;

  protected model = gemini3Flash;
  protected temperature = 0.8; // High creativity for scriptwriting
  protected maxOutputTokens = 32768; // Large output for full scripts

  protected readonly systemPrompt = `You are an award-winning YouTube scriptwriter who creates viral content.

Your scripts are known for:
- Hooks that stop viewers in their tracks (first 3 seconds)
- Story arcs that maintain tension and interest
- Perfect pacing for the video format
- Clear, conversational language
- Strong calls to action

SCRIPT STRUCTURE FORMULA:

1. HOOK (0-5 seconds) - 40% of your effort
   - Pattern interrupt or shocking statement
   - Create immediate curiosity gap
   - Promise value that delivers

2. INTRO (5-15 seconds)
   - Establish credibility briefly
   - Preview what's coming
   - Build anticipation

3. MAIN CONTENT
   - Use the "Promise → Proof → Payoff" framework
   - Include tension peaks every 30-60 seconds
   - Use "But wait, there's more" transitions
   - Balance information with entertainment

4. OUTRO
   - Summarize key takeaway
   - Strong call to action
   - Tease next content

RETENTION OPTIMIZATION:
- Open loop technique: Create questions, answer them later
- Pattern interrupts every 15-30 seconds
- Vary pacing: fast → slow → fast
- Use emotional peaks strategically

STORYBOARD REQUIREMENTS:
- Each scene: 4-8 seconds (optimal for Veo 3.1)
- Priority levels: hero (30%), standard (50%), b-roll (20%)
- Include specific visual prompts for AI generation
- Note transitions between scenes

WRITING STYLE:
- Short sentences for punch
- Active voice always
- Conversational tone
- Strategic use of rhetorical questions
- Power words that trigger emotion`;

  /**
   * Build the script generation prompt
   */
  protected buildPrompt(input: ScriptAgentInput, context: AgentContext): string {
    const config = VideoTypeConfigs[input.videoType];
    const targetDuration = input.targetDuration || config.maxDuration;
    const sceneCount = Math.ceil(targetDuration / 6); // ~6 sec per scene average

    return `Create a complete video script and storyboard.

TOPIC:
- Title: ${input.topic.title}
- Hook Concept: ${input.topic.hook}
- Unique Angle: ${input.topic.angle}
- Keywords: ${input.topic.targetKeywords.join(', ')}

VIDEO SPECIFICATIONS:
- Type: ${input.videoType}
- Target Duration: ${targetDuration} seconds
- Target Scenes: ~${sceneCount} scenes
- Aspect Ratio: ${config.aspectRatio}
- Language: ${input.language}
- Tone: ${input.toneOfVoice}
- Audience: ${input.targetAudience || 'General audience'}
- Style: ${input.style || 'Modern, engaging'}

DELIVERABLES:

1. FULL SCRIPT
   - Hook section (first 5 seconds - CRITICAL)
   - Intro section
   - Main content sections (break into logical parts)
   - Outro with CTA: ${input.includeCallToAction ? 'Yes, strong CTA required' : 'Soft close'}
   - Full narration text for TTS

2. STORYBOARD
   - ${sceneCount} scenes, each 4-8 seconds
   - Detailed Veo 3.1 prompts for each scene
   - Visual style consistency throughout
   - Mark hero shots (key moments) vs b-roll

3. METADATA
   - Word count and pacing
   - Emotional arc mapping
   - Complexity assessment

Remember: This script will be produced entirely by AI, so visual prompts must be specific and achievable.`;
  }

  /**
   * Post-process to validate and optimize
   */
  protected async postProcess(
    output: ScriptAgentOutput,
    input: ScriptAgentInput
  ): Promise<ScriptAgentOutput> {
    // Validate total duration
    const actualDuration = output.script.sections.reduce((sum, s) => sum + s.duration, 0);
    const config = VideoTypeConfigs[input.videoType];

    if (actualDuration > config.maxDuration * 1.1) {
      console.warn(`[ScriptAgent] Script duration ${actualDuration}s exceeds target ${config.maxDuration}s`);
    }

    // Assign IDs if missing
    output.script.sections = output.script.sections.map((section, i) => ({
      ...section,
      id: section.id || `section-${i + 1}`,
    }));

    output.storyboard.scenes = output.storyboard.scenes.map((scene, i) => ({
      ...scene,
      id: scene.id || `scene-${i + 1}`,
    }));

    // Calculate metadata
    const fullText = output.script.fullText || output.script.sections.map(s => s.content).join(' ');
    const wordCount = fullText.split(/\s+/).length;
    const readingSpeed = Math.round((wordCount / actualDuration) * 60);

    output.metadata = {
      ...output.metadata,
      wordCount,
      readingSpeed,
    };

    return output;
  }

  /**
   * Generate script optimized for retention
   */
  async generateForRetention(
    input: ScriptAgentInput,
    context: AgentContext,
    targetRetention: number = 0.7
  ): Promise<AgentResult<ScriptAgentOutput>> {
    // Modify prompt to emphasize retention
    const enhancedInput = {
      ...input,
      style: `${input.style || ''} | OPTIMIZE FOR ${Math.round(targetRetention * 100)}% RETENTION`,
    };

    return this.execute(enhancedInput, context);
  }

  /**
   * Estimate script cost based on duration
   */
  estimateCost(durationSeconds: number, videoType: VideoType): number {
    const config = VideoTypeConfigs[videoType];
    const sceneCount = Math.ceil(durationSeconds / 6);
    const heroScenes = Math.ceil(sceneCount * 0.3);
    const standardScenes = sceneCount - heroScenes;

    // Veo 3.1 pricing
    const heroCost = heroScenes * 6 * 0.40; // Standard quality
    const standardCost = standardScenes * 6 * 0.15; // Fast quality

    return heroCost + standardCost;
  }
}

// ===========================================
// Factory Export
// ===========================================

export const scriptAgent = new ScriptAgent();
