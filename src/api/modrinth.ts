// Modrinth API Client
// API Docs: https://docs.modrinth.com/

import axios, { AxiosInstance } from 'axios';
import type { ModInfo, ModSearchOptions, ModSearchResult, ModFile, ModLoaderType } from '../types/mod';

const MODRINTH_API_BASE = 'https://api.modrinth.com/v2';

export class ModrinthAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: MODRINTH_API_BASE,
      timeout: 30000,
      headers: {
        'User-Agent': 'BonjourMinecraftLauncher/1.0.0'
      }
    });
  }

  /**
   * 搜索模组
   */
  async searchMods(options: ModSearchOptions): Promise<ModSearchResult> {
    const start = Date.now()
    const facets: string[] = [];
    
    // 游戏版本筛选
    if (options.gameVersion) {
      facets.push(`["versions:${options.gameVersion}"]`);
    }
    
    // Mod 加载器筛选
    if (options.modLoader) {
      const loaderMap: Record<string, string> = {
        'forge': 'forge',
        'fabric': 'fabric',
        'quilt': 'quilt',
        'neoforge': 'neoforge'
      };
      if (loaderMap[options.modLoader]) {
        facets.push(`["categories:${loaderMap[options.modLoader]}"]`);
      }
    }
    
    // 项目类型筛选 (模组)
    facets.push('["project_type:mod"]');

    const params: Record<string, string | number> = {
      query: options.query || '',
      offset: options.offset || 0,
      limit: options.limit || 20,
      facets: `[${facets.join(',')}]`
    };

    // 排序
    const sortMap: Record<string, string> = {
      'relevance': 'relevance',
      'downloads': 'downloads',
      'updated': 'updated',
      'newest': 'newest'
    };
    if (options.sortBy && sortMap[options.sortBy]) {
      params.index = sortMap[options.sortBy];
    }

    const response = await this.client.get('/search', { params });
    const data = response.data;
    const latency = Date.now() - start

    return {
      mods: data.hits.map((hit: any) => this.mapToModInfo(hit)),
      total: data.total_hits,
      offset: data.offset,
      limit: data.limit,
      sources: {
        modrinth: { total: data.total_hits, latency },
        curseforge: { total: 0, latency: 0 },
      },
      searchTime: latency,
    };
  }

  /**
   * 获取模组详情
   */
  async getModDetails(modId: string): Promise<ModInfo> {
    const response = await this.client.get(`/project/${modId}`);
    return this.mapToModInfo(response.data);
  }

  /**
   * 获取模组版本列表
   */
  async getModVersions(modId: string, gameVersion?: string, loader?: ModLoaderType): Promise<ModFile[]> {
    const params: Record<string, string> = {};
    
    if (gameVersion) {
      params.game_versions = `["${gameVersion}"]`;
    }
    
    if (loader) {
      const loaderMap: Record<string, string> = {
        'forge': 'forge',
        'fabric': 'fabric',
        'quilt': 'quilt',
        'neoforge': 'neoforge'
      };
      if (loaderMap[loader]) {
        params.loaders = `["${loaderMap[loader]}"]`;
      }
    }

    const response = await this.client.get(`/project/${modId}/version`, { params });
    return response.data.map((version: any) => this.mapToModFile(version));
  }

  /**
   * 获取特定版本文件
   */
  async getVersionFile(versionId: string): Promise<ModFile> {
    const response = await this.client.get(`/version/${versionId}`);
    return this.mapToModFile(response.data);
  }

  /**
   * 获取分类列表
   */
  async getCategories(): Promise<Array<{ id: string; name: string; icon: string }>> {
    const response = await this.client.get('/tag/category');
    return response.data.map((cat: any) => ({
      id: cat.name,
      name: cat.name,
      icon: cat.icon
    }));
  }

  /**
   * 批量获取版本文件信息 (用于依赖解析)
   */
  async getVersionsBatch(versionIds: string[]): Promise<ModFile[]> {
    const response = await this.client.post('/versions', { ids: versionIds });
    return response.data.map((version: any) => this.mapToModFile(version));
  }

  /**
   * 将 Modrinth 项目映射为 ModInfo
   */
  private mapToModInfo(project: any): ModInfo {
    const loaderMap: Record<string, ModLoaderType> = {
      'forge': 'forge',
      'fabric': 'fabric',
      'quilt': 'quilt',
      'neoforge': 'neoforge'
    };

    // 从分类中检测加载器
    let modLoader: ModLoaderType = 'unknown';
    for (const category of project.categories || []) {
      if (loaderMap[category]) {
        modLoader = loaderMap[category];
        break;
      }
    }

    return {
      id: project.slug,
      name: project.title,
      description: project.description,
      version: project.versions?.[0] || 'unknown',
      authors: project.team ? [project.team] : [],
      license: project.license?.id,
      iconUrl: project.icon_url,
      projectUrl: `https://modrinth.com/mod/${project.slug}`,
      gameVersions: project.game_versions || [],
      modLoader,
      dependencies: [],
      downloads: project.downloads,
      source: 'modrinth',
      sourceId: project.id,
      fileId: project.versions?.[0],
      categories: project.categories || [],
    };
  }

  /**
   * 将 Modrinth 版本映射为 ModFile
   */
  private mapToModFile(version: any): ModFile {
    const primaryFile = version.files?.find((f: any) => f.primary) || version.files?.[0];
    
    const loaderMap: Record<string, ModLoaderType> = {
      'forge': 'forge',
      'fabric': 'fabric',
      'quilt': 'quilt',
      'neoforge': 'neoforge'
    };

    let modLoader: ModLoaderType = 'unknown';
    for (const loader of version.loaders || []) {
      if (loaderMap[loader]) {
        modLoader = loaderMap[loader];
        break;
      }
    }

    return {
      id: version.id,
      version: version.version_number,
      gameVersions: version.game_versions || [],
      modLoader,
      downloadUrl: primaryFile?.url || '',
      fileSize: primaryFile?.size || 0,
      releaseType: this.mapReleaseType(version.version_type),
      uploadDate: version.date_published,
      downloads: version.downloads || 0
    };
  }

  private mapReleaseType(type: string): 'release' | 'beta' | 'alpha' {
    switch (type) {
      case 'release':
        return 'release';
      case 'beta':
        return 'beta';
      case 'alpha':
        return 'alpha';
      default:
        return 'release';
    }
  }
}

export const modrinthAPI = new ModrinthAPI();
