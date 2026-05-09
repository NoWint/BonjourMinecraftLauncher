mod commands;
pub mod db;
pub mod errors;
mod macros;
pub mod models;
pub mod services;
pub mod utils;

use commands::*;
use std::sync::Arc;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    crate::services::performance::init_tracing();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Arc::new(commands::advanced::AppState::new()))
        .manage(commands::overlay::OverlayAppState::new())
        .invoke_handler(tauri::generate_handler![
            // Batch A: Core
            settings::get_settings,
            settings::save_settings,
            account::get_accounts,
            account::save_accounts,
            account::add_offline_account,
            account::delete_account,
            version::get_version_manifest,
            version::get_installed_versions,
            version::scan_game_dir,
            version::install_version,
            java::check_java,
            java::download_java,
            java::download_java_version,
            java::download_java_with_progress,
            java::get_all_java_versions,
            java::get_java_for_version,
            launch::launch_game,
            launch::launch_instance,
            launch::warmup_launch_cache,
            system::get_system_info,
            system::get_hardware_info,
            system::open_external,
            settings::is_first_launch,
            settings::complete_setup,
            settings::auto_setup,
            settings::select_java_path,
            settings::select_game_dir,
            system::run_pre_check,
            system::get_performance_tier,
            system::find_java_installations,
            system::find_game_directories,
            // Batch B: Instance & Mod
            instance::get_instances,
            instance::create_instance,
            instance::delete_instance,
            instance::update_instance,
            instance::update_instance_settings,
            instance::get_instance,
            instance::get_instance_by_version,
            instance::ensure_instances_for_versions,
            mod_mgr::scan_instance_mods,
            mod_mgr::scan_local_mods,
            mod_mgr::add_mod_to_instance,
            mod_mgr::toggle_instance_mod,
            mod_mgr::toggle_mod,
            mod_mgr::delete_instance_mod,
            mod_mgr::delete_mod,
            mod_mgr::check_mod_compatibility,
            mod_mgr::install_mod,
            mod_mgr::analyze_mod_jar,
            mod_mgr::compute_mod_hash,
            mod_mgr::get_mod_loader_versions,
            mod_mgr::install_mod_loader,
            mod_mgr::search_mods_global,
            mod_mgr::batch_install_mods,
            mod_mgr::get_mod_recommendations,
            mod_mgr::check_mod_conflicts,
            mod_mgr::check_mod_updates_rust,
            mod_mgr::aggregate_mod_ratings,
            mod_mgr::get_mod_performance_ratings,
            mod_mgr::estimate_instance_performance,
            mod_mgr::check_config_migration,
            mod_mgr::generate_mod_share_info,
            mod_mgr::enhance_mod_metadata,
            mod_mgr::detect_mod_loader_from_jar,
            mod_mgr::get_mod_chinese_name,
            mod_mgr::get_mod_associations,
            // Batch C: World
            world::get_worlds,
            world::get_world_info,
            world::backup_world,
            world::get_backups,
            world::restore_backup,
            world::delete_backup,
            world::export_world,
            world::import_world,
            world::delete_world,
            world::rename_world,
            world::copy_world,
            world::get_world_icon,
            world::check_world_health,
            world::fix_world_health_issue,
            world::fix_all_world_health_issues,
            world::get_world_timeline,
            world::create_timeline_entry,
            world::restore_timeline_entry,
            world::get_world_map_overview,
            world::render_world_map,
            world::get_world_statistics,
            world::convert_world_format,
            world::get_world_migration_plan,
            world::execute_world_migration,
            world::preview_seed,
            world::get_world_sync_info,
            world::sync_world,
            world::resolve_sync_conflict,
            world::analyze_world_slim,
            world::execute_world_slim,
            world::get_world_diary,
            world::generate_diary_entry,
            world::export_structure,
            world::import_structure,
            world::share_blueprint,
            world::get_world_structures,
            // Batch D: Resource
            resource::scan_instance_shaders,
            resource::add_shader_pack,
            resource::toggle_shader_pack,
            resource::delete_shader_pack,
            resource::reorder_shader_packs,
            resource::select_shader_file,
            resource::scan_instance_resource_packs,
            resource::add_resource_pack,
            resource::toggle_resource_pack,
            resource::delete_resource_pack,
            resource::reorder_resource_packs,
            resource::select_resource_pack_file,
            resource::scan_instance_datapacks,
            resource::toggle_instance_datapack,
            resource::delete_instance_datapack,
            resource::add_instance_datapack,
            resource::select_datapack_file,
            resource::scan_instance_structures,
            resource::import_instance_structure,
            resource::export_instance_structure,
            resource::delete_instance_structure,
            resource::get_structure_preview,
            resource::select_structure_file,
            resource::build_global_resource_index,
            resource::select_mod_file,
            resource::create_texture_project,
            resource::save_texture_project,
            resource::export_texture_project,
            resource::get_texture_projects,
            resource::get_resource_subscriptions,
            resource::add_resource_subscription,
            resource::remove_resource_subscription,
            resource::check_resource_subscription_updates,
            resource::get_resource_subscription_notifications,
            resource::mark_resource_notification_read,
            resource::get_resource_collections,
            resource::create_resource_collection,
            resource::update_resource_collection,
            resource::delete_resource_collection,
            resource::install_resource_collection,
            // Batch E: Auth
            auth::microsoft_login_start,
            auth::microsoft_login_poll,
            auth::microsoft_login_refresh,
            auth::upload_skin,
            auth::upload_avatar,
            auth::select_image_file,
            auth::select_skin_file,
            auth::littleskin_login,
            auth::littleskin_get_players,
            auth::littleskin_upload_skin,
            // Batch F: Modpack
            modpack::install_modpack,
            modpack::create_modpack,
            modpack::export_modpack,
            modpack::get_installed_modpacks,
            modpack::update_modpack,
            modpack::check_modpack_update,
            modpack::check_modpack_updates,
            modpack::fork_modpack,
            modpack::get_modpack_forks,
            modpack::sync_modpack_room,
            modpack::create_sync_room,
            modpack::get_recommended_modpacks,
            modpack::get_modpack_recommendations,
            modpack::test_modpack_compatibility,
            modpack::run_modpack_test,
            modpack::get_modpack_performance,
            modpack::apply_modpack_update,
            // Batch G: Server
            server::get_servers,
            server::add_server,
            server::delete_server,
            server::update_server,
            server::get_server_info,
            server::ping_server,
            server::get_server_groups,
            server::create_server_group,
            server::delete_server_group,
            server::assign_server_to_group,
            server::scan_lan_worlds,
            server::join_friend_lobby,
            server::create_friend_lobby,
            server::leave_friend_lobby,
            server::get_friend_lobbies,
            server::get_friend_lobby_status,
            server::get_community_servers,
            server::start_local_server,
            server::stop_local_server,
            server::get_local_server_status,
            server::toggle_server_favorite,
            server::get_server_player_history,
            server::get_local_servers,
            server::create_local_server,
            server::join_server,
            server::get_server_notifications,
            server::sync_server_resource_pack,
            server::sync_mods_to_server,
            // Batch H: Advanced
            download::download_file,
            download::pause_download,
            download::resume_download,
            download::cancel_download,
            advanced::get_config_categories,
            advanced::classify_config_change,
            advanced::launch_multiple_instances,
            advanced::get_instance_groups,
            advanced::save_instance_groups,
            advanced::create_instance_group,
            advanced::update_instance_group,
            advanced::delete_instance_group,
            advanced::assign_instance_to_group,
            advanced::create_instance_tag,
            advanced::delete_instance_tag,
            advanced::assign_tag_to_instance,
            advanced::remove_tag_from_instance,
            advanced::search_instances_by_tags,
            advanced::batch_assign_tag,
            advanced::batch_move_to_group,
            advanced::get_instance_templates,
            advanced::save_instance_templates,
            advanced::create_instance_template,
            advanced::delete_instance_template,
            advanced::clone_instance_from_template,
            advanced::search_instance_templates,
            advanced::get_version_compatibility,
            advanced::batch_get_version_compatibilities,
            advanced::get_version_diff,
            advanced::create_instance_snapshot,
            advanced::list_instance_snapshots,
            advanced::delete_instance_snapshot,
            advanced::restore_instance_snapshot,
            advanced::diff_instance_snapshot,
            advanced::export_instance,
            advanced::export_instance_as_zip,
            advanced::import_instance,
            advanced::import_instance_from_zip,
            advanced::analyze_instance_storage,
            advanced::clean_instance_storage,
            advanced::check_instance_health,
            advanced::auto_fix_health_issues,
            advanced::get_instance_dashboard,
            advanced::record_play_time,
            advanced::record_mod_change,
            advanced::get_version_migration_guide,
            advanced::get_version_annotations,
            advanced::add_version_annotation,
            advanced::like_version_annotation,
            advanced::delete_version_annotation,
            advanced::run_health_check,
            advanced::get_launch_dependencies,
            advanced::set_launch_dependency,
            advanced::remove_launch_dependency,
            advanced::get_instance_launch_order,
            advanced::launch_dependent_instances,
            advanced::detect_launchers,
            advanced::migrate_launcher_data,
            advanced::detect_download_source,
            advanced::get_optimal_download_url,
            advanced::check_for_updates,
            advanced::check_network_status,
            advanced::detect_region,
            advanced::launch_engine_start,
            advanced::launch_engine_phase,
            advanced::launch_engine_log,
            advanced::launch_engine_complete,
            advanced::launch_engine_exit,
            advanced::get_running_game_processes,
            advanced::kill_game_process,
            advanced::repair_version_files,
            advanced::verify_local_file,
            advanced::incremental_sync,
            advanced::get_jvm_profiles,
            advanced::recommend_jvm_profile,
            advanced::create_crash_report,
            advanced::get_crash_reports,
            advanced::get_launch_benchmarks,
            advanced::get_benchmark_summary,
            advanced::save_benchmark,
            advanced::setup_tray,
            advanced::update_tray_menu,
            advanced::get_game_sessions,
            advanced::register_global_shortcut,
            advanced::unregister_global_shortcut,
            advanced::get_display_info,
            advanced::move_window_to_display,
            advanced::save_window_position,
            advanced::restore_window_position,
            // Batch H2: Core Launch Engine New Commands
            advanced::diagnose_log_message,
            advanced::build_jvm_args_command,
            advanced::get_system_memory,
            advanced::watch_config_directory,
            advanced::stop_watching_directory,
            advanced::get_recent_config_changes,
            advanced::analyze_exit_code,
            advanced::get_recovery_options,
            advanced::collect_system_snapshot,
            advanced::detect_slow_mod,
            advanced::classify_log_phase,
            // Batch I: CurseForge API Proxy
            curseforge_api::curseforge_search,
            curseforge_api::curseforge_get_mod_details,
            curseforge_api::curseforge_get_mod_files,
            curseforge_api::curseforge_fingerprint_matches,
            services::performance::get_performance_panel_data,
            services::performance::get_command_performance_stats,
            services::performance::clear_performance_data,
            // Batch J: Database Commands
            db_commands::db_get_accounts,
            db_commands::db_get_account,
            db_commands::db_insert_account,
            db_commands::db_delete_account,
            db_commands::db_get_settings,
            db_commands::db_save_settings,
            db_commands::db_get_setting,
            db_commands::db_set_setting,
            db_commands::db_get_instances,
            db_commands::db_get_instance,
            db_commands::db_insert_instance,
            db_commands::db_delete_instance,
            db_commands::db_update_instance,
            db_commands::db_update_instance_play_time,
            db_commands::db_get_installed_versions,
            db_commands::db_upsert_installed_version,
            db_commands::db_get_servers,
            db_commands::db_insert_server,
            db_commands::db_delete_server,
            db_commands::db_get_server_groups,
            db_commands::db_insert_server_group,
            db_commands::db_get_world_backups,
            db_commands::db_insert_world_backup,
            db_commands::db_delete_world_backup,
            db_commands::db_insert_launch_record,
            db_commands::db_get_recent_launches,
            db_commands::db_insert_crash_report,
            db_commands::db_get_recent_crash_reports,
            db_commands::db_get_local_mods,
            db_commands::db_insert_local_mod,
            db_commands::db_toggle_local_mod,
            db_commands::db_delete_local_mod,
            db_commands::db_import_from_json,
            db_commands::db_export_to_json,
            // Batch K: Compute (spawn_blocking)
            services::compute::compute_file_sha256,
            services::compute::compute_file_sha1,
            services::compute::compute_file_md5,
            services::compute::compute_data_sha256,
            services::compute::compute_data_sha1,
            services::compute::compute_data_md5,
            // Batch L: JAR Analyzer (spawn_blocking)
            services::jar_analyzer::jar_analyze_mod,
            services::jar_analyzer::jar_scan_security,
            // Batch M: Platform
            utils::platform::platform_get_system_info,
            utils::platform::platform_get_memory_info,
            utils::platform::platform_get_os_name,
            utils::platform::platform_get_arch,
            utils::platform::platform_get_minecraft_data_dir,
            utils::platform::platform_get_default_java_paths,
            utils::platform::platform_open_in_file_manager,
            utils::platform::platform_open_url,
            utils::platform::platform_kill_process,
            // Batch N: Window Manager
            services::window_manager::window_create,
            services::window_manager::window_close,
            services::window_manager::window_show,
            services::window_manager::window_hide,
            services::window_manager::window_set_title,
            services::window_manager::window_focus,
            services::window_manager::window_is_open,
            services::window_manager::window_list,
            services::window_manager::window_open_launch_log,
            services::window_manager::window_open_settings,
            services::window_manager::window_open_crash_report,
            // Batch K: Overlay
            overlay::overlay_open,
            overlay::overlay_close,
            overlay::overlay_toggle,
            overlay::overlay_get_data,
            overlay::overlay_set_game_pid,
            overlay::overlay_start_log_watcher,
            overlay::overlay_stop_log_watcher,
            overlay::overlay_set_collapsed,
        ])
        .setup(|app| {
            match db_commands::init_database() {
                Ok(db_state) => {
                    app.manage(db_state);
                    tracing::info!("Database initialized successfully");
                }
                Err(e) => {
                    tracing::error!(error = %e, "Failed to initialize database");
                }
            }

            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&tauri::menu::MenuItem::with_id(app, "quick-launch", "快速启动", true, None::<&str>)?)
                .separator()
                .item(&tauri::menu::MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?)
                .separator()
                .item(&tauri::menu::MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?)
                .build()?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .tooltip("Bonjour Minecraft")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quick-launch" => {
                        let _ = app.emit("quick-launch", ());
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
