// Download related types

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled';

export interface DownloadTask {
  id: string;
  url: string;
  targetPath: string;
  fileName: string;
  
  // 进度
  status: DownloadStatus;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0-100
  
  // 速度
  speed: number; // bytes/s
  eta: number; // seconds
  
  // 错误信息
  error?: string;
  retryCount: number;
  
  // 校验
  expectedHash?: string;
  hashAlgorithm?: 'sha1' | 'sha256' | 'md5';
  
  // 多线程
  threads: number;
  chunks: DownloadChunk[];
  
  // 时间
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface DownloadChunk {
  index: number;
  start: number;
  end: number;
  downloaded: number;
  status: DownloadStatus;
}

export interface DownloadOptions {
  threads?: number;
  expectedHash?: string;
  hashAlgorithm?: 'sha1' | 'sha256' | 'md5';
  resume?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface DownloadSource {
  name: string;
  url: string;
  priority: number;
  enabled: boolean;
}

export interface DownloadStats {
  activeDownloads: number;
  queuedDownloads: number;
  completedDownloads: number;
  failedDownloads: number;
  totalSpeed: number;
  totalDownloaded: number;
}
