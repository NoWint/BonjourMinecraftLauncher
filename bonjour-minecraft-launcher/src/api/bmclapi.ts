// BMCLAPI Client (国内镜像加速)
// Docs: https://bmclapidoc.bangbang93.com/

import axios, { AxiosInstance } from 'axios';
import type { GameVersion } from '../types';

const BMCLAPI_BASE = 'https://bmclapi2.bangbang93.com';

export interface ForgeVersion {
  version: string;
  build: number;
  mcversion: string;
}

export interface FabricVersion {
  version: string;
  stable: boolean;
}

export interface QuiltVersion {
  version: string;
}

export interface NeoForgeVersion {
  version: string;
  rawVersion: string;
}

export class BMCLAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BMCLAPI_BASE,
      timeout: 30000
    });
  }

  /**
   * 获取 Minecraft 版本清单
   */
  async getVersionManifest(): Promise<{ latest: { release: string; snapshot: string }; versions: GameVersion[] }> {
    const response = await this.client.get('/mc/game/version_manifest.json');
    return response.data;
  }

  /**
   * 获取特定版本信息
   */
  async getVersionJson(versionId: string): Promise<any> {
    const response = await this.client.get(`/version/${versionId}/json`);
    return response.data;
  }

  /**
   * 获取 Forge 版本列表
   */
  async getForgeVersions(mcVersion?: string): Promise<ForgeVersion[]> {
    const url = mcVersion 
      ? `/forge/minecraft/${mcVersion}`
      : '/forge/list';
    const response = await this.client.get(url);
    return response.data;
  }

  /**
   * 获取 Forge 安装器下载链接
   */
  getForgeInstallerUrl(mcVersion: string, forgeVersion: string): string {
    return `${BMCLAPI_BASE}/forge/download?mcversion=${mcVersion}&version=${forgeVersion}&category=installer&format=jar`;
  }

  /**
   * 获取 Fabric 版本列表
   */
  async getFabricVersions(mcVersion?: string): Promise<{ loader: FabricVersion[]; installer: FabricVersion[] }> {
    const url = mcVersion
      ? `/fabric/meta/v2/versions/loader/${mcVersion}`
      : '/fabric/meta/v2/versions';
    const response = await this.client.get(url);
    return response.data;
  }

  /**
   * 获取 Fabric 安装器下载链接
   */
  getFabricInstallerUrl(loaderVersion: string, installerVersion: string): string {
    return `${BMCLAPI_BASE}/fabric/download?loader=${loaderVersion}&installer=${installerVersion}`;
  }

  /**
   * 获取 Quilt 版本列表
   */
  async getQuiltVersions(mcVersion?: string): Promise<{ loader: QuiltVersion[]; installer: QuiltVersion[] }> {
    const url = mcVersion
      ? `/quilt/meta/v3/versions/loader/${mcVersion}`
      : '/quilt/meta/v3/versions';
    const response = await this.client.get(url);
    return response.data;
  }

  /**
   * 获取 NeoForge 版本列表
   */
  async getNeoForgeVersions(mcVersion?: string): Promise<NeoForgeVersion[]> {
    const url = mcVersion
      ? `/neoforge/list/${mcVersion}`
      : '/neoforge/list';
    const response = await this.client.get(url);
    return response.data;
  }

  /**
   * 获取 NeoForge 安装器下载链接
   */
  getNeoForgeInstallerUrl(version: string): string {
    return `${BMCLAPI_BASE}/neoforge/installer/${version}`;
  }

  /**
   * 获取 OptiFine 版本列表
   */
  async getOptiFineVersions(mcVersion?: string): Promise<any[]> {
    const url = mcVersion
      ? `/optifine/${mcVersion}`
      : '/optifine/versionList';
    const response = await this.client.get(url);
    return response.data;
  }

  /**
   * 获取 OptiFine 下载链接
   */
  getOptiFineDownloadUrl(mcVersion: string, type: string, patch: string): string {
    return `${BMCLAPI_BASE}/optifine/${mcVersion}/${type}/${patch}`;
  }

  /**
   * 获取库文件下载链接
   */
  getLibraryUrl(libraryPath: string): string {
    return `${BMCLAPI_BASE}/libraries/${libraryPath}`;
  }

  /**
   * 获取资源文件下载链接
   */
  getAssetUrl(assetHash: string): string {
    return `${BMCLAPI_BASE}/assets/${assetHash.substring(0, 2)}/${assetHash}`;
  }

  /**
   * 获取客户端 Jar 下载链接
   */
  getClientJarUrl(versionId: string): string {
    return `${BMCLAPI_BASE}/version/${versionId}/client`;
  }

  /**
   * 获取服务端 Jar 下载链接
   */
  getServerJarUrl(versionId: string): string {
    return `${BMCLAPI_BASE}/version/${versionId}/server`;
  }

  /**
   * 获取所有可用的 Mod 加载器版本
   */
  async getAllModLoaders(mcVersion: string): Promise<{
    forge: ForgeVersion[];
    fabric: FabricVersion[];
    quilt: QuiltVersion[];
    neoforge: NeoForgeVersion[];
  }> {
    const [forge, fabric, quilt, neoforge] = await Promise.all([
      this.getForgeVersions(mcVersion).catch(() => []),
      this.getFabricVersions(mcVersion).then(v => v.loader).catch(() => []),
      this.getQuiltVersions(mcVersion).then(v => v.loader).catch(() => []),
      this.getNeoForgeVersions(mcVersion).catch(() => [])
    ]);

    return { forge, fabric, quilt, neoforge };
  }
}

export const bmclAPI = new BMCLAPI();
