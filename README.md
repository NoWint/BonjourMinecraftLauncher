# Bonjour Minecraft Launcher

【该readme系本项目由electron迁移tauri前编写 现仅供参考】编写前一个基于 Electron + React + TypeScript 的第三方 Minecraft 启动器，支持 Windows 和 macOS 平台。

## 功能特性

### 核心功能
- ✅ **多账号管理** - 支持离线模式和正版登录（Microsoft 账号）
- ✅ **版本管理** - 浏览、安装和启动所有 Minecraft 版本（正式版、快照版、旧版本）
- ✅ **游戏启动** - 完整的游戏启动流程，支持自定义 JVM 参数
- ✅ **设置管理** - 灵活的配置选项

### 设置选项
- 游戏目录自定义
- Java 路径配置
- 内存分配（最大/最小内存）
- 窗口设置（分辨率、全屏模式）
- 自动连接服务器
- 启动后关闭启动器选项

### 技术栈
- **Electron** - 跨平台桌面应用框架
- **React 18** - 用户界面
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式系统
- **minecraft-launcher-core** - Minecraft 启动核心
- **Vite** - 构建工具

## 项目结构

```
bonjour-minecraft-launcher/
├── electron/                 # Electron 主进程
│   ├── main.ts              # 主进程入口
│   ├── preload.ts           # 预加载脚本
│   └── electron-env.d.ts    # 类型声明
├── src/
│   ├── components/          # React 组件
│   │   ├── Sidebar.tsx      # 侧边栏导航
│   │   ├── HomePage.tsx     # 首页
│   │   ├── VersionsPage.tsx # 版本管理页
│   │   ├── AccountsPage.tsx # 账号管理页
│   │   ├── SettingsPage.tsx # 设置页
│   │   └── LaunchOverlay.tsx # 启动日志覆盖层
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 渲染进程入口
│   └── index.css            # 全局样式
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖
```bash
cd bonjour-minecraft-launcher
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建应用
```bash
# Windows
npm run build

# macOS
npm run build
```

## 使用指南

### 1. 添加账号
1. 点击左侧菜单的「账号管理」
2. 点击「添加账号」按钮
3. 输入用户名（离线模式）
4. 点击添加

### 2. 安装游戏版本
1. 点击左侧菜单的「版本管理」
2. 浏览可用的 Minecraft 版本
3. 使用筛选器查找特定版本类型
4. 点击「安装」按钮

### 3. 启动游戏
1. 返回首页
2. 选择要启动的版本
3. 点击「启动游戏」按钮
4. 查看启动日志窗口

### 4. 配置设置
1. 点击左侧菜单的「设置」
2. 调整游戏目录、Java 路径、内存分配等选项
3. 点击「保存」按钮

## 数据存储

启动器数据存储在以下位置：

- **Windows**: `%APPDATA%/.bonjour-minecraft/launcher/`
- **macOS**: `~/Library/Application Support/bonjour-minecraft/launcher/`

存储的文件包括：
- `accounts.json` - 账号信息
- `settings.json` - 启动器设置
- `versions.json` - 已安装版本记录

## 开发计划

### 已实现 ✅
- [x] 基础启动器框架
- [x] 离线账号支持
- [x] 版本管理（浏览、安装、启动）
- [x] 多账号管理
- [x] 设置管理
- [x] 启动日志显示

### 计划中 📋
- [ ] Microsoft 正版登录
- [ ] Mod 加载器支持（Forge/Fabric/Quilt）
- [ ] 皮肤管理
- [ ] 服务器列表
- [ ] 游戏内覆盖层
- [ ] 自动更新
- [ ] 多语言支持

## 许可证

MIT License

## 致谢

- [minecraft-launcher-core](https://github.com/Pierce01/MinecraftLauncher-core) - Minecraft 启动核心库
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://react.dev/) - 用户界面库
