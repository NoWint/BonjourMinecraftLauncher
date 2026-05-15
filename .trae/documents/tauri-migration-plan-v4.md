# Bonjour Minecraft Launcher — Tauri 完整迁移开发计划（V4）

## 一、当前状态深度分析

### 1.1 编译状态

当前 `cargo check` 存在 **1 个编译错误** 和 **119 个警告**：

**编译错误**：`modpack.rs` 中 `archive` 双重可变借用问题。`found_manifest` 持有 `archive` 的可变借用，在其生命周期内又尝试 `archive.by_name("modrinth.index.json")`，导致第二次可变借用冲突。

**关键警告**：
- 4 个空壳模块（`jvm.rs`、`crash.rs`、`benchmark.rs`、`tray_cmd.rs`）仅有 `use tauri;`，产生未使用导入警告
- 多个未使用变量警告（`_game_dir`、`_version_id` 等）
- `system.rs` 中 `shell().open()` 已弃用，应使用 `tauri-plugin-opener`
- `minecraft_launcher.rs` 中不必要的 `mut` 声明

### 1.2 前端桥接状态

`tauri-bridge.ts` 已完整实现，覆盖 223+ API 方法。`main.tsx` 已正确挂载 `minecraftAPI` 和 `electronAPI` 到 `window` 对象。前端代码中 **已无 `require()` 调用**（之前的迁移已全部替换为 `window.minecraftAPI` 调用）。

### 1.3 核心问题清单

**P0 — 编译阻断**：
1. `modpack.rs` archive 双重借用编译错误

**P1 — 前后端参数不匹配**：
2. `add_server`：Rust 端需要 4 个参数 `(name, address, port, group_id)`，前端只传 2 个 `(name, address)`
3. `install_modpack`：Rust 端参数 `(source_path, instance_id)`，前端传 `(filePath, instanceName)`
4. `create_crash_report`：Rust 端参数 `(log_content, exit_code)`，前端传 `(version, exitCode, rawLog, instanceId)`
5. `save_benchmark`：Rust 端 8 个独立参数，前端传一个 `record` 对象
6. `repair_version_files`：Rust 端需要 `(game_dir, version_id)`，前端只传 `(versionId)`
7. `export_instance`：Rust 端参数 `(instance_dir, name, description, ...)`，前端传 `(instanceDir, name, ...)`
8. `import_instance`：Rust 端参数 `(pkg, target_dir)`，前端传 `(pkg, targetDir)`
9. `start_local_server`：Rust 端参数 `(version, server_name, port)`，前端传 `(serverId)`
10. `update_tray_menu`：Rust 端参数 `(items: Vec<Value>)`，前端传 `(versions, defaultVersion)`
11. `create_modpack`：Rust 端参数与前端传参不匹配
12. `export_modpack`：Rust 端参数与前端传参不匹配
13. `fork_modpack`：Rust 端参数与前端传参不匹配

**P2 — 前端调用了 Rust 端不存在的命令**：
14. 前端调用 `deleteServer` → Rust 端命令名是 `remove_server`
15. 前端调用 `deleteServerGroup` → Rust 端命令名是 `remove_server_group`
16. 前端调用 `getLocalServers` → Rust 端无此命令
17. 前端调用 `createLocalServer` → Rust 端无此命令
18. 前端调用 `scanLANWorlds` → Rust 端命令名是 `scan_lan_servers`
19. 前端调用 `createFriendLobby` → Rust 端参数不匹配
20. 前端调用 `joinFriendLobby` → Rust 端参数不匹配
21. 前端调用 `getFriendLobbies` → Rust 端命令名是 `get_friend_lobby_status`
22. 前端调用 `getServerNotifications` → Rust 端无此命令
23. 前端调用 `joinServer` → Rust 端无此命令
24. 前端调用 `syncServerResourcePack` → Rust 端无此命令
25. 前端调用 `syncModsToServer` → Rust 端无此命令
26. 前端调用 `checkModpackUpdate` → Rust 端命令名是 `check_modpack_updates`
27. 前端调用 `getModpackForks` → Rust 端无此命令
28. 前端调用 `createModpackFork` → Rust 端参数不匹配
29. 前端调用 `runModpackTest` → Rust 端命令名是 `test_modpack_compatibility`
30. 前端调用 `getModpackPerformance` → Rust 端无此命令
31. 前端调用 `createSyncRoom` → Rust 端命令名是 `sync_modpack_room`
32. 前端调用 `getModpackRecommendations` → Rust 端命令名是 `get_recommended_modpacks`
33. 前端调用 `applyModpackUpdate` → Rust 端无此命令
34. 前端调用 `getInstanceSnapshots` → Rust 端命令名是 `list_instance_snapshots`
35. 前端调用 `rollbackInstanceSnapshot` → Rust 端命令名是 `restore_instance_snapshot`
36. 前端调用 `exportInstancePkg` → Rust 端命令名是 `export_instance`
37. 前端调用 `importInstancePkg` → Rust 端命令名是 `import_instance`
38. 前端调用 `getGameSessions` → Rust 端无此命令
39. 前端调用 `verifyLocalFile` → Rust 端参数不匹配
40. 前端调用 `incrementalSync` → Rust 端参数不匹配
41. 前端调用 `repairVersionFiles` → Rust 端参数不匹配

**P3 — 代码质量**：
42. 4 个空壳模块需要清理
43. `shell().open()` 弃用警告
44. 多个未使用变量/导入警告
45. `electronAPI` 命名残留（不影响功能但造成混淆）

---

## 二、迁移策略

采用"修复编译→对齐接口→清理优化→验证构建"四步策略：

**第一步**：修复编译错误，确保 `cargo check` 零错误通过
**第二步**：对齐前后端接口，确保每个前端调用的命令在 Rust 端都有正确匹配的实现
**第三步**：清理代码质量，消除所有警告
**第四步**：完整构建验证，确保 `vite build` + `cargo tauri build` 成功

---

## 三、详细实施步骤

### 阶段 1：修复编译错误

#### 1.1 修复 modpack.rs archive 双重借用

**问题**：`found_manifest = archive.by_name("manifest.json")` 持有可变借用，在其 `else` 分支中又调用 `archive.by_name("modrinth.index.json")`。

**方案**：先尝试读取 manifest.json，如果失败则释放借用后再读取 modrinth.index.json：

```rust
let manifest: serde_json::Value = {
    let mut content = String::new();
    let manifest_result = archive.by_name("manifest.json");
    match manifest_result {
        Ok(mut file) => {
            std::io::Read::read_to_string(&mut file, &mut content).map_err(|e| e.to_string())?;
            serde_json::from_str(&content).map_err(|e| e.to_string())?
        }
        Err(_) => {
            let modrinth_result = archive.by_name("modrinth.index.json");
            match modrinth_result {
                Ok(mut file) => {
                    std::io::Read::read_to_string(&mut file, &mut content).map_err(|e| e.to_string())?;
                    serde_json::from_str(&content).map_err(|e| e.to_string())?
                }
                Err(_) => return Err("未找到 manifest.json 或 modrinth.index.json".to_string()),
            }
        }
    }
};
```

### 阶段 2：对齐前后端接口

这是最关键也最复杂的阶段。核心原则：**以 tauri-bridge.ts 中的前端调用为准，修改 Rust 后端命令签名使其匹配**。

#### 2.1 修复 server.rs 命令签名

- `add_server`：改为接受 `(name, address)` 两个参数，port 和 group_id 改为 Optional
- 添加 `delete_server` 命令（前端调用名）作为 `remove_server` 的别名，或直接重命名
- 添加缺失命令：`get_local_servers`、`create_local_server`、`scan_lan_worlds`、`join_server`、`get_server_notifications`、`sync_server_resource_pack`、`sync_mods_to_server`
- 修改 `create_friend_lobby` 和 `join_friend_lobby` 参数匹配前端
- 添加 `get_friend_lobbies` 命令

#### 2.2 修复 modpack.rs 命令签名

- `install_modpack`：参数改为 `(file_path, instance_name)` 匹配前端
- `create_modpack`：参数改为匹配前端 `(instance_id, pack_name, pack_version, pack_author, pack_description, format)`
- `export_modpack`：参数改为匹配前端
- `fork_modpack`：参数改为匹配前端
- 添加缺失命令：`check_modpack_update`、`get_modpack_forks`、`run_modpack_test`、`get_modpack_performance`、`create_sync_room`、`get_modpack_recommendations`、`apply_modpack_update`

#### 2.3 修复 advanced.rs 命令签名

- `create_crash_report`：参数改为 `(version, exit_code, raw_log, instance_id)` 匹配前端
- `save_benchmark`：参数改为接受单个 `record: serde_json::Value` 对象
- `repair_version_files`：参数改为 `(version_id)` 一个参数，game_dir 从 settings 读取
- `export_instance`：参数改为 `(instance_dir, name, description, game_version, author, mod_loader, mod_loader_version, source_instance_id, tags)` 匹配前端
- `import_instance`：参数改为 `(pkg, target_dir)` 匹配前端
- `update_tray_menu`：参数改为 `(versions, default_version)` 匹配前端
- `verify_local_file`：参数改为 `(file_path, expected_hash, expected_size)` 匹配前端
- `incremental_sync`：参数改为 `(game_dir, version_json, concurrency)` 匹配前端

#### 2.4 添加缺失的 Rust 命令

在 lib.rs 中注册所有前端调用的命令，确保一一对应：
- `delete_server`（别名 remove_server）
- `delete_server_group`（别名 remove_server_group）
- `get_local_servers`
- `create_local_server`
- `scan_lan_worlds`
- `join_server`
- `get_server_notifications`
- `sync_server_resource_pack`
- `sync_mods_to_server`
- `get_friend_lobbies`
- `check_modpack_update`
- `get_modpack_forks`
- `run_modpack_test`
- `get_modpack_performance`
- `create_sync_room`
- `get_modpack_recommendations`
- `apply_modpack_update`
- `get_game_sessions`
- `list_instance_snapshots`（前端调用 getInstanceSnapshots 对应）
- `restore_instance_snapshot`（前端调用 rollbackInstanceSnapshot 对应）

### 阶段 3：清理代码质量

#### 3.1 移除空壳模块

将 `jvm.rs`、`crash.rs`、`benchmark.rs`、`tray_cmd.rs` 从 `mod.rs` 和 `lib.rs` 中移除，因为它们的所有功能已在 `advanced.rs` 中实现。

#### 3.2 修复弃用 API

将 `system.rs` 中的 `app.shell().open()` 替换为 `tauri_plugin_opener` 或 `opener::open()`。

#### 3.3 清理未使用变量

为所有未使用但有意保留的变量添加 `_` 前缀。

#### 3.4 清理未使用导入

移除所有未使用的 `use` 语句。

### 阶段 4：构建验证

#### 4.1 Rust 编译验证

- `cargo check` 零错误零警告
- `cargo build` 成功

#### 4.2 前端构建验证

- `npx vite build` 成功
- 无 TypeScript 类型错误

#### 4.3 Tauri 完整构建

- `cargo tauri build` 成功
- 生成的应用可正常启动

---

## 四、实施优先级

| 优先级 | 步骤 | 内容 |
|--------|------|------|
| P0 | 阶段1 | 修复 modpack.rs 编译错误 |
| P1 | 阶段2.1 | 对齐 server.rs 命令签名 |
| P1 | 阶段2.2 | 对齐 modpack.rs 命令签名 |
| P1 | 阶段2.3 | 对齐 advanced.rs 命令签名 |
| P1 | 阶段2.4 | 添加缺失的 Rust 命令 |
| P2 | 阶段3.1 | 移除空壳模块 |
| P2 | 阶段3.2 | 修复弃用 API |
| P2 | 阶段3.3-3.4 | 清理警告 |
| P3 | 阶段4 | 构建验证 |

---

## 五、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 前后端参数对齐可能遗漏 | 运行时调用失败 | 逐一比对 tauri-bridge.ts 中每个 invoke 调用与 Rust 命令签名 |
| 新增命令可能引入新编译错误 | 编译失败 | 每次修改后立即 cargo check 验证 |
| shell.open 替换方案可能需要新依赖 | 构建失败 | 使用标准库 opener 或 tauri-plugin-opener |
| 前端类型定义与 Rust 返回值不匹配 | 运行时类型错误 | 确保返回 JSON 结构与前端类型定义一致 |

---

## 六、验收标准

1. **编译零错误零警告**：`cargo check` 和 `vite build` 均通过
2. **前后端接口完全对齐**：tauri-bridge.ts 中每个 invoke 调用都有对应的 Rust 命令，参数名和数量完全匹配
3. **无空壳模块**：所有模块都有实际实现
4. **完整构建成功**：`cargo tauri build` 生成可运行的应用
5. **核心功能可用**：设置→账号→版本→Java→启动 完整链路可运行
