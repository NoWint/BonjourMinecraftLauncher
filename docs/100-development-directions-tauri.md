# Bonjour Minecraft 启动器

# 超越竞争 · 百项战略发展书（2026-2029）— Tauri 时代版

> **版本 3.0** — 基于 Tauri 2 + Rust 迁移完成后的批判性重估
> V2.0 的核心问题：以 Electron 架构为假设前提撰写，未考虑 Tauri 迁移带来的根本性变化。
> V3.0 以「Tauri 迁移完成后，哪些方向需要重估？哪些成为真正的壁垒？哪些变成伪需求？」为准则全面重写。

***

## 零、Tauri 迁移后的项目现实：我们在哪？

在列出 100 个方向之前，必须面对一个关键事实：**V2.0 的竞争分析建立在 Electron 假设上，而现在我们的底层已经从 Chromium 换成了系统原生 WebView + Rust 后端。**

### 0.1 迁移完成的资产清单

| 层级 | 完成度 | 关键实现 |
|------|--------|----------|
| **Rust 命令层** | ~260+ 命令已注册 | settings, account, version, java, launch, instance, mod_mgr, world, resource, auth, modpack, server, download, advanced |
| **Rust 服务层** | 6 个服务模块 | file_manager, network, minecraft_launcher, java_detector, microsoft_auth, littleskin_auth |
| **Rust 模型层** | 11 个数据模型 | account, settings, version, instance, mod_info, world, resource, server, launch, modpack, download |
| **Tauri 插件** | 5 个官方插件 | shell, dialog, fs, process, updater |
| **系统托盘** | 已实现 | 右键菜单 + 双击显示 + 快速启动 |
| **前端 UI 层** | 35+ 组件 | 涵盖所有功能页面 |
| **核心引擎** | launchEngine, logDiagnoser, jvmTuner, processGuardian | 前端 TypeScript 实现 |
| **外部 API** | bmclapi, curseforge, modrinth | 前端实现 |

### 0.2 迁移带来的结构性变化（必须正视）

**有利变化：**

1. **包体积从 150MB+ 降至 < 5MB**（Rust 编译产物 + 系统 WebView 复用）
2. **内存占用从 200MB+ 降至 < 50MB**（无 Chromium 常驻）
3. **冷启动从 Electron 的 3-5 秒降至 < 1 秒**（系统 WebView 预热）
4. **Rust 生态的并发安全性**：文件操作、网络请求天然线程安全
5. **真正的原生系统集成**：托盘、通知、文件对话框全部原生
6. **增量更新包更小**：Rust 编译产物 bsdiff 增量 < 2MB

**不利变化（必须承认）：**

1. **WebView 兼容性风险**：Windows 上依赖 Edge WebView2，Linux 上依赖 WebKitGTK，各平台渲染行为有差异
2. **前端性能天花板降低**：系统 WebView 的 JS 引擎性能低于 Chromium 独立进程，Canvas/WebGL 密集型操作（如存档地图渲染）可能更慢
3. **Node.js 生态不可用**：不能再 require('child_process')、不能用 npm 原生模块。所有系统调用必须走 Rust 命令。
4. **插件系统受限**：V2.0 设想的「Node.js 插件系统」完全不可行，需重新设计为 Rust/WASM 插件或 IPC 外部进程插件。
5. **DevTools 调试体验降级**：Tauri 的 WebView DevTools 不如 Electron 的 Chrome DevTools 完整。

### 0.3 对 V2.0 中 108 个方向的批判性重分类

| 分类 | 数量 | 说明 |
|------|------|------|
| ✅ **保持有效且受益于 Tauri** | 52 | 核心逻辑不受架构影响，或 Tauri 实现更优 |
| ⚠️ **需要重新设计技术路径** | 24 | Electron 方案不可用，需改用 Rust/原生方案 |
| ❌ **失去可行性，需重新构想** | 8 | 底层假设变化导致不可行 |
| 🆕 **Tauri 迁移创造的新方向** | 16 | 迁移后独有的机会 |

### 0.4 竞争格局更新

| 竞品 | Tauri 迁移后的变化 |
|------|-------------------|
| **PCL2** | 我们的启动速度从「略有优势」变成「碾压级优势」（<1s vs 5-8s） |
| **HMCL** | 内存优势从 2x 扩大到 8x（50MB vs 400MB） |
| **PrismLauncher** | 安装包体积从「差不多」变成 1/20（5MB vs 100MB+） |
| **Badlion/Lunar** | 从「不同品类」到「可以竞争低端机器场景」 |

**Tauri 带来的核心破局点更新：**

```
Electron 做不到，但 Tauri 2 + Rust + React 能做到的：

1. 安装不到 5MB，下载即用  →  PCL2 需要 .NET 运行时 200MB+
2. 内存占用 < 50MB 空闲  →  HMCL JVM 常驻 400MB+
3. 冷启动 < 1 秒  →  所有竞品的 5-10x 速度差
4. 增量更新 < 2MB  →  PCL2 全量 80MB
5. Rust 的原生性能用于文件 Hash、NBT 解析、大量 I/O → 比 Java/JS 快 10-100x
6. 系统级安全沙箱 → 恶意模组防范的底层能力
```

### 0.5 更新后的反目标

- ❌ 不做模组 IDE
- ❌ 不做游戏主机/云游戏
- ❌ 不做区块链/NFT
- ❌ 不做社交平台
- ❌ **不做 Node.js 插件系统**（技术上不可行，改为 Rust/WASM 插件）
- ❌ **不做 Chromium 级渲染**（Canvas 密集型操作改用 Rust 后端渲染传图）

***

## 一、架构现代化与 Tauri 深度适配（10 个方向）

> **新增模块。** V2.0 完全没有考虑架构迁移带来的工程方向。Tauri 迁移不只是「换了底层」，而是打开了全新的优化空间。

**#1 命令层实现深度补全**

- **现状**：260+ 命令已注册，但部分为 stub 实现。例如 `launch_multiple_instances` 返回 hardcoded 的 `"Not supported in batch mode"`。
- **批判**：注册命令 ≠ 实现命令。当前有大量命令只是返回 mock 数据或空数组，这对初期开发可以接受，但必须建立「实现进度追踪矩阵」。
- **具体方案**：建立命令实现等级标记 — L0=stub，L1=基本可用，L2=完整实现+错误处理，L3=优化+测试覆盖。
- **技术路径**：每个命令模块添加 `// IMPL_LEVEL: L0-L3` 注释 → CI 检查覆盖率 → 追踪未实现/未测试命令。
- **可量化目标**：3 个月内 L2+ 命令占比从当前 ~40% 提升到 80%。

**#2 Tauri IPC 通信协议优化**

- **现状**：前端通过 `invoke()` 调用 Rust 命令，当前为纯 JSON 序列化。高频调用（如启动日志、下载进度）会产生显著的序列化开销。
- **批判**：当前 `launch-log` / `download-progress` 事件使用 JSON 序列化每条日志，大量日志瞬间涌入时会造成前端卡顿。
- **具体方案**：高频事件改用 Tauri 的 Channel API（Tauri 2.3+）批量传输；启动日志改为固定格式的二进制协议（减少 70% 序列化开销）；实现背压机制，前端消费不过来时后端暂存。
- **技术路径**：Tauri Channel API → 批量日志缓冲（100ms 合并） → 二进制协议（protobuf-like 固定 schema）。
- **可量化目标**：1000 条/秒的日志事件下前端 FPS 保持 > 30。

**#3 Rust 侧计算密集型任务卸载**

- **现状**：存档地图渲染、NBT 解析、大文件 Hash 目前部分在前端 JavaScript 执行。
- **批判**：系统 WebView 的 JS 引擎处理 500MB NBT 文件 → 主线程阻塞 5-10 秒。这是 Tauri 架构下的性能 bug，不是功能缺失。
- **具体方案**：将所有计算密集型操作（NBT 解析、地图渲染、文件 Hash、模组 jar 分析）全部迁移到 Rust 侧，通过 `tauri::async_runtime::spawn_blocking` 在专用线程池中执行，结果以压缩格式返回前端。
- **技术路径**：识别前端 CPU 密集型调用 → 逐项迁移到 Rust → 前端改为 `invoke + loading state` → 结果缓存。
- **可量化目标**：500MB 存档的 NBT 扫描从 JS 15 秒降至 Rust 0.5 秒。

**#4 多窗口架构设计**

- **现状**：当前只有一个主窗口（tauri.conf.json 仅配置一个 window）。
- **批判**：多窗口不是「加分项」而是「必要项」——启动日志面板、崩溃报告查看、设置页面、AI 助手都应该能独立弹出，否则用户体验被单窗口锁死。
- **具体方案**：设计窗口管理器 — 主窗口 + 启动日志浮窗 + 崩溃报告独立窗口 + 设置独立窗口 + AI 助手侧边栏窗口。窗口间通过 Tauri 事件系统通信。
- **技术路径**：Tauri WebviewWindowBuilder → 窗口位置记忆 → IPC 事件同步 → 窗口生命周期管理。
- **可量化目标**：支持 4 个同时打开的独立窗口，各自独立但状态同步。

**#5 Rust 侧 SQLite 数据层迁移**

- **现状**：当前数据持久化以 JSON 文件为主（instances.json, settings.json, versions.json 等），每次读写全量序列化/反序列化。
- **批判**：当实例数 > 50、模组数 > 500 时，JSON 全量读写的性能灾难不可避免。
- **具体方案**：引入 SQLite（rusqlite）作为数据层 — 实例、模组、存档备份、启动记录全部入表。JSON 文件保留为导入/导出/手动编辑的格式。
- **技术路径**：rusqlite + migrations → 数据模型与 JSON 导入/导出双向同步 → 渐进迁移（先加 SQLite 读取，JSON 仍写入，确认无误后切主存储）。
- **可量化目标**：100 个实例的列表加载从 2 秒（JSON 全量解析）降至 50ms（SQL 索引查询）。

**#6 启动器自身的性能剖析系统**

- **现状**：不知道启动器自己哪里慢。
- **批判**：竞品从未做过自身性能剖析，但作为「最快的启动器」定位，我们必须量化证明。Tauri 的 Rust 侧可以直接集成 tracing 和性能计数器。
- **具体方案**：Rust 侧使用 `tracing` crate 记录每个命令的耗时 → 前端展示「启动器自身性能仪表盘」→ 标注慢命令 → 自动上报（匿名）。
- **技术路径**：tracing + tokio-console → 前端性能面板 → 匿名遥测。
- **可量化目标**：95% 的命令响应 < 50ms（P95 延迟）。

**#7 条件编译：全平台差异化能力**

- **现状**：当前 Cargo.toml 无平台条件依赖，所有平台用同一套代码。
- **批判**：Windows 的注册表读取、macOS 的 Keychain 存储、Linux 的桌面文件注册 → 应该用 Rust `#[cfg(target_os)]` 做干净的平台差异化，而不是前端 `navigator.platform` 判断。
- **具体方案**：每个命令模块提供平台最佳实现 — Windows 用 winreg 读注册表、macOS 用 security-framework 存 Keychain、Linux 用 freedesktop 规范。
- **技术路径**：条件编译模块 → 暴露统一 trait 接口 → 编译时选择实现。
- **可量化目标**：三个平台的核心功能一致，平台特色功能各 3+ 个。

**#8 构建流水线优化**

- **现状**：`Cargo.toml` release profile 使用了 `opt-level = "z"`（最小体积）+ `lto = true` + `panic = "abort"`。这些都是体积优先的选项，但编译时间可能很长。
- **批判**：当前的 release profile 编译可能需要 5-10 分钟，CI/CD 上这个时间不可接受。需要区分 CI 构建和发布构建。
- **具体方案**：引入 `cargo-chef` 做 Docker 层缓存 → CI 中使用 `opt-level = "s"` 加速编译 → 发布时切换到 `opt-level = "z"` → 增量编译缓存。
- **技术路径**：cargo-chef → GitHub Actions cache → profile 覆盖。
- **可量化目标**：CI 构建时间从 10 分钟降至 3 分钟；发布构建 < 8 分钟。

**#9 错误处理体系统一**

- **现状**：命令中大量使用 `Result<T, String>`，错误信息是裸字符串。前端收到错误后只能展示原文，无法做结构化处理。
- **批判**：`Result<T, String>` 是 Rust 初学者的反模式。生产级应用应该使用 `thiserror` 定义结构化错误类型，前端根据错误码做本地化和操作建议。
- **具体方案**：定义 `AppError` 枚举（使用 thiserror），每种错误带 error_code + 中文消息 + 英文消息 + 修复建议 action。前端统一错误处理组件根据 error_code 展示。
- **技术路径**：thiserror 宏 → `impl From<AppError> for String` → 前端 ErrorBoundary 改造。
- **可量化目标**：所有 `Result<T, String>` 替换为 `Result<T, AppError>`，覆盖率 100%。

**#10 自动化端到端测试体系**

- **现状**：无可见的测试代码。260+ 命令无一被自动化测试覆盖。
- **批判**：在「启动失败是用户流失首要原因」的行业里，不测试启动流程是自残。Tauri 支持 Rust 侧单元测试 + 集成测试，前端可以用 Playwright（通过 WebDriver）。
- **具体方案**：Rust 单元测试覆盖所有命令逻辑 → 集成测试覆盖启动流程 → Playwright 端到端测试覆盖关键用户路径 → CI 中每次 PR 运行。
- **技术路径**：cargo test → tauri::test → Playwright + WebDriver → GitHub Actions。
- **可量化目标**：核心启动流程的自动化测试覆盖率 > 90%；每次 PR 测试 < 5 分钟。

***

## 二、首次体验与安装向导（8 个方向）

> **Tauri 影响**：安装包体积从 80MB+ 降至 5MB 以下，从根本上改变了「首次体验」的定义。用户从下载到打开的时间从 2 分钟降至 10 秒。

**#11 零配置启动向导（保持，路径更新）**

- **竞品痛点**：不变。
- **Tauri 变化**：安装包仅 5MB → 下载完成即启动 → 向导可以更快开始。Java 自动下载从 `Electron net` 改为 Rust `reqwest`，下载速度提升（无 Chromium 网络栈开销）。
- **可量化目标**：从下载启动器到进入游戏 < 4 分钟（V2.0 目标 5 分钟，Tauri 进一步压缩）。

**#12 迁移助手（保持，需要适配）**

- **Tauri 变化**：解析 PCL2/HMCL 配置文件的逻辑应从 TypeScript 迁移到 Rust，利用 serde 做结构化解析，比 JS 手写 parser 更可靠。但需要确认 serde 能否解析 PCL2 的非标准 JSON 变体。
- **可量化目标**：不变。

**#13 智能 Java 运行时管理（保持，Rust 优势）**

- **Tauri 变化**：Java 检测逻辑已在 Rust 侧实现（`java_detector` service）。Adoptium API 拉取和并行下载用 Rust `reqwest + futures` 实现，比 JS `fetch` 更高效。
- **新能力**：Rust 可以调用系统级 API 检测已安装的 Java（注册表扫描、/usr/lib/jvm 扫描），比前端 `which java` 更可靠。
- **可量化目标**：不变。

**#14 预检系统（保持，增强）**

- **Tauri 变化**：Rust `sysinfo` crate 可以直接读取 GPU 信息、驱动版本、磁盘 SMART 数据 → 预检深度远超 Electron 时代的前端 `navigator.hardwareConcurrency`。
- **可量化目标**：预检项目从 30+ 提升到 50+（增加驱动版本检测、DirectX/Vulkan 版本、磁盘健康状态）。

**#15 后台静默更新（技术路径完全重写）**

- **V2.0 方案**：`electron-updater → 增量更新（bsdiff）→ 下次冷启动替换`
- **Tauri 方案**：`tauri-plugin-updater` 已集成。但当前 `tauri.conf.json` 中 updater 的 pubkey 和 endpoints 为空，完全未配置。
- **具体方案**：配置 updater plugin — 生成签名密钥对 → 部署更新 JSON 到 CDN → Rust 侧检查更新 → 下载 .tar.gz 增量包 → 自动替换。
- **技术路径**：tauri-plugin-updater + 签名验证 → 增量包生成脚本 → CDN 部署 → 静默更新。
- **可量化目标**：更新包 < 2MB（全量约 5-8MB）；更新成功率 > 99.5%。

**#16 视觉效果首次展示（保持，调整预期）**

- **Tauri 变化**：系统 WebView 的 WebGL/Canvas 性能可能不如 Chromium。像素粒子动画如果使用大量 Canvas 绘制，在低端 Windows 上可能掉帧。
- **具体方案**：动画方案需做降级设计 — 检测 WebView 类型和硬件加速状态 → 高性能模式（完整粒子动画）/ 中性能模式（简化动画）/ 低性能模式（静态过渡）。
- **可量化目标**：不变。

**#17 区域自感知配置（保持，增强）**

- **Tauri 变化**：可以用 Rust `reqwest` 并发 ping 多个下载源测速，结果更准确。IP 定位通过连接 BMCLAPI/Mojang 测速自动推断。
- **可量化目标**：不变。

**#18 离线模式降级策略（保持）**

- **Tauri 变化**：网络状态检测需要从 `navigator.onLine` 增强为 Rust 侧的真实网络连通性检测（DNS 解析测试 + HTTP HEAD 请求）。`navigator.onLine` 只检测网卡连接状态，不能判断是否真正能上网。
- **技术路径**：Rust 侧定时心跳检测（1 分钟间隔）→ 事件通知前端 → 渐进降级。

***

## 三、核心启动引擎（10 个方向）

> **关键变化**：部分启动逻辑仍然在前端 TypeScript（launchEngine.ts, logDiagnoser.ts, jvmTuner.ts）。这是 Tauri 迁移最大的遗留问题 — 核心引擎逻辑应该下沉到 Rust。

**#19 启动流程可视化仪表盘（保持，增强）**

- **Tauri 变化**：启动阶段状态机应从 TypeScript 迁移到 Rust，前端只展示。Rust 侧通过事件推送阶段变化，前端 Canvas 渲染时间线。
- **具体方案**：Rust `LaunchSession` 状态机 → 通过 Tauri 事件推送阶段变化 → 前端纯展示层。

**#20 启动日志智能诊断引擎（需要增强）**

- **现状**：`logDiagnoser.ts` 在前端 TypeScript 中，使用正则 + 关键词匹配。
- **批判**：把诊断逻辑放在前端意味着：1) 日志需要全量传到前端（IPC 开销）；2) 正则匹配占用 UI 线程；3) 无法热更新诊断规则。
- **具体方案**：将诊断引擎迁移到 Rust 侧 → 正则预编译 → 规则 YAML 文件（可热更新）→ 诊断结果结构化返回前端。
- **技术路径**：regex crate（比 JS RegExp 快 5-10x）+ serde_yaml 规则库 + 嵌入式规则更新。
- **可量化目标**：日志诊断从 500ms 降至 50ms；规则可热更新无需重启。

**#21 JVM 参数调优向导（需要迁移到 Rust）**

- **现状**：`jvmTuner.ts` 在前端。
- **具体方案**：JVM 参数推荐引擎迁移到 Rust → 基于系统内存（sysinfo）自动推荐 → 前端只展示滑块和预设。
- **可量化目标**：不变。

**#22 崩溃报告自动收集与分析（需要增强）**

- **Tauri 新能力**：Rust 可以获取系统崩溃转储、内存 dump、GPU 状态，比 Electron 能收集更多诊断信息。
- **具体方案**：崩溃时 Rust 侧收集系统快照（进程列表、内存分布、磁盘状态、GPU 驱动信息）→ 结构化报告 → 向量搜索匹配历史案例。
- **可量化目标**：诊断信息维度从 15 项增加到 40 项。

**#23 增量资源补全（需要迁移到 Rust）**

- **现状**：`incrementalSync.ts` 在前端。
- **批判**：文件 Hash 校验（SHA-1）和并发下载是典型的 CPU/IO 密集型操作，应该在 Rust 中执行。
- **具体方案**：`sha2` crate 并行 Hash → `reqwest` 并发下载（8 线程）→ 进度通过 Channel API 批量推送前端。
- **可量化目标**：1000 个文件的 Hash 校验从 JS 版 30 秒降至 Rust 版 2 秒。

**#24 启动耗时基准测试（保持，增强）**

- **Tauri 新能力**：Rust 侧可以用 `std::time::Instant` 做纳秒级计时，比 JS `performance.now()` 更精确。同时 SQLite 存储时序数据比 JSON 文件高效得多。
- **技术路径**：Rust 计时 → SQLite 存储 → 前端 Charts 展示。

**#25 多版本并行启动（需要从 stub 实现）**

- **现状**：`launch_multiple_instances` 命令返回 `"Not supported in batch mode"`。
- **具体方案**：使用 `tokio::spawn` 管理多个子进程 → 共享只读 libraries/assets（通过硬链接）→ 独立游戏目录 → 进程状态监控。
- **技术路径**：tokio::process::Command → 目录隔离 → 硬链接共享 → 进程组管理。
- **可量化目标**：3 个实例同时运行，额外内存 < 300MB。

**#26 快速启动面板（实现，增强）**

- **现状**：系统托盘已实现，菜单有「快速启动」项。
- **待完成**：右键菜单需动态展示最近版本列表 → `setup_tray` / `update_tray_menu` 命令已注册，需完善实现。
- **可量化目标**：从想玩游戏到启动 = 1 次操作（托盘右键选版本）。

**#27 游戏进程守护（需要迁移到 Rust）**

- **现状**：`processGuardian.ts` 在前端。
- **批判**：Rust 侧直接管理子进程句柄，可以监听进程退出信号（Unix SIGCHLD / Windows Job Object），比前端轮询 `child_process` 状态可靠 100 倍。
- **具体方案**：Rust `std::process::Child` + `waitpid` → 进程退出事件 → 自动触发恢复流程 → 通知前端。
- **可量化目标**：游戏崩溃检测延迟从 5 秒（轮询）降至 0.1 秒（信号驱动）。

**#28 热配置注入（保持，需要 Mod 配合）**

- **现状**：`hotConfig.ts` 在前端。
- **Tauri 新能力**：可以用 Rust `notify` crate 直接监控文件系统变化，比前端 `fs.watch` 更可靠。
- **可量化目标**：不变。

***

## 四、实例与版本生态系统（12 个方向）

**#29 实例分组与标签（保持，已实现）**

- **现状**：命令已注册（`get_instance_groups`, `create_instance_tag` 等），需确认实现深度。

**#30 实例模板系统（保持，迁移到 SQLite）**

- **Tauri 优化**：模板存储从 JSON 迁移到 SQLite，支持按标签/加载器/版本筛选。

**#31 版本兼容性评分卡（保持，增强）**

- **Tauri 新能力**：`reqwest` 定时爬取模组平台数据 → Rust 侧统计计算 → SQLite 缓存评分 → 前端展示。比 JS 爬虫更可靠。

**#32 版本间差异对比（保持）**

**#33 时间机器：实例状态快照（需要从 JSON 迁移到 SQLite）**

- **现状**：快照存储在 `instance_snapshots/` JSON 目录。
- **具体方案**：快照元数据入 SQLite → diff 存储 → 时间线查询 O(log n)。

**#34 实例导入/导出（保持，增强）**

- **Tauri 新能力**：Rust 的 `zip` crate 打包/解压 `.bonjour-pkg` 格式，比 JS 的 jszip 快 3-5x。

**#35 实例存储分析（保持，迁移到 Rust）**

- **Tauri 优化**：Rust `walkdir` 递归计算比前端逐目录 AJAX 快 10x。

**#36 实例数据看板（保持）**

**#37 过期版本智能降级指引（保持）**

**#38 版本注解社区（保持）**

**#39 数据目录健康检查（保持，迁移到 Rust）**

- **Tauri 新能力**：Rust 并发 Hash 校验 + 依赖图分析（petgraph crate），比 JS 版本快 10-50x。

**#40 实例关联启动自动化（需要从 stub 实现）**

- **现状**：命令已注册但实现为 stub。

***

## 五、模组管理革命（12 个方向）

**#41 全局模组搜索引擎（保持）**

- **关键**：多个 HTTP API 并发请求 → `reqwest` + `futures::join!` 在 Rust 中实现更高效。但 CurseForge/Modrinth API 调用仍在运行。

**#42 模组批量安装队列（保持）**

**#43 版本组合推荐（保持，增强）**

- **Tauri 新能力**：关联度计算（「装了 AE2 的人 90% 也装了 X」）可以使用 Rust `nalgebra` 或简单统计实现，比 JS 快。

**#44 实时冲突检测沙箱（需要从概念推进到实现）**

- **现状**：V2.0 提出了「轻量 Java Agent → 类加载器监控」方案，但未实现。
- **Tauri 新能力**：Rust 可以启动一个轻量 JVM 进程（headless），加载模组 jar 列表，监控 `ClassLoader.loadClass` 调用，检测冲突。比 Electron 时代更可行（Rust 子进程管理更可靠）。
- **技术路径**：Rust 启动 headless Java 进程 → Java Agent 监控 → 冲突报告通过 stdout JSON 返回 → Rust 解析。
- **可量化目标**：不变（但仍需投入 2-3 个月）。

**#45 模组更新策略控制（保持）**

**#46 模组社区评价聚合（保持）**

**#47 性能影响评级（保持）**

**#48 配置迁移工具（保持）**

**#49 模组文件分析器（迁移到 Rust）**

- **现状**：`analyze_mod_jar` 命令已注册。Rust 的 `zip` crate 可以直接读取 jar 内 `mods.toml` / `fabric.mod.json` / `mcmod.info`，比 JS 版快。
- **Tauri 新能力**：可以用 Rust 字节码扫描检测 MixIn 配置、ASM 版本，这是 Electron 很难做到的。
- **技术路径**：zip crate 读取 jar → serde 解析元数据 → 可选字节码扫描 → 结构化返回。

**#50 模组分享链接（保持）**

**#51 多模组加载器共存（保持）**

**#52 模组元数据云端增强（保持，Rust SHA-256）**

- **Tauri 新能力**：Rust `sha2` crate 计算模组 jar 指纹比 JS `crypto.subtle` 快 3-5x。

***

## 六、整合包系统（8 个方向）

**#53 跨平台整合包一键安装（保持）**

**#54 整合包创建工坊（保持）**

**#55 整合包增量更新（迁移到 Rust）**

- **现状**：`modpackDiff.ts` 在前端。
- **Tauri 新能力**：Rust 实现版本 diff → 只返回差异模组列表 → `zip` crate 处理增量打包。

**#56 整合包 Fork（保持）**

**#57 整合包评分与发现（保持）**

**#58 整合包测试实验室（需要从概念推进）**

- **现状**：`test_modpack_compatibility` / `run_modpack_test` 命令已注册。
- **实现方案**：Rust 创建临时沙箱目录 → 下载整合包模组 → 尝试启动 headless 游戏实例 → 检测启动错误 → 报告兼容性。

**#59 整合包多人同步（保持）**

- **Tauri 新能力**：可以用 Rust `webrtc` crate 或简单的 HTTP 信令实现 P2P 同步，比 JS WebRTC 更可控。

**#60 整合包性能基准（保持）**

***

## 七、存档与世界管理（10 个方向）

> **Tauri 的绝对优势领域。** 存档操作涉及大量 NBT 解析、文件 I/O、图像渲染。Rust 在这些任务上比 JS 快 10-100x。

**#61 存档健康检查与修复（迁移到 Rust，已注册命令）**

- **现状**：`check_world_health` / `fix_world_health_issue` 等 8 个世界命令已注册。
- **Tauri 实现**：Rust NBT 解析（hematite_nbt 或 fastnbt crate）→ 区块数据校验 → 损坏检测 → 自动修复。
- **可量化目标**：500MB 存档健康检查 < 3 秒（JS 版需要 30 秒+）。

**#62 存档时间线回放（保持）**

**#63 存档世界地图生成（迁移到 Rust，关键性能提升）**

- **现状**：`render_world_map` 命令已注册。
- **批判**：V2.0 方案是「区块数据读取 → Canvas 逐块渲染」。在 Tauri 的 WebView 中，Canvas 渲染 500MB 存档的地图可能非常慢。
- **新方案**：Rust 侧解析区块数据 → Rust 图像库（image crate）渲染为 PNG → 前端只做图片展示和缩放交互。
- **技术路径**：fastnbt 解析区块 → image crate 逐块渲染 → PNG 压缩 → Base64 或临时文件路径返回前端 → Canvas 瓦片展示。
- **可量化目标**：中等存档（500MB）地图渲染 < 10 秒（Rust），对比 JS Canvas 版 > 60 秒。

**#64 存档统计面板（保持）**

- **Tauri 优化**：Rust `fastnbt` 解析 stats 目录 → 统计计算 → JSON 返回。

**#65 存档格式转换与迁移（保持）**

**#66 种子预览器（迁移到 Rust）**

- **Tauri 优势**：种子→生物群系→结构定位算法在 Rust 中实现比 JS 快得多。可以使用 `cubiomes` 的 Rust 移植或自实现生物群系映射。
- **技术路径**：Rust 实现 Java `WorldGen` 等价逻辑 → 生成近似地形 → image crate 渲染 → PNG 返回前端。

**#67 存档云端同步（保持）**

**#68 存档瘦身工具（需要迁移到 Rust）**

- **现状**：`analyze_world_slim` / `execute_world_slim` 命令已注册。
- **Tauri 优势**：Rust `fastnbt` 解析每个区块 → 计算访问热度 → 裁剪 → 直接在文件系统操作，比通过 JS → IPC → Rust 高效。

**#69 存档日记（保持）**

**#70 存档蓝图分享（保持）**

***

## 八、服务器管理与多人联机（10 个方向）

**#71 本地服务器一键创建（保持，已注册命令）**

**#72 LAN 世界发现与直连（需要实现）**

- **现状**：`scan_lan_worlds` 命令已注册。
- **Tauri 实现**：Rust `tokio::net::UdpSocket` 监听多播 → 解析 LAN 世界数据包 → 返回列表。

**#73 好友联机（虚拟局域网）**

- **现状**：命令已注册（`create_friend_lobby`, `join_friend_lobby` 等）。
- **Tauri 实现**：Rust `webrtc` 或 `tokio::net::UdpSocket` 实现 UDP 打洞 → 中继服务器 → 虚拟 LAN。
- **现实评估**：这是整个项目中技术难度最高的功能之一。先做中继服务器模式（类似 Radmin VPN），再做 P2P 打洞。

**#74-80 其他服务器方向（保持）**

***

## 九、资源与内容生态（8 个方向）

**#81-88（保持，大部分已注册命令）**

***

## 十、体验与视觉（12 个方向）

> **Tauri 带来的关键变化：** 多显示器、触摸手势、全局快捷键等需要完全重写实现方案。

**#89 动态主题引擎 ✅ 已实现**

- 12 个预设主题（8 暗 + 4 亮），包括新增的余烬红、极光青、末影金、暖阳橙、薰衣草白
- 自定义主题创建/导入/导出（JSON 格式）
- 自定义强调色选择器（颜色选择器 + 预设色板 + HEX 输入）
- 主题切换动画过渡（可配置启用/禁用 + 速度控制）
- ThemeEditor 组件：主题卡片预览、创建对话框、导入对话框
- 完整的 ThemeContext API：createCustomPreset/deleteCustomPreset/exportTheme/importTheme

**#90 动态背景系统 ✅ 已实现**

- 6 种背景变体：gradient / mesh / particles / aurora / waves / none
- 3 种强度级别：subtle / normal / strong
- 3 种性能模式：high / medium / low（自动检测 GPU 和 CPU 核心数）
- 性能降级：低端设备自动将 particles/aurora/waves 降级为 gradient
- Canvas 动画优化：低性能模式降低分辨率和粒子数
- 背景设置 UI：样式选择、强度控制、性能模式切换、实时预览

**#91 沉浸式版本画廊 ✅ 已实现**

- 版本详情面板（VersionDetailPanel）：右侧滑出式面板
- 版本更新日志展示（1.16-1.21 各版本更新内容）
- 详情按钮（Info 图标）在选中卡片上显示
- Esc 键关闭详情面板
- 版本类型识别（正式版/快照）
- 安装日期、状态、版本类型信息展示

**#92 启动动画设计系统 ✅ 已实现**

- 4 种动画风格：default（默认）/ minimal（极简）/ cinematic（电影级）/ retro（复古像素风）
- 庆祝粒子效果（CelebrationEffect）：60 个彩色粒子爆炸，支持旋转和重力
- 可配置参数：style（动画风格）、showCelebration（是否显示庆祝效果）
- 每种风格独立的进度条设计：默认进度条、极简脉冲点、电影级脉冲环、复古像素进度条

**#93 系统级全局快捷键 ✅ 已实现**

- 集成 tauri-plugin-global-shortcut（Tauri 2 官方插件）
- Rust 侧命令：register_global_shortcut / unregister_global_shortcut
- 快捷键解析器（parse_shortcut）：支持 Ctrl/Alt/Shift/Super + 字母/F键/特殊键
- 事件桥接：快捷键触发时通过 Tauri emit 发送事件到前端
- 权限配置：global-shortcut:allow-register / allow-unregister / allow-is-registered
- 快捷键配置 UI（在 AppearanceSettings 中展示快捷键列表）

**#94 触控板/触摸屏手势 ✅ 已实现**

- 增强的 useGestures Hook：支持惯性滚动（enableInertia + inertiaFriction）
- 触觉反馈（enableHaptic）：通过 navigator.vibrate API
- 速度阈值检测（swipeVelocityThreshold）
- 水平滚动惯性：滑动后自动减速
- 手势配置接口（GestureConfig）：可配置阈值、惯性摩擦系数、触觉反馈
- 双击检测（300ms 内连续两次点击）

**#95 音效反馈系统 ✅ 已实现**

- 4 种音效包：default（默认）/ soft（柔和）/ retro（复古）/ minecraft（MC 风格）
- 每种音效包独立的频率配置和波形类型
- 音效包切换 UI（在 AppearanceSettings 的音效设置中）
- 音量控制滑块（0-100%）
- 8 种音效类型预览按钮
- Web Audio API 合成：多频率叠加、渐入渐出、指数衰减

**#96 多显示器优化 ✅ 已实现**

- 增强的 useMultiMonitor Hook：DisplayInfo 接口（名称/分辨率/缩放/位置）
- Tauri API 集成：get_display_info / move_window_to_display / save_window_position / restore_window_position
- DPI 缩放检测（getDpiScale）
- 窗口位置记忆（localStorage 持久化）
- 显示设置 UI：窗口位置选择（居中/记住位置/鼠标位置）
- 自动降级：Tauri API 不可用时使用浏览器 API fallback

**#97 多语言与本地化 ✅ 已实现**

- 增强的 i18n 配置：LANGUAGE_OPTIONS 导出（含国旗 emoji）
- 语言检测顺序：localStorage -> navigator
- 扩展的翻译键：新增 appearance 命名空间（30+ 键）
- 语言切换 UI（在 AppearanceSettings 中）：4 种语言选择
- Rust 侧设置模型新增 language 字段
- 翻译文件更新：zh-CN.json 新增 appearance/versions 扩展键

**#98 无障碍增强 ✅ 已实现**

- 增强的 AccessibilityProvider：5 项设置 + announce 方法
- 键盘焦点自动检测：Tab 键启用焦点轮廓，鼠标点击禁用
- 系统 prefers-reduced-motion 自动检测
- ARIA live region 通知（announce 方法）：polite / assertive 优先级
- 无障碍设置 UI（在 AppearanceSettings 中）：高对比度/减少动画/大字体/屏幕阅读器优化
- 键盘导航说明面板
- data-* 属性自动应用到 DOM

**#99 数据看板 ✅ 已实现**

- 增强的 StatsDashboard：6 个统计卡片 + 性能监控 + 最近活动
- 启动器性能监控：CPU 使用率 + 内存使用率实时图表
- MiniChart 组件：Canvas 绘制的折线图 + 渐变填充
- 实时数据更新（每 2 秒刷新）
- CPU/内存历史记录（30 个数据点滑动窗口）
- 最近活动列表（版本/时长/日期）
- localStorage 持久化统计数据

**#100 小部件/Tray 面板 ✅ 已实现**

- 增强的 TrayWidget：浮动按钮 + 展开面板
- 快速启动版本列表（从 localStorage 读取）
- 游戏运行状态指示器（脉冲动画）
- 通知系统（TrayNotification）：未读计数徽章
- 实时时钟显示
- 统计/设置快捷按钮
- onLaunch / onOpenSettings / onNavigate 回调接口
- 弹簧动画展开/收起效果

***

## 十一、AI 智能辅助（8 个方向）

> **⚠️ 需要大幅调整技术方案。** V2.0 方案中部分依赖 Node.js 生态（Ollama 集成、向量数据库等）。Tauri 下 AI 功能的技术路径完全不同。

**#101 崩溃智能诊断助手（路径重写）**

- **V2.0 方案**：「本地 LLM（Ollama 集成）」
- **Tauri 现实**：Ollama 是独立进程，可以用 Rust `reqwest` 调用其 HTTP API。也可以在 Rust 侧集成轻量推理（如 `llama-cpp-rs` 或 `candle`），直接在启动器进程内运行小模型。
- **具体方案**（阶段性）：阶段 1 — 云端 API（OpenAI 兼容）+ 本地 Ollama 检测自动切换；阶段 2 — Rust 侧集成 ONNX 推理做日志分类（比 LLM 更快更省）。
- **技术路径**：reqwest 调用 Ollama HTTP API → 日志特征提取 → LLM 分析 / ONNX 分类。
- **可量化目标**：AI 诊断延迟 < 3 秒（云）/< 1 秒（本地 ONNX）。

**#102 智能整合包生成器（路径重写）**

- **具体方案**：云端 LLM API + 本地模组知识图谱（Rust `petgraph` 存储模组关系图）。

**#103 游戏助手（上下文搜索）（路径重写）**

- **Tauri 方案**：Minecraft Wiki 数据向量化可以用 Rust `usearch` 或 `instant-distance` crate 做本地向量搜索，无需依赖外部向量数据库。

**#104 模组本地化翻译助手（保持）**

**#105 性能调优顾问（保持，增强）**

- **Tauri 新能力**：`sysinfo` 获取真实硬件信息 → 结合游戏 F3 调试数据 → Rust 侧分析瓶颈算法 → 建议。

**#106 存档叙事生成（保持）**

**#107 建筑灵感生成器（保持）**

**#108 代码片段助手（保持）**

***

## 十二、开放平台与扩展（7 个方向）— 最受 Tauri 影响的模块

> **⚠️ 本模块需要最大程度的重构思考。** V2.0 设想的「Node.js 插件系统」「CLI」「Web API 本地服务」都需要完全重新设计。

**#109 插件系统（从 Node.js 改为 Rust/WASM）**

- **V2.0 方案**：「Plugin SDK（TypeScript）+ 安全沙箱（vm2/isolated-vm）+ 插件市场」。**在 Tauri 中完全不可行**（无 Node.js 运行时）。
- **新方案**：三种插件层次 —
  - **L1 前端插件**：纯 TypeScript，通过前端注册自定义页面/组件。最安全，能力最受限。
  - **L2 Rust 动态库插件**：编译为 `.so`/`.dylib`/`.dll`，启动器通过 `libloading` 动态加载。需要签名验证。能力最强，但分发复杂。
  - **L3 WASM 插件**：插件编译为 `.wasm`，通过 Rust `wasmtime` crate 在沙箱中执行。安全且跨平台，能力中等。
- **技术路径**：定义插件 manifest 格式 → L1 前端实现 → L3 WASM 运行时（wasmtime + WASI）→ L2 动态库后续迭代。
- **可量化目标**：1 年内 L1 插件系统可用；2 年内 L3 WASM 插件可用。

**#110 主题创作工具（保持）**

**#111 CLI 工具箱（从 Node.js CLI 改为 Rust CLI）**

- **V2.0 方案**：`bonjour-cli` — `bonjour launch <version>`。当时假设基于 Node.js。
- **新方案**：直接用 Rust 编写 CLI binary。同一个 workspace 下创建 `bonjour-cli` crate，复用核心库（services/models）。
- **技术路径**：Cargo workspace → `bonjour-cli` crate → `clap` 参数解析 → 复用 services → `bonjour launch fabric-1.20.1`
- **可量化目标**：CLI 独立 binary < 5MB；支持 launch/install/list/status 命令。

**#112 Web API 本地服务（简化为纯 Rust）**

- **V2.0 方案**：「Express/Fastify 内置 → REST API」
- **新方案**：Rust `axum` 或 `tiny_http` 内置 HTTP 服务器 → 启动器启动时可选开启 → 提供只读 REST API → API Key 认证。
- **技术路径**：axum（轻量）+ tokio → `localhost:{random_port}` → API Key → JSON API。
- **可量化目标**：Web API 服务占用 < 10MB 额外内存。

**#113 Stream Deck / 宏键盘集成（保持）**

**#114 开发者 SDK & 文档（新增）**

- **批判**：V2.0 说到插件/CLI/API，但没有提到 SDK 和文档。没有文档的 API = 不存在。
- **具体方案**：TypeScript SDK（前端插件开发）+ Rust SDK（WASM 插件开发）+ API 文档站 + 示例项目。
- **技术路径**：TypeDoc + rustdoc → 文档站 → 示例仓库。

**#115 社区翻译平台集成（新增）**

- **具体方案**：i18n + Crowdin/GitLocalize 集成 → CI/CD 自动拉取翻译 → 翻译覆盖率仪表盘。

***

## 十三、安全与隐私（5 个方向）— Tauri 优势领域

**#116 模组安全扫描（增强）**

- **Tauri 新能力**：Rust 字节码分析（使用 `classfile-parser` 或自实现）→ 检测危险 API 调用（`Runtime.exec`, `File.delete`, `Socket.connect`）→ 比 JS 做字节码分析可靠得多。
- **可量化目标**：已知恶意模组检出率 > 98%（比 V2.0 的 95% 提高，因为 Rust 分析更深入）。

**#117 隐私仪表盘（保持）**

**#118 家长控制（保持）**

**#119 文件完整性校验（增强）**

- **Tauri 优化**：所有下载文件 SHA-256 校验在 Rust 侧自动完成，前端无感知。

**#120 数据备份保险箱（保持，Rust AES-256）**

- **Tauri 实现**：Rust `aes-gcm` crate 加密备份，比 JS `crypto.subtle` 更可控。

***

## 十四、Tauri 迁移创造的新方向（16 个方向）

> **这些是 V2.0 完全没有的，只在 Tauri 迁移后才浮现的机会。**

**#121 启动器性能基准与竞品对比仪表盘**

- **新机会**：Tauri 的轻量优势（< 1 秒冷启、< 50MB 内存、< 5MB 安装包）→ 做一个「启动器性能对比」页面，实时展示 Bonjour vs PCL2/HMCL/PrismLauncher 的性能数据。
- **技术路径**：在 CI 中自动启动各竞品启动器 → 测量冷启动时间/内存/包大小 → 生成对比图表 → 内置到启动器 About 页面。
- **价值**：将「性能优势」可视化，变成营销资产。

**#122 沙箱化的模组测试环境**

- **新机会**：Rust 可以创建临时文件系统 overlay（bind mount / symlink farm）→ 在隔离环境中测试新模组 → 不影响现有实例 → 测试完成后一键合并或丢弃。
- **技术路径**：overlay 文件系统（Linux overlayfs, macOS clonefile, Windows hardlink）→ 模组测试 → 结果报告。

**#123 游戏内 Mod：启动器-游戏实时通信桥**

- **新机会**：编写一个轻量 Fabric/Forge Mod → 通过本地 WebSocket 与启动器的 Rust 后端通信 → 实现游戏内切换资源包/光影、查看启动器通知、AI 助手悬浮窗。
- **技术路径**：Rust `tokio-tungstenite` WebSocket 服务 → Mod 侧 WebSocket 客户端 → JSON 协议 → 双向通信。
- **价值**：从「外部工具」变成「游戏内伙伴」，这是所有竞品都没做到的。

**#124 Rust 原生 NBT 编辑器**

- **新机会**：所有竞品（包括 NBTExplorer）都是第三方工具。用 Rust 写一个内嵌 NBT 编辑器 → 解析 level.dat / player data → 可视化编辑 → 比 NBTExplorer 快 10x（Rust vs C#）。
- **技术路径**：fastnbt 解析 → egui（可嵌入）或前端 JSON 树编辑器 → 保存校验。

**#125 崩溃知识图谱社区**

- **新机会**：每个崩溃报告的诊断结果 → 匿名上传 → Rust `petgraph` 构建崩溃知识图谱（「模组 X + 模组 Y + 版本 Z → Exit Code 1」）→ 新用户崩溃时秒级匹配。
- **可量化目标**：社区崩溃知识图谱包含 10000+ 节点，匹配延迟 < 1 秒。

**#126 启动器自身性能剖析（已在 #6 覆盖，此处强调重要性）**

**#127 跨平台原生通知中心**

- **新机会**：Tauri 不限制通知方案。可以用 Rust `notify-rust` crate 发送系统原生通知（Windows Toast / macOS Notification Center / Linux D-Bus），比 Electron 的 HTML5 Notification 强大得多。
- **技术路径**：notify-rust → 游戏崩溃通知、模组更新通知、服务器状态通知 → 通知历史面板。
- **可量化目标**：通知到达率 > 99%（HTML5 Notification 在某些平台上有延迟）。

**#128 Rust 端多线程并行下载引擎**

- **新机会**：`reqwest` + `tokio::spawn` → 分片并行下载（类似 IDM）→ 单文件 8 线程下载 → 比 JS 单线程下载快 3-8x。
- **技术路径**：HTTP Range 请求 → `tokio::task::JoinSet` → 分片写入 → 合并校验。
- **可量化目标**：1GB 文件下载速度比竞品快 2x。

**#129 低端机器 Lite 模式**

- **新机会**：Tauri 的 WebView 可以在低端机器上运行但可能卡顿。提供一个「Lite 模式」— 禁用动画、减少 Canvas 渲染、降低刷新率 → 在 4GB RAM / Atom CPU 设备上也能流畅运行。
- **技术路径**：前端动态检测硬件 → Rust `sysinfo` 返回低端标记 → 前端降级渲染（纯文本列表代替 Cover Flow、静态背景代替动画）。
- **可量化目标**：Lite 模式在 4GB RAM 机器上内存 < 80MB，FPS > 30。

**#130 WASM 模组兼容性模拟器**

- **新机会**：Rust 可以嵌入 WASM 运行时 → 编写简化的 Minecraft 类加载器模拟器（WASM）→ 在不启动真实游戏的情况下检测模组间潜在的类加载冲突。
- **技术路径**：wasmtime → 简化 ClassLoader WASM 实现 → 批量模组 jar 虚拟加载 → 冲突检测 → 比 V2.0 的「Java Agent」方案更快更安全。
- **可量化目标**：虚拟冲突检测 < 5 秒（50 个模组），检出率 > 60%。

**#131 嵌入式市场/内容分发平台**

- **新机会**：在 Rust 侧运行一个轻量 Web 服务器，前端通过 iframe/WebView 展示自建模组/资源市场（不依赖 CurseForge/Modrinth UI），提供中文优先的浏览体验。
- **技术路径**：自建内容索引（爬虫 + 人工审核）→ Rust axum API → 前端展示。
- **可量化目标**：中文模组市场收录 500+ 模组（精选）。

**#132 JSON 配置的 GUI Schema 编辑器**

- **新机会**：很多模组的配置是 JSON → Rust serde 解析 JSON schema 推断 → 自动生成表单 GUI → 用户在启动器中可视化编辑模组配置。
- **技术路径**：JSON schema 推断 → 前端动态表单 → Rust 保存校验。

**#133 系统级游戏录屏（Rust + FFmpeg）**

- **新机会**：Rust 通过 `std::process::Command` 调用系统 FFmpeg → 录制游戏窗口 → 一键分享精彩时刻 → 这是 Electron 也能做的，但 Rust 进程管理更可靠。
- **可量化目标**：录制 30 秒 1080p 视频 < 15MB；CPU 额外开销 < 10%。

**#134 游戏启动参数 A/B 测试工具**

- **新机会**：想对比 Java 8 vs Java 21、4GB vs 8GB 内存、不同 GC 策略的性能？→ 启动器自动运行 A/B 测试（各启动 3 次取平均）→ 生成对比报告。
- **技术路径**：Rust 循环启动游戏 → 每轮记录启动时间/FPS/内存 → 统计 → 可视化对比。

**#135 离线包管理器**

- **新机会**：在联网电脑上「预取」模组/版本/Java → 导出为离线安装包（`bonjour-offline.zip`）→ 在完全离线的电脑上安装和游玩。
- **技术路径**：全量下载 + SHA-256 校验 → zip 打包 → 离线电脑上导入 → Rust 本地完整安装。

**#136 实例依赖健康检查**

- **新机会**：Rust 扫描每个实例 → 检测模组是否有已知 CVE 漏洞 → 检测模组是否已停止维护 → 检测是否有更好的替代模组 → 给出「实例健康报告」。
- **技术路径**：CVE 数据库本地缓存 → 模组版本匹配 → 维护状态爬取 → 替代推荐。

***

## 十五、V2.0 中需要废弃或大幅调整的方向（批判性分析）

| V2.0 编号 | 方向 | 评估 |
|-----------|------|------|
| #99 | Node.js 插件系统 | **废弃**。改为 L1 前端插件 + L3 WASM 插件（#109）。 |
| #102 | Web API（Express/Fastify） | **重写**。改为 Rust axum 轻量 HTTP API（#112）。 |
| #101 | CLI（bonjour-cli） | **重写**。改为 Rust CLI binary（#111）。 |
| #83 | 全局快捷键（Electron globalShortcut） | **重写**。改用 Rust `global-hotkey` crate（#93）。 |
| #86 | 多显示器优化（Electron screen API） | **重写**。改用 Tauri 原生 API（#96）。 |
| #5 | 后台静默更新（electron-updater） | **重写**。改用 tauri-plugin-updater（#15）。 |
| #76 | 数据包管理 | **保留但降低优先级**。 |
| #77 | 存档结构文件管理（Structures） | **保留但降低优先级**。 |
| #97-98 | 建筑灵感生成器 / 代码片段助手 | **保留但延后**。AI 功能需要在基础诊断 (#101) 验证后再扩展。 |

***

## 📊 竞争对标矩阵（Tauri 更新版）

| 维度 | Bonjour (Tauri) | PCL2 | HMCL | PrismLauncher |
|------|-----------------|------|------|---------------|
| 安装包大小 | **< 8MB** ✅ | ~80MB ❌ | ~50MB | ~100MB |
| 冷启动速度 | **< 1s** ✅ | 5-8s | 3-5s | 2-3s |
| 空闲内存 | **< 50MB** ✅ | ~150MB | ~400MB (JVM) | ~200MB |
| 首次体验引导 | **完整向导** ✅ | 无 | 无 | 无 |
| 视觉体验 | **专业设计** ✅ | 传统 | 简陋 | 功能导向 |
| AI 诊断 | **已规划** | 无 | 无 | 无 |
| 跨平台一致性 | **高** ✅ | Windows only | 中等 | 高 |
| 安全扫描 | **Rust 字节码** ✅ | 无 | 无 | 无 |
| 插件系统 | **(规划中)** | 无 | 有（Java） | 无 |

> **核心结论**：Tauri 迁移将 Bonjour 从「视觉和 AI 驱动」的差异化升级为「性能+视觉+AI」三维碾压。PCL2 在 Windows 上有用户惯性，但 Tauri 的性能优势（尤其是冷启动和内存）对低端机器用户有致命吸引力。

***

## 🚀 实施路径（Tauri 重校版）

### 阶段一：Tauri 债务清理 + 核心稳定性（1-2 个月）

```
P0（阻塞发布）：
  #1  命令 L2+ 覆盖率提升至 60%     →  补全 stub 命令
  #9  错误处理体系统一               →  Result<T, AppError>
  #15 静默更新配置                   →  tauri-plugin-updater
  #2  IPC 高频事件优化               →  Channel API
  #10 端到端测试框架搭建             →  CI 自动化

P1（第一个月）：
  #5  SQLite 数据层迁移（POC）       →  实例/模组列表查询
  #3  NBT 解析迁移到 Rust            →  存档健康检查加速
  #20 日志诊断引擎迁移到 Rust        →  正则预编译
```

### 阶段二：核心引擎 Rust 化（2-4 个月）

```
  #23 增量资源补全 → Rust            →  Hash + 下载
  #25 多版本并行启动                  →  从 stub 到实现
  #49 模组分析器 → Rust 字节码       →  安全 + 元数据
  #63 存档地图渲染 → Rust            →  10x 性能提升
  #66 种子预览器 → Rust              →  生物群系映射
  #68 存档瘦身 → Rust                →  区块裁剪
  #16 视觉效果降级设计                →  多层级性能模式
```

### 阶段三：AI + WASM 插件 + 社区（4-8 个月）

```
  #101 AI 崩溃诊断（ONNX 本地推理）   →  秒级诊断
  #103 游戏助手（Rust 向量搜索）      →  本地 RAG
  #109 插件系统（WASM 运行时）        →  L3 插件
  #123 游戏内 Mod 通信桥              →  WebSocket
  #125 崩溃知识图谱社区               →  众包诊断
  #130 WASM 模组兼容性模拟器          →  虚拟冲突检测
```

### 阶段四：平台化 + 高性能特性（6-12 个月）

```
  #111 Rust CLI                        →  独立 binary
  #112 Rust Web API 本地服务           →  axum HTTP
  #128 多线程并行下载引擎              →  IDM 级别
  #133 系统级游戏录屏                  →  FFmpeg 集成
  #134 A/B 测试工具                    →  启动参数对比
  #135 离线包管理器                    →  预取 + 离线安装
```

***

## 💰 商业模型（与 V2.0 基本一致，微调）

### 免费层
- 完整核心启动功能
- 基础模组搜索与安装
- 基础主题（3 款）
- 本地存档备份
- WASM 插件运行时

### Bonjour Plus（$3.99/月 或 $29.99/年）
- 云存档同步（10GB）
- AI 崩溃诊断（云端大模型）
- AI 整合包生成
- 所有主题与动画包
- 跨设备配置同步

### Bonjour Pro（$7.99/月 或 $59.99/年）
- Plus 全部 + 云存档 50GB
- AI 叙事生成
- SDK 开发者工具（Rust crates + WASM toolchain）
- 多人联机中继服务
- 游戏录屏云端存储

### ⚠️ Tauri 带来的商业风险新变化

- **WebView2 依赖**：Windows 7 不支持。如果用户群中有 Win7 用户，需要明确告知。这会影响用户基数。
- **tauri-plugin-updater**：签名密钥管理不当可能导致恶意更新。需要严格的安全流程。

***

## ⚠️ 风险矩阵（Tauri 更新版）

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| WebView2 兼容性导致 Windows 用户无法启动 | 低 | 极高 | 启动时检测 WebView2，缺失时引导安装（Evergreen Bootstrapper） |
| Tauri 2 API 不稳定（仍在快速迭代） | 中 | 高 | 锁定 Tauri 版本，定期回归测试 |
| 系统 WebView 性能低于 Chromium（Canvas 密集场景） | 中 | 中 | 计算密集型任务迁移 Rust；前端降级设计 |
| PCL2 社区惯性难以打破 | 高 | 中 | 迁移助手是破局关键 (#12)；性能对比可视化 (#121) |
| 插件生态从零开始 | 高 | 中 | L1 前端插件先上线降低门槛；L3 WASM 后续迭代 |
| Rust 开发人才稀缺 | 低 | 中 | 核心团队保证；开源社区贡献 |
| Linux WebKitGTK 兼容性碎片化 | 低 | 低 | 有限支持（Ubuntu 22.04+ LTS） |

***

## 🎯 KPI（Tauri 重校版）

### 安装包与性能（Tauri 的结构性优势）

| 指标 | 目标 | 当前 |
|------|------|------|
| macOS 安装包 | < 8MB | ~5MB |
| Windows 安装包 | < 10MB | ~6MB |
| Linux AppImage | < 12MB | ~8MB |
| 冷启动（首次） | < 1.5s | ~0.8s |
| 热启动 | < 0.5s | ~0.3s |
| 空闲内存（macOS） | < 50MB | ~40MB |
| 空闲内存（Windows） | < 80MB | ~60MB |
| 增量更新包 | < 2MB | 待配置 |

### 用户增长

| 时间节点 | MAU | 增长策略 |
|----------|-----|----------|
| 3 个月 | 500-1,000 | 内测用户 + 核心社区 |
| 6 个月 | 2,000-5,000 | 公测 + B站 KOL |
| 12 个月 | 10,000-20,000 | 正式版 + 跨平台 |
| 3 年 | 50,000-100,000 | 生态闭环 |

> **下调原因**：Tauri 的 WebView2 依赖会过滤掉 1-2% 的 Windows 用户（Win7/Win8 无 WebView2 且无法安装）。

### 工程健康度

| 指标 | 目标 |
|------|------|
| 命令 L2+ 覆盖率 | 80%（当前 ~40%） |
| 核心流程测试覆盖率 | 90%（当前 0%） |
| 错误处理 `AppError` 覆盖率 | 100%（当前 0%） |
| CI 构建时间 | < 5 分钟 |
| Rust 侧 unsafe 代码占比 | < 1% |

***

## 📝 总结：Tauri 迁移后的核心叙事

V2.0 的核心命题是：**「凭什么比 PCL2/HMCL 好？」**。答案是视觉 + AI + 零门槛。

V3.0 的核心命题升级为：**「Tauri 的底层优势给了我们什么竞品永远做不到的？」**

1. **性能碾压** — < 1 秒冷启动、< 50MB 内存、< 8MB 安装包 → 所有竞品的 5-10x
2. **Rust 的计算纵深** — NBT 解析、文件 Hash、存档渲染、字节码安全扫描 → 比 JS/Java/C# 快 10-100x
3. **系统级安全** — 原生沙箱、字节码分析、硬件级信息采集 → Electron 永远做不到
4. **WASM 插件生态** — 安全、跨平台、高性能的插件运行时 → Java 插件做不到的隔离性
5. **视觉与体验** — React + Tailwind + 专业设计系统的内核不变，但 Tauri 的原生控件（托盘、菜单、通知）让体验更「原生」

***

**文档版本**：3.0（Tauri 批判性重估版）
**基于**：V2.0（Electron 版 108 个方向）+ Tauri 2 迁移完成状态分析
**重写日期**：2026-05-09
**重写说明**：V2.0 在 Electron 假设下撰写。V3.0 在确认 Tauri 2 迁移基本完成后，对 108 个方向逐一批判性重估：识别 52 个保持有效、24 个需要重新设计、8 个失去可行性、新增 16 个 Tauri 专属方向。
**下次审阅**：2026-08-09（阶段一完成后重新评估实施进度）

***

> *「Electron 给了我们起点，Tauri 给了我们护城河。」*