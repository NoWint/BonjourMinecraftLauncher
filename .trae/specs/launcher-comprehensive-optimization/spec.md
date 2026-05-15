# Bonjour Minecraft Launcher 全面优化 Spec

## Why
Bonjour Minecraft Launcher 存在 8 类影响用户体验和安全的严重缺陷：窗口圆角在 Windows/Linux 上缺失、窗口控制按钮不完整、启动引擎进度虚假/状态卡死、渲染性能不足导致操作卡顿、设计系统不统一导致硬编码颜色泛滥、Java 下载在 Windows 上不可靠、多个高危安全漏洞（命令注入/路径遍历/明文存储）、以及若干核心功能交互缺失。需要一次性系统性地解决所有问题。

## What Changes
- 窗口圆角修复：6 个窗口类型在 Windows/Linux 上添加 12px 圆角
- 窗口控制按钮：从单一关闭按钮扩展为完整的最小化/最大化/关闭三按钮
- 启动引擎 UI 重构：状态迁移到 Zustand，接入真实 LaunchEngine，修复卡死/无反馈问题
- 性能优化：React.memo 包裹页面、虚拟化大列表、消除定时器泄漏、IPC 并行化、backdrop-filter 降级
- 设计系统统一：补充 CSS 变量、统一按钮/输入框组件类、消除硬编码颜色
- Java 下载修复：统一下载函数、添加互斥锁、修复 ARM64 和版本映射、添加验证
- 安全漏洞修复：命令注入防护、路径遍历防护、账户加密、权限收窄、CSP 收紧、生产禁用 devtools
- 功能完整性修复：SetupWizard 登录流程、PreCheck 激活、空状态引导、校验规则等

## Impact
- Affected specs: 全部 8 个模块（安全、窗口、启动引擎、性能、设计系统、Java 下载、功能完整性）
- Affected code: `src-tauri/src/services/` (window_manager, overlay_manager)、所有 HTML 入口文件、`src/components/` (35 个组件)、`src/stores/` (5 个 store)、`src/core/launch/`、`src/index.css`、`src/App.css`、`tailwind.config.js`、`src-tauri/capabilities/default.json`、Cargo.toml、package.json

---

## ADDED Requirements

### 模块一：窗口视觉与圆角修复

#### Requirement: WindowConfig Transparent Support
WindowConfig 结构体 SHALL 包含 `transparent: bool` 字段，默认值为 `true`。

##### Scenario: Transparent window creation
- **WHEN** `create_window` 被调用且 `config.transparent` 为 `true`
- **THEN** 创建的窗口调用 `.transparent(true)`
- **THEN** 所有子窗口的 `decorations` 为 `false`，`transparent` 为 `true`

##### Scenario: Crash report window decorations fix
- **WHEN** `open_crash_report_window` 被调用
- **THEN** 显式设置 `decorations: false`，不使用 `..Default::default()` 导致的 `decorations: true`

#### Requirement: Sub-Window Corner Radius via clip-path
所有子窗口 HTML 的 `html` 和 `body` 标签 SHALL 应用 `clip-path: inset(0 round 12px)` 和 `background: transparent`。

##### Scenario: Rounded corners on Windows/Linux
- **WHEN** 任何子窗口（launch-log-window, settings-window, mods-browser-window, map-preview-window, overlay）在 Windows/Linux 上打开
- **THEN** 窗口显示 12px 圆角，零方角

### 模块二：窗口控制按钮完善

#### Requirement: WindowControls Component
系统 SHALL 提供 `WindowControls.tsx` 组件，包含最小化、最大化、关闭三个按钮。

##### Scenario: macOS traffic light style
- **WHEN** 用户悬停在关闭按钮（红色 #ff5f57）上
- **THEN** 显示 × 图标
- **WHEN** 用户悬停在最小化按钮（黄色 #febc2e）上
- **THEN** 显示 − 图标
- **WHEN** 用户悬停在最大化按钮（绿色 #28c840）上
- **THEN** 显示 □/⧉ 图标

##### Scenario: Button touch targets
- **WHEN** 渲染窗口控制按钮
- **THEN** 可点击区域 ≥ 44×44pt，视觉圆点保持 16×16px
- **THEN** 按钮使用 `position: fixed` + `z-index: 99999`

#### Requirement: Window Close Confirmation
当游戏运行中时关闭窗口 SHALL 弹出确认对话框。

#### Requirement: Tauri Window Permissions
`default.json` SHALL 包含 `core:window:allow-minimize`、`core:window:allow-maximize`、`core:window:allow-unmaximize`、`core:window:allow-is-maximized` 权限。

### 模块三：启动引擎 UI 重构

#### Requirement: Centralized Launch State
`isLaunching`、`launchLogs`、`launchVersionName` SHALL 从 App.tsx 迁移到 `useLaunchStore`（Zustand）。

##### Scenario: Single source of truth
- **WHEN** 启动过程中日志产生
- **THEN** 仅 `useLaunchStore` 持有状态，App.tsx 从中消费

#### Requirement: LaunchEngine Integration
前端 SHALL 接入 `LaunchEngine` 类的阶段状态机，替代 `classifyLogToPhase` 的日志推断方式。

#### Requirement: Launch Failure Recovery
启动失败时 `isLaunching` SHALL 被正确重置；添加 60 秒超时保护自动重置。

#### Requirement: LaunchOverlay Reopenable
关闭 LaunchOverlay 只隐藏界面，不改变 `isLaunching` 状态；提供重新打开入口。

#### Requirement: Launch Feedback
游戏进程启动成功时 SHALL 显示 "游戏已启动" Toast；失败时显示错误横幅 + 重试按钮。

#### Requirement: Launch Elapsed Time
LaunchOverlay 头部 SHALL 显示已用时间。

#### Requirement: Shared Launch Phases Module
`classifyLogToPhase`、`diagnoseLog`、`PHASE_META` SHALL 抽取到 `src/core/launch/launchPhases.ts`。

#### Requirement: Log Buffer Limit
日志数组 SHALL 最多保留 500 条，超出时丢弃最旧的。

#### Requirement: Reduced Motion Adaptation
LaunchAnimation SHALL 检测 `prefers-reduced-motion: reduce`，禁用复杂动画。

### 模块四：性能优化 — 渲染与动画

#### Requirement: Page Component Memoization
HomePage、VersionsPage、ModsPage、ServersPage、WorldsPage、ResourcePage、AccountsPage、SettingsPage、ModpacksPage、StatsDashboard SHALL 使用 `React.memo` 包裹。

#### Requirement: App.tsx State Decoupling
App.tsx SHALL 将 `accounts`/`settings`/`versions`/`installedVersions`/`gameSessions` 迁移到对应 Zustand store，仅保留 UI 状态。

#### Requirement: LaunchLogs Performance
日志 SHALL 使用 `useRef` 存储，仅在 LaunchOverlay 可见时同步到 state，每 100ms 批量更新。

#### Requirement: Animation Filter Removal
`filter: 'blur(12px) brightness(0.3)'` SHALL 替换为 `opacity` + `scale` 组合。

#### Requirement: Mousemove Throttling
mousemove 事件 SHALL 使用 `requestAnimationFrame` 节流。

#### Requirement: Virtual Scrolling
VersionsPage 和 ModsPage 本地模组列表 SHALL 使用 `@tanstack/react-virtual` 虚拟滚动。

#### Requirement: Timer Leak Fixes
所有 `setInterval`/`setTimeout` SHALL 在 `useEffect` cleanup 中清理，ID 使用 `useRef` 存储。

#### Requirement: IPC Parallelization
`loadInitialData` SHALL 使用 `Promise.all` 并行加载 settings/accounts/versions/installedVersions。

#### Requirement: Backdrop-Filter Degradation
`.glass-strong` 的 `blur(40px)` 降至 `blur(20px)`；低端设备禁用 backdrop-filter。

#### Requirement: Theme Transition Optimization
移除通配符 `*` transition，改用 `requestAnimationFrame` 分批应用。

### 模块五：设计系统统一

#### Requirement: CSS Variable Completion
`index.css` SHALL 补充 `--bg-tertiary`、`--overlay-backdrop`、`--font-size-*`、`--font-weight-*` 变量。

#### Requirement: Unified Button System
系统 SHALL 定义 `.btn-primary`、`.btn-secondary`、`.btn-ghost` 组件类，替换所有 inline style 按钮。

#### Requirement: Unified Input System
系统 SHALL 定义 `.input-field` 组件类，统一背景、边框、圆角、focus 样式。

#### Requirement: Hardcoded Color Elimination
所有硬编码 hex/rgba 颜色 SHALL 替换为 CSS 变量引用。

#### Requirement: Border Radius Standard
圆角规范：卡片 `rounded-2xl`、按钮 `rounded-xl`、输入框 `rounded-xl`、小元素 `rounded-lg`。

#### Requirement: Emoji to Lucide Migration
启动阶段的 Emoji 图标 SHALL 替换为 Lucide React 组件。

#### Requirement: App.css Cleanup
App.css SHALL 移除 Vite 模板残留样式（.logo, .card, .read-the-docs）。

#### Requirement: Tailwind Config Extension
`tailwind.config.js` SHALL 添加自定义 `borderRadius` 配置对齐 CSS 变量。

### 模块六：Java 下载功能修复

#### Requirement: Unified Download Function
`download_java_version_impl` SHALL 重构为调用 `download_java_with_progress` 的内部逻辑。

#### Requirement: SettingsPage Progress Download
SettingsPage 所有 Java 下载按钮 SHALL 使用 `downloadJavaWithProgress`。

#### Requirement: Download Mutex
系统 SHALL 使用 Tauri managed state (`Mutex`) 防止 Java 并发下载。

#### Requirement: Windows ARM64 Support
Adoptium 源 Java 21+ SHALL 使用 `aarch64` 架构参数；BMCLAPI 保持 `x64` 回退。

#### Requirement: Version Mapping Fix
`minor >= 17` SHALL 对应 Java 8；1.17 对应 Java 16。

#### Requirement: Post-Download Validation
解压后 SHALL 运行 `java -version` 确认安装有效。

#### Requirement: Windows remove_dir_all Error Handling
不再静默忽略错误，失败时 SHALL 向用户报告。

#### Requirement: Post-Download Version Refresh
SettingsWindow 下载后 SHALL 调用 `getAllJavaVersions()` 更新 UI。

#### Requirement: Temp File Cleanup
应用启动时 SHALL 检查并清理残留的临时文件。

### 模块七：安全漏洞修复

#### Requirement: open_url Command Injection Fix
Windows 上对 URL SHALL 进行严格验证，仅允许 http/https 协议，转义特殊字符。

#### Requirement: Path Traversal Fix
`import_instance`、`clean_instance_storage`、`download_file` SHALL 验证路径在游戏目录内。

#### Requirement: Account Encryption
SHALL 移除 `accounts.json` 明文存储，使用 SQLite + AES-256-GCM 加密。

#### Requirement: LittleSkin Password Hashing
SHALL 使用 Argon2 进行密码哈希；验证 `server_url` 合法性。

#### Requirement: Tauri Permission Scoping
`fs:allow-read/write` SHALL 添加 scope 限制；`shell:allow-open` 添加 URL 白名单。

#### Requirement: open_external Protocol Validation
SHALL 仅允许 http/https 协议。

#### Requirement: CSP Tightening
`connect-src` SHALL 限制为已知域名白名单。

#### Requirement: Production Devtools Disable
Release 构建 SHALL 通过 feature flag 禁用 devtools。

### 模块八：功能完整性修复

#### Requirement: SetupWizard Login Flow
Microsoft/LittleSkin 模式下 SHALL 触发实际登录流程。

#### Requirement: PreCheck Panel Activation
`handleLaunch` SHALL 根据 `settings.skipPreCheck` 决定是否显示 PreCheck。

#### Requirement: Map Preview Path Fix
SHALL 传入实际的 `worldPath` 参数。

#### Requirement: Version Install Progress
SHALL 使用 Tauri emit 发送安装进度事件。

#### Requirement: Mod Search Debounce
SHALL 使用 300ms debounce。

#### Requirement: VersionStore Error Handling
SHALL 移除 silent fail，添加错误状态和用户通知。

#### Requirement: Microsoft Login Timeout
SHALL 添加最大轮询 30 次和总超时 5 分钟。

#### Requirement: Offline Username Validation
SHALL 校验 3-16 字符，仅允许字母数字下划线。

#### Requirement: Memory Setting Validation
SHALL 最小 512MB，最大系统内存的 80%。

#### Requirement: Empty State Guidance
VersionsPage、ServersPage、WorldsPage、ModpacksPage SHALL 使用统一 `EmptyState` 组件。
