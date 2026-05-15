// Download Manager - 下载管理核心
// 参考 HMCL: HMCLCore/src/main/java/org/jackhuang/hmcl/task/FileDownloadTask.java

import type { DownloadTask, DownloadOptions, DownloadStats, DownloadChunk } from '../../types/download';

export class DownloadManager {
  private static instance: DownloadManager;
  private tasks: Map<string, DownloadTask> = new Map();
  private listeners: Set<(tasks: DownloadTask[]) => void> = new Set();
  
  private constructor() {}
  
  static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  /**
   * 添加下载任务
   */
  async addTask(
    url: string, 
    targetPath: string, 
    options: DownloadOptions = {}
  ): Promise<DownloadTask> {
    const id = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: DownloadTask = {
      id,
      url,
      targetPath,
      fileName: targetPath.split('/').pop() || 'unknown',
      status: 'pending',
      totalBytes: 0,
      downloadedBytes: 0,
      progress: 0,
      speed: 0,
      eta: 0,
      retryCount: 0,
      expectedHash: options.expectedHash,
      hashAlgorithm: options.hashAlgorithm,
      threads: options.threads || 4,
      chunks: [],
      createdAt: Date.now()
    };

    this.tasks.set(id, task);
    this.notifyListeners();

    // 开始下载
    this.startDownload(task, options);

    return task;
  }

  /**
   * 开始下载
   */
  private async startDownload(task: DownloadTask, options: DownloadOptions): Promise<void> {
    try {
      task.status = 'downloading';
      task.startedAt = Date.now();
      this.updateTask(task);

      // 通过 Electron IPC 调用主进程下载
      await window.minecraftAPI.downloadFile(task.url, task.targetPath, {
        ...options,
        onProgress: (progress: { downloaded: number; total: number; speed: number }) => {
          task.downloadedBytes = progress.downloaded;
          task.totalBytes = progress.total;
          task.progress = progress.total > 0 
            ? Math.round((progress.downloaded / progress.total) * 100) 
            : 0;
          task.speed = progress.speed;
          
          // 计算 ETA
          if (task.speed > 0 && task.totalBytes > 0) {
            const remaining = task.totalBytes - task.downloadedBytes;
            task.eta = Math.round(remaining / task.speed);
          }
          
          this.updateTask(task);
        }
      });

      task.status = 'completed';
      task.completedAt = Date.now();
      task.progress = 100;
      this.updateTask(task);

    } catch (error) {
      task.status = 'error';
      task.error = String(error);
      this.updateTask(task);
    }
  }

  /**
   * 暂停下载
   */
  pauseTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'downloading') {
      task.status = 'paused';
      this.updateTask(task);
      // 通知主进程暂停
      window.minecraftAPI.pauseDownload(taskId);
    }
  }

  /**
   * 恢复下载
   */
  resumeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'paused') {
      task.status = 'downloading';
      this.updateTask(task);
      // 通知主进程恢复
      window.minecraftAPI.resumeDownload(taskId);
    }
  }

  /**
   * 取消下载
   */
  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'cancelled';
      this.updateTask(task);
      // 通知主进程取消
      window.minecraftAPI.cancelDownload(taskId);
    }
  }

  /**
   * 重试下载
   */
  retryTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && (task.status === 'error' || task.status === 'cancelled')) {
      task.status = 'pending';
      task.error = undefined;
      task.retryCount++;
      this.updateTask(task);
      this.startDownload(task, {});
    }
  }

  /**
   * 删除任务
   */
  removeTask(taskId: string): void {
    this.tasks.delete(taskId);
    this.notifyListeners();
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取进行中的任务
   */
  getActiveTasks(): DownloadTask[] {
    return this.getAllTasks().filter(t => 
      t.status === 'downloading' || t.status === 'pending'
    );
  }

  /**
   * 获取统计信息
   */
  getStats(): DownloadStats {
    const tasks = this.getAllTasks();
    return {
      activeDownloads: tasks.filter(t => t.status === 'downloading').length,
      queuedDownloads: tasks.filter(t => t.status === 'pending').length,
      completedDownloads: tasks.filter(t => t.status === 'completed').length,
      failedDownloads: tasks.filter(t => t.status === 'error').length,
      totalSpeed: tasks
        .filter(t => t.status === 'downloading')
        .reduce((sum, t) => sum + t.speed, 0),
      totalDownloaded: tasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.totalBytes, 0)
    };
  }

  /**
   * 批量添加下载任务
   */
  async addBatchTasks(
    items: Array<{ url: string; targetPath: string; options?: DownloadOptions }>
  ): Promise<DownloadTask[]> {
    const tasks: DownloadTask[] = [];
    
    for (const item of items) {
      const task = await this.addTask(item.url, item.targetPath, item.options);
      tasks.push(task);
    }
    
    return tasks;
  }

  /**
   * 等待所有任务完成
   */
  async waitForAll(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        const active = this.getActiveTasks();
        if (active.length === 0) {
          resolve();
        } else {
          setTimeout(check, 1000);
        }
      };
      check();
    });
  }

  /**
   * 订阅任务更新
   */
  subscribe(callback: (tasks: DownloadTask[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getAllTasks());
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 更新任务并通知监听器
   */
  private updateTask(task: DownloadTask): void {
    this.tasks.set(task.id, task);
    this.notifyListeners();
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const tasks = this.getAllTasks();
    this.listeners.forEach(callback => callback(tasks));
  }

  /**
   * 格式化速度
   */
  formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let size = bytesPerSecond;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 格式化 ETA
   */
  formatETA(seconds: number): string {
    if (seconds === 0) return '计算中...';
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时 ${minutes}分钟`;
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

export const downloadManager = DownloadManager.getInstance();
