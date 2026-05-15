# Tasks

## 执行顺序：7(安全) → 1(圆角) → 2(窗口控制) → 3(启动引擎) → 4(性能) → 6(Java下载) → 5(设计系统) → 8(功能完整性)

---

### Phase 1: 模块七 — 安全漏洞修复

- [x] Task 7.1: Fix `open_url` command injection
  - Validate URL protocol (http/https only) using `url::Url::parse()`
  - Escape special characters on Windows
  - Update `src-tauri/src/services/` Rust command handlers

- [x] Task 7.2: Fix path traversal in `import_instance`, `clean_instance_storage`, `download_file`
  - Validate paths are within game directory using `canonicalize()` + prefix matching
  - Update Rust backend commands

- [ ] Task 7.3: Encrypt accounts storage
  - Migrate `accounts.json` plaintext to SQLite + AES-256-GCM encryption
  - Update account read/write logic in Rust backend
  - Update TypeScript account store to use new encrypted backend

- [ ] Task 7.4: Improve LittleSkin password handling
  - Hash passwords with Argon2 in backend
  - Validate `server_url` is legitimate LittleSkin server
  - Add `argon2` crate to Cargo.toml

- [ ] Task 7.5: Tighten Tauri permissions scope
  - Add scope restrictions to `fs:allow-read/write` (game directory only)
  - Add URL whitelist to `shell:allow-open`
  - Update `src-tauri/capabilities/default.json`

- [x] Task 7.6: Fix `open_external` protocol validation
  - Allow http/https only
  - Update frontend and backend open URL logic

- [ ] Task 7.7: Tighten CSP
  - Restrict `connect-src` to known domain whitelist
  - Update Tauri configuration

- [ ] Task 7.8: Disable devtools in production
  - Add feature flag for devtools
  - Conditional compilation for release builds

### Phase 2: 模块一 — 窗口视觉与圆角修复

- [ ] Task 1.1: Add `transparent: bool` to `WindowConfig` with default `true`
  - Update `src-tauri/src/services/window_manager.rs`: add field to struct, apply `.transparent(true)` in `create_window`

- [ ] Task 1.2: Add `.transparent(true)` to overlay window creation
  - Update `src-tauri/src/services/overlay_manager.rs`

- [ ] Task 1.3: Fix `open_crash_report_window` decorations
  - Explicitly set `decorations: false` instead of `..Default::default()`

- [ ] Task 1.4: Add `clip-path: inset(0 round 12px)` to all sub-window HTML files
  - `launch-log-window.html`, `settings-window.html`, `mods-browser-window.html`, `map-preview-window.html`, `overlay.html`
  - Apply to both `html` and `body` tags, add `background: transparent`

### Phase 3: 模块二 — 窗口控制按钮完善

- [ ] Task 2.1: Add Tauri window permissions to `default.json`
  - `core:window:allow-minimize`, `core:window:allow-maximize`, `core:window:allow-unmaximize`, `core:window:allow-is-maximized`

- [ ] Task 2.2: Create `WindowControls.tsx` component
  - Extend from `WindowCloseButton.tsx` with minimize/maximize/close buttons
  - macOS traffic light style: red #ff5f57 close, yellow #febc2e minimize, green #28c840 maximize
  - 44×44pt touch targets, 16×16px visual dots
  - `position: fixed` + `z-index: 99999`

- [ ] Task 2.3: Integrate WindowControls into main window layout
  - Remove redundant `-webkit-app-region: drag`, use `data-tauri-drag-region`
  - Ensure no drag/click conflicts

- [ ] Task 2.4: Add window close confirmation dialog
  - Show confirmation when game is running
  - Use `useGameSessionStore` to detect running state

### Phase 4: 模块三 — 启动引擎 UI 重构

- [ ] Task 3.1: Extract shared launch phases module
  - Create `src/core/launch/launchPhases.ts` with `classifyLogToPhase`, `diagnoseLog`, `PHASE_META`

- [ ] Task 3.2: Migrate launch state to `useLaunchStore`
  - Move `isLaunching`/`launchLogs`/`launchVersionName` from App.tsx to `useLaunchStore`
  - Use `subscribeWithSelector` for granular subscriptions

- [ ] Task 3.3: Integrate LaunchEngine into frontend
  - Replace `classifyLogToPhase` timer-based simulation with LaunchEngine phase state machine
  - Add log throttling: 100ms batch updates max

- [ ] Task 3.4: Fix `isLaunching` stuck state
  - Reset `isLaunching` on launch failure
  - Add 60-second timeout protection with auto-reset

- [ ] Task 3.5: Fix LaunchOverlay close/reopen logic
  - Close only hides UI, does not change `isLaunching`
  - Add reopen entry (status indicator in BottomNav)

- [ ] Task 3.6: Add launch success/failure feedback
  - Success: Toast "游戏已启动"
  - Failure: error banner + retry button

- [ ] Task 3.7: Add launch elapsed time display
  - Show elapsed time in LaunchOverlay header

- [ ] Task 3.8: Add log buffer limit (500 max)
  - Discard oldest logs when exceeding limit

- [ ] Task 3.9: Add prefers-reduced-motion to LaunchAnimation
  - Use `window.matchMedia('(prefers-reduced-motion: reduce)')`
  - Disable complex animations when preferred

- [ ] Task 3.10: Fix PopOut fake sessionId
  - Use real launch session ID

### Phase 5: 模块四 — 性能优化

- [ ] Task 4.1: Wrap all page components with `React.memo`
  - HomePage, VersionsPage, ModsPage, ServersPage, WorldsPage, ResourcePage, AccountsPage, SettingsPage, ModpacksPage, StatsDashboard

- [ ] Task 4.2: Decouple App.tsx state
  - Migrate `accounts`/`settings`/`versions`/`installedVersions`/`gameSessions` to stores
  - App.tsx keeps only UI state (currentPage, showSplash)

- [ ] Task 4.3: Optimize launchLogs rendering
  - Use `useRef` for log array, sync to state only when LaunchOverlay visible
  - Add 100ms batch update

- [ ] Task 4.4: Remove animation filters
  - Replace `filter: 'blur(12px) brightness(0.3)'` with `opacity` + `scale`
  - Use `will-change: transform, opacity` where needed

- [ ] Task 4.5: Throttle mousemove with `requestAnimationFrame`

- [ ] Task 4.6: Install and configure `@tanstack/react-virtual`
  - Virtual scroll for VersionsPage version list
  - Virtual scroll for ModsPage local mods list

- [ ] Task 4.7: Fix all timer leaks
  - All `setInterval`/`setTimeout` in `useEffect` cleanup
  - Use `useRef` for timer IDs
  - Fix HomePage phaseInterval and setTimeout

- [ ] Task 4.8: Parallelize `loadInitialData` with `Promise.all`

- [ ] Task 4.9: Degrade backdrop-filter
  - `.glass-strong` blur from 40px to 20px
  - Disable on low-end devices via `detectPerformanceTier`

- [ ] Task 4.10: Optimize theme switching
  - Remove wildcard `*` transition
  - Use `requestAnimationFrame` for batched application

### Phase 6: 模块六 — Java 下载功能修复

- [ ] Task 6.1: Unify download functions
  - Refactor `download_java_version_impl` to use `download_java_with_progress` logic

- [ ] Task 6.2: Update SettingsPage to use progress downloads
  - All Java download buttons use `downloadJavaWithProgress`

- [ ] Task 6.3: Add download mutex via Tauri managed state
  - Use `app.manage(Mutex::new(...))`

- [ ] Task 6.4: Fix Windows ARM64 support
  - Adoptium: Java 21+ use `aarch64`
  - BMCLAPI: keep `x64` fallback

- [ ] Task 6.5: Fix version mapping
  - `minor >= 17` → Java 8, 1.17 → Java 16

- [ ] Task 6.6: Add post-download validation
  - Run `java -version` after extraction

- [ ] Task 6.7: Fix `remove_dir_all` error handling on Windows
  - Report errors to user, no silent ignore

- [ ] Task 6.8: Refresh versions after SettingsWindow download
  - Call `getAllJavaVersions()` to update UI

- [ ] Task 6.9: Add temp file cleanup on app startup

### Phase 7: 模块五 — 设计系统统一

- [ ] Task 5.1: Add missing CSS variables to `index.css`
  - `--bg-tertiary`, `--overlay-backdrop`, `--font-size-xs/sm/md/lg/xl`, `--font-weight-normal/medium/bold`

- [ ] Task 5.2: Create unified button classes
  - `.btn-primary`, `.btn-secondary`, `.btn-ghost` in `@layer components`
  - Replace all inline style buttons across all components

- [ ] Task 5.3: Create unified input class
  - `.input-field` in `@layer components`
  - Replace all inline style inputs across all components

- [ ] Task 5.4: Eliminate hardcoded colors
  - ResourcePage: 13 `color: '#000'` → `var(--accent-text)`
  - ModsPage/ServersPage status colors → CSS variables
  - Launch phase colors → CSS variables
  - Overlay backgrounds → `var(--overlay-backdrop)`

- [ ] Task 5.5: Standardize border radius
  - Cards `rounded-2xl`, buttons `rounded-xl`, inputs `rounded-xl`, small elements `rounded-lg`

- [ ] Task 5.6: Replace Emoji with Lucide icons
  - Launch phase Emoji → Lucide React components

- [ ] Task 5.7: Unify LaunchOverlay and LaunchLogWindow visual style
  - Use same CSS variables and component classes

- [ ] Task 5.8: Clean up App.css
  - Remove Vite template residue: `.logo`, `.card`, `.read-the-docs`

- [ ] Task 5.9: Extend tailwind.config.js
  - Add custom `borderRadius` aligned with CSS variables

### Phase 8: 模块八 — 功能完整性修复

- [ ] Task 8.1: Fix SetupWizard login flow
  - Microsoft/LittleSkin modes trigger actual login instead of offline account creation

- [ ] Task 8.2: Activate PreCheck panel
  - `handleLaunch` respects `settings.skipPreCheck`

- [ ] Task 8.3: Fix map preview empty path
  - Pass actual `worldPath` parameter

- [ ] Task 8.4: Add version install progress feedback
  - Use Tauri emit for install progress events

- [ ] Task 8.5: Add 300ms mod search debounce

- [ ] Task 8.6: Fix VersionStore error handling
  - Remove silent fail, add error state and user notification

- [ ] Task 8.7: Add Microsoft login polling timeout
  - Max 30 poll attempts, 5-minute total timeout

- [ ] Task 8.8: Add offline username validation
  - 3-16 chars, alphanumeric + underscore only

- [ ] Task 8.9: Add memory setting validation
  - Min 512MB, max 80% system memory

- [ ] Task 8.10: Add EmptyState components
  - Unified `EmptyState` component for VersionsPage, ServersPage, WorldsPage, ModpacksPage

---

# Task Dependencies

- Task 7.1 depends on Task 7.5 (permissions scope needed first)
- Task 7.2 depends on Task 7.5
- Task 3.2 depends on Task 3.1 (launchPhases module first)
- Task 3.3 depends on Task 3.2 (store migration first)
- Task 4.2 depends on Task 3.2 (launch store migration)
- Task 4.3 depends on Task 3.2
- Task 5.4 depends on Task 5.1 (CSS variables first)
- Task 5.2 depends on Task 5.1
- Task 5.3 depends on Task 5.1
- Phase 2 (Module 1) can run parallel to Phase 1 (Module 7)
- Phase 3 (Module 2) depends on Phase 2 (needs transparent windows)
