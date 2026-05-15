# Bonjour Minecraft Launcher — Tauri 完整迁移开发计划（V3）

## 一、当前状态深度分析

### 1.1 迁移完成度：约 55%

经过全面代码审查，当前迁移存在以下核心问题：

**致命问题（P0）**：`src/core/` 目录中 7 个文件共 45 处使用 Node.js `require()` 调用（`fs`、`path`、`crypto`、`axios`），这些代码在 Tauri WebView 环境中会直接抛出 `ReferenceError: require is not defined`，导致相关功能完全崩溃。涉及文件：
- `instanceEcosystem.ts`（11 处 require）
- `instanceSnapshots.ts`（8 处 require）
- `instanceGroups.ts`（4 处 require）
- `instanceTemplates.ts`（4 处 require）
- `incrementalSync.ts`（8 处 require）
- `launchBenchmark.ts`（4 处 require）
- `modpackDiff.ts`（2 处 require）

**高优先级问题（P1）**：Rust 后端约 65 个命令仍为 stub 实现，返回空值/默认值，前端调用后无实际效果。包括：modpack（10个）、server（18个）、advanced（31个）、crash（2个）、benchmark（3个）等模块。

**中优先级问题（P2）**：事件监听器竞态条件、electronAPI 与 minecraftAPI 方法重复定义（20+方法）、参数映射不一致、类型安全缺失（大量 any）。

### 1.2 已正确完成的部分

- 前端桥接层（tauri-bridge.ts）覆盖所有 223+ API
- main.tsx 已正确挂载 tauri-bridge 到 window 对象
- 核心后端命令（settings/account/version/java/launch/system/instance）实现率 100%
- 事件推送系统（launch-log/close/exit/running/crash-recovery/download-progress）
- Native 库提取、版本 JSON arguments 解析
- 文件对话框（9个）、系统托盘
- 下载进度回调
- Rust 编译 0 错误通过

---

## 二、迁移策略：三层递进

采用"修复致命→补全功能→优化质量"三层递进策略：

**第一层**：修复所有 P0 致命问题，确保应用在 Tauri 环境中可启动且不崩溃
**第二层**：补全所有 P1 功能缺失，确保每个前端调用的 API 都有真实后端实现
**第三层**：修复 P2 设计问题，提升代码质量和类型安全

---

## 三、详细实施步骤

### 阶段 1：修复 Node.js require() 致命问题（P0）

这是最紧急的问题。7 个 `src/core/` 文件中的 `require()` 调用必须在 Tauri WebView 中被替换。

**策略**：将这些文件中的 Node.js 文件系统操作替换为 `window.minecraftAPI` 调用（即通过 Tauri invoke 调用 Rust 后端），同时确保 Rust 后端有对应的命令实现。

#### 1.1 修复 instanceGroups.ts

**当前**：使用 `require('fs')` 读取/写入分组配置文件
**方案**：将文件操作替换为 `window.minecraftAPI` 调用，Rust 后端 `advanced.rs` 中实现 `get_instance_groups`/`save_instance_groups` 命令

具体修改：
- `require('fs')` → `window.minecraftAPI.getInstanceGroups()`
- `fs.writeFileSync()` → `window.minecraftAPI.saveInstanceGroups()`
- `require('path')` → 移除，路径由 Rust 后端管理

#### 1.2 修复 instanceTemplates.ts

**当前**：使用 `require('fs')`/`require('path')` 读写模板文件
**方案**：替换为 `window.minecraftAPI.getInstanceTemplates()`/`window.minecraftAPI.saveInstanceTemplate()` 调用

#### 1.3 修复 instanceEcosystem.ts

**当前**：11 处 require 调用，涉及 fs/path/crypto，实现分组、标签、模板、快照、导出导入等功能
**方案**：将所有文件操作替换为对应的 minecraftAPI 调用，Rust 后端实现完整的实例生态命令

#### 1.4 修复 instanceSnapshots.ts

**当前**：8 处 require 调用，实现快照创建/恢复/删除/列表
**方案**：替换为 `window.minecraftAPI.createInstanceSnapshot()` 等调用

#### 1.5 修复 incrementalSync.ts

**当前**：8 处 require 调用，实现增量同步（文件 diff + 增量下载）
**方案**：将文件 diff 逻辑移到 Rust 后端，前端仅调用 API

#### 1.6 修复 launchBenchmark.ts

**当前**：4 处 require 调用，实现启动计时和基准数据存储
**方案**：替换为 `window.minecraftAPI.saveBenchmark()`/`window.minecraftAPI.getLaunchBenchmarks()` 调用

#### 1.7 修复 modpackDiff.ts

**当前**：2 处 require 调用，实现整合包差异比较
**方案**：将文件比较逻辑移到 Rust 后端，前端调用 API 获取 diff 结果

---

### 阶段 2：补全 Rust 后端 Stub 命令（P1）

按功能模块逐步实现，每个模块完成后独立验证。

#### 2.1 实现 advanced.rs — 实例生态命令（31个）

这是最大的 stub 模块，需要实现以下功能组：

**实例分组**（5个命令）：
- `get_instance_groups`：读取分组配置 JSON
- `save_instance_groups`：保存分组配置
- `add_instance_to_group`：将实例添加到分组
- `remove_instance_from_group`：从分组移除实例
- `get_instances_by_group`：获取分组内所有实例

**实例标签**（4个命令）：
- `get_instance_tags`：读取标签配置
- `add_instance_tag`：添加标签
- `remove_instance_tag`：移除标签
- `get_instances_by_tag`：按标签查询实例

**实例模板**（4个命令）：
- `get_instance_templates`：读取模板列表
- `create_instance_template`：从现有实例创建模板
- `apply_instance_template`：将模板应用到新实例
- `delete_instance_template`：删除模板

**实例快照**（4个命令）：
- `create_instance_snapshot`：创建实例快照（压缩整个实例目录）
- `restore_instance_snapshot`：恢复快照
- `delete_instance_snapshot`：删除快照
- `list_instance_snapshots`：列出所有快照

**实例导出导入**（3个命令）：
- `export_instance`：导出实例为压缩包
- `import_instance`：从压缩包导入实例
- `clone_instance`：克隆实例

**版本兼容性**（3个命令）：
- `check_version_compatibility`：检查版本兼容性
- `migrate_instance_version`：迁移实例版本
- `get_migration_plan`：获取迁移计划

**启动依赖**（3个命令）：
- `get_launch_dependencies`：获取启动依赖
- `add_launch_dependency`：添加启动依赖
- `remove_launch_dependency`：移除启动依赖

**健康检查**（2个命令）：
- `check_instance_health`：检查实例健康状态
- `repair_instance`：修复实例问题

**下载源/更新/网络**（3个命令）：
- `check_download_source`：检查下载源可用性
- `check_for_updates`：检查更新
- `get_network_status`：获取网络状态

#### 2.2 实现 modpack.rs — 整合包系统（10个）

- `install_modpack`：从 CurseForge/Modrinth 格式安装整合包
- `create_modpack`：从当前实例创建整合包
- `export_modpack`：导出整合包为文件
- `get_installed_modpacks`：获取已安装整合包列表
- `update_modpack`：更新整合包
- `check_modpack_updates`：检查整合包更新
- `fork_modpack`：分支整合包
- `sync_modpack_room`：同步整合包房间
- `get_recommended_modpacks`：获取推荐整合包
- `test_modpack_compatibility`：测试整合包兼容性

#### 2.3 实现 server.rs — 服务器管理（18个）

- 服务器 CRUD（add/remove/update/get servers）
- 服务器分组（add/remove/get groups）
- 局域网扫描（scan_lan_servers）
- 好友大厅（join/leave/create friend lobby）
- 社区服务器（get community servers）
- 本地服务器管理（start/stop local server）

#### 2.4 实现 crash.rs — 崩溃报告（2个）

- `create_crash_report`：解析崩溃日志，提取关键信息
- `get_crash_reports`：获取历史崩溃报告列表

#### 2.5 实现 benchmark.rs — 基准测试（3个）

- `get_launch_benchmarks`：获取启动计时数据
- `get_benchmark_summary`：获取基准测试摘要
- `save_benchmark`：保存基准测试数据

#### 2.6 实现 download.rs — 下载管理（3个）

- `pause_download`：暂停下载
- `resume_download`：恢复下载
- `cancel_download`：取消下载

#### 2.7 实现 auth.rs — 认证补充（4个）

- `microsoft_login_refresh`：刷新微软登录 Token
- `upload_skin`：上传皮肤到 Mojang
- `upload_avatar`：上传头像
- `littleskin_get_players`/`littleskin_upload_skin`：Littleskin 高级功能

#### 2.8 实现 world.rs — 存档高级功能（20个）

- 存档健康检查/修复
- 存档统计
- 存档时间线
- 存档格式转换
- 存档同步
- 存档瘦身
- 存档日记
- 存档地图预览

---

### 阶段 3：修复前端桥接问题（P2）

#### 3.1 修复事件监听器竞态条件

**问题**：`tauri-bridge.ts` 中 `onLaunchLog` 等方法使用异步 `listen()` 但同步返回 unsubscribe 函数，在 Promise resolve 前调用 unsubscribe 无效。

**方案**：改为返回 Promise<UnlistenFn>，或在 listen resolve 后才标记为可用：

```typescript
onLaunchLog: (callback) => {
    let unlistenFn: UnlistenFn | null = null
    const ready = listen<{type: string; message: string}>('launch-log', (event) => callback(event.payload))
        .then(fn => { unlistenFn = fn })
    return {
        unsubscribe: () => { unlistenFn?.() },
        ready
    }
}
```

同时更新 App.tsx 中的调用方式。

#### 3.2 消除 electronAPI 与 minecraftAPI 重复定义

**问题**：20+ 方法在两个对象中重复定义，且 `recommendJVMProfile` 参数映射不一致。

**方案**：将 `electronAPI` 中与 `minecraftAPI` 重复的方法改为直接引用 `minecraftAPI` 的方法，消除重复代码和参数不一致风险：

```typescript
export const electronAPI = {
    // 窗口管理（electronAPI 独有）
    toggleFullscreen: async () => { ... },
    getDisplays: async () => { ... },
    moveToDisplay: async (displayId: string) => { ... },
    saveWindowPlacement: async () => { ... },
    restoreWindowPlacement: async () => { ... },
    // 以下方法直接引用 minecraftAPI
    ...Object.fromEntries(
        ['launchEngineStart', 'launchEnginePhase', ...].map(key => [key, minecraftAPI[key]])
    )
}
```

#### 3.3 实现 moveToDisplay

**当前**：标记为 TODO，未实现
**方案**：使用 Tauri 的 window API 实现窗口移动到指定显示器

#### 3.4 添加 getGameSessions 到 minecraftAPI

**当前**：App.tsx 使用 `as Record<string, unknown>` 类型断言调用
**方案**：在 tauri-bridge.ts 的 minecraftAPI 中添加 `getGameSessions` 方法，并在 Rust 后端实现对应命令

#### 3.5 清理 setupEventListeners

**当前**：函数已定义但未被调用
**方案**：确认 App.tsx 中的事件监听方式，如果使用 `minecraftAPI.onLaunchLog` 等方法，则移除 `setupEventListeners`；否则统一使用 `setupEventListeners`

---

### 阶段 4：MinecraftLauncher 进程监控改进

#### 4.1 修复进程监控实现

**当前问题**：`minecraft_launcher.rs` 中的 `monitor_process` 使用 `ps` 和 `kill -0` 命令监控进程，这是 Unix-only 方案，且日志读取使用 `/proc` 文件系统（Linux-only）。

**方案**：使用 `std::process::Child` 的 `try_wait()` 和 `wait()` 方法替代：

```rust
fn monitor_process(mut child: std::process::Child, app: tauri::AppHandle, session_id: String) {
    // 使用 child.stdout.take() 和 child.stderr.take() 读取日志
    // 使用 child.try_wait() 检查进程状态
    // 使用 child.wait() 等待进程退出
}
```

这需要将 `Child` 对象移动到监控线程中，而不是仅传递 pid。

#### 4.2 实现日志流式推送

**当前**：日志监控使用 `/proc` 文件系统，仅 Linux 可用
**方案**：在 `launch()` 中将 `child` 的 stdout/stderr 传递给监控线程，使用 `BufRead::lines()` 逐行读取并 emit

---

### 阶段 5：权限与安全

#### 5.1 更新 capabilities/default.json

添加可能缺少的权限：
- `fs:allow-read-dir`：目录列表读取
- `fs:allow-copy-file`：文件复制（如果前端需要）

#### 5.2 确认 Microsoft OAuth CLIENT_ID

当前为占位值 `"00000000-0000-0000-0000-000000000000"`，需要替换为真实的 Azure 应用 ID。

---

### 阶段 6：构建验证与测试

#### 6.1 编译验证

- `cargo check` 0 错误
- `cargo build` 成功
- `npx vite build` 成功
- `cargo tauri build` 成功

#### 6.2 运行时验证

- 应用启动显示窗口
- 设置读写正常
- 离线账号创建/删除
- 版本清单获取
- Java 检测
- 游戏启动（离线账号）
- 启动日志实时推送
- 游戏退出事件
- 文件对话框正常工作
- 系统托盘正常工作

---

## 四、实施优先级与时间线

| 优先级 | 阶段 | 内容 | 预估工作量 |
|--------|------|------|-----------|
| P0 | 阶段1 | 修复 7 个文件的 require() 问题 | 2-3 天 |
| P1 | 阶段2.1 | 实现 advanced.rs（31个命令） | 5-7 天 |
| P1 | 阶段2.2 | 实现 modpack.rs（10个命令） | 2-3 天 |
| P1 | 阶段2.3 | 实现 server.rs（18个命令） | 3-4 天 |
| P1 | 阶段2.4-2.8 | 实现其余 stub 模块 | 3-4 天 |
| P2 | 阶段3 | 修复前端桥接问题 | 1-2 天 |
| P2 | 阶段4 | MinecraftLauncher 改进 | 1-2 天 |
| P2 | 阶段5 | 权限与安全 | 0.5 天 |
| - | 阶段6 | 构建验证与测试 | 2-3 天 |
| **总计** | | | **20-29 天** |

---

## 五、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| require() 替换可能遗漏 | 运行时崩溃 | 全局搜索 `require(` 确保无遗漏 |
| advanced.rs 31个命令实现量大 | 开发周期长 | 优先实现被前端实际调用的命令 |
| 整合包格式解析复杂 | 安装失败 | 参考 CurseForge/Modrinth 格式规范 |
| 进程监控跨平台兼容性 | 某些平台无法监控 | 使用 Child API 而非系统命令 |
| Microsoft CLIENT_ID 缺失 | 微软登录不可用 | 需要用户提供真实 ID |

---

## 六、验收标准

1. **零 require() 调用**：`src/` 目录中不存在任何 `require()` 调用
2. **零 stub 命令**：所有注册的 Tauri 命令都有真实实现（至少返回合理默认值）
3. **编译零错误**：`cargo check` 和 `vite build` 均通过
4. **核心功能可用**：设置→账号→版本→Java→启动 完整链路可运行
5. **事件推送正常**：启动日志、下载进度、游戏退出事件可被前端接收
6. **文件对话框可用**：选择 Java 路径、游戏目录、模组文件等对话框正常工作
