import type { InstanceTemplate, TemplateModEntry, TemplateShaderEntry } from '../../types/instance'

const TEMPLATES_DIR_NAME = 'instance_templates'

async function loadTemplates(dataDir: string): Promise<InstanceTemplate[]> {
  try {
    const result = await window.minecraftAPI.getInstanceTemplates()
    return (result as InstanceTemplate[]) || []
  } catch {
    return []
  }
}

async function saveTemplates(dataDir: string, templates: InstanceTemplate[]): Promise<void> {
  await window.minecraftAPI.saveInstanceTemplates(templates)
}

export async function getTemplates(dataDir: string): Promise<InstanceTemplate[]> {
  return loadTemplates(dataDir)
}

export async function getTemplateById(dataDir: string, templateId: string): Promise<InstanceTemplate | null> {
  return (await loadTemplates(dataDir)).find(t => t.id === templateId) || null
}

export async function createTemplateFromInstance(
  dataDir: string,
  name: string,
  description: string,
  gameVersion: string,
  modLoader: string | undefined,
  modLoaderVersion: string | undefined,
  settings: Record<string, any>,
  mods: TemplateModEntry[],
  shaders: TemplateShaderEntry[],
  sourceInstanceId?: string,
  tags: string[] = []
): Promise<InstanceTemplate> {
  const templates = await loadTemplates(dataDir)
  const template: InstanceTemplate = {
    id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    gameVersion,
    modLoader,
    modLoaderVersion,
    settings,
    modList: mods,
    shaderPacks: shaders,
    createdAt: Date.now(),
    sourceInstanceId,
    tags,
  }
  templates.push(template)
  await saveTemplates(dataDir, templates)
  return template
}

export async function deleteTemplate(dataDir: string, templateId: string): Promise<boolean> {
  const templates = await loadTemplates(dataDir)
  const idx = templates.findIndex(t => t.id === templateId)
  if (idx === -1) return false
  templates.splice(idx, 1)
  await saveTemplates(dataDir, templates)
  return true
}

export async function exportTemplate(dataDir: string, templateId: string): Promise<string> {
  const template = await getTemplateById(dataDir, templateId)
  if (!template) throw new Error('Template not found')
  return JSON.stringify(template, null, 2)
}

export async function importTemplate(dataDir: string, jsonStr: string): Promise<InstanceTemplate> {
  const template = JSON.parse(jsonStr) as InstanceTemplate
  if (!template.name || !template.gameVersion) {
    throw new Error('Invalid template format')
  }
  template.id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  template.createdAt = Date.now()
  const templates = await loadTemplates(dataDir)
  templates.push(template)
  await saveTemplates(dataDir, templates)
  return template
}
