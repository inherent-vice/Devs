/**
 * Gemini TTS Client
 *
 * Generates high-quality voice narration using Gemini 2.5 TTS models.
 * Uses natural language prompts for style, accent, pace, and emotion control.
 *
 * NOTE: Gemini 3.0 TTS is NOT available yet (as of Jan 2026).
 * Using Gemini 2.5 Flash/Pro TTS (latest TTS models).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnv } from '../utils/env.js';
import { getLocalStorage, type LocalStorageManager } from '../storage/LocalStorageManager.js';
import * as fs from 'fs';
import * as path from 'path';

// ===========================================
// Types
// ===========================================

export interface GeminiVoice {
  name: string;
  description: string;
  style: string;
}

export interface GeminiTTSRequest {
  text: string;
  voice: GeminiVoice;
  stylePrompt?: string; // Natural language style control
  speakingRate?: number; // Reference only, controlled via prompt
  language?: string;
}

export interface GeminiTTSResult {
  audioContent: Buffer;
  duration: number;
  characterCount: number;
  cost: number;
  mimeType: string;
}

export interface GeminiTTSUploadResult extends GeminiTTSResult {
  url: string;
  fileId: string;
}

// ===========================================
// Voice Presets (Gemini 2.5 TTS)
// ===========================================

export const GeminiVoicePresets: Record<string, GeminiVoice> = {
  // Korean-friendly voices
  'Kore': {
    name: 'Kore',
    description: 'Warm and professional',
    style: 'narration',
  },
  'Puck': {
    name: 'Puck',
    description: 'Bright and upbeat',
    style: 'energetic',
  },
  'Zephyr': {
    name: 'Zephyr',
    description: 'Calm and soothing',
    style: 'conversational',
  },
  'Enceladus': {
    name: 'Enceladus',
    description: 'Deep and authoritative',
    style: 'news',
  },
  'Charon': {
    name: 'Charon',
    description: 'Clear and articulate',
    style: 'professional',
  },
  'Fenrir': {
    name: 'Fenrir',
    description: 'Dynamic and engaging',
    style: 'storytelling',
  },
  'Aoede': {
    name: 'Aoede',
    description: 'Melodic and expressive',
    style: 'creative',
  },
  'Leda': {
    name: 'Leda',
    description: 'Friendly and approachable',
    style: 'casual',
  },
};

// ===========================================
// Gemini TTS Client
// ===========================================

export class GeminiTTSClient {
  private genAI: GoogleGenerativeAI;
  private storage: LocalStorageManager;
  private model: string;

  // Pricing per 1M tokens
  private static readonly PRICING = {
    'gemini-2.5-flash-preview-tts': { input: 0.50, output: 10.00 },
    'gemini-2.5-pro-preview-tts': { input: 1.00, output: 20.00 },
  };

  constructor(useProModel: boolean = false) {
    const env = getEnv();

    if (!env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is required for Gemini TTS');
    }

    this.genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
    this.storage = getLocalStorage();
    this.model = useProModel
      ? 'gemini-2.5-pro-preview-tts'
      : 'gemini-2.5-flash-preview-tts';

    console.log(`[GeminiTTS] Initialized with model: ${this.model}`);
  }

  // ===========================================
  // Synthesis Methods
  // ===========================================

  /**
   * Synthesize text to speech using Gemini TTS
   */
  async synthesize(request: GeminiTTSRequest): Promise<GeminiTTSResult> {
    const characterCount = request.text.length;

    // Build the style prompt
    const stylePrompt = this.buildStylePrompt(request);

    // Get the generative model with audio output
    const model = this.genAI.getGenerativeModel({
      model: this.model,
    });

    // Generate speech with voice configuration
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `${stylePrompt}\n\n${request.text}` }],
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: request.voice.name,
            },
          },
        },
      } as any,
    });

    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate?.content?.parts?.[0]) {
      throw new Error('No audio content in response');
    }

    const audioPart = candidate.content.parts[0] as any;

    if (!audioPart.inlineData?.data) {
      throw new Error('No audio data in response');
    }

    let audioContent: Buffer = Buffer.from(audioPart.inlineData.data, 'base64');
    let mimeType: string = audioPart.inlineData.mimeType || 'audio/wav';

    // Convert PCM to WAV if needed
    if (mimeType.includes('L16') || mimeType.includes('pcm')) {
      // Extract sample rate from mimeType (e.g., "audio/L16;codec=pcm;rate=24000")
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

      const wavBuffer = this.addWavHeader(audioContent, sampleRate, 1, 16);
      audioContent = wavBuffer;
      mimeType = 'audio/wav';
    }

    // Estimate duration (approximately 15 chars/second for Korean)
    const duration = this.estimateDuration(characterCount, request.speakingRate || 1.0);

    // Calculate cost
    const cost = this.calculateCost(characterCount, audioContent.length);

    return {
      audioContent,
      duration,
      characterCount,
      cost,
      mimeType,
    };
  }

  /**
   * Synthesize and save to local storage
   */
  async synthesizeAndUpload(
    request: GeminiTTSRequest,
    sessionId: string,
    filename?: string
  ): Promise<GeminiTTSUploadResult> {
    if (!sessionId) {
      throw new Error('sessionId is required for synthesizeAndUpload');
    }

    const result = await this.synthesize(request);

    const ext = this.getFileExtension(result.mimeType);
    const finalFilename = filename || `narration-${Date.now()}.${ext}`;

    // Verify session exists (optional, just for logging)
    const session = this.storage.getSession(sessionId);
    if (!session) {
      console.log(`[GeminiTTS] Session ${sessionId} not found, it may be managed elsewhere`);
    }

    // Save to local storage with explicit sessionId
    const asset = this.storage.saveAudio(sessionId, result.audioContent, finalFilename, {
      voice: request.voice.name,
      duration: result.duration,
      characterCount: result.characterCount,
      cost: result.cost,
    });

    console.log(`[GeminiTTS] Audio saved: ${result.duration.toFixed(1)}s, cost: $${result.cost.toFixed(4)}`);

    return {
      ...result,
      url: asset.path,
      fileId: asset.filename,
    };
  }

  // ===========================================
  // Voice Management
  // ===========================================

  /**
   * Get recommended voice for style
   */
  getRecommendedVoice(
    style: 'narration' | 'conversational' | 'energetic' | 'news' | 'professional'
  ): GeminiVoice {
    const styleMap: Record<string, string> = {
      narration: 'Kore',
      conversational: 'Zephyr',
      energetic: 'Puck',
      news: 'Enceladus',
      professional: 'Charon',
    };

    const voiceName = styleMap[style] || 'Kore';
    return GeminiVoicePresets[voiceName];
  }

  /**
   * Get all available voices
   */
  getAvailableVoices(): GeminiVoice[] {
    return Object.values(GeminiVoicePresets);
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  /**
   * Build natural language style prompt
   */
  private buildStylePrompt(request: GeminiTTSRequest): string {
    const parts: string[] = [];

    // Language instruction
    if (request.language === 'ko' || request.language === 'ko-KR') {
      parts.push('Speak in Korean with natural Korean pronunciation and intonation.');
    }

    // Voice style
    const voice = request.voice;
    parts.push(`Use a ${voice.description.toLowerCase()} voice style.`);

    // Speaking rate
    if (request.speakingRate) {
      if (request.speakingRate > 1.1) {
        parts.push('Speak at a slightly faster pace.');
      } else if (request.speakingRate < 0.9) {
        parts.push('Speak at a slower, more deliberate pace.');
      }
    }

    // Custom style prompt
    if (request.stylePrompt) {
      parts.push(request.stylePrompt);
    }

    return parts.join(' ');
  }

  private estimateDuration(characterCount: number, speakingRate: number): number {
    // Korean: approximately 12-15 characters per second
    const baseSpeed = 13;
    return characterCount / (baseSpeed * speakingRate);
  }

  private calculateCost(inputChars: number, outputBytes: number): number {
    const pricing = GeminiTTSClient.PRICING[this.model as keyof typeof GeminiTTSClient.PRICING];

    // Estimate tokens: ~4 chars per token for input, ~1 token per 100 bytes for audio
    const inputTokens = inputChars / 4;
    const outputTokens = outputBytes / 100;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/ogg': 'ogg',
      'audio/pcm': 'wav', // PCM will be converted to WAV
    };
    // Handle L16 codec
    if (mimeType.includes('L16') || mimeType.includes('pcm')) {
      return 'wav';
    }
    return extensions[mimeType] || 'wav';
  }

  /**
   * Add WAV header to PCM audio data
   */
  private addWavHeader(
    pcmData: Buffer,
    sampleRate: number = 24000,
    numChannels: number = 1,
    bitsPerSample: number = 16
  ): Buffer {
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const headerSize = 44;
    const fileSize = headerSize + dataSize - 8;

    const header = Buffer.alloc(headerSize);

    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);

    // fmt subchunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // data subchunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
  }
}

// ===========================================
// Singleton Export
// ===========================================

let geminiTTSClientInstance: GeminiTTSClient | null = null;

export function getGeminiTTSClient(useProModel: boolean = false): GeminiTTSClient {
  if (!geminiTTSClientInstance) {
    geminiTTSClientInstance = new GeminiTTSClient(useProModel);
  }
  return geminiTTSClientInstance;
}
