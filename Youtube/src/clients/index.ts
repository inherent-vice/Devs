/**
 * API Clients Index
 *
 * Centralized exports for all API clients.
 * All clients require valid API credentials.
 */

// Google Drive (replaces Cloud Storage)
import { DriveClient, getDriveClient } from './drive.js';
export {
  DriveClient,
  getDriveClient,
  type DriveUploadOptions,
  type DriveUploadResult,
  type DriveFolderStructure,
} from './drive.js';

// Text-to-Speech (Legacy Cloud TTS)
import { TTSClient, getTTSClient } from './tts.js';
export {
  TTSClient,
  getTTSClient,
  VoicePresets,
  type TTSVoice,
  type TTSRequest,
  type TTSResult,
  type TTSUploadResult,
} from './tts.js';

// Gemini TTS (Recommended - uses Gemini 2.5 Flash TTS)
import { GeminiTTSClient, getGeminiTTSClient } from './gemini-tts.js';
export {
  GeminiTTSClient,
  getGeminiTTSClient,
  GeminiVoicePresets,
  type GeminiVoice,
  type GeminiTTSRequest,
  type GeminiTTSResult,
  type GeminiTTSUploadResult,
} from './gemini-tts.js';

// Veo Video Generation
import { VeoClient, getVeoClient } from './veo.js';
export {
  VeoClient,
  getVeoClient,
  type VeoGenerationRequest,
  type VeoGenerationResult,
  type VeoExtendRequest,
} from './veo.js';

// Imagen (Legacy) Image Generation
import { ImagenClient, getImagenClient } from './imagen.js';
export {
  ImagenClient,
  getImagenClient,
  type ImagenGenerationRequest,
  type ImagenGenerationResult,
  type ThumbnailGenerationRequest,
  type ThumbnailResult,
} from './imagen.js';

// Nano Banana Pro (Gemini 3 Pro Image) - Recommended
import { NanoBananaClient, getNanoBananaClient } from './nano-banana.js';
export {
  NanoBananaClient,
  getNanoBananaClient,
  type NanoBananaRequest,
  type NanoBananaResult,
  type SceneImageRequest,
  type SceneImageResult,
  type ThumbnailRequest as NanoBananaThumbnailRequest,
  type ThumbnailResult as NanoBananaThumbnailResult,
  type ThumbnailVariant,
} from './nano-banana.js';

// YouTube Data API
import { YouTubeClient, getYouTubeClient } from './youtube.js';
export {
  YouTubeClient,
  getYouTubeClient,
  type VideoSearchParams,
  type VideoSearchResult,
  type VideoDetails,
  type ChannelDetails,
  type VideoUploadParams,
  type VideoUploadResult,
} from './youtube.js';

// Video Composer (FFmpeg-based video composition)
import { VideoComposer, getVideoComposer } from './video-composer.js';
export {
  VideoComposer,
  getVideoComposer,
  generateSRT,
  generateASS,
  scriptToSubtitles,
  YOUTUBE_SUBTITLE_CONFIG,
  type SceneImage,
  type SubtitleEntry,
  type SubtitleStyle,
  type SubtitleOptions,
  type ScriptSection,
  type VideoCompositionRequest,
  type VideoCompositionResult,
} from './video-composer.js';

// Convenience function to check all clients
export async function initializeAllClients(): Promise<void> {
  console.log('[Clients] Initializing all API clients...');

  const drive = getDriveClient();
  await drive.initialize();

  getGeminiTTSClient(); // Using Gemini TTS (no ADC required)
  getVeoClient();
  getImagenClient();
  getYouTubeClient();

  console.log('[Clients] All clients initialized.');
}
