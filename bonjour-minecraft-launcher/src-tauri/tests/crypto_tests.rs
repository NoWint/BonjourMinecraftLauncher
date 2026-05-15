use bonjour_minecraft_launcher::utils::crypto::{encrypt_field, decrypt_field, is_encrypted};

#[test]
fn test_encrypt_decrypt_roundtrip() {
    let plaintext = "my-secret-access-token";
    let encrypted = encrypt_field(plaintext).unwrap();
    assert!(is_encrypted(&encrypted));
    assert_ne!(encrypted, plaintext);

    let decrypted = decrypt_field(&encrypted).unwrap();
    assert_eq!(decrypted, plaintext);
}

#[test]
fn test_encrypt_empty_string() {
    let encrypted = encrypt_field("").unwrap();
    assert_eq!(encrypted, "");

    let decrypted = decrypt_field("").unwrap();
    assert_eq!(decrypted, "");
}

#[test]
fn test_decrypt_plaintext_returns_same() {
    let plaintext = "not-encrypted-value";
    let decrypted = decrypt_field(plaintext).unwrap();
    assert_eq!(decrypted, plaintext);
}

#[test]
fn test_is_encrypted() {
    assert!(is_encrypted("ENC:v1:somebase64data"));
    assert!(!is_encrypted("plain-text"));
    assert!(!is_encrypted(""));
}

#[test]
fn test_encrypt_different_each_time() {
    let plaintext = "same-input";
    let encrypted1 = encrypt_field(plaintext).unwrap();
    let encrypted2 = encrypt_field(plaintext).unwrap();
    assert_ne!(encrypted1, encrypted2);

    let decrypted1 = decrypt_field(&encrypted1).unwrap();
    let decrypted2 = decrypt_field(&encrypted2).unwrap();
    assert_eq!(decrypted1, plaintext);
    assert_eq!(decrypted2, plaintext);
}

#[test]
fn test_encrypt_long_token() {
    let long_token = "a".repeat(1000);
    let encrypted = encrypt_field(&long_token).unwrap();
    let decrypted = decrypt_field(&encrypted).unwrap();
    assert_eq!(decrypted, long_token);
}

#[test]
fn test_encrypt_unicode() {
    let unicode_text = "你好世界🎮🎮🎮";
    let encrypted = encrypt_field(unicode_text).unwrap();
    let decrypted = decrypt_field(&encrypted).unwrap();
    assert_eq!(decrypted, unicode_text);
}
