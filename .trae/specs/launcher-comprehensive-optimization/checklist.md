# Checklist

## 模块七：安全漏洞修复
- [x] `open_url` 仅允许 http/https 协议，Windows 上特殊字符已转义
- [x] `import_instance`/`clean_instance_storage`/`download_file` 路径验证在游戏目录内
- [ ] `accounts.json` 明文存储已移除，改用 SQLite + AES-256-GCM 加密
- [ ] LittleSkin 密码使用 Argon2 哈希，`server_url` 已验证
- [ ] `fs:allow-read/write` scope 限制到游戏目录
- [ ] `shell:allow-open` 添加 URL 白名单
- [x] `open_external` 仅允许 http/https
- [ ] CSP `connect-src` 限制为已知域名白名单
- [ ] Release 构建 devtools 已禁用

## 模块一：窗口视觉与圆角修复
- [ ] `WindowConfig` 包含 `transparent: bool` 字段，默认 `true`
- [ ] `create_window` 在 `config.transparent` 为 true 时调用 `.transparent(true)`
- [ ] overlay 窗口创建添加 `.transparent(true)`
- [ ] 所有子窗口 HTML（5个）的 `html` 和 `body` 均有 `clip-path: inset(0 round 12px)` + `background: transparent`
- [ ] `open_crash_report_window` 显式设置 `decorations: false`

## 模块二：窗口控制按钮完善
- [ ] `default.json` 包含 minimize/maximize/unmaximize/is-maximized 权限
- [ ] `WindowControls.tsx` 包含关闭(红)/最小化(黄)/最大化(绿)三按钮
- [ ] 按钮 hover 显示对应图标（× / − / □⧉）
- [ ] 可点击区域 ≥ 44×44pt，视觉圆点 16×16px
- [ ] `position: fixed` + `z-index: 99999`
- [ ] 拖拽区域 `data-tauri-drag-region`，按钮区域 no-drag，无冲突
- [ ] 游戏运行中关闭窗口有确认对话框

## 模块三：启动引擎 UI 重构
- [ ] `isLaunching`/`launchLogs`/`launchVersionName` 在 `useLaunchStore` 中
- [ ] LaunchEngine 的阶段状态机已接入前端
- [ ] 启动失败 isLaunching 被正确重置，60 秒超时保护已添加
- [ ] 关闭 LaunchOverlay 不改变 isLaunching，可重新打开
- [ ] 启动成功有 Toast，失败有错误横幅 + 重试按钮
- [ ] LaunchOverlay 头部显示已用时间
- [ ] `launchPhases.ts` 已创建，classifyLogToPhase/diagnoseLog/PHASE_META 已迁移
- [ ] 日志最多 500 条，超出丢弃最旧
- [ ] LaunchAnimation 检测 `prefers-reduced-motion` 并禁用复杂动画
- [ ] PopOut 使用真实 sessionId

## 模块四：性能优化
- [ ] 10 个页面组件均使用 `React.memo` 包裹
- [ ] App.tsx 仅保留 UI 状态（currentPage, showSplash）
- [ ] launchLogs 使用 `useRef` 存储，100ms 批量更新
- [ ] filter blur 已替换为 opacity + scale
- [ ] mousemove 使用 `requestAnimationFrame` 节流
- [ ] `@tanstack/react-virtual` 已安装
- [ ] VersionsPage 和 ModsPage 本地列表使用虚拟滚动
- [ ] 所有 setInterval/setTimeout 在 cleanup 中清理，ID 用 useRef 存储
- [ ] `loadInitialData` 使用 `Promise.all` 并行加载
- [ ] `.glass-strong` blur 从 40px 降至 20px，低端设备禁用 backdrop-filter
- [ ] 通配符 `*` transition 已移除

## 模块六：Java 下载功能修复
- [ ] `download_java_version_impl` 已重构为统一函数
- [ ] SettingsPage 所有下载按钮使用 `downloadJavaWithProgress`
- [ ] 下载互斥锁（Tauri managed state）已添加
- [ ] Adoptium Java 21+ ARM64 支持，BMCLAPI x64 回退
- [ ] 版本映射：`minor >= 17` → Java 8, 1.17 → Java 16
- [ ] 下载后 `java -version` 验证
- [ ] `remove_dir_all` 错误不再静默忽略
- [ ] 下载后 SettingsWindow 自动刷新版本列表
- [ ] 应用启动时清理残留临时文件

## 模块五：设计系统统一
- [ ] `--bg-tertiary`、`--overlay-backdrop`、`--font-size-*`、`--font-weight-*` 变量已添加
- [ ] `.btn-primary`/`.btn-secondary`/`.btn-ghost` 组件类已定义并替换所有 inline style 按钮
- [ ] `.input-field` 组件类已定义并替换所有 inline style 输入框
- [ ] ResourcePage 13 处 `color: '#000'` 已替换为 CSS 变量
- [ ] ModsPage/ServersPage 状态颜色使用 CSS 变量
- [ ] 启动阶段颜色使用 CSS 变量
- [ ] 遮罩层背景使用 `var(--overlay-backdrop)`
- [ ] 圆角规范：卡片 `rounded-2xl`、按钮 `rounded-xl`、输入框 `rounded-xl`、小元素 `rounded-lg`
- [ ] 启动阶段 Emoji 已替换为 Lucide 图标
- [ ] LaunchOverlay 和 LaunchLogWindow 视觉风格统一
- [ ] App.css Vite 模板残留（.logo/.card/.read-the-docs）已移除
- [ ] tailwind.config.js 添加自定义 borderRadius

## 模块八：功能完整性修复
- [ ] SetupWizard Microsoft/LittleSkin 模式触发实际登录
- [ ] `handleLaunch` 根据 `settings.skipPreCheck` 决定 PreCheck 显示
- [ ] 地图预览传入实际 `worldPath`
- [ ] 版本安装进度事件通过 Tauri emit 发送
- [ ] 模组搜索 300ms debounce
- [ ] VersionStore 无 silent fail，有错误通知
- [ ] Microsoft 登录轮询 30 次上限，5 分钟总超时
- [ ] 离线用户名 3-16 字符，字母数字下划线
- [ ] 内存设置 512MB 最小，80% 系统内存最大
- [ ] VersionsPage/ServersPage/WorldsPage/ModpacksPage 有统一 EmptyState

## 构建与质量验证
- [ ] `npm run lint` 零错误
- [ ] `npm run typecheck` 零错误
- [ ] `cargo build` 零错误
