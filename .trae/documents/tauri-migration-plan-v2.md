# Bonjour Minecraft Launcher — Electron → Tauri 迁移计划（修订版）

## 一、项目现状总结

### 1.1 已完成工作

| 模块 | 完成度 | 说明 |
|------|--------|------|
| Tauri 项目结构 | 100% | src-tauri/ 目录完整，Cargo.toml/tauri.conf.json 配置就绪 |
| 数据模型层 (models/) | 100% | 11 个模型文件全部完成 |
| 工具层 (utils/) | 100% | paths/crypto/platform 全部实现 |
| 前端 API 适配层 | 100% | tauri-bridge.ts 已编写，但**未被任何前端代码导入** |
| 文件系统服务 | 100% | file_manager.rs 完整 |
| Java 检测服务 | 100% | java_detector.rs 完整 |
| 命令层 - 批次A（核心） | ~90% | settings/account/version/java/launch/system 基本完整 |
| 命令层 - 批次B（实例/模组） | ~70% | instance 完整；mod_mgr 大部分实现 |
| 命令层 - 批次C（存档） | ~25% | 基础 CRUD 有实现，高级功能 stub |
| 命令层 - 批次D（资源） | ~5% | 全部 stub |
| 命令层 - 批次E（认证） | ~50% | 微软登录核心可用，其余 stub |
| 命令层 - 批次F-H | ~0-5% | 几乎全部 stub |

### 1.2 当前编译状态

`cargo check` 存在 **7 个编译错误** + 264 个警告：

| # | 错误类型 | 文件 | 行号 | 原因 |
|---|---------|------|------|------|
| 1 | E0599 | launch.rs | 9 | `MinecraftLauncher::launch()` 方法签名不匹配 |
| 2 | E0599 | launch.rs | 59 | 同上 |
| 3 | E0282 | server.rs | 14 | `TcpStream::connect_timeout` 类型标注缺失 |
| 4 | E0382 | littleskin_auth.rs | 66 | `access_token` 被移动后再次使用 |
| 5 | E0502 | instance.rs | 59 | `instances` 同时被可变和不可变借用 |
| 6 | E0502 | instance.rs | 73 | 同上 |
| 7 | proc macro panicked | lib.rs | - | Tauri 宏展开失败（可能由上述错误引起） |

### 1.3 关键缺失功能

| 功能 | 影响 | 涉及文件 |
|------|------|---------|
| 事件推送系统 (`app.emit()`) | 前端无法接收启动日志/下载进度等实时事件 | minecraft_launcher.rs, network.rs, lib.rs |
| Native 库提取 | 某些 MC 版本无法启动（缺少 .so/.dll/.dylib） | minecraft_launcher.rs |
| 下载进度回调 | 下载无进度显示 | network.rs |
| 文件对话框实现 | 无法选择 Java 路径/游戏目录/皮肤文件等 | auth.rs, resource.rs, settings.rs |
| 版本 JSON `arguments` 字段解析 | 现代 MC 版本（1.13+）启动参数不完整 | minecraft_launcher.rs |
| 系统托盘 | 无托盘图标和快捷操作 | lib.rs, tray_cmd.rs |
| 前端未切换到 tauri-bridge | 前端仍使用 `window.minecraftAPI`（Electron preload） | 所有 .tsx/.ts 文件 |

---

## 二、迁移策略

采用**分阶段、渐进式**策略，每个阶段完成后可独立验证：

1. **先修复编译** → 确保 Rust 后端可编译
2. **补全核心功能** → 让启动链完整可用
3. **切换前端桥接** → 从 Electron preload 切换到 tauri-bridge
4. **填充高级功能** → 逐步实现 stub 命令
5. **清理与优化** → 移除 Electron 代码，优化打包

---

## 三、详细实施步骤

### 阶段 1：修复 Rust 编译错误（优先级：最高）

#### 1.1 修复 launch.rs — MinecraftLauncher::launch() 签名不匹配

**问题**：`launch.rs:9` 和 `launch.rs:59` 调用 `launcher.launch(&options, app)`，但 `minecraft_launcher.rs:8` 的方法签名是 `pub fn launch(options: &LaunchOptions, _app: tauri::AppHandle) -> Result<u32, String>`，是同步方法。

**修复方案**：将 `launch_game` 和 `launch_instance` 命令改为同步调用（因为 `MinecraftLauncher::launch` 本身是同步的），或者将 `MinecraftLauncher::launch` 改为 async。

推荐方案：保持 `MinecraftLauncher::launch` 同步，在 command 层使用 `tauri::async_runtime::spawn_blocking` 或直接标记为同步命令：

```rust
// launch.rs
#[tauri::command]
pub fn launch_game(options: LaunchOptions, app: tauri::AppHandle) -> Result<bool, String> {
    let launcher = MinecraftLauncher;
    let _pid = launcher.launch(&options, &app)?;
    Ok(true)
}
```

同时修改 `minecraft_launcher.rs` 中的 `launch` 方法签名，将 `app: tauri::AppHandle` 改为 `app: &tauri::AppHandle`。

#### 1.2 修复 server.rs — 类型标注缺失

**问题**：`server.rs:14` 的 `format!("{}:{}", address, port).parse()` 缺少类型标注。

**修复方案**：
```rust
let addr: std::net::SocketAddr = format!("{}:{}", address, port)
    .parse().map_err(|e| format!("Invalid address: {}", e))?;
```

#### 1.3 修复 littleskin_auth.rs — access_token 移动后使用

**问题**：`littleskin_auth.rs:58` 使用 `access_token.clone()`，但 `:64` 和 `:66` 又直接使用 `access_token`，导致第 66 行在移动后使用。

**修复方案**：在 `Account` 结构体中也使用 `clone()`：
```rust
access_token: Some(access_token.clone()),
// ...
littleskin_access_token: Some(access_token.clone()),
// ...
access_token,  // 最后一次使用，move 出去
```

或者重新组织代码，让 `access_token` 在最后才被移动。

#### 1.4 修复 instance.rs — 同时可变和不可变借用

**问题**：`instance.rs:59` 和 `:73`，在 `instances.iter_mut().find()` 之后立即调用 `file_manager::save_json(&instances_path, &instances)`，此时可变借用仍活跃。

**修复方案**：使用作用域块或提前 clone：
```rust
pub fn update_instance(instance_id: String, updates: serde_json::Value) -> Result<VersionInstance, String> {
    let instances_path = paths::instances_file();
    let mut instances: Vec<VersionInstance> = file_manager::load_json_or_default(&instances_path);
    
    let result = {
        if let Some(instance) = instances.iter_mut().find(|i| i.id == instance_id) {
            if let Some(name) = updates["name"].as_str() { instance.name = name.to_string(); }
            if let Some(gv) = updates["gameVersion"].as_str() { instance.game_version = gv.to_string(); }
            Ok(instance.clone())
        } else {
            Err(format!("Instance {} not found", instance_id))
        }
    };
    
    if result.is_ok() {
        file_manager::save_json(&instances_path, &instances)?;
    }
    result
}
```

#### 1.5 修复 proc macro panicked

此错误通常由上述编译错误引起，修复 1.1-1.4 后应自动解决。

---

### 阶段 2：补全核心功能（优先级：高）

#### 2.1 实现事件推送系统

**当前状态**：Rust 端未实现任何 `app.emit()` 推送，前端无法接收实时事件。

**需要实现的事件**：

| 事件名 | 触发时机 | 数据类型 |
|--------|---------|---------|
| `launch-log` | 游戏进程输出日志 | `{ type: string, message: string }` |
| `launch-close` | 游戏进程退出 | `number` (exit code) |
| `launch-error` | 启动失败 | `string` |
| `download-progress` | 下载进度更新 | `{ taskId, downloaded, total, speed }` |
| `launch-phase-update` | 启动阶段变更 | `{ sessionId, phaseId, timestamp }` |
| `launch-running` | 游戏进程已运行 | `{ sessionId, pid, timestamp }` |
| `launch-exit` | 游戏退出 | `{ sessionId, exitCode, timestamp }` |
| `launch-crash-recovery` | 崩溃恢复 | `{ sessionId, exitCode, recoveryOptions, timestamp }` |
| `repair-progress` | 修复进度 | `{ file, downloaded, total }` |
| `quick-launch` | 托盘快速启动 | `void` |
| `quick-launch-version` | 托盘指定版本启动 | `string` |

**实现步骤**：

1. 修改 `MinecraftLauncher::launch()` 接收 `app: &tauri::AppHandle` 并使用 `app.emit()`
2. 在 spawn 游戏进程后，启动异步任务读取 stdout/stderr 并 emit `launch-log`
3. 监控进程退出并 emit `launch-close` / `launch-exit`
4. 在 `network.rs` 的 `download_file` 中实现流式下载并 emit `download-progress`
5. 在 `lib.rs` 的 `setup` 闭包中初始化事件监听

**关键代码**：
```rust
// minecraft_launcher.rs
pub fn launch(options: &LaunchOptions, app: &tauri::AppHandle) -> Result<u32, String> {
    // ... 构建 args ...
    let child = Command::new(java_path)
        .args(&all_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to launch game: {}", e))?;
    
    let pid = child.id();
    
    // 启动日志监控任务
    let app_clone = app.clone();
    std::thread::spawn(move || {
        // 读取 stdout/stderr，emit launch-log
        // 等待进程退出，emit launch-close
    });
    
    app.emit("launch-running", serde_json::json!({
        "sessionId": uuid::Uuid::new_v4().to_string(),
        "pid": pid,
        "timestamp": chrono::Utc::now().timestamp_millis()
    })).ok();
    
    Ok(pid)
}
```

#### 2.2 实现 Native 库提取

**当前状态**：`minecraft_launcher.rs` 仅创建了 `natives` 目录但未从 jar 中提取 native 库。

**实现步骤**：
1. 解析 version JSON 中的 `libraries` 数组
2. 对每个库检查 `rules` 和 `natives` 字段
3. 根据当前平台选择对应的 native 分类（如 `natives-linux`, `natives-windows`, `natives-macos`）
4. 从对应的 jar 文件中提取 `.so`/`.dll`/`.dylib` 文件到 `natives` 目录
5. 使用 `zip` crate 解压 jar 文件

**关键代码**：
```rust
fn extract_natives(game_dir: &Path, version_json: &serde_json::Value, natives_dir: &Path) -> Result<(), String> {
    let os_name = if cfg!(target_os = "windows") { "windows" }
                  else if cfg!(target_os = "macos") { "osx" }
                  else { "linux" };
    
    if let Some(libraries) = version_json["libraries"].as_array() {
        for lib in libraries {
            if let Some(natives) = lib.get("natives") {
                if let Some(native_key) = natives[os_name].as_str() {
                    let native_key = native_key.replace("${arch}", std::env::consts::ARCH);
                    // 从 downloads.classifiers[native_key] 获取路径
                    // 用 zip crate 解压 jar 中的 native 文件
                }
            }
        }
    }
    Ok(())
}
```

#### 2.3 实现版本 JSON `arguments` 字段解析

**当前状态**：仅处理了 `minecraftArguments`（旧版），未处理 `arguments`（1.13+）。

**实现步骤**：
1. 检查 version JSON 中是否存在 `arguments` 字段
2. 解析 `arguments.game` 数组（游戏参数）
3. 解析 `arguments.jvm` 数组（JVM 参数）
4. 处理条件参数（rules 判断）
5. 处理变量替换（`${auth_player_name}`, `${auth_uuid}` 等）

#### 2.4 实现文件对话框

**当前状态**：所有文件选择对话框返回 `None`。

**需要实现的对话框**：

| 命令 | 用途 | 过滤器 |
|------|------|--------|
| `select_java_path` | 选择 Java 可执行文件 | 可执行文件 |
| `select_game_dir` | 选择游戏目录 | 文件夹 |
| `select_shader_file` | 选择光影包文件 | .zip |
| `select_mod_file` | 选择模组文件 | .jar |
| `select_image_file` | 选择图片文件 | .png, .jpg |
| `select_skin_file` | 选择皮肤文件 | .png |
| `select_resource_pack_file` | 选择资源包文件 | .zip |
| `select_datapack_file` | 选择数据包文件 | .zip |
| `select_structure_file` | 选择结构文件 | .nbt |

**实现方案**：使用 `tauri_plugin_dialog` 的 `DialogExt` trait：

```rust
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn select_java_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = app.dialog()
        .file()
        .set_title("选择 Java 可执行文件")
        .blocking_file_path();
    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
async fn select_game_dir(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = app.dialog()
        .file()
        .set_title("选择游戏目录")
        .blocking_file_path();
    Ok(path.map(|p| p.to_string()))
}
```

注意：需要在 `lib.rs` 中注册这些新命令到 `invoke_handler`。

#### 2.5 实现下载进度回调

**当前状态**：`network.rs` 的 `download_file` 是一次性下载，无进度推送。

**实现方案**：使用 `reqwest` 的流式响应 + `app.emit()` 推送进度：

```rust
pub async fn download_file_with_progress(
    client: &Client,
    url: &str,
    target: &Path,
    app: &tauri::AppHandle,
    task_id: &str,
) -> Result<(), String> {
    let mut resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut file = std::fs::File::create(target).map_err(|e| e.to_string())?;
    let start = std::time::Instant::now();
    
    while let Some(chunk) = resp.chunk().await.map_err(|e| e.to_string())? {
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        let speed = downloaded as f64 / start.elapsed().as_secs_f64();
        app.emit("download-progress", serde_json::json!({
            "taskId": task_id,
            "downloaded": downloaded,
            "total": total,
            "speed": speed as u64
        })).ok();
    }
    Ok(())
}
```

---

### 阶段 3：前端桥接切换（优先级：高）

#### 3.1 理解当前前端调用模式

**当前**：所有前端代码通过 `window.minecraftAPI.xxx()` 和 `window.electronAPI?.xxx()` 调用后端，这些全局对象由 Electron `preload.ts` 通过 `contextBridge.exposeInMainWorld` 注入。

**目标**：切换为从 `tauri-bridge.ts` 导入 `minecraftAPI` 和 `electronAPI`。

#### 3.2 切换策略

**方案 A（推荐）：全局替换**

1. 在 `src/main.tsx` 中导入 tauri-bridge 并将 API 挂载到 window 对象
2. 这样所有现有 `window.minecraftAPI.xxx()` 调用无需修改

```typescript
// main.tsx
import { minecraftAPI, electronAPI, setupEventListeners } from './api/tauri-bridge'

// 挂载到 window，保持兼容性
window.minecraftAPI = minecraftAPI
window.electronAPI = electronAPI
```

**方案 B：逐文件替换**

逐个文件将 `window.minecraftAPI.xxx()` 替换为 `import { minecraftAPI } from '../api/tauri-bridge'`。

**选择方案 A**，因为：
- 改动量最小（仅需修改 main.tsx 和 vite-env.d.ts）
- 不需要修改 100+ 处 API 调用
- 保持与现有代码的兼容性

#### 3.3 具体修改

1. **修改 `src/main.tsx`**：添加 tauri-bridge 导入和 window 挂载
2. **修改 `src/vite-env.d.ts`**：更新类型声明，使 `window.minecraftAPI` 和 `window.electronAPI` 的类型与 tauri-bridge 导出一致
3. **移除 `window.ipcRenderer` 使用**：删除 `main.tsx` 中的 `window.ipcRenderer.on(...)` 调用
4. **修改事件监听**：将 `window.minecraftAPI.onLaunchLog(...)` 等事件监听改为使用 `setupEventListeners()`

#### 3.4 修改 App.tsx 中的事件监听

当前 App.tsx 中的事件监听方式：
```typescript
window.minecraftAPI.onLaunchLog((data) => { ... })
window.minecraftAPI.onLaunchClose((code) => { ... })
```

需要改为：
```typescript
import { setupEventListeners } from './api/tauri-bridge'

const listeners = setupEventListeners()
listeners.onLaunchLog((data) => { ... })
listeners.onLaunchClose((code) => { ... })
```

或者在 tauri-bridge.ts 中将事件监听方法也添加到 `minecraftAPI` 对象中。

---

### 阶段 4：填充 Stub 命令实现（优先级：中）

按功能模块逐步实现，每个模块完成后独立测试。

#### 4.1 批次 D：资源管理（30 个命令）

**核心功能**：
- 光影包扫描/添加/切换/删除/排序
- 资源包扫描/添加/切换/删除/排序
- 数据包扫描/添加/切换/删除
- 结构文件管理
- 纹理项目管理
- 资源订阅与合集

**实现优先级**：
1. 光影包基础功能（scan/toggle/delete/add）— 最常用
2. 资源包基础功能 — 最常用
3. 数据包基础功能 — 常用
4. 文件选择对话框 — 辅助功能
5. 纹理/订阅/合集 — 低优先级

#### 4.2 批次 C：存档高级功能（25 个命令）

**核心功能**：
- 存档健康检查与修复
- 存档时间线
- 存档地图渲染
- 存档统计
- 存档格式转换
- 存档同步
- 存档瘦身
- 存档日记

**实现优先级**：
1. 健康检查与修复 — 实用
2. 统计信息 — 实用
3. 地图渲染 — 复杂，可后续迭代
4. 同步/日记/瘦身 — 高级功能，可后续迭代

#### 4.3 批次 F：整合包系统（10 个命令）

**核心功能**：
- 整合包安装（从 CurseForge/Modrinth 格式）
- 整合包创建与导出
- 整合包更新检测
- 整合包分支与同步

**实现优先级**：
1. 安装/创建 — 核心功能
2. 更新检测 — 重要
3. 分支/同步/推荐 — 高级功能

#### 4.4 批次 G：服务器管理（22 个命令）

**核心功能**：
- 服务器 CRUD
- 服务器 Ping（已实现基础版）
- 服务器分组
- 局域网扫描
- 好友大厅
- 本地服务器管理

**实现优先级**：
1. 服务器 CRUD + Ping — 已部分实现
2. 服务器分组 — 常用
3. 局域网扫描/好友大厅 — 高级功能

#### 4.5 批次 E：认证补充（9 个命令）

**核心功能**：
- 微软登录刷新 Token
- 皮肤上传
- 头像上传
- Littleskin 获取角色/上传皮肤

**实现优先级**：
1. 微软刷新 Token — 重要
2. 皮肤上传 — 常用
3. Littleskin 高级功能 — 低优先级

#### 4.6 批次 H：高级功能（48 个命令）

**核心功能**：
- 实例生态（分组/标签/模板/快照/导出导入）
- 版本兼容性/迁移
- 启动依赖
- 启动引擎（事件系统）
- 迁移助手
- 网络检测
- 自动更新
- 系统托盘
- 热配置

**实现优先级**：
1. 系统托盘 — 用户体验
2. 自动更新 — 用户体验
3. 迁移助手 — 新用户引导
4. 网络检测 — 诊断工具
5. 其余高级功能 — 可后续迭代

---

### 阶段 5：系统托盘实现（优先级：中）

#### 5.1 实现系统托盘

**当前状态**：`setup_tray` 和 `update_tray_menu` 为 stub，`lib.rs` 的 `setup` 闭包为空。

**实现步骤**：
1. 在 `lib.rs` 的 `setup` 闭包中创建 `TrayIcon`
2. 设置托盘菜单（快速启动、最近版本、退出）
3. 处理托盘事件（双击显示窗口、菜单点击触发操作）
4. 实现 `update_tray_menu` 命令动态更新菜单项

```rust
// lib.rs setup
.setup(|app| {
    let tray = tauri::tray::TrayIconBuilder::new()
        .tooltip("Bonjour Minecraft")
        .icon(app.default_window_icon().unwrap().clone())
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => app.exit(0),
            "quick-launch" => { app.emit("quick-launch", ()).ok(); }
            _ => {}
        })
        .build(app)?;
    Ok(())
})
```

---

### 阶段 6：构建与打包配置（优先级：中）

#### 6.1 确认 Tauri 打包配置

- 检查 `tauri.conf.json` 的 `bundle` 配置
- 确认图标文件存在（icons/ 目录）
- 配置 macOS .dmg、Windows NSIS、Linux AppImage

#### 6.2 移除 Electron 构建依赖

- 从 `package.json` 移除 `vite-plugin-electron` 和 `vite-plugin-electron-renderer`
- 移除 `electron-builder.json5`
- 保留 `electron/` 目录作为参考（后续可删除）

#### 6.3 确认前端构建流程

- `npm run build:frontend` → `vite build`
- `cargo tauri build` → 完整打包

---

### 阶段 7：Electron 代码清理（优先级：低）

#### 7.1 清理 Electron 代码

- 删除 `electron/main.ts` 和 `electron/preload.ts`
- 删除 `electron/electron-env.d.ts`
- 删除 `dist-electron/` 目录
- 从 `package.json` 移除 Electron 相关依赖
- 更新 `vite-env.d.ts` 移除 Electron 相关类型

#### 7.2 清理无用文件

- 删除 `release/` 目录中的旧 Electron 打包产物
- 删除 `electron-builder.json5`

---

### 阶段 8：测试与验证（优先级：高，贯穿始终）

#### 8.1 编译验证

- [ ] `cargo check` 通过（0 错误）
- [ ] `cargo build` 通过
- [ ] 264 个警告逐步清理

#### 8.2 核心功能测试

- [ ] 应用启动与窗口显示
- [ ] 设置读写
- [ ] 账号增删（离线账号）
- [ ] 版本清单获取
- [ ] Java 检测
- [ ] 游戏启动（离线账号 + 已安装版本）
- [ ] 启动日志实时推送
- [ ] 游戏退出事件

#### 8.3 扩展功能测试

- [ ] 微软登录（Device Code Flow）
- [ ] Littleskin 登录
- [ ] 实例管理完整流程
- [ ] 模组管理完整流程
- [ ] 文件对话框
- [ ] 系统托盘

#### 8.4 跨平台验证

- [ ] macOS (arm64/x64)
- [ ] Windows (x64)
- [ ] Linux (x64)

---

## 四、实施时间线

| 阶段 | 内容 | 预估工作量 |
|------|------|-----------|
| 阶段 1 | 修复 7 个编译错误 | 0.5 天 |
| 阶段 2 | 补全核心功能（事件/Native/对话框/下载进度） | 3-5 天 |
| 阶段 3 | 前端桥接切换 | 0.5-1 天 |
| 阶段 4 | 填充 Stub 命令（按优先级） | 10-15 天 |
| 阶段 5 | 系统托盘 | 0.5 天 |
| 阶段 6 | 构建与打包配置 | 0.5 天 |
| 阶段 7 | Electron 代码清理 | 0.5 天 |
| 阶段 8 | 测试与验证 | 3-5 天 |
| **总计** | | **19-28 天** |

---

## 五、风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Native 库提取实现复杂 | 某些 MC 版本无法启动 | 参考 minecraft-launcher-core 源码逻辑，使用 zip crate |
| 版本 JSON arguments 解析复杂 | 现代 MC 版本参数不完整 | 优先支持 1.13+ 的 arguments 格式，兼容旧版 minecraftArguments |
| 前端桥接切换导致回归 | UI 功能异常 | 方案 A（window 挂载）最小化改动，保持兼容 |
| 微软 OAuth CLIENT_ID 为占位值 | 微软登录不可用 | 需要替换为真实的 Azure 应用 Client ID |
| 264 个编译警告 | 代码质量 | 逐步修复，优先处理 unused 变量 |
| tauri-plugin-dialog API 版本差异 | 文件对话框无法工作 | 确认 Tauri 2.x 的 dialog 插件 API |

---

## 六、关键决策点

1. **前端桥接方式**：推荐方案 A（window 挂载），最小化改动
2. **MinecraftLauncher 异步策略**：保持同步 launch + 异步日志监控线程
3. **Stub 命令处理**：保持返回默认值，不删除，确保前端不崩溃
4. **Electron 代码保留**：阶段 7 再删除，避免过早删除导致无法回退
5. **Microsoft CLIENT_ID**：需要用户提供真实的 Azure 应用 ID
