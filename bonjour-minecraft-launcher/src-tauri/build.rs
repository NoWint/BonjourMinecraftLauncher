use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=src/models/");

    let output = Command::new("cargo")
        .args(["test", "--features", "ts-rs", "--", "--test-threads=1"])
        .current_dir(std::env::var("CARGO_MANIFEST_DIR").unwrap())
        .output();

    match output {
        Ok(_) => {
            let generated_path = std::path::Path::new("../src/types/generated.ts");
            if generated_path.exists() {
                println!("TypeScript types generated successfully");
            }
        }
        Err(e) => {
            println!("cargo:warning=Failed to generate TypeScript types: {}", e);
        }
    }
}
