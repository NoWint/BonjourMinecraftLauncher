# Bonjour Minecraft Launcher — Electron → Tauri 迁移计划

## 一、项目现状总结

### 1.1 技术栈

| 层级 | 当前技术 | 目标技术 |
|------|---------|---------|
| 桌面框架 | Electron 30 | Tauri 2.x |
| 前端 UI | React 18 + TypeScript | React 18 + TypeScript（不变） |
| 样式 | Tailwind CSS 3 + Framer Motion | 不变 |
| 后端逻辑 | Node.js (electron/main.ts, ~7000行) | Rust (src-tauri/) |
| 进程通信 | ipcMain/ipcRenderer (223个通道) | Tauri Commands + Events |
| 打包 | electron-builder | Tauri 内置打包 |
| 源码保护 | javascript-obfuscator | Rust 编译为机器码（天然保护） |

### 1.2 迁移规模

| 类别 | 数量 | 迁移难度 |
|------|------|---------|
| ipcMain.handle 通道 | 223 个 | 高（需用 Rust 重写） |
| webContents.send 事件 | 15 个 | 中（改为 Tauri Events） |
| BrowserWindow 配置 | 1 处 | 低（Tauri 配置文件） |
| Tray 系统托盘 | 1 处 | 低（Tauri tray API） |
| dialog 文件对话框 | 11 处 | 低（Tauri dialog API） |
| shell.openExternal | 1 处 | 低（Tauri shell API） |
| child_process.spawn | 2 处 | 中（Rust std::process::Command） |
| child_process.execSync | 12 处 | 中（Rust std::process::Command） |
| fs 文件操作 | 80+ 处 | 中（Rust std::fs） |
| axios 网络请求 | 20+ 个端点 | 中（Rust reqwest） |
| minecraft-launcher-core | 3 处 | 高（需 Rust 替代方案） |
| React 前端组件 | 33 个 | 极低（几乎不变） |
| 前端 core/ 业务逻辑 | 8 个模块 | 低（仅改调用方式） |

### 1.3 可保留代码比例

| 模块 | 保留比例 | 说明 |
|------|---------|------|
| src/components/*.tsx | ~95% | 仅需改 API 调用方式 |
| src/core/*.ts | ~80% | API 调用从 window.minecraftAPI 改为 invoke() |
| src/types/*.ts | ~100% | 类型定义完全不变 |
| src/hooks/*.ts | ~90% | 少量 Electron 特有 API 需适配 |
| src/i18n/* | ~100% | 完全不变 |
| src/api/*.ts | ~90% | 前端 API 客户端不变，部分移入 Rust |
| electron/main.ts | 0% | 全部用 Rust 重写 |
| electron/preload.ts | 0% | Tauri 不需要 preload |

---

## 二、迁移策略：分阶段渐进式迁移

采用**分阶段**策略，每个阶段完成后可独立验证，降低风险。

---

## 三、详细实施步骤

### 阶段 1：项目初始化与基础架构搭建

#### 步骤 1.1：安装 Tauri CLI 和依赖

```bash
# 安装 Tauri CLI
cargo install tauri-cli

# 在现有项目目录中初始化 Tauri
cd bonjour-minecraft-launcher
cargo tauri init
```

#### 步骤 1.2：配置 Tauri 项目结构

创建 `src-tauri/` 目录，包含：

```
src-tauri/
├── Cargo.toml              # Rust 依赖配置
├── tauri.conf.json         # Tauri 应用配置
├── capabilities/
│   └── default.json        # 权限配置
├── icons/                  # 应用图标
├── src/
│   ├── main.rs             # 入口
│   ├── lib.rs              # 模块注册
│   ├── commands/           # Tauri 命令模块
│   │   ├── mod.rs
│   │   ├── version.rs      # 版本管理
│   │   ├── account.rs      # 账号管理
│   │   ├── settings.rs     # 设置管理
│   │   ├── launch.rs       # 游戏启动
│   │   ├── java.rs         # Java 管理
│   │   ├── instance.rs     # 实例管理
│   │   ├── mod_mgr.rs      # 模组管理
│   │   ├── world.rs        # 存档管理
│   │   ├── resource.rs     # 资源包管理
│   │   ├── modpack.rs      # 整合包管理
│   │   ├── server.rs       # 服务器管理
│   │   ├── auth.rs         # 微软/Littleskin 认证
│   │   ├── download.rs     # 下载管理
│   │   ├── system.rs       # 系统信息/硬件
│   │   ├── tray.rs         # 系统托盘
│   │   ├── jvm.rs          # JVM 调优
│   │   ├── crash.rs        # 崩溃报告
│   │   ├── benchmark.rs    # 基准测试
│   │   ├── migration.rs    # 迁移助手
│   │   └── update.rs       # 自动更新
│   ├── models/             # 数据模型（对应 TypeScript 类型）
│   │   ├── mod.rs
│   │   ├── account.rs
│   │   ├── settings.rs
│   │   ├── version.rs
│   │   ├── instance.rs
│   │   ├── mod_info.rs
│   │   ├── world.rs
│   │   ├── resource.rs
│   │   ├── server.rs
│   │   └── launch.rs
│   ├── services/           # 业务逻辑服务
│   │   ├── mod.rs
│   │   ├── minecraft_launcher.rs  # Minecraft 启动核心
│   │   ├── file_manager.rs        # 文件系统操作
│   │   ├── network.rs             # HTTP 请求
│   │   ├── java_detector.rs       # Java 检测
│   │   ├── microsoft_auth.rs      # 微软 OAuth
│   │   └── littleskin_auth.rs     # Littleskin 认证
│   └── utils/
│       ├── mod.rs
│       ├── paths.rs               # 路径管理
│       ├── crypto.rs              # 哈希/加密
│       └── platform.rs            # 平台检测
└── build.rs
```

#### 步骤 1.3：配置 tauri.conf.json

```json
{
  "productName": "Bonjour",
  "version": "0.0.3",
  "identifier": "com.bonjour.minecraft-launcher",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build:frontend",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Bonjour Minecraft",
        "width": 1200,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "decorations": false,
        "transparent": false
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

#### 步骤 1.4：配置 Cargo.toml 核心依赖

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "devtools"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-process = "2"
tauri-plugin-updater = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json", "stream"] }
tokio = { version = "1", features = ["full"] }
sha2 = "0.10"
md-5 = "0.10"
zip = "2"
uuid = { version = "1", features = ["v4"] }
chrono = "0.4"
sysinfo = "0.33"
dirs = "5"
```

#### 步骤 1.5：修改前端构建配置

- 移除 `vite-plugin-electron` 和 `vite-plugin-electron-renderer`
- 修改 `vite.config.ts`，移除 Electron 相关插件
- 添加 `@tauri-apps/api` 前端依赖
- 修改 `package.json` scripts

---

### 阶段 2：前端 API 适配层

#### 步骤 2.1：创建 Tauri API 适配器

创建 `src/api/tauri-bridge.ts`，将所有 `window.minecraftAPI.xxx()` 调用映射到 Tauri 的 `invoke()`：

```typescript
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// 请求-响应模式适配
export const minecraftAPI = {
  getVersionManifest: () => invoke<VersionManifest>('get_version_manifest'),
  getSettings: () => invoke<LauncherSettings>('get_settings'),
  saveSettings: (settings: LauncherSettings) => invoke<boolean>('save_settings', { settings }),
  // ... 223 个通道逐一映射
}

// 事件监听模式适配
export const events = {
  onLaunchLog: (callback: (data: LaunchLogData) => void) =>
    listen<LaunchLogData>('launch-log', (event) => callback(event.payload)),
  onLaunchClose: (callback: (code: number) => void) =>
    listen<number>('launch-close', (event) => callback(event.payload)),
  // ... 15 个事件逐一映射
}
```

#### 步骤 2.2：修改 window 对象声明

更新 `src/vite-env.d.ts`，将 `window.minecraftAPI` 和 `window.electronAPI` 的类型声明替换为 Tauri 适配器的类型。

#### 步骤 2.3：逐步替换前端调用

在所有组件和 core/ 模块中，将：
- `window.minecraftAPI.xxx()` → `minecraftAPI.xxx()` (从 tauri-bridge 导入)
- `window.electronAPI.xxx()` → `electronAPI.xxx()` (从 tauri-bridge 导入)

涉及文件：
- `src/App.tsx` — 主要调用点
- `src/core/mod/modManager.ts`
- `src/core/world/worldManager.ts`
- `src/core/resource/resourceManager.ts`
- `src/core/download/downloadManager.ts`
- 所有 `src/components/*.tsx` 中的直接 API 调用

#### 步骤 2.4：适配窗口管理

将 Electron 窗口操作替换为 Tauri API：

| Electron API | Tauri 替代 |
|--------------|-----------|
| `window.electronAPI.toggleFullscreen()` | `appWindow.setFullscreen()` |
| `window.electronAPI.getDisplays()` | `availableMonitors()` / `currentMonitor()` |
| `window.electronAPI.moveToDisplay(id)` | `appWindow.setPosition()` |
| `window.electronAPI.saveWindowPlacement()` | 自定义 Rust command |
| `window.electronAPI.restoreWindowPlacement()` | 自定义 Rust command |

---

### 阶段 3：Rust 后端核心模块实现（按优先级排序）

#### 步骤 3.1：数据模型层 (models/)

将 TypeScript 类型定义翻译为 Rust struct，确保 serde 序列化兼容：

```rust
// models/account.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub username: String,
    pub account_type: String,  // "offline" | "microsoft" | "littleskin"
    pub uuid: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_at: Option<u64>,
    pub skin_url: Option<String>,
    pub avatar_url: Option<String>,
    pub littleskin_server: Option<String>,
}
```

需要翻译的类型文件：
- `src/types/index.ts` → `models/account.rs`, `models/settings.rs`, `models/version.rs`
- `src/types/instance.ts` → `models/instance.rs`
- `src/types/mod.ts` → `models/mod_info.rs`
- `src/types/world.ts` → `models/world.rs`
- `src/types/resource.ts` → `models/resource.rs`
- `src/types/server.ts` → `models/server.rs`
- `src/types/launch.ts` → `models/launch.rs`
- `src/types/modpack.ts` → `models/modpack.rs`
- `src/types/download.ts` → `models/download.rs`

#### 步骤 3.2：路径与配置管理 (utils/paths.rs)

```rust
pub fn default_game_dir() -> PathBuf {
    if cfg!(target_os = "macos") {
        dirs::home_dir().unwrap()
            .join("Library/Application Support/bonjour-minecraft")
    } else {
        dirs::data_dir().unwrap()
            .join(".bonjour-minecraft")
    }
}

pub fn config_dir() -> PathBuf {
    default_game_dir().join("launcher")
}
```

#### 步骤 3.3：文件系统服务 (services/file_manager.rs)

实现所有 JSON 配置文件的读写操作：
- `load_json<T: DeserializeOwned>(path) -> Result<T>`
- `save_json<T: Serialize>(path, data) -> Result<()>`
- `ensure_dir(path) -> Result<()>`
- 覆盖 20+ 个配置文件

#### 步骤 3.4：基础命令模块 (commands/)

按优先级实现 223 个 Tauri Command，分为以下批次：

**批次 A：核心启动链（最高优先级）**

| # | 命令名 | 原 IPC 通道 | 功能 |
|---|--------|------------|------|
| 1 | `get_settings` | get-settings | 读取设置 |
| 2 | `save_settings` | save-settings | 保存设置 |
| 3 | `get_accounts` | get-accounts | 获取账号 |
| 4 | `save_accounts` | save-accounts | 保存账号 |
| 5 | `add_offline_account` | add-offline-account | 添加离线账号 |
| 6 | `delete_account` | delete-account | 删除账号 |
| 7 | `get_version_manifest` | get-version-manifest | 获取版本清单 |
| 8 | `get_installed_versions` | get-installed-versions | 获取已安装版本 |
| 9 | `install_version` | install-version | 安装版本 |
| 10 | `check_java` | check-java | 检查 Java |
| 11 | `download_java` | download-java | 下载 Java |
| 12 | `launch_game` | launch-game | 启动游戏 |
| 13 | `get_system_info` | get-system-info | 系统信息 |
| 14 | `select_java_path` | select-java-path | 选择 Java 路径 |
| 15 | `select_game_dir` | select-game-dir | 选择游戏目录 |
| 16 | `open_external` | open-external | 打开外部链接 |

**批次 B：实例与模组管理**

| # | 命令名 | 原 IPC 通道 | 功能 |
|---|--------|------------|------|
| 17-27 | `get_instances` 等 | get-instances 等 | 实例 CRUD |
| 28-34 | `scan_instance_mods` 等 | scan-instance-mods 等 | 模组管理 |
| 35-36 | `get_mod_loader_versions` 等 | get-mod-loader-versions 等 | 模组加载器 |
| 37 | `launch_instance` | launch-instance | 实例启动 |

**批次 C：存档管理（30+ 个命令）**

| # | 命令名 | 原 IPC 通道 | 功能 |
|---|--------|------------|------|
| 38-59 | `get_worlds` 等 | get-worlds 等 | 存档完整功能链 |

**批次 D：资源管理（光影/资源包/数据包/结构文件/纹理/订阅/合集）**

| # | 命令名 | 原 IPC 通道 | 功能 |
|---|--------|------------|------|
| 60-118 | `scan_instance_shaders` 等 | scan-instance-shaders 等 | 资源完整功能链 |

**批次 E：认证与皮肤**

| # | 命令名 | 原 IPC 通道 | 功能 |
|---|--------|------------|------|
| 119-128 | `microsoft_login_start` 等 | microsoft-login-start 等 | 微软/Littleskin 认证 |

**批次 F：整合包系统**

| # | 命令名 | 原 IPC 通道 | 功能 |
|---|--------|------------|------|
| 129-139 | `install_modpack` 等 | install-modpack 等 | 整合包完整功能链 |

**批次 G：服务器管理**

| # | 命令名 | 原 IPC 通道 | 功能 |
|---|--------|------------|------|
| 140-162 | `get_servers` 等 | get-servers 等 | 服务器完整功能链 |

**批次 H：高级功能**

| # | 命令名 | 原 IPC 通道 | 功能 |
|---|--------|------------|------|
| 163-223 | 启动引擎/JVM调优/崩溃报告/基准测试/进程守护/系统托盘/热配置/多实例启动/实例生态/迁移助手/自动更新/网络检测 等 | 对应通道 | 高级功能 |

#### 步骤 3.5：Minecraft 启动核心 (services/minecraft_launcher.rs)

这是最关键的模块，需要替代 `minecraft-launcher-core` 的 `Client` 类：

```rust
pub struct MinecraftLauncher;

impl MinecraftLauncher {
    /// 启动 Minecraft 游戏进程
    pub async fn launch(config: LaunchConfig) -> Result<Child> {
        // 1. 解析版本 JSON，构建 classpath
        // 2. 组装 JVM 参数（-Xmx, -Xms, GC 参数等）
        // 3. 组装游戏参数（--username, --uuid, --accessToken 等）
        // 4. spawn Java 子进程
        let child = Command::new(&config.java_path)
            .args(&jvm_args)
            .args(&game_args)
            .current_dir(&config.game_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
        Ok(child)
    }
}
```

**替代 minecraft-launcher-core 的方案：**

| 方案 | 优点 | 缺点 |
|------|------|------|
| A. 纯 Rust 实现 | 完全控制，最佳性能 | 工作量最大，需自行解析 version JSON / 构建 classpath / 处理 natives |
| B. 调用 @xmcl/core 的 Node.js | 复用现有逻辑 | 需要嵌入 Node.js 运行时 |
| C. 使用 Rust 版 xmcl 库 | 直接复用 | 需要确认 API 兼容性 |

**推荐方案 A**：纯 Rust 实现。参考 `minecraft-launcher-core` 的逻辑，用 Rust 重写核心启动流程。主要步骤：
1. 读取版本 JSON 文件
2. 解析依赖库列表，构建 classpath
3. 处理 native 库（提取 .so/.dll/.dylib）
4. 组装 JVM 参数和游戏参数
5. spawn Java 进程
6. 监听 stdout/stderr 输出日志

#### 步骤 3.6：微软 OAuth 认证 (services/microsoft_auth.rs)

```rust
pub async fn device_code_login() -> Result<MicrosoftAuthResult> {
    // 1. POST https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode
    //    获取 device_code + user_code + verification_uri
    // 2. 返回给前端，让用户在浏览器中输入
    // 3. 轮询 POST https://login.microsoftonline.com/consumers/oauth2/v2.0/token
    // 4. 获取 access_token 后，Xbox Live -> XSTS -> Minecraft 认证链
    // 5. 返回 Minecraft access_token + profile
}
```

#### 步骤 3.7：网络服务 (services/network.rs)

```rust
pub struct NetworkService {
    client: reqwest::Client,
}

impl NetworkService {
    pub async fn get_version_manifest(&self) -> Result<VersionManifest> {
        // 先尝试 BMCLAPI 镜像，失败回退 Mojang 官方
    }

    pub async fn download_file_with_progress(
        &self,
        url: &str,
        target: &Path,
    ) -> Result<impl Stream<Item = Result<DownloadProgress>>> {
        // 带进度的文件下载，通过 Tauri Event 推送进度
    }
}
```

#### 步骤 3.8：系统托盘 (commands/tray.rs)

```rust
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState};

pub fn setup_tray(app: &tauri::App) -> Result<()> {
    let tray = TrayIconBuilder::new()
        .tooltip("Bonjour Minecraft 启动器")
        .icon(app.default_window_icon().unwrap().clone())
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap();
                }
            }
        })
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "quick-launch" => { /* emit event to frontend */ }
                "quit" => { app.exit(0); }
                _ => {}
            }
        })
        .build(app)?;
    Ok(())
}
```

---

### 阶段 4：事件系统迁移

#### 步骤 4.1：主进程→渲染进程事件映射

将所有 `win.webContents.send(channel, data)` 替换为 Tauri Event：

| Electron 事件 | Tauri Event | 说明 |
|---------------|-------------|------|
| `main-process-message` | `main-process-message` | 页面加载完成 |
| `launch-log` | `launch-log` | 启动日志 |
| `launch-close` | `launch-close` | 进程退出 |
| `launch-error` | `launch-error` | 启动错误 |
| `download-progress` | `download-progress` | 下载进度 |
| `launch-phase-update` | `launch-phase-update` | 启动阶段 |
| `launch-log-diagnosed` | `launch-log-diagnosed` | 诊断日志 |
| `launch-running` | `launch-running` | 游戏运行中 |
| `launch-exit` | `launch-exit` | 游戏退出 |
| `launch-crash-recovery` | `launch-crash-recovery` | 崩溃恢复 |
| `repair-progress` | `repair-progress` | 修复进度 |
| `quick-launch` | `quick-launch` | 快速启动 |
| `quick-launch-recent` | `quick-launch-recent` | 最近版本 |
| `quick-launch-version` | `quick-launch-version` | 指定版本启动 |

Rust 端发送事件：
```rust
app.emit("launch-log", &data)?;
```

前端监听：
```typescript
import { listen } from '@tauri-apps/api/event'
const unlisten = await listen('launch-log', (event) => { ... })
```

---

### 阶段 5：文件对话框迁移

#### 步骤 5.1：使用 tauri-plugin-dialog

```rust
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn select_java_path(app: AppHandle) -> Result<Option<String>, String> {
    let path = app.dialog()
        .file()
        .add_filter("Java Executable", &["exe", ""])
        .blocking_file_path();
    Ok(path.map(|p| p.to_string()))
}
```

---

### 阶段 6：构建与打包配置

#### 步骤 6.1：配置 Tauri 打包

```json
// tauri.conf.json
{
  "bundle": {
    "active": true,
    "targets": ["dmg", "nsis", "appimage"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installerIcon": "icons/icon.ico",
        "allowToChangeInstallationDirectory": true
      }
    }
  }
}
```

#### 步骤 6.2：更新 package.json scripts

```json
{
  "scripts": {
    "dev": "cargo tauri dev",
    "build": "cargo tauri build",
    "build:frontend": "vite build",
    "lint": "eslint . --ext ts,tsx"
  }
}
```

---

### 阶段 7：源码保护策略

#### 步骤 7.1：Rust 后端（天然保护）

- Rust 编译为原生机器码，**极难逆向**
- 使用 `strip = true` 和 `opt-level = "z"` 减小体积并增加逆向难度
- 关键算法（认证流程、启动逻辑）全部在 Rust 中实现

```toml
# Cargo.toml
[profile.release]
strip = true
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
```

#### 步骤 7.2：前端资源保护

- Tauri 支持将前端资源嵌入二进制文件
- 可启用资源加密：`bundle > resources` 配置
- 可选：对前端 JS 进行混淆（保留 javascript-obfuscator）
- 前端不含任何敏感逻辑（核心逻辑已在 Rust 中）

#### 步骤 7.3：敏感信息保护

- API Key 移入 Rust 后端，不暴露给前端
- 微软 OAuth client_id 在 Rust 中管理
- CurseForge API Key 在 Rust 中管理

---

### 阶段 8：测试与验证

#### 步骤 8.1：功能测试清单

按批次验证每个命令模块：

**批次 A 核心测试：**
- [ ] 应用启动与窗口显示
- [ ] 设置读写
- [ ] 账号增删
- [ ] 版本清单获取
- [ ] Java 检测与下载
- [ ] 游戏启动与日志
- [ ] 文件对话框

**批次 B-H 逐步验证：**
- [ ] 实例管理完整流程
- [ ] 模组管理完整流程
- [ ] 存档管理完整流程
- [ ] 资源管理完整流程
- [ ] 微软/Littleskin 认证
- [ ] 整合包安装/创建
- [ ] 服务器管理
- [ ] 系统托盘
- [ ] 自动更新

#### 步骤 8.2：跨平台验证

- [ ] macOS (arm64)
- [ ] macOS (x64)
- [ ] Windows (x64)
- [ ] Linux (x64)

#### 步骤 8.3：性能对比

- [ ] 启动速度对比
- [ ] 内存占用对比
- [ ] 安装包体积对比
- [ ] 游戏启动耗时对比

---

## 四、风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| minecraft-launcher-core 无 Rust 版 | 游戏无法启动 | 纯 Rust 实现启动逻辑，参考原库源码 |
| 微软 OAuth 流程复杂 | 账号功能不可用 | 逐步实现，先用离线账号验证启动 |
| 223 个命令工作量大 | 开发周期长 | 按优先级分批实现，先实现核心启动链 |
| 存档高级功能（地图渲染等）实现复杂 | 部分功能延迟 | 先实现基础功能，高级功能后续迭代 |
| Tauri 2.x API 变更 | 兼容性问题 | 锁定 Tauri 版本，关注 changelog |
| 前端调用方式变更导致回归 | UI 功能异常 | 适配层模式，逐步替换 |

---

## 五、迁移时间线估算

| 阶段 | 内容 | 预估工作量 |
|------|------|-----------|
| 阶段 1 | 项目初始化与基础架构 | 1-2 天 |
| 阶段 2 | 前端 API 适配层 | 2-3 天 |
| 阶段 3 | Rust 后端核心模块 | 15-25 天 |
| 阶段 4 | 事件系统迁移 | 1-2 天 |
| 阶段 5 | 文件对话框迁移 | 0.5 天 |
| 阶段 6 | 构建与打包配置 | 1-2 天 |
| 阶段 7 | 源码保护策略 | 1 天 |
| 阶段 8 | 测试与验证 | 5-7 天 |
| **总计** | | **27-43 天** |

---

## 六、IPC 通道完整映射表（223 个）

### 命名规则

Electron IPC 通道使用 `kebab-case`（如 `get-version-manifest`），Tauri Command 使用 `snake_case`（如 `get_version_manifest`）。

### 映射表

| # | Electron 通道 | Tauri Command | 批次 |
|---|---------------|---------------|------|
| 1 | get-version-manifest | get_version_manifest | A |
| 2 | get-settings | get_settings | A |
| 3 | save-settings | save_settings | A |
| 4 | get-accounts | get_accounts | A |
| 5 | save-accounts | save_accounts | A |
| 6 | add-offline-account | add_offline_account | A |
| 7 | delete-account | delete_account | A |
| 8 | get-installed-versions | get_installed_versions | A |
| 9 | scan-game-dir | scan_game_dir | A |
| 10 | install-version | install_version | A |
| 11 | check-java | check_java | A |
| 12 | download-java | download_java | A |
| 13 | launch-game | launch_game | A |
| 14 | select-java-path | select_java_path | A |
| 15 | select-game-dir | select_game_dir | A |
| 16 | open-external | open_external | A |
| 17 | get-system-info | get_system_info | A |
| 18 | scan-local-mods | scan_local_mods | B |
| 19 | toggle-mod | toggle_mod | B |
| 20 | delete-mod | delete_mod | B |
| 21 | install-mod | install_mod | B |
| 22 | analyze-mod-jar | analyze_mod_jar | B |
| 23 | compute-mod-hash | compute_mod_hash | B |
| 24 | get-worlds | get_worlds | C |
| 25 | get-world-info | get_world_info | C |
| 26 | backup-world | backup_world | C |
| 27 | get-backups | get_backups | C |
| 28 | restore-backup | restore_backup | C |
| 29 | delete-backup | delete_backup | C |
| 30 | export-world | export_world | C |
| 31 | import-world | import_world | C |
| 32 | delete-world | delete_world | C |
| 33 | rename-world | rename_world | C |
| 34 | copy-world | copy_world | C |
| 35 | get-world-icon | get_world_icon | C |
| 36 | check-world-health | check_world_health | C |
| 37 | fix-world-health-issue | fix_world_health_issue | C |
| 38 | fix-all-world-health-issues | fix_all_world_health_issues | C |
| 39 | get-world-timeline | get_world_timeline | C |
| 40 | create-timeline-entry | create_timeline_entry | C |
| 41 | restore-timeline-entry | restore_timeline_entry | C |
| 42 | get-world-map-overview | get_world_map_overview | C |
| 43 | render-world-map | render_world_map | C |
| 44 | get-world-statistics | get_world_statistics | C |
| 45 | convert-world-format | convert_world_format | C |
| 46 | get-world-migration-plan | get_world_migration_plan | C |
| 47 | execute-world-migration | execute_world_migration | C |
| 48 | preview-seed | preview_seed | C |
| 49 | get-world-sync-info | get_world_sync_info | C |
| 50 | sync-world | sync_world | C |
| 51 | resolve-sync-conflict | resolve_sync_conflict | C |
| 52 | analyze-world-slim | analyze_world_slim | C |
| 53 | execute-world-slim | execute_world_slim | C |
| 54 | get-world-diary | get_world_diary | C |
| 55 | generate-diary-entry | generate_diary_entry | C |
| 56 | export-structure | export_structure | C |
| 57 | import-structure | import_structure | C |
| 58 | share-blueprint | share_blueprint | C |
| 59 | get-world-structures | get_world_structures | C |
| 60 | download-file | download_file | D |
| 61 | pause-download | pause_download | D |
| 62 | resume-download | resume_download | D |
| 63 | cancel-download | cancel_download | D |
| 64 | get-instances | get_instances | B |
| 65 | create-instance | create_instance | B |
| 66 | delete-instance | delete_instance | B |
| 67 | update-instance | update_instance | B |
| 68 | update-instance-settings | update_instance_settings | B |
| 69 | get-instance | get_instance | B |
| 70 | get-instance-by-version | get_instance_by_version | B |
| 71 | ensure-instances-for-versions | ensure_instances_for_versions | B |
| 72 | scan-instance-mods | scan_instance_mods | B |
| 73 | add-mod-to-instance | add_mod_to_instance | B |
| 74 | toggle-instance-mod | toggle_instance_mod | B |
| 75 | delete-instance-mod | delete_instance_mod | B |
| 76 | check-mod-compatibility | check_mod_compatibility | B |
| 77 | get-mod-loader-versions | get_mod_loader_versions | B |
| 78 | install-mod-loader | install_mod_loader | B |
| 79 | scan-instance-shaders | scan_instance_shaders | D |
| 80 | add-shader-pack | add_shader_pack | D |
| 81 | toggle-shader-pack | toggle_shader_pack | D |
| 82 | delete-shader-pack | delete_shader_pack | D |
| 83 | reorder-shader-packs | reorder_shader_packs | D |
| 84 | select-shader-file | select_shader_file | D |
| 85 | scan-instance-resource-packs | scan_instance_resource_packs | D |
| 86 | add-resource-pack | add_resource_pack | D |
| 87 | toggle-resource-pack | toggle_resource_pack | D |
| 88 | delete-resource-pack | delete_resource_pack | D |
| 89 | reorder-resource-packs | reorder_resource_packs | D |
| 90 | select-resource-pack-file | select_resource_pack_file | D |
| 91 | scan-instance-datapacks | scan_instance_datapacks | D |
| 92 | toggle-instance-datapack | toggle_instance_datapack | D |
| 93 | delete-instance-datapack | delete_instance_datapack | D |
| 94 | add-instance-datapack | add_instance_datapack | D |
| 95 | select-datapack-file | select_datapack_file | D |
| 96 | scan-instance-structures | scan_instance_structures | D |
| 97 | import-instance-structure | import_instance_structure | D |
| 98 | export-instance-structure | export_instance_structure | D |
| 99 | delete-instance-structure | delete_instance_structure | D |
| 100 | get-structure-preview | get_structure_preview | D |
| 101 | select-structure-file | select_structure_file | D |
| 102 | build-global-resource-index | build_global_resource_index | D |
| 103 | select-mod-file | select_mod_file | D |
| 104 | create-texture-project | create_texture_project | D |
| 105 | save-texture-project | save_texture_project | D |
| 106 | export-texture-project | export_texture_project | D |
| 107 | get-texture-projects | get_texture_projects | D |
| 108 | get-resource-subscriptions | get_resource_subscriptions | D |
| 109 | add-resource-subscription | add_resource_subscription | D |
| 110 | remove-resource-subscription | remove_resource_subscription | D |
| 111 | check-resource-subscription-updates | check_resource_subscription_updates | D |
| 112 | get-resource-subscription-notifications | get_resource_subscription_notifications | D |
| 113 | mark-resource-notification-read | mark_resource_notification_read | D |
| 114 | get-resource-collections | get_resource_collections | D |
| 115 | create-resource-collection | create_resource_collection | D |
| 116 | update-resource-collection | update_resource_collection | D |
| 117 | delete-resource-collection | delete_resource_collection | D |
| 118 | install-resource-collection | install_resource_collection | D |
| 119 | microsoft-login-start | microsoft_login_start | E |
| 120 | microsoft-login-poll | microsoft_login_poll | E |
| 121 | microsoft-login-refresh | microsoft_login_refresh | E |
| 122 | upload-skin | upload_skin | E |
| 123 | upload-avatar | upload_avatar | E |
| 124 | select-image-file | select_image_file | E |
| 125 | select-skin-file | select_skin_file | E |
| 126 | littleskin-login | littleskin_login | E |
| 127 | littleskin-get-players | littleskin_get_players | E |
| 128 | littleskin-upload-skin | littleskin_upload_skin | E |
| 129 | launch-instance | launch_instance | B |
| 130 | get-hardware-info | get_hardware_info | A |
| 131 | get-all-java-versions | get_all_java_versions | A |
| 132 | get-java-for-version | get_java_for_version | A |
| 133 | download-java (带版本号) | download_java_version | A |
| 134 | run-pre-check | run_pre_check | A |
| 135 | complete-setup | complete_setup | A |
| 136 | is-first-launch | is_first_launch | A |
| 137 | detect-launchers | detect_launchers | H |
| 138 | migrate-launcher-data | migrate_launcher_data | H |
| 139 | detect-download-source | detect_download_source | H |
| 140 | get-optimal-download-url | get_optimal_download_url | H |
| 141 | check-for-updates | check_for_updates | H |
| 142 | check-network-status | check_network_status | H |
| 143 | launch-engine-start | launch_engine_start | H |
| 144 | launch-engine-phase | launch_engine_phase | H |
| 145 | launch-engine-log | launch_engine_log | H |
| 146 | launch-engine-complete | launch_engine_complete | H |
| 147 | launch-engine-exit | launch_engine_exit | H |
| 148 | get-jvm-profiles | get_jvm_profiles | H |
| 149 | recommend-jvm-profile | recommend_jvm_profile | H |
| 150 | create-crash-report | create_crash_report | H |
| 151 | get-crash-reports | get_crash_reports | H |
| 152 | repair-version-files | repair_version_files | H |
| 153 | get-launch-benchmarks | get_launch_benchmarks | H |
| 154 | get-benchmark-summary | get_benchmark_summary | H |
| 155 | save-benchmark | save_benchmark | H |
| 156 | get-running-game-processes | get_running_game_processes | H |
| 157 | kill-game-process | kill_game_process | H |
| 158 | setup-tray | setup_tray | H |
| 159 | update-tray-menu | update_tray_menu | H |
| 160 | get-config-categories | get_config_categories | H |
| 161 | classify-config-change | classify_config_change | H |
| 162 | launch-multiple-instances | launch_multiple_instances | H |
| 163 | get-instance-groups | get_instance_groups | H |
| 164 | create-instance-group | create_instance_group | H |
| 165 | update-instance-group | update_instance_group | H |
| 166 | delete-instance-group | delete_instance_group | H |
| 167 | assign-instance-to-group | assign_instance_to_group | H |
| 168 | create-instance-tag | create_instance_tag | H |
| 169 | delete-instance-tag | delete_instance_tag | H |
| 170 | assign-tag-to-instance | assign_tag_to_instance | H |
| 171 | remove-tag-from-instance | remove_tag_from_instance | H |
| 172 | get-instance-templates | get_instance_templates | H |
| 173 | create-instance-template | create_instance_template | H |
| 174 | delete-instance-template | delete_instance_template | H |
| 175 | clone-instance-from-template | clone_instance_from_template | H |
| 176 | get-version-compatibility | get_version_compatibility | H |
| 177 | get-version-diff | get_version_diff | H |
| 178 | create-instance-snapshot | create_instance_snapshot | H |
| 179 | get-instance-snapshots | get_instance_snapshots | H |
| 180 | delete-instance-snapshot | delete_instance_snapshot | H |
| 181 | rollback-instance-snapshot | rollback_instance_snapshot | H |
| 182 | export-instance-pkg | export_instance_pkg | H |
| 183 | import-instance-pkg | import_instance_pkg | H |
| 184 | analyze-instance-storage | analyze_instance_storage | H |
| 185 | get-instance-dashboard | get_instance_dashboard | H |
| 186 | get-version-migration-guide | get_version_migration_guide | H |
| 187 | run-health-check | run_health_check | H |
| 188 | get-launch-dependencies | get_launch_dependencies | H |
| 189 | set-launch-dependency | set_launch_dependency | H |
| 190 | remove-launch-dependency | remove_launch_dependency | H |
| 191 | launch-dependent-instances | launch_dependent_instances | H |
| 192 | install-modpack | install_modpack | F |
| 193 | create-modpack | create_modpack | F |
| 194 | get-installed-modpacks | get_installed_modpacks | F |
| 195 | check-modpack-update | check_modpack_update | F |
| 196 | update-modpack | update_modpack | F |
| 197 | get-modpack-forks | get_modpack_forks | F |
| 198 | create-modpack-fork | create_modpack_fork | F |
| 199 | run-modpack-test | run_modpack_test | F |
| 200 | get-modpack-performance | get_modpack_performance | F |
| 201 | create-sync-room | create_sync_room | F |
| 202 | get-modpack-recommendations | get_modpack_recommendations | F |
| 203 | get-servers | get_servers | G |
| 204 | add-server | add_server | G |
| 205 | delete-server | delete_server | G |
| 206 | update-server | update_server | G |
| 207 | get-server-groups | get_server_groups | G |
| 208 | create-server-group | create_server_group | G |
| 209 | delete-server-group | delete_server_group | G |
| 210 | ping-server | ping_server | G |
| 211 | join-server | join_server | G |
| 212 | get-local-servers | get_local_servers | G |
| 213 | create-local-server | create_local_server | G |
| 214 | start-local-server | start_local_server | G |
| 215 | stop-local-server | stop_local_server | G |
| 216 | scan-lan-worlds | scan_lan_worlds | G |
| 217 | create-friend-lobby | create_friend_lobby | G |
| 218 | join-friend-lobby | join_friend_lobby | G |
| 219 | leave-friend-lobby | leave_friend_lobby | G |
| 220 | get-friend-lobbies | get_friend_lobbies | G |
| 221 | get-community-servers | get_community_servers | G |
| 222 | get-server-notifications | get_server_notifications | G |
| 223 | sync-server-resource-pack | sync_server_resource_pack | G |
| 224 | sync-mods-to-server | sync_mods_to_server | G |

---

## 七、关键决策点

1. **Minecraft 启动核心**：推荐纯 Rust 实现，参考 minecraft-launcher-core 源码逻辑
2. **前端状态管理**：迁移后建议引入 Zustand 管理全局状态，解决当前 props drilling 问题
3. **配置文件格式**：保持 JSON 格式，确保与现有用户数据兼容
4. **渐进式迁移**：可以先让 Electron 和 Tauri 共存，逐步切换命令实现
5. **占位功能**：原代码中部分功能（云同步、LAN 扫描等）为占位实现，迁移时可暂缓
