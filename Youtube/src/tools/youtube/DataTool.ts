/**
 * YouTube Data API Tool
 *
 * Provides access to YouTube Data API v3 for trend analysis,
 * competitor research, and video metadata.
 */

import { ai } from '../../genkit.config.js';
import { z } from 'zod';

// ===========================================
// Tool Schemas
// ===========================================

const SearchVideosInputSchema = z.object({
  query: z.string().describe('Search query'),
  maxResults: z.number().min(1).max(50).default(10),
  order: z.enum(['relevance', 'date', 'viewCount', 'rating']).default('viewCount'),
  publishedAfter: z.string().optional().describe('ISO 8601 date'),
  regionCode: z.string().default('KR'),
  videoDuration: z.enum(['short', 'medium', 'long', 'any']).default('any'),
});

const VideoDetailsInputSchema = z.object({
  videoIds: z.array(z.string()).min(1).max(50),
});

const ChannelDetailsInputSchema = z.object({
  channelIds: z.array(z.string()).min(1).max(50),
});

const TrendingVideosInputSchema = z.object({
  regionCode: z.string().default('KR'),
  categoryId: z.string().optional(),
  maxResults: z.number().min(1).max(50).default(25),
});

// ===========================================
// Response Types
// ===========================================

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

// ===========================================
// YouTube API Client
// ===========================================

export class YouTubeDataClient {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[YouTubeDataClient] No API key provided, mock data will be used');
    }
  }

  /**
   * Search for videos
   */
  async searchVideos(params: z.infer<typeof SearchVideosInputSchema>): Promise<VideoSearchResult[]> {
    if (!this.apiKey) {
      return this.getMockSearchResults(params.query, params.maxResults);
    }

    try {
      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('type', 'video');
      url.searchParams.set('q', params.query);
      url.searchParams.set('maxResults', String(params.maxResults));
      url.searchParams.set('order', params.order);
      url.searchParams.set('regionCode', params.regionCode);

      if (params.publishedAfter) {
        url.searchParams.set('publishedAfter', params.publishedAfter);
      }

      if (params.videoDuration !== 'any') {
        url.searchParams.set('videoDuration', params.videoDuration);
      }

      const response = await fetch(url.toString());
      const data: any = await response.json();

      if (!response.ok) {
        throw new Error(`YouTube API error: ${data.error?.message || 'Unknown error'}`);
      }

      return data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      }));
    } catch (error) {
      console.error('[YouTubeDataClient] Search error:', error);
      return this.getMockSearchResults(params.query, params.maxResults);
    }
  }

  /**
   * Get video details
   */
  async getVideoDetails(videoIds: string[]): Promise<VideoDetails[]> {
    if (!this.apiKey) {
      return this.getMockVideoDetails(videoIds);
    }

    try {
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('part', 'snippet,statistics,contentDetails');
      url.searchParams.set('id', videoIds.join(','));

      const response = await fetch(url.toString());
      const data: any = await response.json();

      if (!response.ok) {
        throw new Error(`YouTube API error: ${data.error?.message || 'Unknown error'}`);
      }

      return data.items.map((item: any) => ({
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails.duration,
        viewCount: parseInt(item.statistics.viewCount || '0'),
        likeCount: parseInt(item.statistics.likeCount || '0'),
        commentCount: parseInt(item.statistics.commentCount || '0'),
        tags: item.snippet.tags || [],
        categoryId: item.snippet.categoryId,
        thumbnailUrl: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
      }));
    } catch (error) {
      console.error('[YouTubeDataClient] Video details error:', error);
      return this.getMockVideoDetails(videoIds);
    }
  }

  /**
   * Get channel details
   */
  async getChannelDetails(channelIds: string[]): Promise<ChannelDetails[]> {
    if (!this.apiKey) {
      return this.getMockChannelDetails(channelIds);
    }

    try {
      const url = new URL(`${this.baseUrl}/channels`);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('part', 'snippet,statistics');
      url.searchParams.set('id', channelIds.join(','));

      const response = await fetch(url.toString());
      const data: any = await response.json();

      if (!response.ok) {
        throw new Error(`YouTube API error: ${data.error?.message || 'Unknown error'}`);
      }

      return data.items.map((item: any) => ({
        channelId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        subscriberCount: parseInt(item.statistics.subscriberCount || '0'),
        videoCount: parseInt(item.statistics.videoCount || '0'),
        viewCount: parseInt(item.statistics.viewCount || '0'),
        thumbnailUrl: item.snippet.thumbnails.high?.url,
        country: item.snippet.country || 'KR',
      }));
    } catch (error) {
      console.error('[YouTubeDataClient] Channel details error:', error);
      return this.getMockChannelDetails(channelIds);
    }
  }

  /**
   * Get trending videos
   */
  async getTrendingVideos(params: z.infer<typeof TrendingVideosInputSchema>): Promise<VideoDetails[]> {
    if (!this.apiKey) {
      return this.getMockTrendingVideos(params.maxResults);
    }

    try {
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('part', 'snippet,statistics,contentDetails');
      url.searchParams.set('chart', 'mostPopular');
      url.searchParams.set('regionCode', params.regionCode);
      url.searchParams.set('maxResults', String(params.maxResults));

      if (params.categoryId) {
        url.searchParams.set('videoCategoryId', params.categoryId);
      }

      const response = await fetch(url.toString());
      const data: any = await response.json();

      if (!response.ok) {
        throw new Error(`YouTube API error: ${data.error?.message || 'Unknown error'}`);
      }

      return data.items.map((item: any) => ({
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails.duration,
        viewCount: parseInt(item.statistics.viewCount || '0'),
        likeCount: parseInt(item.statistics.likeCount || '0'),
        commentCount: parseInt(item.statistics.commentCount || '0'),
        tags: item.snippet.tags || [],
        categoryId: item.snippet.categoryId,
        thumbnailUrl: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
      }));
    } catch (error) {
      console.error('[YouTubeDataClient] Trending videos error:', error);
      return this.getMockTrendingVideos(params.maxResults);
    }
  }

  // ===========================================
  // Mock Data (for development/testing)
  // ===========================================

  private getMockSearchResults(query: string, count: number): VideoSearchResult[] {
    return Array.from({ length: count }, (_, i) => ({
      videoId: `mock-video-${i + 1}`,
      title: `${query} - Video ${i + 1}`,
      description: `Description for ${query} video ${i + 1}`,
      channelId: `mock-channel-${i + 1}`,
      channelTitle: `Channel ${i + 1}`,
      publishedAt: new Date(Date.now() - i * 86400000).toISOString(),
      thumbnailUrl: `https://i.ytimg.com/vi/mock-video-${i + 1}/hqdefault.jpg`,
    }));
  }

  private getMockVideoDetails(videoIds: string[]): VideoDetails[] {
    return videoIds.map((id, i) => ({
      videoId: id,
      title: `Mock Video ${i + 1}`,
      description: `Description for video ${id}`,
      channelId: `mock-channel-${i + 1}`,
      channelTitle: `Channel ${i + 1}`,
      publishedAt: new Date().toISOString(),
      duration: 'PT5M30S',
      viewCount: Math.floor(Math.random() * 1000000),
      likeCount: Math.floor(Math.random() * 50000),
      commentCount: Math.floor(Math.random() * 5000),
      tags: ['tag1', 'tag2', 'tag3'],
      categoryId: '24',
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    }));
  }

  private getMockChannelDetails(channelIds: string[]): ChannelDetails[] {
    return channelIds.map((id, i) => ({
      channelId: id,
      title: `Mock Channel ${i + 1}`,
      description: `Description for channel ${id}`,
      subscriberCount: Math.floor(Math.random() * 10000000),
      videoCount: Math.floor(Math.random() * 1000),
      viewCount: Math.floor(Math.random() * 100000000),
      thumbnailUrl: `https://yt3.ggpht.com/channel/${id}`,
      country: 'KR',
    }));
  }

  private getMockTrendingVideos(count: number): VideoDetails[] {
    return Array.from({ length: count }, (_, i) => ({
      videoId: `trending-${i + 1}`,
      title: `Trending Video ${i + 1}`,
      description: `This is trending video ${i + 1}`,
      channelId: `trending-channel-${i + 1}`,
      channelTitle: `Popular Channel ${i + 1}`,
      publishedAt: new Date().toISOString(),
      duration: 'PT10M00S',
      viewCount: Math.floor(Math.random() * 10000000) + 1000000,
      likeCount: Math.floor(Math.random() * 500000) + 10000,
      commentCount: Math.floor(Math.random() * 50000) + 1000,
      tags: ['trending', 'viral', '2026'],
      categoryId: '24',
      thumbnailUrl: `https://i.ytimg.com/vi/trending-${i + 1}/maxresdefault.jpg`,
    }));
  }
}

// ===========================================
// Genkit Tools
// ===========================================

export const youtubeSearchTool = ai.defineTool(
  {
    name: 'youtube-search',
    description: 'Search for YouTube videos by query',
    inputSchema: SearchVideosInputSchema,
    outputSchema: z.array(z.object({
      videoId: z.string(),
      title: z.string(),
      description: z.string(),
      channelId: z.string(),
      channelTitle: z.string(),
      publishedAt: z.string(),
      thumbnailUrl: z.string(),
    })),
  },
  async (input) => {
    const client = new YouTubeDataClient();
    return client.searchVideos(input);
  }
);

export const youtubeVideoDetailsTool = ai.defineTool(
  {
    name: 'youtube-video-details',
    description: 'Get detailed information about specific videos',
    inputSchema: VideoDetailsInputSchema,
    outputSchema: z.array(z.any()),
  },
  async (input) => {
    const client = new YouTubeDataClient();
    return client.getVideoDetails(input.videoIds);
  }
);

export const youtubeTrendingTool = ai.defineTool(
  {
    name: 'youtube-trending',
    description: 'Get currently trending videos',
    inputSchema: TrendingVideosInputSchema,
    outputSchema: z.array(z.any()),
  },
  async (input) => {
    const client = new YouTubeDataClient();
    return client.getTrendingVideos(input);
  }
);

// ===========================================
// Default Export
// ===========================================

export const youtubeDataClient = new YouTubeDataClient();
