use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourcePack {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size: u64,
    pub is_enabled: bool,
    pub pack_format: Option<u32>,
    pub description: Option<String>,
    pub priority: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Datapack {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub file_path: String,
    pub is_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StructureFile {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalResourceIndex {
    pub resource_type: String,
    pub name: String,
    pub file_path: String,
    pub file_size: u64,
    pub instance_id: Option<String>,
}
