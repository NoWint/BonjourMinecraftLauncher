# Bonjour Minecraft Launcher

第三方 Minecraft Java 版启动器，基于 Tauri 2 + Rust + React 构建，支持 Windows、macOS、Linux 三平台。

项目当前处于 **Alpha 阶段（v0.0.3）**，功能尚在持续开发中。

## 功能概述

### 账号与认证
- 离线模式登录
- Microsoft 正版账号登录（OAuth Device Code Flow）
- LittleSkin 外置登录（Yggdrasil 协议）
- 多账号管理与切换

### 版本与实例
- Minecraft 版本浏览、安装与启动（正式版、快照版、历史版本）
- Mod 加载器安装（Forge / Fabric / Quilt / NeoForge）
- 实例隔离管理，每个实例独立配置
- 实例分组、快照与存储分析

### Mod 与资源管理
- 本地 Mod 扫描、启用/禁用切换
- CurseForge 与 Modrinth 在线搜索与下载
- Mod 依赖解析与冲突检测
- 整合包安装与创建
- 资源包管理

### 世界管理
- 存档列表浏览与信息查看
- 世界备份与恢复
- 存档导出与导入
- NBT 数据解析（基于 fastnbt）

### 启动与运行
- 完整的游戏启动流程（launch engine）
- 自定义 JVM 参数
- JVM 自动调优（JVMTuningWizard）
- Java 自动检测与手动配置
- 游戏内覆盖层（GameOverlay）
- 启动前环境检查（PreCheckPanel）
- 启动性能基准测试（LaunchBenchmarkPanel）

### 诊断与维护
- 崩溃日志分析（CrashAnalyzer + LogDiagnoser）
- 自动修复建议
- 日志解析与结构化展示（CrashReportViewer）
- 游戏进程守护（ProcessGuardian）
- 系统监控（SystemMonitor）

### 其他
- 自动更新（Tauri Updater）
- 系统托盘
- 网络状态检测（NetworkStatusBar）
- 主题编辑与切换（暗色/亮色）
- 国际化支持：简体中文、英语、日语、韩语

## 技术架构

| 层级 | 技术 |
|------|------|
| 应用框架 | Tauri 2 |
| 后端 | Rust（Edition 2021） |
| 前端 | React 18 + TypeScript 5 |
| 样式 | Tailwind CSS 3 |
| 动画 | Framer Motion 12 |
| 构建 | Vite 5 |
| 数据库 | SQLite（rusqlite，bundled） |
| 国际化 | i18next + react-i18next |

### 后端模块结构（`src-tauri/src/`）

```
commands/       Tauri IPC 命令层（19 个模块）
services/       核心业务逻辑（25 个模块）
models/         数据模型定义
db/             SQLite 数据库层（连接、迁移、仓库）
utils/          工具函数（加密、路径、平台）
```

主要 service 模块：`launch_engine`、`minecraft_launcher`、`crash_analyzer`、`java_detector`、`jvm_tuner`、`microsoft_auth`、`littleskin_auth`、`server_manager`、`world`、`log_diagnoser`、`process_guardian`、`system_monitor`、`overlay_manager`、`window_manager` 等。

### 前端模块结构（`src/`）

```
components/     UI 组件（37 个）
core/           业务逻辑抽象层
api/            Tauri 桥接 + 外部 API 客户端
hooks/          自定义 React Hooks
types/          TypeScript 类型定义
i18n/           国际化资源（4 语言）
```

## 项目仓库结构

```
BonjourMinecraft/
├── bonjour-minecraft-launcher/   # 启动器本体
│   ├── src-tauri/                # Rust 后端
│   ├── src/                      # React 前端
│   └── package.json
├── website/                      # 产品官网
├── promo-page/                   # 交互式宣传页
├── promo-video/                  # Canvas 动画宣传视频
├── docs/                         # 项目文档
└── launcher-api-research.md      # HMCL/PCL2 竞品 API 分析
```

## 开发环境搭建

### 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install)（stable 工具链）
- [Tauri 2 CLI](https://v2.tauri.app/start/prerequisites/) 及平台相关依赖

### 安装与运行

```bash
# 进入启动器目录
cd bonjour-minecraft-launcher

# 安装前端依赖
npm install

# 开发模式（同时启动 Vite 开发服务器与 Tauri 窗口）
npm run dev

# 生产构建
npm run build
```

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Tauri 开发模式 |
| `npm run dev:frontend` | 仅启动前端开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run build:frontend` | 仅构建前端 |
| `npm run lint` | ESLint 代码检查 |
| `npm run preview` | 预览构建产物 |

## 数据存储

启动器数据存储位置：

- **Windows**: `%APPDATA%/com.bonjour.minecraft-launcher/`
- **macOS**: `~/Library/Application Support/com.bonjour.minecraft-launcher/`
- **Linux**: `~/.local/share/com.bonjour.minecraft-launcher/`

使用 SQLite 数据库存储账号、实例、设置等持久化数据。

## 当前状态

项目处于早期 Alpha 阶段，核心框架已搭建完成，部分功能仍在开发与调试中。不建议用于日常游戏启动。

### 已完成的主要模块
- 账号管理（离线 / Microsoft / LittleSkin）
- 版本安装与启动
- Mod 加载器安装
- 实例管理
- 本地 Mod 管理
- CurseForge / Modrinth 在线浏览
- 世界管理
- 崩溃诊断
- 多语言界面

### 开发中的功能
- 游戏内覆盖层完善
- 整合包创建与分享
- 服务器管理与快速加入
- 自动更新流程验证
- 性能优化与稳定性提升

## 社区

QQ 群：1016641691

## 许可证

MIT License
