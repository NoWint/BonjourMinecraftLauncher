use std::env;

fn main() {
    if env::var("CARGO_CFG_TARGET_OS").unwrap_or_default() == "macos" {
        println!("cargo:rustc-env=MACOSX_DEPLOYMENT_TARGET=10.15");
    }

    if std::path::Path::new("../../.git").exists() {
        let output = std::process::Command::new("git")
            .args(["rev-parse", "--short", "HEAD"])
            .output()
            .ok();
        if let Some(o) = output {
            if o.status.success() {
                let hash = String::from_utf8_lossy(&o.stdout).trim().to_string();
                println!("cargo:rustc-env=GIT_HASH={}", hash);
            }
        }

        let dirty = std::process::Command::new("git")
            .args(["diff", "--quiet"])
            .status()
            .map(|s| !s.success())
            .unwrap_or(false);
        if dirty {
            println!("cargo:rustc-env=GIT_DIRTY=-dirty");
        }
    }

    let build_profile = env::var("PROFILE").unwrap_or_default();
    println!("cargo:rustc-env=BUILD_PROFILE={}", build_profile);

    let target = env::var("TARGET").unwrap_or_default();
    println!("cargo:rustc-env=BUILD_TARGET={}", target);

    println!("cargo:rerun-if-env-changed=CARGO_CFG_TARGET_OS");
    println!("cargo:rerun-if-changed=build.rs");
}
