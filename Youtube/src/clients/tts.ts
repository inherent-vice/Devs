/**
 * Google Cloud Text-to-Speech Client
 *
 * Generates high-quality voice narration using Neural2 and WaveNet voices.
 */

import textToSpeech from '@google-cloud/text-to-speech';
import { getEnv } from '../utils/env.js';
import { getDriveClient, type DriveUploadResult } from './drive.js';

// ===========================================
// Types
// ===========================================

export interface TTSVoice {
  name: string;
  languageCode: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
}

export interface TTSRequest {
  text: string;
  ssml?: string; // If provided, used instead of text
  voice: TTSVoice;
  speakingRate?: number; // 0.25 to 4.0, default 1.0
  pitch?: number; // -20.0 to 20.0, default 0
  volumeGainDb?: number; // -96.0 to 16.0
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  sampleRateHertz?: number;
}

export interface TTSResult {
  audioContent: Buffer;
  duration: number; // estimated in seconds
  characterCount: number;
  cost: number;
}

export interface TTSUploadResult extends TTSResult {
  url: string;
  fileId: string;
}

// ===========================================
// Voice Presets
// ===========================================

export const VoicePresets = {
  // Korean voices
  'ko-KR-Neural2-A': {
    name: 'ko-KR-Neural2-A',
    languageCode: 'ko-KR',
    ssmlGender: 'FEMALE' as const,
    description: 'Korean female, professional narration',
  },
  'ko-KR-Neural2-B': {
    name: 'ko-KR-Neural2-B',
    languageCode: 'ko-KR',
    ssmlGender: 'MALE' as const,
    description: 'Korean male, professional narration',
  },
  'ko-KR-Neural2-C': {
    name: 'ko-KR-Neural2-C',
    languageCode: 'ko-KR',
    ssmlGender: 'MALE' as const,
    description: 'Korean male, conversational',
  },
  'ko-KR-Wavenet-A': {
    name: 'ko-KR-Wavenet-A',
    languageCode: 'ko-KR',
    ssmlGender: 'FEMALE' as const,
    description: 'Korean female, energetic',
  },
  'ko-KR-Wavenet-B': {
    name: 'ko-KR-Wavenet-B',
    languageCode: 'ko-KR',
    ssmlGender: 'MALE' as const,
    description: 'Korean male, energetic',
  },

  // English voices
  'en-US-Neural2-A': {
    name: 'en-US-Neural2-A',
    languageCode: 'en-US',
    ssmlGender: 'MALE' as const,
    description: 'English male, professional narration',
  },
  'en-US-Neural2-C': {
    name: 'en-US-Neural2-C',
    languageCode: 'en-US',
    ssmlGender: 'FEMALE' as const,
    description: 'English female, professional narration',
  },
  'en-US-Neural2-D': {
    name: 'en-US-Neural2-D',
    languageCode: 'en-US',
    ssmlGender: 'MALE' as const,
    description: 'English male, conversational',
  },
  'en-US-Neural2-F': {
    name: 'en-US-Neural2-F',
    languageCode: 'en-US',
    ssmlGender: 'FEMALE' as const,
    description: 'English female, conversational',
  },
  'en-US-Studio-O': {
    name: 'en-US-Studio-O',
    languageCode: 'en-US',
    ssmlGender: 'FEMALE' as const,
    description: 'English female, studio quality',
  },
  'en-US-Studio-Q': {
    name: 'en-US-Studio-Q',
    languageCode: 'en-US',
    ssmlGender: 'MALE' as const,
    description: 'English male, studio quality',
  },
};

// ===========================================
// TTS Client
// ===========================================

export class TTSClient {
  private client: textToSpeech.TextToSpeechClient;
  private driveClient = getDriveClient();

  // Pricing per 1M characters
  private static readonly PRICING = {
    neural2: 16.0,
    wavenet: 16.0,
    studio: 160.0,
    standard: 4.0,
  };

  constructor() {
    this.client = new textToSpeech.TextToSpeechClient();
    console.log('[TTSClient] Connected to Google Cloud TTS');
  }

  // ===========================================
  // Synthesis Methods
  // ===========================================

  /**
   * Synthesize text to speech
   */
  async synthesize(request: TTSRequest): Promise<TTSResult> {
    const characterCount = request.ssml
      ? this.countSSMLCharacters(request.ssml)
      : request.text.length;

    const audioEncoding = this.mapAudioEncoding(request.audioEncoding || 'MP3');

    const [response] = await this.client.synthesizeSpeech({
      input: request.ssml
        ? { ssml: request.ssml }
        : { text: request.text },
      voice: {
        name: request.voice.name,
        languageCode: request.voice.languageCode,
        ssmlGender: request.voice.ssmlGender,
      },
      audioConfig: {
        audioEncoding,
        speakingRate: request.speakingRate || 1.0,
        pitch: request.pitch || 0,
        volumeGainDb: request.volumeGainDb,
        sampleRateHertz: request.sampleRateHertz || 24000,
      },
    });

    const audioContent = response.audioContent as Buffer;
    const duration = this.estimateDuration(characterCount, request.speakingRate || 1.0);
    const cost = this.calculateCost(characterCount, request.voice.name);

    return {
      audioContent,
      duration,
      characterCount,
      cost,
    };
  }

  /**
   * Synthesize and upload to Google Drive
   */
  async synthesizeAndUpload(
    request: TTSRequest,
    sessionId: string,
    filename?: string
  ): Promise<TTSUploadResult> {
    const result = await this.synthesize(request);

    const ext = this.getFileExtension(request.audioEncoding || 'MP3');
    const finalFilename = filename || `narration-${Date.now()}.${ext}`;
    const fullFilename = this.driveClient.generateFilename('audio', sessionId, finalFilename);

    const uploadResult = await this.driveClient.uploadBuffer(
      result.audioContent,
      fullFilename,
      'audio',
      {
        mimeType: this.getMimeType(request.audioEncoding || 'MP3'),
        description: `Voice: ${request.voice.name}, Duration: ${result.duration}s`,
      }
    );

    return {
      ...result,
      url: uploadResult.url,
      fileId: uploadResult.fileId,
    };
  }

  /**
   * Synthesize multiple sections
   */
  async synthesizeSections(
    sections: Array<{
      id: string;
      text: string;
      voice?: TTSVoice;
      speakingRate?: number;
    }>,
    defaultVoice: TTSVoice,
    sessionId: string
  ): Promise<{
    segments: Array<{
      id: string;
      url: string;
      fileId: string;
      startTime: number;
      endTime: number;
      duration: number;
    }>;
    totalDuration: number;
    totalCost: number;
  }> {
    const segments: Array<{
      id: string;
      url: string;
      fileId: string;
      startTime: number;
      endTime: number;
      duration: number;
    }> = [];

    let currentTime = 0;
    let totalCost = 0;

    for (const section of sections) {
      const result = await this.synthesizeAndUpload(
        {
          text: section.text,
          voice: section.voice || defaultVoice,
          speakingRate: section.speakingRate || 1.0,
        },
        sessionId,
        `section-${section.id}.mp3`
      );

      segments.push({
        id: section.id,
        url: result.url,
        fileId: result.fileId,
        startTime: currentTime,
        endTime: currentTime + result.duration,
        duration: result.duration,
      });

      currentTime += result.duration;
      totalCost += result.cost;
    }

    return {
      segments,
      totalDuration: currentTime,
      totalCost,
    };
  }

  // ===========================================
  // Voice Management
  // ===========================================

  /**
   * List available voices
   */
  async listVoices(languageCode?: string): Promise<TTSVoice[]> {
    const [response] = await this.client.listVoices({
      languageCode,
    });

    return (response.voices || []).map(v => ({
      name: v.name!,
      languageCode: v.languageCodes![0],
      ssmlGender: v.ssmlGender as 'MALE' | 'FEMALE' | 'NEUTRAL',
    }));
  }

  /**
   * Get recommended voice for language and style
   */
  getRecommendedVoice(
    languageCode: string,
    gender: 'male' | 'female' | 'neutral',
    style: 'narration' | 'conversational' | 'energetic' | 'studio'
  ): TTSVoice {
    const lang = languageCode.substring(0, 2);

    if (lang === 'ko') {
      if (style === 'energetic') {
        return gender === 'male' ? VoicePresets['ko-KR-Wavenet-B'] : VoicePresets['ko-KR-Wavenet-A'];
      }
      if (style === 'conversational') {
        return VoicePresets['ko-KR-Neural2-C'];
      }
      return gender === 'male' ? VoicePresets['ko-KR-Neural2-B'] : VoicePresets['ko-KR-Neural2-A'];
    }

    // English defaults
    if (style === 'studio') {
      return gender === 'male' ? VoicePresets['en-US-Studio-Q'] : VoicePresets['en-US-Studio-O'];
    }
    if (style === 'conversational') {
      return gender === 'male' ? VoicePresets['en-US-Neural2-D'] : VoicePresets['en-US-Neural2-F'];
    }
    return gender === 'male' ? VoicePresets['en-US-Neural2-A'] : VoicePresets['en-US-Neural2-C'];
  }

  // ===========================================
  // SSML Helpers
  // ===========================================

  /**
   * Wrap text in SSML with prosody
   */
  wrapInSSML(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      breaks?: boolean;
    }
  ): string {
    let content = text;

    // Add breaks for punctuation
    if (options?.breaks !== false) {
      content = content
        .replace(/\./g, '.<break time="300ms"/>')
        .replace(/,/g, ',<break time="150ms"/>')
        .replace(/\?/g, '?<break time="400ms"/>')
        .replace(/!/g, '!<break time="350ms"/>');
    }

    const rateAttr = options?.rate ? ` rate="${options.rate}"` : '';
    const pitchAttr = options?.pitch ? ` pitch="${options.pitch}st"` : '';

    return `<speak><prosody${rateAttr}${pitchAttr}>${content}</prosody></speak>`;
  }

  /**
   * Add emphasis to text
   */
  addEmphasis(text: string, level: 'strong' | 'moderate' | 'reduced' = 'moderate'): string {
    return `<emphasis level="${level}">${text}</emphasis>`;
  }

  /**
   * Add break
   */
  addBreak(timeMs: number): string {
    return `<break time="${timeMs}ms"/>`;
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  private mapAudioEncoding(encoding: string): textToSpeech.protos.google.cloud.texttospeech.v1.AudioEncoding {
    const encodings: Record<string, number> = {
      MP3: 2,
      LINEAR16: 1,
      OGG_OPUS: 3,
    };
    return encodings[encoding] || 2;
  }

  private getFileExtension(encoding: string): string {
    const extensions: Record<string, string> = {
      MP3: 'mp3',
      LINEAR16: 'wav',
      OGG_OPUS: 'ogg',
    };
    return extensions[encoding] || 'mp3';
  }

  private getMimeType(encoding: string): string {
    const mimes: Record<string, string> = {
      MP3: 'audio/mpeg',
      LINEAR16: 'audio/wav',
      OGG_OPUS: 'audio/ogg',
    };
    return mimes[encoding] || 'audio/mpeg';
  }

  private countSSMLCharacters(ssml: string): number {
    // Remove SSML tags to count actual text
    return ssml.replace(/<[^>]*>/g, '').length;
  }

  private estimateDuration(characterCount: number, speakingRate: number): number {
    // Average ~15 characters per second at normal speed
    const baseSpeed = 15;
    return characterCount / (baseSpeed * speakingRate);
  }

  private calculateCost(characterCount: number, voiceName: string): number {
    let pricePerMillion = TTSClient.PRICING.neural2;

    if (voiceName.includes('Wavenet')) {
      pricePerMillion = TTSClient.PRICING.wavenet;
    } else if (voiceName.includes('Studio')) {
      pricePerMillion = TTSClient.PRICING.studio;
    } else if (voiceName.includes('Standard')) {
      pricePerMillion = TTSClient.PRICING.standard;
    }

    return (characterCount / 1_000_000) * pricePerMillion;
  }
}

// ===========================================
// Singleton Export
// ===========================================

let ttsClientInstance: TTSClient | null = null;

export function getTTSClient(): TTSClient {
  if (!ttsClientInstance) {
    ttsClientInstance = new TTSClient();
  }
  return ttsClientInstance;
}
