# HMCL & PCL2 启动器 API 与逻辑分析报告

## 一、项目概述

### HMCL (Hello Minecraft! Launcher)
- **GitHub**: https://github.com/HMCL-dev/HMCL
- **语言**: Java (99%)
- **架构**: JavaFX + Gradle
- **许可证**: GPL-3.0

### PCL2 (Plain Craft Launcher 2)
- **GitHub**: https://github.com/Meloong-Git/PCL
- **语言**: VB.NET / C# (正在迁移)
- **架构**: WPF + .NET Framework 4.5+
- **许可证**: 开源

---

## 二、HMCL 核心模块分析

### 2.1 项目结构

```
HMCL/
├── HMCLCore/                    # 核心模块
│   └── src/main/java/org/jackhuang/hmcl/
│       ├── auth/               # 认证模块 (微软/Mojang/离线)
│       ├── download/           # 下载模块
│       ├── event/              # 事件系统
│       ├── game/               # 游戏管理 (版本/世界/存档)
│       ├── java/               # Java 管理
│       ├── launch/             # 启动流程
│       ├── mod/                # 模组管理
│       ├── resourcepack/       # 资源包管理
│       ├── schematic/          # 投影文件管理
│       ├── task/               # 任务系统
│       └── util/               # 工具类
├── HMCL/                       # UI 模块
└── HMCLBoot/                   # 启动引导
```

### 2.2 版本管理 API

#### 核心类
```java
// 版本仓库接口
public interface GameRepository {
    File getBaseDirectory();
    File getVersionsDirectory();
    File getVersionRoot(String id);
    File getLibraryFile(Version version, Library lib);
    File getNativeDirectory(String id, Platform platform);
    File getRunDirectory(String id);
}

// 默认实现
public class DefaultGameRepository implements GameRepository {
    // 版本发现机制
    protected void refreshVersionsImpl() {
        Map<String, Version> versions = new TreeMap<>();
        File[] files = new File(getBaseDirectory(), "versions").listFiles();
        // 扫描版本目录...
    }
}
```

#### 版本继承解析
```java
public Version resolve(VersionProvider provider) {
    Version resolved = this;
    if (getInheritsFrom() != null) {
        Version parent = provider.getVersion(getInheritsFrom());
        resolved = merge(parent.resolve(provider), this);
    }
    return resolved.markAsResolved();
}
```

### 2.3 模组管理 API

#### 模组解析器
```java
// 位于 HMCLCore/src/main/java/org/jackhuang/hmcl/mod/
public interface ModManager {
    // 模组元数据解析
    ModInfo parseMod(File modFile);
    
    // 依赖检测
    List<Dependency> checkDependencies(ModInfo mod);
    
    // 冲突检测
    List<Conflict> checkConflicts(List<ModInfo> mods);
}

// Forge 模组解析
public class ForgeModParser implements ModParser {
    public ModInfo parse(File jarFile) {
        // 读取 META-INF/mods.toml
        // 读取 mcmod.info (旧版)
    }
}

// Fabric 模组解析
public class FabricModParser implements ModParser {
    public ModInfo parse(File jarFile) {
        // 读取 fabric.mod.json
    }
}
```

#### 支持的模组格式
| 加载器 | 元数据文件 | 解析器 |
|--------|-----------|--------|
| Forge | `mods.toml` / `mcmod.info` | ForgeModParser |
| Fabric | `fabric.mod.json` | FabricModParser |
| Quilt | `quilt.mod.json` | QuiltModParser |
| LiteLoader | `litemod.json` | LiteModParser |

### 2.4 下载管理 API

#### 多源下载系统
```java
public class DownloadProvider {
    // 官方源
    public static final String MOJANG = "https://launcher.mojang.com";
    
    // BMCLAPI 镜像 (国内)
    public static final String BMCLAPI = "https://bmclapi2.bangbang93.com";
    
    // CurseForge API
    public static final String CURSEFORGE = "https://api.curseforge.com";
    
    // Modrinth API
    public static final String MODRINTH = "https://api.modrinth.com";
}

// 下载任务
public class FileDownloadTask extends Task<Void> {
    private final URL url;
    private final File file;
    private final IntegrityCheck integrityCheck;
    
    // 断点续传
    // 多线程下载
    // SHA-256 校验
}
```

### 2.5 世界/存档管理 API

```java
public class WorldManager {
    // 存档目录
    public File getSavesDirectory(String versionId);
    
    // 读取世界信息
    public WorldInfo getWorldInfo(File worldDir);
    
    // 导出/导入
    public void exportWorld(File worldDir, File target);
    public void importWorld(File source, String versionId);
    
    // 备份
    public void backupWorld(File worldDir);
}

public class WorldInfo {
    private String name;           // 世界名称
    private String gameVersion;    // 创建版本
    private long lastPlayed;       // 最后游玩时间
    private GameMode gameMode;     // 游戏模式
    private boolean cheatsEnabled; // 是否开启作弊
    private long size;             // 存档大小
}
```

---

## 三、PCL2 核心模块分析

### 3.1 项目结构

```
Plain Craft Launcher 2/
├── Modules/
│   ├── Base/                   # 基础模块
│   │   ├── ModBase.vb         # 基础功能
│   │   └── ModValidate.vb     # 验证模块
│   ├── Minecraft/
│   │   ├── ModJava.vb         # Java 管理
│   │   ├── ModLaunch.vb       # 启动流程
│   │   ├── ModDownload.vb     # 下载管理
│   │   ├── ModMod.vb          # 模组管理 (已拆分)
│   │   ├── ModComp.vb         # 社区资源 (CurseForge/Modrinth)
│   │   └── ModMinecraft.vb    # 游戏版本管理
│   └── Controls/              # UI 控件
├── Pages/                     # 页面
└── Images/                    # 资源文件
```

### 3.2 模组管理逻辑

#### 模组数据结构
```vb
Public Class ModEntry
    ' 基础信息
    Public Property Name As String
    Public Property FileName As String
    Public Property Version As String
    Public Property Description As String
    
    ' 兼容性
    Public Property SupportedGameVersions As List(Of String)
    Public Property ModLoader As ModLoaderType ' Forge/Fabric/Quilt
    Public Property Dependencies As List(Of ModDependency)
    
    ' 状态
    Public Property IsEnabled As Boolean
    Public Property FilePath As String
    Public Property FileSize As Long
    
    ' 元数据
    Public Property Authors As List(Of String)
    Public Property License As String
    Public Property ProjectUrl As String
End Class
```

#### 模组加载器检测
```vb
Public Enum ModLoaderType
    Forge
    Fabric
    Quilt
    NeoForge
    LiteLoader
    Unknown
End Enum

Public Function DetectModLoader(modFile As FileInfo) As ModLoaderType
    ' 1. 检查文件名特征
    ' 2. 读取 JAR 内元数据文件
    ' 3. 解析 mods.toml / fabric.mod.json
End Function
```

### 3.3 下载管理 API

#### 多线程下载器
```vb
Public Module ModDownload
    ' 下载源配置
    Public DownloadSources As New Dictionary(Of String, String) From {
        {"Official", "https://launcher.mojang.com"},
        {"BMCLAPI", "https://bmclapi2.bangbang93.com"},
        {"CurseForge", "https://api.curseforge.com"},
        {"Modrinth", "https://api.modrinth.com"}
    }
    
    ' 分块下载
    Public Sub DownloadFile(url As String, targetPath As String)
        ' 1. 获取文件大小
        ' 2. 分块 (默认 8 线程)
        ' 3. 并发下载
        ' 4. 合并文件
        ' 5. SHA256 校验
    End Sub
    
    ' 断点续传
    Public Sub ResumeDownload(url As String, targetPath As String)
        ' 检查 .tmp 文件
        ' 计算已下载大小
        ' 设置 Range 头
    End Sub
End Module
```

### 3.4 社区资源 API (CurseForge/Modrinth)

```vb
Public Module ModComp
    ' CurseForge API
    Public Function SearchCurseForge(
        query As String,
        gameVersion As String,
        modLoader As ModLoaderType,
        category As String
    ) As List(Of ModInfo)
        
        ' API Endpoint: /v1/mods/search
        ' Parameters:
        '   - gameId: 432 (Minecraft)
        '   - gameVersion: "1.20.1"
        '   - modLoaderType: 1 (Forge) / 4 (Fabric)
        '   - searchFilter: query
        '   - sortField: 2 (Popularity)
    End Function
    
    ' Modrinth API
    Public Function SearchModrinth(
        query As String,
        gameVersion As String,
        modLoader As String
    ) As List(Of ModInfo)
        
        ' API Endpoint: /v2/search
        ' Facets: [["versions:1.20.1"], ["categories:forge"]]
    End Function
    
    ' 下载文件
    Public Function DownloadMod(
        modInfo As ModInfo,
        version As String
    ) As FileInfo
        ' 1. 获取文件列表
        ' 2. 选择对应版本
        ' 3. 解析依赖
        ' 4. 并发下载
    End Function
End Module
```

### 3.5 版本管理逻辑

```vb
Public Module ModMinecraft
    ' 版本信息
    Public Class MinecraftVersion
        Public Property Id As String           ' 1.20.1
        Public Property Type As VersionType    ' Release/Snapshot
        Public Property ReleaseTime As DateTime
        Public Property Url As String          ' version.json URL
        Public Property Sha1 As String
    End Class
    
    ' 安装版本
    Public Sub InstallVersion(versionId As String)
        ' 1. 下载 version.json
        ' 2. 解析依赖库
        ' 3. 下载 client.jar
        ' 4. 下载 libraries
        ' 5. 下载 assets
        ' 6. 解压 natives
    End Sub
    
    ' 安装 Mod 加载器
    Public Sub InstallModLoader(
        versionId As String,
        loaderType As ModLoaderType,
        loaderVersion As String
    )
        Select Case loaderType
            Case ModLoaderType.Forge
                InstallForge(versionId, loaderVersion)
            Case ModLoaderType.Fabric
                InstallFabric(versionId, loaderVersion)
            Case ModLoaderType.Quilt
                InstallQuilt(versionId, loaderVersion)
        End Select
    End Sub
End Module
```

---

## 四、核心 API 对比

### 4.1 模组下载 API

| 功能 | HMCL | PCL2 |
|------|------|------|
| 搜索源 | CurseForge + Modrinth | CurseForge + Modrinth |
| 默认源 | Modrinth (国内优化) | BMCLAPI |
| 中文搜索 | ✅ | ✅ |
| 依赖解析 | ✅ 自动 | ✅ 自动 |
| 冲突检测 | ✅ | ✅ |
| 多线程下载 | ✅ | ✅ |
| 断点续传 | ✅ | ✅ |

### 4.2 版本管理 API

| 功能 | HMCL | PCL2 |
|------|------|------|
| 版本隔离 | ✅ | ✅ |
| 版本继承解析 | ✅ | ✅ |
| 自动安装加载器 | ✅ | ✅ |
| 整合包安装 | ✅ | ✅ |
| 版本回滚 | ✅ | ❌ |

### 4.3 世界管理 API

| 功能 | HMCL | PCL2 |
|------|------|------|
| 存档浏览 | ✅ | ✅ |
| 存档备份 | ✅ | ✅ |
| 存档导出 | ✅ | ✅ |
| 存档导入 | ✅ | ✅ |
| 世界信息查看 | ✅ | 基础 |

---

## 五、关键 API 端点

### 5.1 CurseForge API
```
Base URL: https://api.curseforge.com/v1

GET /mods/search                    # 搜索模组
GET /mods/{modId}                   # 获取模组详情
GET /mods/{modId}/files             # 获取文件列表
GET /mods/{modId}/files/{fileId}    # 获取文件详情
GET /categories                     # 获取分类列表
```

### 5.2 Modrinth API
```
Base URL: https://api.modrinth.com/v2

GET /search                         # 搜索模组
GET /project/{id}                   # 获取项目详情
GET /project/{id}/version           # 获取版本列表
GET /version/{id}                   # 获取版本详情
GET /tag/category                   # 获取分类标签
```

### 5.3 BMCLAPI (国内镜像)
```
Base URL: https://bmclapi2.bangbang93.com

GET /mc/game/version_manifest.json  # 版本清单
GET /version/{version}/json         # 版本信息
GET /libraries/{path}               # 下载库文件
GET /assets/{hash}                  # 下载资源文件
GET /forge/list                     # Forge 版本列表
GET /fabric/list                    # Fabric 版本列表
```

---

## 六、推荐实现方案

### 6.1 技术选型

基于 Electron + Node.js 的启动器，建议采用以下架构：

```
bonjour-minecraft-launcher/
├── src/
│   ├── api/                    # API 客户端
│   │   ├── curseforge.ts      # CurseForge API
│   │   ├── modrinth.ts        # Modrinth API
│   │   ├── bmclapi.ts         # BMCLAPI 镜像
│   │   └── mojang.ts          # Mojang 官方 API
│   ├── core/                   # 核心逻辑
│   │   ├── version/           # 版本管理
│   │   ├── mod/               # 模组管理
│   │   ├── world/             # 世界管理
│   │   └── download/          # 下载管理
│   └── components/             # UI 组件
└── electron/
    └── main/                    # 主进程
```

### 6.2 核心模块设计

#### 模组管理器
```typescript
interface ModManager {
  // 扫描本地模组
  scanMods(versionId: string): Promise<ModInfo[]>;
  
  // 搜索在线模组
  searchMods(query: string, options: SearchOptions): Promise<ModInfo[]>;
  
  // 安装模组
  installMod(modId: string, version: string): Promise<void>;
  
  // 检查依赖
  checkDependencies(mod: ModInfo): Promise<Dependency[]>;
  
  // 检查冲突
  checkConflicts(mods: ModInfo[]): Promise<Conflict[]>;
  
  // 启用/禁用
  toggleMod(modId: string, enabled: boolean): Promise<void>;
}
```

#### 版本管理器
```typescript
interface VersionManager {
  // 获取可用版本列表
  getAvailableVersions(): Promise<GameVersion[]>;
  
  // 安装版本
  installVersion(versionId: string): Promise<void>;
  
  // 安装 Mod 加载器
  installModLoader(
    versionId: string,
    loader: ModLoaderType,
    loaderVersion: string
  ): Promise<void>;
  
  // 删除版本
  removeVersion(versionId: string): Promise<void>;
}
```

#### 世界管理器
```typescript
interface WorldManager {
  // 获取存档列表
  getWorlds(versionId: string): Promise<WorldInfo[]>;
  
  // 备份存档
  backupWorld(worldPath: string): Promise<void>;
  
  // 导出存档
  exportWorld(worldPath: string, targetPath: string): Promise<void>;
  
  // 导入存档
  importWorld(sourcePath: string, versionId: string): Promise<void>;
  
  // 删除存档
  deleteWorld(worldPath: string): Promise<void>;
}
```

### 6.3 下载管理器

```typescript
interface DownloadManager {
  // 添加下载任务
  addTask(url: string, targetPath: string): DownloadTask;
  
  // 多线程下载
  downloadMultiThread(
    url: string,
    targetPath: string,
    threads: number
  ): Promise<void>;
  
  // 断点续传
  resumeDownload(url: string, targetPath: string): Promise<void>;
  
  // 校验文件
  verifyFile(filePath: string, expectedHash: string): Promise<boolean>;
}
```

---

## 七、参考资源

### HMCL
- GitHub: https://github.com/HMCL-dev/HMCL
- 文档: https://docs.hmcl.net/
- 核心模块: `HMCLCore/src/main/java/org/jackhuang/hmcl/`

### PCL2
- GitHub: https://github.com/Meloong-Git/PCL
- 官网: https://pcl2.aoe.top/
- 核心模块: `Plain Craft Launcher 2/Modules/Minecraft/`

### API 文档
- CurseForge API: https://docs.curseforge.com/
- Modrinth API: https://docs.modrinth.com/
- BMCLAPI: https://bmclapidoc.bangbang93.com/

---

*报告生成时间: 2026-05-04*
