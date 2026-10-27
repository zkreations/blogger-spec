import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getWorkspacePaths } from '../paths.js'

export interface SchemaCompatibilityResult {
  valid: boolean
  errors: string[]
  skipped?: boolean
}

export interface SchemaCompatibilityOptions {
  schemasDir?: string
  gitRef?: string
  reporter?: (message: string) => void
}

export interface SchemaResolutionContext {
  oldSchemas?: Record<string, any>
  newSchemas?: Record<string, any>
  currentFile?: string
}

function resolveJsonPointer(root: any, pointer: string): any {
  if (!pointer || pointer === '#' || pointer === '') {
    return root
  }
  const clean = pointer.replace(/^#/, '').replace(/^\//, '')
  const parts = clean.split('/')
  let curr = root
  for (const part of parts) {
    if (!curr || typeof curr !== 'object') {
      return undefined
    }
    curr = curr[part]
  }
  return curr
}

export function dereferenceSchema(
  schema: any,
  schemasMap?: Record<string, any>,
  currentFile?: string,
  seen: Set<string> = new Set(),
): any {
  if (!schema || typeof schema !== 'object' || !schema.$ref || typeof schema.$ref !== 'string') {
    return schema
  }

  const ref = schema.$ref
  if (seen.has(ref)) {
    return schema
  }
  seen.add(ref)

  let targetFile = currentFile
  let pointer = ''
  if (ref.includes('#')) {
    const parts = ref.split('#')
    if (parts[0]) {
      targetFile = parts[0]
    }
    pointer = parts[1] || ''
  }
  else {
    targetFile = ref
  }

  const root = schemasMap && targetFile ? schemasMap[targetFile] : undefined
  if (!root) {
    return schema
  }

  const resolved = resolveJsonPointer(root, pointer)
  return resolved ? dereferenceSchema(resolved, schemasMap, targetFile, seen) : schema
}

export function checkSchemaCompatibility(
  rawOldSchema: any,
  rawNewSchema: any,
  jsonPath: string = '#',
  context?: SchemaResolutionContext,
): string[] {
  const errors: string[] = []

  const oldSchema = dereferenceSchema(rawOldSchema, context?.oldSchemas, context?.currentFile)
  const newSchema = dereferenceSchema(rawNewSchema, context?.newSchemas, context?.currentFile)

  if (!oldSchema || typeof oldSchema !== 'object' || !newSchema || typeof newSchema !== 'object') {
    return errors
  }

  // 1. Enum value preservation: old enum values cannot be removed
  if (Array.isArray(oldSchema.enum)) {
    if (!Array.isArray(newSchema.enum)) {
      errors.push(`${jsonPath}: Enum definition was removed or changed to non-array.`)
    }
    else {
      const newEnumSet = new Set(newSchema.enum)
      for (const val of oldSchema.enum) {
        if (!newEnumSet.has(val)) {
          errors.push(`${jsonPath}: Enum value '${val}' was removed, breaking backward compatibility.`)
        }
      }
    }
  }

  // 2. Type preservation
  if (oldSchema.type && newSchema.type) {
    const oldTypes = Array.isArray(oldSchema.type) ? oldSchema.type : [oldSchema.type]
    const newTypes = Array.isArray(newSchema.type) ? newSchema.type : [newSchema.type]
    for (const ot of oldTypes) {
      if (!newTypes.includes(ot)) {
        errors.push(`${jsonPath}: Type '${ot}' was removed from permitted types, breaking backward compatibility.`)
      }
    }
  }

  // 3. Required properties: optional properties cannot become required
  if (Array.isArray(newSchema.required)) {
    const oldRequiredSet = new Set(Array.isArray(oldSchema.required) ? oldSchema.required : [])
    const oldProperties = oldSchema.properties || {}
    for (const req of newSchema.required) {
      if (!oldRequiredSet.has(req) && Object.hasOwn(oldProperties, req)) {
        errors.push(`${jsonPath}: Optional property '${req}' was made required, breaking backward compatibility.`)
      }
    }
  }

  // 4. Closed object property deletion: if additionalProperties is false, properties cannot be removed
  if (oldSchema.additionalProperties === false && oldSchema.properties && newSchema.properties) {
    for (const propName of Object.keys(oldSchema.properties)) {
      if (!Object.hasOwn(newSchema.properties, propName)) {
        errors.push(`${jsonPath}: Property '${propName}' was deleted from closed object (additionalProperties: false), breaking backward compatibility.`)
      }
    }
  }

  // Recursively inspect definitions / defs
  const oldDefs = oldSchema.$defs || oldSchema.definitions || {}
  const newDefs = newSchema.$defs || newSchema.definitions || {}
  for (const [defKey, oldDef] of Object.entries(oldDefs)) {
    if (newDefs[defKey]) {
      errors.push(...checkSchemaCompatibility(oldDef, newDefs[defKey], `${jsonPath}/$defs/${defKey}`, context))
    }
  }

  // Recursively inspect object properties
  if (oldSchema.properties && newSchema.properties) {
    for (const [propKey, oldProp] of Object.entries(oldSchema.properties)) {
      if (newSchema.properties[propKey]) {
        errors.push(...checkSchemaCompatibility(oldProp, newSchema.properties[propKey], `${jsonPath}/properties/${propKey}`, context))
      }
    }
  }

  // Recursively inspect array items
  if (oldSchema.items && newSchema.items) {
    errors.push(...checkSchemaCompatibility(oldSchema.items, newSchema.items, `${jsonPath}/items`, context))
  }

  return errors
}

export function verifySchemasBackwardCompatibility(
  options?: SchemaCompatibilityOptions,
): SchemaCompatibilityResult {
  const log = options?.reporter || (() => {})
  const schemasDir = options?.schemasDir || getWorkspacePaths().schemas
  const gitRef = options?.gitRef || 'HEAD'
  const errors: string[] = []

  if (!existsSync(schemasDir)) {
    return { valid: true, errors: [], skipped: true }
  }

  // Check if Git is available and has history
  let hasGit = false
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' })
    hasGit = true
  }
  catch {
    hasGit = false
  }

  if (!hasGit) {
    log('  [SKIP] Git repository not detected; schema backward compatibility check skipped.')
    return { valid: true, errors: [], skipped: true }
  }

  const schemaFiles = readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'))
  const oldSchemasMap: Record<string, any> = {}
  const newSchemasMap: Record<string, any> = {}

  for (const file of schemaFiles) {
    const currentPath = join(schemasDir, file)
    try {
      newSchemasMap[file] = JSON.parse(readFileSync(currentPath, 'utf-8'))
    }
    catch (err: any) {
      errors.push(`Failed to parse current schema '${file}': ${err.message}`)
      continue
    }

    try {
      const baseSchemaContent = execSync(`git show ${gitRef}:catalogs/schemas/${file}`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
      })
      oldSchemasMap[file] = JSON.parse(baseSchemaContent)
    }
    catch {
      // New schema file not present in gitRef is permissible
    }
  }

  for (const file of schemaFiles) {
    const baseSchema = oldSchemasMap[file]
    const currentSchema = newSchemasMap[file]
    if (!baseSchema || !currentSchema) {
      continue
    }

    const fileErrors = checkSchemaCompatibility(baseSchema, currentSchema, file, {
      oldSchemas: oldSchemasMap,
      newSchemas: newSchemasMap,
      currentFile: file,
    })
    errors.push(...fileErrors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
