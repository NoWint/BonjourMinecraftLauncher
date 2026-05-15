# Bonjour Minecraft Launcher 全面修复计划

> **目标**：修复 Windows/macOS 双平台稳定性问题，包括窗口控制缺失、Java 检测异常、依赖库崩溃、下载功能缺陷、耗电过高等所有已知问题。

---

## 一、自定义窗口控制按钮（最小化/最大化/关闭）

### 问题诊断
- [tauri.conf.json](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/tauri.conf.json#L20)：`decorations: false` 禁用了原生窗口装饰
- [App.tsx:L535](file:///Users/xiatian/Desktop/BonjourMinecraft/src/App.tsx#L535)：仅有一个透明的 32px 拖拽区域 `<div className="...drag-region" />`，完全没有最小化/最大化/关闭按钮
- [tauri-bridge.ts:L516-L553](file:///Users/xiatian/Desktop/BonjourMinecraft/src/api/tauri-bridge.ts#L516-L553)：`windowAPI` 只实现了 `toggleFullscreen`，缺少 `minimize`/`maximize`/`close` 方法
- 用户只能通过系统托盘或操作系统快捷键（Cmd+Q/Alt+F4）关闭窗口

### 修复步骤

#### 1.1 前端 windowAPI 补充窗口控制方法
- **文件**：[tauri-bridge.ts](file:///Users/xiatian/Desktop/BonjourMinecraft/src/api/tauri-bridge.ts)
- **操作**：在 `windowAPI` 对象中添加三个方法：
  - `minimize()` — 调用 `@tauri-apps/api/window` 的 `getCurrentWindow().minimize()`
  - `toggleMaximize()` — 调用 `getCurrentWindow().toggleMaximize()`
  - `close()` — 调用 `getCurrentWindow().close()`
- **跨平台注意**：macOS 上最大化应是 `setFullscreen` 而非 `maximize`，需用 `cfg!(target_os = "macos")` 条件调用

#### 1.2 Rust 后端添加窗口控制 Tauri 命令
- **文件**：新建 `src-tauri/src/commands/window_controls.rs` 或在 `lib.rs` 中注册
- **操作**：添加三个命令：
  - `window_minimize` — 获取 `main` 窗口调用 `minimize()`
  - `window_toggle_maximize` — 获取 `main` 窗口调用 `toggle_maximize()`（Windows/Linux）或 `set_fullscreen(!is_fullscreen)`（macOS）
  - `window_close` — 获取 `main` 窗口调用 `close()`

#### 1.3 创建自定义标题栏组件
- **文件**：新建 `src/components/TitleBar.tsx`
- **操作**：
  - 在 App.tsx 的 32px 拖拽区域中嵌入窗口控制按钮
  - 按钮样式：macOS 风格（红/黄/绿圆点）或 Windows 风格（_/□/×）
  - 使用 `webkit-app-region: no-drag` 防止按钮被拖拽
  - 按钮从左到右：关闭（红）、最小化（黄）、最大化（绿）
  - 添加 hover 状态和图标

#### 1.4 在 App.tsx 中集成标题栏
- **文件**：[App.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/App.tsx#L535)
- **操作**：
  - 将现有的 `drag-region` div 替换为 `<TitleBar />` 组件
  - 标题栏左侧保留拖拽区域，右侧放置窗口控制按钮
  - 标题栏高度保持 32px

---

## 二、Java 路径检测异常修复

### 问题诊断
- [java_detector.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/java_detector.rs)：系统 Java 检测逻辑仅在 PATH 和标准位置搜索
- [java.rs:L122-L155](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/commands/java.rs#L122-L155)：`check_java()` 同步调用可能在 UI 线程造成阻塞
- `get_java_version()` 执行 `java -version` 命令，异常 Java 安装（损坏/不兼容架构）会导致超时或错误，当前没有超时处理
- Windows 上 `where java` 可能与 `java.exe`/`javaw.exe` 区分不清

### 修复步骤

#### 2.1 为 Java 版本检测添加超时机制
- **文件**：[java_detector.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/java_detector.rs#L151)
- **操作**：
  - `get_java_version()` 使用 `std::process::Command` 并设置子进程超时（`timeout` 后在另一个线程 `kill`）
  - 设置 8 秒超时，超时则返回 `None` 表示无法检测
  - 捕获损坏 Java 安装的 stderr 输出，避免异常弹窗

#### 2.2 增加 Windows Java 注册表检测
- **文件**：[java_detector.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/java_detector.rs#L61-L88)
- **操作**：
  - Windows 平台通过 `winreg` crate 读取注册表 `HKLM\SOFTWARE\JavaSoft\JDK` 和 `HKLM\SOFTWARE\JavaSoft\JRE`
  - 读取 `CurrentVersion` / `JavaHome` 键值
  - 将注册表路径加入搜索结果

#### 2.3 增加 macOS `/usr/libexec/java_home` 检测
- **文件**：[java_detector.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/java_detector.rs#L79-L107)
- **操作**：
  - macOS 平台上执行 `/usr/libexec/java_home -v <version>` 获取 Java 路径
  - 按优先级尝试：17、21、11、8、任意版本

#### 2.4 异步化 Java 检测命令
- **文件**：[java.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/commands/java.rs#L122)
- **操作**：
  - `check_java()` 中使用 `tokio::task::spawn_blocking` 包装同步调用，避免阻塞 Tauri 主线程
  - 同理处理 `find_java_installations()`、`get_all_java_versions()`

#### 2.5 Java 下载进度条与错误重试
- **文件**：[java.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/commands/java.rs#L167-L234)
- **操作**：
  - `download_java_version_impl()` 添加重试逻辑（最多 3 次，指数退避）
  - 解压失败时清理不完整文件，避免下次检测到不完整的 Java
  - 下载过程中添加 SHA256 校验
  - 完成后显示验证通过/失败状态

#### 2.6 前端 Java 检测异常 UI 处理
- **文件**：[SettingsPage.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/components/SettingsPage.tsx#L203-L253)
- **操作**：
  - 检测失败时显示友好错误提示而非卡死
  - 提供"手动浏览"、"自动下载"、"忽略"三个选项
  - 添加检测超时提示

---

## 三、崩溃处理与 panic hook

### 问题诊断
- [Cargo.toml:L71-L79](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/Cargo.toml#L71-L79)：release 和 fast-release 都设 `panic = "abort"`，任何未捕获 panic 都导致静默崩溃
- 全局搜索：**不存在** `std::panic::set_hook()` 调用
- 用户看到的现象：闪退、无任何错误提示

### 修复步骤

#### 3.1 添加全局 panic hook
- **文件**：[performance.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/performance.rs) 或新建 `src-tauri/src/services/panic_handler.rs`
- **操作**：
  - 在 `init_tracing()` 中添加 `std::panic::set_hook()`：
    ```rust
    std::panic::set_hook(Box::new(|info| {
        let msg = format!("PANIC: {}", info);
        // 1. 写入日志文件到 game_dir/crash-logs/
        // 2. 创建 crash 报告 JSON
        // 3. 如有 Tauri 句柄，尝试弹出原生错误对话框
        // 4. 写入 stderr
        tracing::error!("{}", msg);
        eprintln!("{}", msg);
    }));
    ```
  - 将 panic 信息写入 `crash-logs/panic-{timestamp}.log`

#### 3.2 将 panic 改为 unwind（eval 阶段）
- **文件**：[Cargo.toml](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/Cargo.toml#L71)
- **注意**：此项需要评估，因为 `panic = "abort"` 是为了减小体积
- **建议**：
  - 开发阶段：`panic = "unwind"` 允许捕获和报告
  - Release 阶段：保持 `panic = "abort"`，但添加全局 hook 记录日志
  - 或者在 profile 中移除 `panic = "abort"`，因为 Tauri 2 应用体积主要来自 WebView，panic 策略的差异可忽略

#### 3.3 添加启动崩溃恢复机制
- **文件**：[main.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/main.rs) 或 [lib.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/lib.rs)
- **操作**：
  - 在 `init_tracing()` 后设置全局 panic hook
  - 将 panic 日志写入固定路径（如 `<app_data>/BonjourMinecraft/crash-logs/`）
  - 下次启动时检测 crash-logs 目录，如有新的崩溃日志则提示用户
  - 自动备份崩溃前的数据库状态

#### 3.4 关键路径 panic 防护
- **文件**：[minecraft_launcher.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/minecraft_launcher.rs)
- **操作**：
  - `launch()` 中 `natives_handle.join()` 已有基本防护（L167-L168），确认所有线程 join 都有类似防护
  - `monitor_process` 中的 reader 线程添加 `std::panic::catch_unwind` 包装
  - database 操作使用事务 + `catch_unwind` 保护数据一致性

---

## 四、依赖库和构建配置修复

### 问题诊断
- [Cargo.toml:L16](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/Cargo.toml#L16)：`tauri` 依赖硬编码 `devtools` feature
- [Cargo.toml:L25](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/Cargo.toml#L25)：`reqwest` 同时启用 `blocking` feature
- [server_manager.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/server_manager.rs#L300-L308)：`is_process_running` 仅 Windows 实现
- [tauri.conf.json:L25](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/tauri.conf.json#L25)：CSP 设为 `null`

### 修复步骤

#### 4.1 条件化 devtools feature
- **文件**：[Cargo.toml](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/Cargo.toml#L16)
- **操作**：
  ```toml
  [features]
  devtools = ["tauri/devtools"]

  [dependencies]
  tauri = { version = "2", features = ["tray-icon"] }
  ```
  - 在 `tauri.conf.json` 中 dev 构建启用 `devtools` feature，release 不启用

#### 4.2 移除 reqwest blocking feature
- **文件**：[Cargo.toml](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/Cargo.toml#L25)
- **操作**：将 `reqwest` features 从 `["json", "stream", "blocking"]` 改为 `["json", "stream"]`
- **验证**：检查所有使用 `reqwest::blocking` 的代码（如有，用 `tokio::task::spawn_blocking` 替代）

#### 4.3 补全平台特定代码
- **文件**：[server_manager.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/server_manager.rs#L300-L308)
- **操作**：
  - 为 `is_process_running` 添加 macOS/Linux 实现（使用 `kill -0 <pid>` 或 `/proc/<pid>` 检测）
  - 将 `creation_flags(0x00000008)` 替换为 `DETACHED_PROCESS` 常量或使用条件编译宏

#### 4.4 配置内容安全策略
- **文件**：[tauri.conf.json](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/tauri.conf.json#L24-L26)
- **操作**：设置合理的 CSP：
  ```json
  "security": {
    "csp": "default-src 'self'; img-src 'self' asset: https: data:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://bmclapi2.bangbang93.com https://launchermeta.mojang.com https://piston-meta.mojang.com https://api.modrinth.com https://api.curseforge.com https://resources.download.minecraft.net https://launcher.mojang.com https://api.adoptium.net; font-src 'self' data:; script-src 'self'"
  }
  ```

#### 4.5 配置更新器
- **文件**：[tauri.conf.json](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/tauri.conf.json#L52-L57)
- **操作**：配置更新公钥和端点，或暂时移除 `updater` 插件以避免启动时失败的网络请求
  - 如果没有更新服务器：移除 `tauri-plugin-updater` 依赖
  - 如果将来需要：正确配置 `pubkey` 和 `endpoints`

---

## 五、游戏版本和 Java 下载功能修复

### 问题诊断
- [download.rs:L10-L12](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/commands/download.rs#L10-L12)：`pause_download`、`resume_download`、`cancel_download` 是空实现
- [version.rs:L54-L55](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/commands/version.rs#L54-L55)：`install_version` 中版本 JSON 用 `reqwest::get()` 直连原始 URL，不经过 BMCLAPI 镜像
- [network.rs:L50-L71](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/network.rs#L50-L71)：`download_file` 全量读入内存无断点续传
- [java.rs:L167-L234](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/commands/java.rs#L167-L234)：Java 下载无进度上报（`download_java_version_impl`）、无校验

### 修复步骤

#### 5.1 实现可暂停/恢复/取消的下载系统
- **文件**：[download.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/commands/download.rs)
- **操作**：
  - 新建 `DownloadManager` 结构体，使用 `Arc<Mutex<HashMap<String, DownloadHandle>>>` 管理活跃下载
  - 每个 `DownloadHandle` 包含 `tokio::sync::watch::Sender<bool>` 取消通道
  - `download_file` 改为流式下载，支持暂停信号和断点续传
  - 暂停时保存已下载字节到 `.part` 文件
  - 恢复时从 `.part` 文件继续
  - 实现 `pause_download`/`resume_download`/`cancel_download` 命令
  - 使用 `AppState` 管理 DownloadManager 实例

#### 5.2 版本下载使用统一镜像替换
- **文件**：[version.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/commands/version.rs#L45-L90)
- **操作**：
  - `install_version` 中所有下载 URL 经过 `replace_download_url_internal` 替换
  - 根据用户设置的 `download_source` 选择镜像源（bmclapi/mojang/mcbbs）
  - 下载前检查用户设置中的 `downloadSource` 配置

#### 5.3 NetworkService 增强
- **文件**：[network.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/network.rs)
- **操作**：
  - 所有下载 URL 统一经过镜像替换
  - `download_file` 改为流式下载 + 临时文件 + 原子重命名
  - 添加 ETag/Last-Modified 支持，避免重复下载
  - 添加下载超时配置（默认 60 秒，可配置）
  - 读取用户设置的 `downloadSource` 决定镜像策略

#### 5.4 Java 下载增加完整性校验
- **文件**：[java.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/commands/java.rs#L167-L234)
- **操作**：
  - 下载完成后校验文件 SHA256（Adoptium API 提供 checksum）
  - 校验失败自动重试（最多 3 次）
  - 解压完成后验证 `bin/java`（或 `bin/java.exe`）可以执行
  - 将 `download_java_version` 改为使用 `download_java_with_progress` 的流式下载逻辑

---

## 六、高耗电问题修复

### 问题诊断
- [DynamicBackground.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/components/DynamicBackground.tsx)：
  - `MeshGradient`（L61-L116）：持续 `requestAnimationFrame` 循环，每帧绘制两个径向渐变
  - `ParticleField`（L128-L213）：50 个粒子持续动画 + O(n²) 连接线计算
  - `AuroraEffect`（L215-L287）：4 条极光带持续正弦波计算
  - `WavesEffect`（L290-L356）：5 条波浪持续正弦波计算
  - 背景渐变 `motion.div`（L395-L411）：`backgroundPosition` 动画 `transition: { duration: 20, repeat: Infinity }`
- [LaunchAnimation.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/components/LaunchAnimation.tsx)：
  - `CelebrationEffect`：60 个 Canvas 粒子 `requestAnimationFrame` 循环
  - `DefaultAnimation`/`CinematicAnimation`：`repeat: Infinity` 动画
- [SplashScreen.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/components/SplashScreen.tsx)：
  - Logo 的 `boxShadow` 动画 `repeat: Infinity`（L91-L98）
  - 旋转 loading 动画 `repeat: Infinity`（L131-L140）
- [App.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/App.tsx)：
  - `DynamicBackground` 一直在最底层持续渲染
  - `TrayWidget` 持续存在

### 修复步骤

#### 6.1 Canvas 动画节流与空闲暂停
- **文件**：[DynamicBackground.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/components/DynamicBackground.tsx)
- **操作**：
  - 所有 Canvas 动画循环添加 `requestAnimationFrame` 帧率控制：
    - high tier: 60fps
    - medium tier: 30fps
    - low tier: 15fps
  - 使用 `document.visibilityState` API：窗口不可见时暂停所有 Canvas 动画
  - 使用 `document.hasFocus()` API：窗口失去焦点时降低帧率到 5fps
  - `ParticleField` 粒子数量在 `low` tier 降到 10 个，禁用连接线（O(n²) 计算）

#### 6.2 添加空闲检测
- **文件**：新建 `src/hooks/useIdleTimer.ts`
- **操作**：
  - 检测用户无操作（鼠标/键盘/触摸）超过 30 秒
  - 空闲时停止 `DynamicBackground` 动画、降低 Canvas 帧率到 1fps
  - 恢复操作时立即恢复

#### 6.3 条件渲染优化
- **文件**：[DynamicBackground.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/components/DynamicBackground.tsx)
- **操作**：
  - `variant === 'none'` 时不渲染任何 Canvas 元素
  - `variant === 'gradient'` 时只渲染 CSS 渐变（motion.div），不创建 Canvas
  - `intensity === 'subtle'` 时停止粒子/极光/波浪动画，仅显示静态渐变
  - 添加 `prefers-reduced-motion` 媒体查询检测，自动降级为静态背景

#### 6.4 SplashScreen 动画优化
- **文件**：[SplashScreen.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/components/SplashScreen.tsx#L86-L98)
- **操作**：
  - `boxShadow` 动画从 `repeat: Infinity` 改为循环 2 次后停止
  - `loading` phase 的旋转动画保持 `repeat: Infinity`（splash 场景可接受）

#### 6.5 LaunchAnimation 优化
- **文件**：[LaunchAnimation.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/components/LaunchAnimation.tsx)
- **操作**：
  - `CelebrationEffect`：粒子降到 30 个，动画最长 3 秒后自动停止
  - `DefaultAnimation` pulsating 效果 `repeat` 改为 3 次后停止
  - `CinematicAnimation` 波环效果 `repeat` 改为 3 次后停止

#### 6.6 使用 GPU 加速的 CSS 动画替代 Canvas
- **操作**：
  - 简单的渐变动画用 CSS `animation` + `will-change: background-position` 替代 Canvas
  - 粒子效果在低性能设备上完全禁用，用静态渐变替代
  - Canvas 仅在 `variant === 'particles'` 或 `'aurora'` 时创建

---

## 七、整体稳定性增强

### 7.1 数据库初始化错误处理
- **文件**：[lib.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/lib.rs#L418-L427)
- **操作**：
  - 数据库初始化失败时不要静默继续，而是在前端显示错误提示
  - 添加数据库迁移版本号和降级保护
  - 数据库操作添加 WAL 模式和定期 checkpoint

### 7.2 设置加载失败回退
- **文件**：[App.tsx](file:///Users/xiatian/Desktop/BonjourMinecraft/src/App.tsx#L146-L241)
- **操作**：
  - `loadInitialData()` 中已有部分回退代码（L206-L240），完善默认设置覆盖所有必需字段
  - 添加数据库损坏检测：`rusqlite` 打开失败时尝试 WAL 恢复或重建数据库

### 7.3 进程守护增强
- **文件**：[process_guardian.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/services/process_guardian.rs)
- **操作**：
  - 添加子进程心跳检测：定期检查启动的 Minecraft 进程是否响应
  - 进程意外退出时提供重启选项
  - 清理僵尸子进程（`waitpid` 处理）

### 7.4 macOS 特定问题
- **操作**：
  - macOS App Nap 处理：启动 Minecraft 时通过 `beginActivityWithOptions` 禁用 App Nap
  - macOS Gatekeeper 公证：确保签名配置正确
  - macOS 原生菜单栏：添加标准 macOS 应用菜单（About/Preferences/Quit）
  - macOS 全屏模式切换到原生全屏

### 7.5 Windows 特定问题
- **操作**：
  - 添加 WebView2 运行时检测：启动时检查 WebView2 是否安装，未安装则引导下载
  - DPI 感知设置：在 `tauri.conf.json` 中添加 dpi 感知配置
  - Windows Defender 误报缓解：确保代码签名
  - 高 DPI 显示器的缩放适配

### 7.6 错误处理完善
- **文件**：[errors.rs](file:///Users/xiatian/Desktop/BonjourMinecraft/src-tauri/src/errors.rs)
- **操作**：
  - `From<std::io::Error>` 转换保留更多上下文（文件路径、操作类型）
  - 添加 `WebViewError`、`DatabaseCorruptionError` 等新错误类型
  - 所有错误变体的 `fix_action` 提供明确的中英文修复建议

---

## 八、实施顺序（按优先级）

| 优先级 | 模块 | 预估影响范围 |
|--------|------|-------------|
| **P0** | 添加全局 panic hook + 崩溃日志 | 防止所有静默闪退 |
| **P0** | 自定义窗口控制按钮（最小化/最大化/关闭） | 解决用户无法关闭窗口的核心 UX 问题 |
| **P1** | 移除 `reqwest blocking` feature + 修复依赖 | 减小体积、避免潜在死锁 |
| **P1** | Java 检测超时 + 异步化 | 解决 Java 检测卡死/弹窗 |
| **P1** | Windows Java 注册表检测 | 提高 Windows 平台 Java 检测成功率 |
| **P1** | 实现可暂停/恢复/取消下载 | 解决下载功能不完整的问题 |
| **P1** | 版本下载使用镜像替换 | 解决国内用户下载慢/失败 |
| **P2** | Canvas 动画节流 + 空闲检测 | 解决高耗电问题 |
| **P2** | CSP 配置 | 安全加固 |
| **P2** | 补全平台特定代码 | macOS/Linux is_process_running |
| **P2** | macOS App Nap + 原生菜单 | macOS 平台稳定性 |
| **P2** | Windows WebView2 检测 | Windows 平台稳定性 |
| **P3** | 更新器配置/移除 | 避免无用的网络请求 |
| **P3** | 条件化 devtools feature | 减小 release 体积 |
| **P3** | Java 下载校验 | 防止下载损坏 |

---

## 九、验证清单

### 功能验证
- [ ] macOS 上窗口最小化/最大化/关闭按钮正常工作
- [ ] Windows 上窗口最小化/最大化/关闭按钮正常工作
- [ ] macOS 上 `/usr/libexec/java_home` 检测 Java 成功
- [ ] Windows 上注册表检测 Java 成功
- [ ] Java 检测超时（损坏的 Java 安装）不会导致 UI 卡死
- [ ] 下载暂停/恢复/取消功能正常
- [ ] 版本下载在国内镜像下可以完成
- [ ] Java 下载完成后带进度显示
- [ ] 空闲时 CPU 使用率明显降低
- [ ] 崩溃后重启能看到 crash log

### 稳定性验证
- [ ] `cargo build --release` 成功（macOS）
- [ ] `cargo build --release` 成功（Windows 交叉编译或实机验证）
- [ ] 10 次连续启动无闪退
- [ ] 内存泄漏检测（运行 30 分钟后内存稳定）
- [ ] 数据库初始化失败时不崩溃
- [ ] 网络断开时下载失败有友好提示
