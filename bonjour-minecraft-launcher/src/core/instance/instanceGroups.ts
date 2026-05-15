import type { InstanceGroupConfig, InstanceGroup, InstanceTag } from '../../types/instance'
import { createDefaultGroupConfig } from '../../types/instance'

const GROUPS_CONFIG_KEY = 'instance_groups_config'

async function loadConfig(dataDir: string): Promise<InstanceGroupConfig> {
  try {
    const result = await window.minecraftAPI.getInstanceGroups()
    return result as InstanceGroupConfig
  } catch {
    return createDefaultGroupConfig()
  }
}

async function saveConfig(dataDir: string, config: InstanceGroupConfig): Promise<void> {
  await window.minecraftAPI.saveInstanceGroups(config)
}

export async function getGroupConfig(dataDir: string): Promise<InstanceGroupConfig> {
  return loadConfig(dataDir)
}

export async function createGroup(dataDir: string, name: string, parentId: string | null, icon?: string, color?: string): Promise<InstanceGroup> {
  const config = await loadConfig(dataDir)
  const group: InstanceGroup = {
    id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    parentId,
    icon,
    color,
    sortOrder: config.groups.length,
    collapsed: false,
  }
  config.groups.push(group)
  await saveConfig(dataDir, config)
  return group
}

export async function updateGroup(dataDir: string, groupId: string, updates: Partial<InstanceGroup>): Promise<InstanceGroup | null> {
  const config = await loadConfig(dataDir)
  const idx = config.groups.findIndex(g => g.id === groupId)
  if (idx === -1) return null
  config.groups[idx] = { ...config.groups[idx], ...updates }
  await saveConfig(dataDir, config)
  return config.groups[idx]
}

export async function deleteGroup(dataDir: string, groupId: string): Promise<boolean> {
  const config = await loadConfig(dataDir)
  if (groupId === 'default') return false
  const childIds = new Set<string>()
  const collectChildren = (pid: string) => {
    for (const g of config.groups) {
      if (g.parentId === pid) {
        childIds.add(g.id)
        collectChildren(g.id)
      }
    }
  }
  collectChildren(groupId)
  const toDelete = new Set([groupId, ...childIds])
  config.groups = config.groups.filter(g => !toDelete.has(g.id))
  for (const iid of Object.keys(config.instanceGroups)) {
    if (toDelete.has(config.instanceGroups[iid])) {
      config.instanceGroups[iid] = 'default'
    }
  }
  await saveConfig(dataDir, config)
  return true
}

export async function assignInstanceToGroup(dataDir: string, instanceId: string, groupId: string): Promise<void> {
  const config = await loadConfig(dataDir)
  config.instanceGroups[instanceId] = groupId
  await saveConfig(dataDir, config)
}

export async function createTag(dataDir: string, name: string, color: string): Promise<InstanceTag> {
  const config = await loadConfig(dataDir)
  const tag: InstanceTag = {
    id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    color,
    createdAt: Date.now(),
  }
  config.tags.push(tag)
  await saveConfig(dataDir, config)
  return tag
}

export async function deleteTag(dataDir: string, tagId: string): Promise<boolean> {
  const config = await loadConfig(dataDir)
  config.tags = config.tags.filter(t => t.id !== tagId)
  for (const iid of Object.keys(config.instanceTags)) {
    config.instanceTags[iid] = config.instanceTags[iid].filter(tid => tid !== tagId)
  }
  await saveConfig(dataDir, config)
  return true
}

export async function assignTagToInstance(dataDir: string, instanceId: string, tagId: string): Promise<void> {
  const config = await loadConfig(dataDir)
  if (!config.instanceTags[instanceId]) {
    config.instanceTags[instanceId] = []
  }
  if (!config.instanceTags[instanceId].includes(tagId)) {
    config.instanceTags[instanceId].push(tagId)
  }
  await saveConfig(dataDir, config)
}

export async function removeTagFromInstance(dataDir: string, instanceId: string, tagId: string): Promise<void> {
  const config = await loadConfig(dataDir)
  if (config.instanceTags[instanceId]) {
    config.instanceTags[instanceId] = config.instanceTags[instanceId].filter(tid => tid !== tagId)
  }
  await saveConfig(dataDir, config)
}

export async function setInstanceSortOrder(dataDir: string, instanceId: string, order: number): Promise<void> {
  const config = await loadConfig(dataDir)
  config.instanceSortOrder[instanceId] = order
  await saveConfig(dataDir, config)
}
