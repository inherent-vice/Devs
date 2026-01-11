/**
 * Google Drive Client
 *
 * Handles file uploads, downloads, and management for media assets.
 * Uses Google Drive API instead of Cloud Storage for simplicity and cost savings.
 */

import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getEnv } from '../utils/env.js';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

// ===========================================
// Types
// ===========================================

export interface DriveUploadOptions {
  mimeType?: string;
  description?: string;
  folderId?: string;
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  url: string;
  webViewLink: string;
  size: number;
  mimeType: string;
}

export interface DriveFolderStructure {
  root: string;
  audio: string;
  video: string;
  thumbnail: string;
  checkpoint: string;
  export: string;
  scenes: string;
  subtitles: string;
}

// ===========================================
// Drive Client
// ===========================================

export class DriveClient {
  private drive: drive_v3.Drive;
  private oauth2Client: OAuth2Client;
  private folders: DriveFolderStructure | null = null;
  private rootFolderName = 'YouTube-AI-Production';

  constructor() {
    const env = getEnv();

    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_DRIVE_CLIENT_ID,
      env.GOOGLE_DRIVE_CLIENT_SECRET,
      'http://localhost:3000/oauth2callback'
    );

    // Set refresh token
    if (!env.GOOGLE_DRIVE_REFRESH_TOKEN) {
      throw new Error('GOOGLE_DRIVE_REFRESH_TOKEN is required');
    }

    this.oauth2Client.setCredentials({
      refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN,
    });

    // Initialize Drive client
    this.drive = google.drive({
      version: 'v3',
      auth: this.oauth2Client,
    });

    console.log('[DriveClient] Connected to Google Drive');
  }

  // ===========================================
  // Initialization
  // ===========================================

  /**
   * Initialize folder structure
   */
  async initialize(): Promise<DriveFolderStructure> {
    if (this.folders) {
      return this.folders;
    }

    console.log('[DriveClient] Initializing folder structure...');

    // Find or create root folder
    const rootId = await this.findOrCreateFolder(this.rootFolderName);

    // Create subfolders
    const [audioId, videoId, thumbnailId, checkpointId, exportId, scenesId, subtitlesId] = await Promise.all([
      this.findOrCreateFolder('audio', rootId),
      this.findOrCreateFolder('video', rootId),
      this.findOrCreateFolder('thumbnail', rootId),
      this.findOrCreateFolder('checkpoint', rootId),
      this.findOrCreateFolder('export', rootId),
      this.findOrCreateFolder('scenes', rootId),
      this.findOrCreateFolder('subtitles', rootId),
    ]);

    this.folders = {
      root: rootId,
      audio: audioId,
      video: videoId,
      thumbnail: thumbnailId,
      checkpoint: checkpointId,
      export: exportId,
      scenes: scenesId,
      subtitles: subtitlesId,
    };

    console.log('[DriveClient] Folder structure ready');
    return this.folders;
  }

  // ===========================================
  // Upload Methods
  // ===========================================

  /**
   * Upload a file from local path
   */
  async uploadFile(
    localPath: string,
    filename: string,
    type: 'audio' | 'video' | 'thumbnail' | 'checkpoint' | 'export',
    options: DriveUploadOptions = {}
  ): Promise<DriveUploadResult> {
    await this.initialize();

    const folderId = this.folders![type];
    const mimeType = options.mimeType || this.detectMimeType(localPath);

    console.log(`[DriveClient] Uploading ${filename} to ${type}/`);

    const response = await this.drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        description: options.description,
      },
      media: {
        mimeType,
        body: fs.createReadStream(localPath),
      },
      fields: 'id, name, webViewLink, webContentLink, size, mimeType',
    });

    const file = response.data;

    // Make file publicly accessible
    await this.drive.permissions.create({
      fileId: file.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: file.id!,
      name: file.name!,
      url: `https://drive.google.com/uc?id=${file.id}&export=download`,
      webViewLink: file.webViewLink!,
      size: parseInt(file.size || '0'),
      mimeType: file.mimeType!,
    };
  }

  /**
   * Upload from buffer
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    type: 'audio' | 'video' | 'thumbnail' | 'checkpoint' | 'export',
    options: DriveUploadOptions = {}
  ): Promise<DriveUploadResult> {
    await this.initialize();

    const folderId = this.folders![type];
    const mimeType = options.mimeType || this.detectMimeTypeFromFilename(filename);

    console.log(`[DriveClient] Uploading buffer ${filename} to ${type}/`);

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const response = await this.drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        description: options.description,
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink, size, mimeType',
    });

    const file = response.data;

    // Make file publicly accessible
    await this.drive.permissions.create({
      fileId: file.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: file.id!,
      name: file.name!,
      url: `https://drive.google.com/uc?id=${file.id}&export=download`,
      webViewLink: file.webViewLink!,
      size: parseInt(file.size || '0'),
      mimeType: file.mimeType!,
    };
  }

  /**
   * Upload from base64
   */
  async uploadBase64(
    base64Data: string,
    filename: string,
    type: 'audio' | 'video' | 'thumbnail' | 'checkpoint' | 'export',
    options: DriveUploadOptions = {}
  ): Promise<DriveUploadResult> {
    const buffer = Buffer.from(base64Data, 'base64');
    return this.uploadBuffer(buffer, filename, type, options);
  }

  // ===========================================
  // Download Methods
  // ===========================================

  /**
   * Download file to local path
   */
  async downloadFile(fileId: string, localPath: string): Promise<void> {
    console.log(`[DriveClient] Downloading ${fileId} to ${localPath}`);

    const response = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const dest = fs.createWriteStream(localPath);

    return new Promise((resolve, reject) => {
      (response.data as NodeJS.ReadableStream)
        .on('error', reject)
        .pipe(dest)
        .on('error', reject)
        .on('finish', resolve);
    });
  }

  /**
   * Download to buffer
   */
  async downloadBuffer(fileId: string): Promise<Buffer> {
    console.log(`[DriveClient] Downloading ${fileId} to buffer`);

    const response = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data as ArrayBuffer);
  }

  // ===========================================
  // Management Methods
  // ===========================================

  /**
   * Delete file
   */
  async delete(fileId: string): Promise<void> {
    console.log(`[DriveClient] Deleting ${fileId}`);
    await this.drive.files.delete({ fileId });
  }

  /**
   * List files in folder
   */
  async list(type: 'audio' | 'video' | 'thumbnail' | 'checkpoint' | 'export'): Promise<drive_v3.Schema$File[]> {
    await this.initialize();

    const folderId = this.folders![type];

    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, size, mimeType, createdTime, webViewLink)',
      orderBy: 'createdTime desc',
    });

    return response.data.files || [];
  }

  /**
   * Get file metadata
   */
  async getMetadata(fileId: string): Promise<drive_v3.Schema$File> {
    const response = await this.drive.files.get({
      fileId,
      fields: 'id, name, size, mimeType, createdTime, webViewLink, webContentLink',
    });
    return response.data;
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  /**
   * Find or create a folder
   */
  private async findOrCreateFolder(name: string, parentId?: string): Promise<string> {
    // Search for existing folder
    let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id)',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create folder
    const folder = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      },
      fields: 'id',
    });

    console.log(`[DriveClient] Created folder: ${name}`);
    return folder.data.id!;
  }

  /**
   * Generate unique filename
   */
  generateFilename(
    type: 'audio' | 'video' | 'thumbnail' | 'checkpoint' | 'export',
    sessionId: string,
    originalName: string
  ): string {
    const timestamp = Date.now();
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    return `${sessionId}-${base}-${timestamp}${ext}`;
  }

  /**
   * Detect MIME type from file path
   */
  private detectMimeType(filePath: string): string {
    return this.detectMimeTypeFromFilename(filePath);
  }

  /**
   * Detect MIME type from filename
   */
  private detectMimeTypeFromFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.json': 'application/json',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get direct download URL
   */
  getDownloadUrl(fileId: string): string {
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }

  /**
   * Get streaming URL for video
   */
  getStreamUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  /**
   * Save a generated scene image
   * Used by ImageVideoAgent for Ken Burns style videos
   */
  async saveSceneImage(request: {
    imageId: string;
    prompt: string;
    width: number;
    height: number;
    base64Data?: string;
  }): Promise<{ fileId: string; webViewLink: string }> {
    await this.initialize();

    const filename = `${request.imageId}.png`;

    // For development, create a placeholder image file
    // In production, this would receive actual image data from Imagen API
    if (request.base64Data) {
      const result = await this.uploadBase64(
        request.base64Data,
        filename,
        'scenes' as any,
        {
          mimeType: 'image/png',
          description: `Scene image: ${request.prompt.substring(0, 100)}`,
        }
      );

      return {
        fileId: result.fileId,
        webViewLink: result.webViewLink,
      };
    }

    // Create a placeholder entry for development
    // This simulates what would happen with real image generation
    console.log(`[DriveClient] Scene image placeholder: ${filename} (${request.width}x${request.height})`);

    // Return a placeholder URL for development
    const placeholderId = `placeholder-${request.imageId}`;
    return {
      fileId: placeholderId,
      webViewLink: `https://via.placeholder.com/${request.width}x${request.height}.png?text=${encodeURIComponent(request.prompt.substring(0, 30))}`,
    };
  }

  /**
   * Save subtitle file
   */
  async saveSubtitle(
    content: string,
    filename: string,
    sessionId: string
  ): Promise<DriveUploadResult> {
    const buffer = Buffer.from(content, 'utf-8');
    return this.uploadBuffer(buffer, filename, 'subtitles' as any, {
      mimeType: 'text/plain',
      description: `Subtitle file for session ${sessionId}`,
    });
  }
}

// ===========================================
// Singleton Export
// ===========================================

let driveClientInstance: DriveClient | null = null;

export function getDriveClient(): DriveClient {
  if (!driveClientInstance) {
    driveClientInstance = new DriveClient();
  }
  return driveClientInstance;
}
