/**
 * Voice Agent
 *
 * Generates voice narration using Gemini 2.5 TTS.
 * Supports natural language prompts for style, accent, pace, and emotion control.
 */

import { z } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import type { AgentContext, AgentResult } from '../base/types.js';
import {
  getGeminiTTSClient,
  GeminiVoicePresets,
  type GeminiVoice,
  type GeminiTTSUploadResult,
} from '../../clients/gemini-tts.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const VoiceAgentInputSchema = z.object({
  script: z.object({
    fullText: z.string(),
    sections: z.array(z.object({
      id: z.string(),
      content: z.string(),
      duration: z.number(),
      audioNotes: z.string().optional(),
    })),
  }),
  language: z.string().default('ko-KR'),
  voicePreference: z.object({
    voiceName: z.string().optional(), // Direct voice selection (e.g., 'Kore', 'Puck')
    gender: z.enum(['male', 'female', 'neutral']).default('neutral'),
    age: z.enum(['young', 'middle', 'mature']).default('middle'),
    style: z.enum(['narration', 'conversational', 'news', 'energetic']).default('energetic'),
  }).optional(),
  speakingRate: z.number().min(0.5).max(2.0).default(1.0),
  pitch: z.number().min(-20).max(20).default(0),
  outputFormat: z.enum(['mp3', 'wav', 'ogg']).default('wav'),
  stylePrompt: z.string().optional(), // Natural language style control
});

export type VoiceAgentInput = z.infer<typeof VoiceAgentInputSchema>;

export const VoiceAgentOutputSchema = z.object({
  audioUrl: z.string(),
  duration: z.number(),
  segments: z.array(z.object({
    sectionId: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    audioUrl: z.string().optional(),
  })),
  voice: z.object({
    name: z.string(),
    languageCode: z.string(),
    gender: z.string(),
  }),
  metadata: z.object({
    sampleRate: z.number(),
    bitrate: z.number(),
    format: z.string(),
    fileSize: z.number().optional(),
  }),
  cost: z.number(),
});

export type VoiceAgentOutput = z.infer<typeof VoiceAgentOutputSchema>;

// ===========================================
// Voice Style Mapping
// ===========================================

const StyleToVoiceMap: Record<string, string> = {
  narration: 'Kore',
  conversational: 'Zephyr',
  news: 'Enceladus',
  energetic: 'Puck',
};

// ===========================================
// Voice Agent Class
// ===========================================

export class VoiceAgent extends BaseAgent<VoiceAgentInput, VoiceAgentOutput> {
  readonly name = 'voice-agent';
  readonly description = 'Generates voice narration using Gemini 2.5 TTS';

  protected readonly inputSchema = VoiceAgentInputSchema as any;
  protected readonly outputSchema = VoiceAgentOutputSchema as any;

  // No LLM needed - uses Gemini TTS directly
  protected readonly systemPrompt = '';

  // Gemini TTS Client
  private ttsClient = getGeminiTTSClient();

  /**
   * Generate voice narration
   */
  async execute(
    input: VoiceAgentInput,
    context: AgentContext
  ): Promise<AgentResult<VoiceAgentOutput>> {
    const startTime = Date.now();

    try {
      // Select voice based on preference
      const voice = this.selectVoice(input.voicePreference);

      // Build style prompt from sections and preferences
      const stylePrompt = this.buildStylePrompt(input);

      console.log(`[VoiceAgent] Generating audio with Gemini TTS using voice: ${voice.name}`);
      console.log(`[VoiceAgent] Text length: ${input.script.fullText.length} characters`);

      // Generate audio using Gemini TTS
      const audioResult = await this.ttsClient.synthesizeAndUpload(
        {
          text: input.script.fullText,
          voice,
          stylePrompt,
          speakingRate: input.speakingRate,
          language: input.language,
        },
        context.sessionId,
        `narration-${Date.now()}.wav`
      );

      // Calculate segments
      const segments = this.calculateSegments(input.script.sections, audioResult.duration);

      const duration = Date.now() - startTime;

      return this.createSuccessResult(
        {
          audioUrl: audioResult.url,
          duration: audioResult.duration,
          segments,
          voice: {
            name: voice.name,
            languageCode: input.language,
            gender: this.inferGender(voice.name),
          },
          metadata: {
            sampleRate: 24000,
            bitrate: 128,
            format: this.getFormatFromMime(audioResult.mimeType),
            fileSize: audioResult.audioContent.length,
          },
          cost: audioResult.cost,
        },
        {
          duration,
          tokensUsed: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: audioResult.cost,
          retryCount: 0,
        }
      );
    } catch (error) {
      console.error('[VoiceAgent] Error:', error);
      return this.createErrorResult(
        {
          type: 'api',
          message: error instanceof Error ? error.message : 'Gemini TTS generation failed',
          retryable: true,
        },
        startTime,
        0
      );
    }
  }

  /**
   * Select the best voice based on preferences
   */
  private selectVoice(preference?: VoiceAgentInput['voicePreference']): GeminiVoice {
    // If voiceName is directly specified, use it
    if (preference?.voiceName && GeminiVoicePresets[preference.voiceName]) {
      return GeminiVoicePresets[preference.voiceName];
    }

    // Otherwise, select based on style
    const style = preference?.style || 'narration';
    const voiceName = StyleToVoiceMap[style] || 'Kore';
    return GeminiVoicePresets[voiceName] || GeminiVoicePresets['Kore'];
  }

  /**
   * Build natural language style prompt
   */
  private buildStylePrompt(input: VoiceAgentInput): string {
    const parts: string[] = [];

    // Add section-specific audio notes
    const audioNotes = input.script.sections
      .filter(s => s.audioNotes)
      .map(s => s.audioNotes)
      .join('. ');

    if (audioNotes) {
      parts.push(`Performance notes: ${audioNotes}`);
    }

    // Add custom style prompt
    if (input.stylePrompt) {
      parts.push(input.stylePrompt);
    }

    // Add YouTube-specific instructions
    parts.push('Deliver this as a professional YouTube narration with engaging energy and clear articulation.');
    parts.push('Add natural pauses at punctuation marks for better comprehension.');

    return parts.join(' ');
  }

  /**
   * Calculate segment timestamps based on total duration
   */
  private calculateSegments(
    sections: VoiceAgentInput['script']['sections'],
    totalDuration: number
  ): VoiceAgentOutput['segments'] {
    const totalTargetDuration = sections.reduce((sum, s) => sum + s.duration, 0);
    const scaleFactor = totalDuration / totalTargetDuration;

    let currentTime = 0;
    return sections.map(section => {
      const segmentDuration = section.duration * scaleFactor;
      const segment = {
        sectionId: section.id,
        startTime: currentTime,
        endTime: currentTime + segmentDuration,
      };
      currentTime += segmentDuration;
      return segment;
    });
  }

  /**
   * Infer gender from voice name (for metadata compatibility)
   */
  private inferGender(voiceName: string): string {
    const maleVoices = ['Enceladus', 'Charon', 'Fenrir'];
    const femaleVoices = ['Aoede', 'Leda'];

    if (maleVoices.includes(voiceName)) return 'male';
    if (femaleVoices.includes(voiceName)) return 'female';
    return 'neutral';
  }

  /**
   * Get format from MIME type
   */
  private getFormatFromMime(mimeType: string): string {
    const formats: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/ogg': 'ogg',
    };
    return formats[mimeType] || 'wav';
  }

  // No LLM prompt needed
  protected buildPrompt(): string {
    return '';
  }
}

// ===========================================
// Factory Export
// ===========================================

export const voiceAgent = new VoiceAgent();
