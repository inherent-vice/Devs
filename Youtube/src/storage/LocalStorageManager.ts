/**
 * Local Storage Manager
 *
 * Session-based local storage for all generated assets.
 * Organizes files by session with proper structure.
 *
 * IMPORTANT: All methods now require explicit sessionId to avoid
 * concurrency issues with global state.
 */

import * as fs from 'fs';
import * as path from 'path';

// ===========================================
// Types
// ===========================================

export interface SessionInfo {
  id: string;
  createdAt: Date;
  topic?: string;
  videoType?: string;
  status: 'active' | 'completed' | 'failed';
}

export interface AssetInfo {
  type: AssetType;
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export type AssetType =
  | 'script'
  | 'storyboard'
  | 'audio'
  | 'video'
  | 'thumbnail'
  | 'subtitle'
  | 'metadata'
  | 'checkpoint';

export interface SessionManifest {
  session: SessionInfo;
  assets: AssetInfo[];
  totalSize: number;
  lastUpdated: Date;
}

// ===========================================
// Local Storage Manager
// ===========================================

export class LocalStorageManager {
  private baseDir: string;
  // REMOVED: private currentSession - all methods now require explicit sessionId
  // REMOVED: private manifest - loaded per-session as needed

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), 'output', 'sessions');
    this.ensureDirectory(this.baseDir);
  }

  // ===========================================
  // Session Management
  // ===========================================

  /**
   * Create a new session and return both session info and sessionId
   */
  createSession(options?: {
    topic?: string;
    videoType?: string;
    customId?: string;
  }): SessionInfo {
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '');
    const id = options?.customId || `session-${dateStr}-${timeStr}`;

    const session: SessionInfo = {
      id,
      createdAt: timestamp,
      topic: options?.topic,
      videoType: options?.videoType,
      status: 'active',
    };

    // Create session directory structure
    const sessionDir = this.getSessionDir(id);
    this.ensureDirectory(sessionDir);
    this.ensureDirectory(path.join(sessionDir, 'scripts'));
    this.ensureDirectory(path.join(sessionDir, 'audio'));
    this.ensureDirectory(path.join(sessionDir, 'video'));
    this.ensureDirectory(path.join(sessionDir, 'thumbnails'));
    this.ensureDirectory(path.join(sessionDir, 'subtitles'));
    this.ensureDirectory(path.join(sessionDir, 'checkpoints'));

    // Initialize manifest
    const manifest: SessionManifest = {
      session,
      assets: [],
      totalSize: 0,
      lastUpdated: timestamp,
    };

    this.saveManifest(id, manifest);

    console.log(`[LocalStorage] Created session: ${id}`);
    console.log(`[LocalStorage] Session directory: ${sessionDir}`);

    return session;
  }

  /**
   * Load existing session
   */
  loadSession(sessionId: string): SessionInfo {
    const manifest = this.loadManifest(sessionId);
    if (!manifest) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    console.log(`[LocalStorage] Loaded session: ${sessionId}`);
    return manifest.session;
  }

  /**
   * Get session info without setting it as current
   */
  getSession(sessionId: string): SessionInfo | null {
    const manifest = this.loadManifest(sessionId);
    return manifest?.session || null;
  }

  /**
   * Complete session
   */
  completeSession(sessionId: string): void {
    const manifest = this.loadManifest(sessionId);
    if (!manifest) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    manifest.session.status = 'completed';
    this.saveManifest(sessionId, manifest);

    console.log(`[LocalStorage] Session completed: ${sessionId}`);
  }

  /**
   * Mark session as failed
   */
  failSession(sessionId: string): void {
    const manifest = this.loadManifest(sessionId);
    if (!manifest) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    manifest.session.status = 'failed';
    this.saveManifest(sessionId, manifest);

    console.log(`[LocalStorage] Session failed: ${sessionId}`);
  }

  /**
   * List all sessions
   */
  listSessions(): SessionInfo[] {
    const sessions: SessionInfo[] = [];

    if (!fs.existsSync(this.baseDir)) {
      return sessions;
    }

    const dirs = fs.readdirSync(this.baseDir);
    for (const dir of dirs) {
      const manifestPath = path.join(this.baseDir, dir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const content = fs.readFileSync(manifestPath, 'utf-8');
          const manifest: SessionManifest = JSON.parse(content);
          sessions.push(manifest.session);
        } catch (e) {
          // Skip invalid manifests
        }
      }
    }

    return sessions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ===========================================
  // Asset Storage (all require sessionId)
  // ===========================================

  /**
   * Save script (JSON)
   */
  saveScript(sessionId: string, data: object, filename?: string): AssetInfo {
    return this.saveAsset(sessionId, 'script', data, filename || 'script.json', 'scripts');
  }

  /**
   * Save storyboard (JSON)
   */
  saveStoryboard(sessionId: string, data: object, filename?: string): AssetInfo {
    return this.saveAsset(sessionId, 'storyboard', data, filename || 'storyboard.json', 'scripts');
  }

  /**
   * Save audio file (Buffer)
   */
  saveAudio(sessionId: string, buffer: Buffer, filename: string, metadata?: Record<string, unknown>): AssetInfo {
    return this.saveBuffer(sessionId, 'audio', buffer, filename, 'audio', metadata);
  }

  /**
   * Save video file (Buffer)
   */
  saveVideo(sessionId: string, buffer: Buffer, filename: string, metadata?: Record<string, unknown>): AssetInfo {
    return this.saveBuffer(sessionId, 'video', buffer, filename, 'video', metadata);
  }

  /**
   * Save thumbnail (Buffer)
   */
  saveThumbnail(sessionId: string, buffer: Buffer, filename: string, metadata?: Record<string, unknown>): AssetInfo {
    return this.saveBuffer(sessionId, 'thumbnail', buffer, filename, 'thumbnails', metadata);
  }

  /**
   * Save subtitle file
   */
  saveSubtitle(sessionId: string, content: string, filename: string): AssetInfo {
    return this.saveText(sessionId, 'subtitle', content, filename, 'subtitles');
  }

  /**
   * Save checkpoint
   */
  saveCheckpoint(sessionId: string, data: object, phase: string): AssetInfo {
    const filename = `checkpoint-${phase}-${Date.now()}.json`;
    return this.saveAsset(sessionId, 'checkpoint', data, filename, 'checkpoints');
  }

  /**
   * Save metadata
   */
  saveMetadata(sessionId: string, data: object, filename?: string): AssetInfo {
    return this.saveAsset(sessionId, 'metadata', data, filename || 'metadata.json', '.');
  }

  /**
   * Save result summary
   */
  saveResult(sessionId: string, data: object): AssetInfo {
    return this.saveAsset(sessionId, 'metadata', data, 'result.json', '.');
  }

  // ===========================================
  // Generic Save Methods
  // ===========================================

  /**
   * Save JSON asset
   */
  private saveAsset(
    sessionId: string,
    type: AssetType,
    data: object,
    filename: string,
    subdir: string
  ): AssetInfo {
    const content = JSON.stringify(data, null, 2);
    const filePath = path.join(this.getSessionDir(sessionId), subdir, filename);

    this.ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf-8');

    const asset = this.registerAsset(sessionId, type, filename, filePath, Buffer.byteLength(content));
    console.log(`[LocalStorage] Saved ${type}: ${filename}`);

    return asset;
  }

  /**
   * Save buffer asset
   */
  private saveBuffer(
    sessionId: string,
    type: AssetType,
    buffer: Buffer,
    filename: string,
    subdir: string,
    metadata?: Record<string, unknown>
  ): AssetInfo {
    const filePath = path.join(this.getSessionDir(sessionId), subdir, filename);

    this.ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, buffer);

    const asset = this.registerAsset(sessionId, type, filename, filePath, buffer.length, metadata);
    console.log(`[LocalStorage] Saved ${type}: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);

    return asset;
  }

  /**
   * Save text asset
   */
  private saveText(
    sessionId: string,
    type: AssetType,
    content: string,
    filename: string,
    subdir: string
  ): AssetInfo {
    const filePath = path.join(this.getSessionDir(sessionId), subdir, filename);

    this.ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf-8');

    const asset = this.registerAsset(sessionId, type, filename, filePath, Buffer.byteLength(content));
    console.log(`[LocalStorage] Saved ${type}: ${filename}`);

    return asset;
  }

  // ===========================================
  // Asset Retrieval
  // ===========================================

  /**
   * Get assets by type for a session
   */
  getAssets(sessionId: string, type?: AssetType): AssetInfo[] {
    const manifest = this.loadManifest(sessionId);
    if (!manifest) {
      return [];
    }

    if (type) {
      return manifest.assets.filter(a => a.type === type);
    }

    return manifest.assets;
  }

  /**
   * Read JSON asset
   */
  readJson<T = object>(assetPath: string): T {
    const content = fs.readFileSync(assetPath, 'utf-8');
    return JSON.parse(content) as T;
  }

  /**
   * Read buffer asset
   */
  readBuffer(assetPath: string): Buffer {
    return fs.readFileSync(assetPath);
  }

  /**
   * Get session directory
   */
  getSessionDir(sessionId: string): string {
    return path.join(this.baseDir, sessionId);
  }

  // ===========================================
  // Manifest Management
  // ===========================================

  private loadManifest(sessionId: string): SessionManifest | null {
    const manifestPath = path.join(this.getSessionDir(sessionId), 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private saveManifest(sessionId: string, manifest: SessionManifest): void {
    const manifestPath = path.join(this.getSessionDir(sessionId), 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private registerAsset(
    sessionId: string,
    type: AssetType,
    filename: string,
    filePath: string,
    size: number,
    metadata?: Record<string, unknown>
  ): AssetInfo {
    const asset: AssetInfo = {
      type,
      filename,
      path: filePath,
      size,
      createdAt: new Date(),
      metadata,
    };

    const manifest = this.loadManifest(sessionId);
    if (manifest) {
      manifest.assets.push(asset);
      manifest.totalSize += size;
      manifest.lastUpdated = new Date();
      this.saveManifest(sessionId, manifest);
    }

    return asset;
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Get storage statistics
   */
  getStats(): {
    totalSessions: number;
    totalSize: number;
  } {
    const sessions = this.listSessions();
    let totalSize = 0;

    for (const session of sessions) {
      const manifest = this.loadManifest(session.id);
      if (manifest) {
        totalSize += manifest.totalSize;
      }
    }

    return {
      totalSessions: sessions.length,
      totalSize,
    };
  }

  /**
   * Clean up old sessions
   */
  cleanup(keepDays: number = 7): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepDays);

    const sessions = this.listSessions();
    let removed = 0;

    for (const session of sessions) {
      if (new Date(session.createdAt) < cutoff && session.status === 'completed') {
        const sessionDir = this.getSessionDir(session.id);
        fs.rmSync(sessionDir, { recursive: true, force: true });
        removed++;
        console.log(`[LocalStorage] Removed old session: ${session.id}`);
      }
    }

    return removed;
  }

  /**
   * Delete a specific session
   */
  deleteSession(sessionId: string): void {
    const sessionDir = this.getSessionDir(sessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[LocalStorage] Deleted session: ${sessionId}`);
    }
  }
}

// ===========================================
// Singleton Export
// ===========================================

let storageInstance: LocalStorageManager | null = null;

export function getLocalStorage(): LocalStorageManager {
  if (!storageInstance) {
    storageInstance = new LocalStorageManager();
  }
  return storageInstance;
}

/**
 * Create a new session and return the sessionId for use in subsequent calls
 * @deprecated Use getLocalStorage().createSession() instead and track sessionId yourself
 */
export function createSessionStorage(options?: {
  topic?: string;
  videoType?: string;
}): { storage: LocalStorageManager; sessionId: string } {
  const storage = getLocalStorage();
  const session = storage.createSession(options);
  return { storage, sessionId: session.id };
}
