use bonjour_minecraft_launcher_lib::services::compute;
use bonjour_minecraft_launcher_lib::utils::platform;
use std::io::Write;

#[test]
fn test_sha256_streaming() {
    let tmp = tempfile::NamedTempFile::new().expect("Failed to create temp file");
    let path = tmp.path().to_path_buf();
    drop(tmp);

    let content = b"Hello, Bonjour Minecraft!";
    let mut file = std::fs::File::create(&path).expect("Failed to create file");
    file.write_all(content).expect("Failed to write");
    drop(file);

    let hash = compute::sha256_file_streaming(&path).expect("Failed to compute hash");
    assert!(!hash.is_empty(), "Hash should not be empty");
    assert_eq!(hash.len(), 64, "SHA-256 hex string should be 64 chars");

    let expected = compute::sha256_data(content);
    assert_eq!(hash, expected, "Streaming hash should match in-memory hash");
}

#[test]
fn test_sha1_streaming() {
    let tmp = tempfile::NamedTempFile::new().expect("Failed to create temp file");
    let path = tmp.path().to_path_buf();
    drop(tmp);

    let content = b"Test SHA-1 content";
    let mut file = std::fs::File::create(&path).expect("Failed to create file");
    file.write_all(content).expect("Failed to write");
    drop(file);

    let hash = compute::sha1_file_streaming(&path).expect("Failed to compute hash");
    assert!(!hash.is_empty());
    assert_eq!(hash.len(), 40, "SHA-1 hex string should be 40 chars");

    let expected = compute::sha1_data(content);
    assert_eq!(hash, expected);
}

#[test]
fn test_md5_streaming() {
    let tmp = tempfile::NamedTempFile::new().expect("Failed to create temp file");
    let path = tmp.path().to_path_buf();
    drop(tmp);

    let content = b"Test MD5 content";
    let mut file = std::fs::File::create(&path).expect("Failed to create file");
    file.write_all(content).expect("Failed to write");
    drop(file);

    let hash = compute::md5_file_streaming(&path).expect("Failed to compute hash");
    assert!(!hash.is_empty());
    assert_eq!(hash.len(), 32, "MD5 hex string should be 32 chars");

    let expected = compute::md5_data(content);
    assert_eq!(hash, expected);
}

#[test]
fn test_sha256_large_file() {
    let tmp = tempfile::NamedTempFile::new().expect("Failed to create temp file");
    let path = tmp.path().to_path_buf();
    drop(tmp);

    let content = vec![0xABu8; 10 * 1024 * 1024];
    let mut file = std::fs::File::create(&path).expect("Failed to create file");
    file.write_all(&content).expect("Failed to write");
    drop(file);

    let hash = compute::sha256_file_streaming(&path).expect("Failed to compute hash for large file");
    assert!(!hash.is_empty());
    assert_eq!(hash.len(), 64);
}

#[test]
fn test_platform_info() {
    let os = platform::os_name();
    assert!(os == "macos" || os == "windows" || os == "linux" || os == "unknown",
        "OS name should be a known platform");

    let arch = platform::arch_name();
    assert!(!arch.is_empty(), "Arch name should not be empty");

    let separator = platform::classpath_separator();
    if cfg!(target_os = "windows") {
        assert_eq!(separator, ";");
    } else {
        assert_eq!(separator, ":");
    }

    let natives = platform::natives_dir_name();
    if cfg!(target_os = "windows") {
        assert_eq!(natives, "windows");
    } else if cfg!(target_os = "macos") {
        assert_eq!(natives, "osx");
    } else {
        assert_eq!(natives, "linux");
    }

    let info = platform::system_info();
    assert_eq!(info["os"], os);
    assert_eq!(info["arch"], arch);
}

#[test]
fn test_memory_info() {
    let (total, available) = platform::memory_info();
    assert!(total > 0, "Total memory should be positive");
    if available > 0 {
        assert!(available <= total, "Available should not exceed total");
    }
}

#[test]
fn test_hash_consistency() {
    let data = b"Consistency test data";
    let h1 = compute::sha256_data(data);
    let h2 = compute::sha256_data(data);
    assert_eq!(h1, h2, "Same input should produce same hash");

    let h3 = compute::sha1_data(data);
    assert_ne!(h1, h3, "SHA-256 and SHA-1 should produce different hashes");
}
