/**
 * YouTube Data API v3 Client
 *
 * Provides access to YouTube Data API for:
 * - Trend analysis and video search
 * - Video metadata and statistics
 * - Video uploads (OAuth required)
 */

import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getEnv } from '../utils/env.js';
import * as fs from 'fs';

// ===========================================
// Types
// ===========================================

export interface VideoSearchParams {
  query: string;
  maxResults?: number;
  order?: 'relevance' | 'date' | 'viewCount' | 'rating';
  publishedAfter?: string;
  regionCode?: string;
  videoDuration?: 'short' | 'medium' | 'long' | 'any';
  type?: 'video' | 'channel' | 'playlist';
}

export interface VideoSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface VideoDetails {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  categoryId: string;
  thumbnailUrl: string;
}

export interface ChannelDetails {
  channelId: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  thumbnailUrl: string;
  country: string;
}

export interface VideoUploadParams {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: 'public' | 'unlisted' | 'private';
  videoFilePath: string;
  thumbnailFilePath?: string;
  playlistId?: string;
  scheduledStartTime?: Date;
  language?: string;
}

export interface VideoUploadResult {
  videoId: string;
  url: string;
  status: 'uploaded' | 'processing' | 'scheduled';
  publishedAt?: Date;
  scheduledFor?: Date;
}

// ===========================================
// YouTube Client
// ===========================================

export class YouTubeClient {
  private youtube: youtube_v3.Youtube;
  private oauth2Client: OAuth2Client | null = null;
  private apiKey: string;
  private isAuthenticated: boolean = false;

  constructor() {
    const env = getEnv();
    this.apiKey = env.YOUTUBE_API_KEY;

    // Initialize with API key for public data access
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.apiKey,
    });

    // Initialize OAuth client if credentials are available
    if (env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET) {
      this.oauth2Client = new google.auth.OAuth2(
        env.YOUTUBE_CLIENT_ID,
        env.YOUTUBE_CLIENT_SECRET,
        'http://localhost:3000/oauth2callback'
      );

      // Set refresh token if available
      if (env.YOUTUBE_REFRESH_TOKEN) {
        this.oauth2Client.setCredentials({
          refresh_token: env.YOUTUBE_REFRESH_TOKEN,
        });
        this.isAuthenticated = true;
        console.log('[YouTubeClient] OAuth configured with refresh token');
      }
    }

    console.log('[YouTubeClient] Connected to YouTube Data API');
  }

  // ===========================================
  // Search & Discovery
  // ===========================================

  /**
   * Search for videos
   */
  async searchVideos(params: VideoSearchParams): Promise<VideoSearchResult[]> {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      q: params.query,
      maxResults: params.maxResults || 10,
      order: params.order || 'viewCount',
      type: [params.type || 'video'],
      regionCode: params.regionCode || 'KR',
      publishedAfter: params.publishedAfter,
      videoDuration: params.videoDuration !== 'any' ? params.videoDuration : undefined,
    });

    return (response.data.items || []).map(item => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelId: item.snippet?.channelId || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || '',
    }));
  }

  /**
   * Get video details
   */
  async getVideoDetails(videoIds: string[]): Promise<VideoDetails[]> {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: videoIds,
    });

    return (response.data.items || []).map(item => ({
      videoId: item.id || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelId: item.snippet?.channelId || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      duration: item.contentDetails?.duration || '',
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      commentCount: parseInt(item.statistics?.commentCount || '0'),
      tags: item.snippet?.tags || [],
      categoryId: item.snippet?.categoryId || '',
      thumbnailUrl: item.snippet?.thumbnails?.maxres?.url
        || item.snippet?.thumbnails?.high?.url || '',
    }));
  }

  /**
   * Get trending videos
   */
  async getTrendingVideos(regionCode: string = 'KR', categoryId?: string, maxResults: number = 25): Promise<VideoDetails[]> {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      chart: 'mostPopular',
      regionCode,
      videoCategoryId: categoryId,
      maxResults,
    });

    return (response.data.items || []).map(item => ({
      videoId: item.id || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelId: item.snippet?.channelId || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      duration: item.contentDetails?.duration || '',
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      commentCount: parseInt(item.statistics?.commentCount || '0'),
      tags: item.snippet?.tags || [],
      categoryId: item.snippet?.categoryId || '',
      thumbnailUrl: item.snippet?.thumbnails?.maxres?.url
        || item.snippet?.thumbnails?.high?.url || '',
    }));
  }

  /**
   * Get channel details
   */
  async getChannelDetails(channelIds: string[]): Promise<ChannelDetails[]> {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: channelIds,
    });

    return (response.data.items || []).map(item => ({
      channelId: item.id || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      subscriberCount: parseInt(item.statistics?.subscriberCount || '0'),
      videoCount: parseInt(item.statistics?.videoCount || '0'),
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || '',
      country: item.snippet?.country || '',
    }));
  }

  // ===========================================
  // Video Upload (OAuth Required)
  // ===========================================

  /**
   * Upload a video
   */
  async uploadVideo(params: VideoUploadParams): Promise<VideoUploadResult> {
    if (!this.isAuthenticated || !this.oauth2Client) {
      throw new Error('OAuth authentication required for video upload');
    }

    // Create authenticated client
    const authedYoutube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });

    console.log(`[YouTubeClient] Uploading video: ${params.title}`);

    // Upload video
    const response = await authedYoutube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: params.title,
          description: params.description,
          tags: params.tags,
          categoryId: params.categoryId,
          defaultLanguage: params.language || 'ko',
        },
        status: {
          privacyStatus: params.privacyStatus,
          publishAt: params.scheduledStartTime?.toISOString(),
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(params.videoFilePath),
      },
    });

    const videoId = response.data.id || '';

    // Upload thumbnail if provided
    if (params.thumbnailFilePath && videoId) {
      await this.setThumbnail(videoId, params.thumbnailFilePath);
    }

    // Add to playlist if specified
    if (params.playlistId && videoId) {
      await this.addToPlaylist(videoId, params.playlistId);
    }

    return {
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      status: params.scheduledStartTime ? 'scheduled' : 'uploaded',
      publishedAt: params.scheduledStartTime ? undefined : new Date(),
      scheduledFor: params.scheduledStartTime,
    };
  }

  /**
   * Set video thumbnail
   */
  async setThumbnail(videoId: string, thumbnailPath: string): Promise<void> {
    if (!this.isAuthenticated || !this.oauth2Client) {
      throw new Error('OAuth authentication required');
    }

    const authedYoutube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });

    await authedYoutube.thumbnails.set({
      videoId,
      media: {
        body: fs.createReadStream(thumbnailPath),
      },
    });

    console.log(`[YouTubeClient] Thumbnail set for video: ${videoId}`);
  }

  /**
   * Add video to playlist
   */
  async addToPlaylist(videoId: string, playlistId: string): Promise<void> {
    if (!this.isAuthenticated || !this.oauth2Client) {
      throw new Error('OAuth authentication required');
    }

    const authedYoutube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });

    await authedYoutube.playlistItems.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      },
    });

    console.log(`[YouTubeClient] Video ${videoId} added to playlist ${playlistId}`);
  }

  // ===========================================
  // OAuth Flow
  // ===========================================

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not configured');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.force-ssl',
      ],
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not configured');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    this.isAuthenticated = true;

    return {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
    };
  }

  // ===========================================
  // Utility
  // ===========================================

  /**
   * Check if authenticated for uploads
   */
  canUpload(): boolean {
    return this.isAuthenticated;
  }
}

// ===========================================
// Singleton Export
// ===========================================

let youtubeClientInstance: YouTubeClient | null = null;

export function getYouTubeClient(): YouTubeClient {
  if (!youtubeClientInstance) {
    youtubeClientInstance = new YouTubeClient();
  }
  return youtubeClientInstance;
}
