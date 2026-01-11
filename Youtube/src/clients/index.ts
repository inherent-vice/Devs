/**
 * API Clients Index
 *
 * Centralized exports for all API clients.
 * All clients require valid API credentials.
 */

// Google Drive (file storage)
import { DriveClient, getDriveClient } from './drive.js';
export {
  DriveClient,
  getDriveClient,
  type DriveUploadOptions,
  type DriveUploadResult,
  type DriveFolderStructure,
} from './drive.js';

// Gemini TTS (Text-to-Speech using Gemini 2.5 Flash)
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

// Nano Banana Pro (Gemini 3 Pro Image) - Image Generation
import { NanoBananaClient, getNanoBananaClient } from './nano-banana.js';
export {
  NanoBananaClient,
  getNanoBananaClient,
  type NanoBananaRequest,
  type NanoBananaResult,
  type SceneImageRequest,
  type SceneImageResult,
  type ThumbnailRequest,
  type ThumbnailResult,
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

// Initialize all clients
export async function initializeAllClients(): Promise<void> {
  console.log('[Clients] Initializing all API clients...');

  const drive = getDriveClient();
  await drive.initialize();

  getGeminiTTSClient();
  getVeoClient();
  getNanoBananaClient();
  getYouTubeClient();

  console.log('[Clients] All clients initialized.');
}
