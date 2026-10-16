import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  getDiagnostics,
  getDirectives,
  getMessages,
  getOperators,
  getWidgets,
} from '../catalogs/index.js'
import { getWorkspacePaths } from '../paths.js'

function readSchema(name: string): any {
  const paths = getWorkspacePaths()
  const filePath = join(paths.schemas, `${name}.schema.json`)
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

export function generateCanonicalSchemaTypes(): string {
  // 1. Read Catalogs for dynamic domain union types
  const directivesData = getDirectives()
  const operatorsData = getOperators()
  const diagnosticsData = getDiagnostics()
  const widgetsData = getWidgets()
  const messagesData = getMessages()

  const dirNames = Object.keys(directivesData.directives || {}).sort()
  const widgetTypes = Object.keys(widgetsData.widgets || {}).sort()
  const ruleCodes = Object.keys(diagnosticsData.rules || {}).sort()
  const opNames = Object.keys(operatorsData.operators || {}).sort()
  const msgKeys = Object.keys(messagesData.messages || {}).sort()
  const layoutVersions = directivesData.domain_metadata?.layout_versions?.supported_versions || [1, 2, 3]

  // 2. Read Schemas for canonical enums & definitions
  const commonSchema = readSchema('common')
  const diagSchema = readSchema('diagnostics')
  const dirSchema = readSchema('directives')
  const incSchema = readSchema('inclusions')
  const opSchema = readSchema('operators')
  const typesSchema = readSchema('types')
  const globalsSchema = readSchema('globals')
  const widgetsSchema = readSchema('widgets')
  const settingsSchema = readSchema('settings')
  const messagesSchema = readSchema('messages')
  const scopesSchema = readSchema('scopes')

  // Extract enums directly from schemas
  const evidenceEnum = (commonSchema.$defs?.evidenceLevel?.enum as string[]) || ['official', 'observed', 'approximate', 'unknown']
  const diagRuleProps = diagSchema.$defs?.diagnosticRule?.properties || {}
  const categoryEnum = (diagRuleProps.category?.enum as string[]) || ['hallucination', 'syntax', 'expressions', 'quota', 'structure', 'deprecation', 'runtime']
  const severityEnum = (diagRuleProps.severity?.enum as string[]) || ['error', 'warning', 'info']

  const nestingActionEnum = (dirSchema.$defs?.invalidNestingPolicyAction?.properties?.action?.enum as string[]) || ['reject', 'strip', 'ignore']

  const incDefProps = incSchema.$defs?.inclusionDefinition?.properties || {}
  const incCategoryEnum = (incDefProps.category?.enum as string[]) || ['universal', 'common', 'icon', 'theme', 'deprecated']

  const stdDiagProps = dirSchema.properties?.domain_metadata?.properties?.standard_diagnostics?.properties || {}
  const stdDiagKeys = Object.keys(stdDiagProps).sort()

  const canonicalPropTypeEnum = (commonSchema.$defs?.canonicalPropertyType?.enum as string[]) || []

  const lines: string[] = [
    '/**',
    ' * blogger-spec — Canonical Generated Domain & Schema Types.',
    ' * Automatically generated from master JSON catalogs and JSON Schemas (Draft 2020-12).',
    ' * DO NOT EDIT MANUALLY.',
    ' */',
    '',
    '// =========================================================================',
    '// Domain Entity Literal Unions (SSoT: Master JSON Catalogs)',
    '// =========================================================================',
    '',
    `export type BloggerDirectiveName = ${dirNames.map(d => `'${d}'`).join(' | ')};`,
    '',
    `export type BloggerWidgetType = ${widgetTypes.map(w => `'${w}'`).join(' | ')};`,
    '',
    `export type BloggerDiagnosticCode = ${ruleCodes.map(c => `'${c}'`).join(' | ')};`,
    '',
    `export type BloggerOperatorName = ${opNames.map(o => JSON.stringify(o)).join(' | ')};`,
    '',
    `export type BloggerMessageKey = ${msgKeys.map(m => `'${m}'`).join(' | ')};`,
    '',
    '// =========================================================================',
    '// Canonical Enums (SSoT: Draft 2020-12 JSON Schemas)',
    '// =========================================================================',
    '',
    `export type BloggerEvidenceLevel = ${evidenceEnum.map(e => `'${e}'`).join(' | ')};`,
    '',
    `export type BloggerDiagnosticCategory = ${categoryEnum.map(c => `'${c}'`).join(' | ')};`,
    '',
    `export type BloggerDiagnosticSeverity = ${severityEnum.map(s => `'${s}'`).join(' | ')};`,
    '',
    `export type DirectiveNestingAction = ${nestingActionEnum.map(a => `'${a}'`).join(' | ')};`,
    '',
    `export type BloggerInclusionCategory = ${incCategoryEnum.map(c => `'${c}'`).join(' | ')};`,
    '',
    `export type BloggerCanonicalPropertyType = ${canonicalPropTypeEnum.map(t => `'${t}'`).join(' | ')};`,
    '',
    `export type BloggerStandardDiagnosticKey = ${stdDiagKeys.map(k => `'${k}'`).join(' | ')};`,
    '',
    'export type BloggerStandardDiagnostics = Record<BloggerStandardDiagnosticKey, BloggerDiagnosticCode>;',
    '',
  ]

  function resolveRef(ref: string): string {
    const def = ref.includes('#/$defs/') ? ref.split('#/$defs/')[1] : ref
    switch (def) {
      case 'evidenceLevel': return 'BloggerEvidenceLevel'
      case 'diagnosticCode': return 'BloggerDiagnosticCode'
      case 'canonicalProperty': return 'BloggerCanonicalProperty'
      case 'deprecatedEntry': return 'Record<string, any>'
      case 'patternDefinition': return 'Record<string, any>'
      case 'canonicalPropertyType': return 'BloggerCanonicalPropertyType'
      case 'operatorDataType': return 'string'
      case 'widgetSettingType': return 'string'
      case 'directiveAttributeType': return 'string'
      case 'invalidNestingPolicyAction': return 'DirectiveNestingPolicyAction'
      case 'invalidNestingPolicy': return 'DirectiveInvalidNestingPolicy'
      case 'directiveAttributeInversion': return 'BloggerDirectiveAttributeInversion'
      case 'directiveTypeAttributeDefinition': return 'BloggerDirectiveTypeAttributeDefinition'
      case 'attributeDefinition': return 'BloggerDirectiveAttribute'
      case 'grammarDefinition': return 'BloggerDirectiveGrammar'
      case 'operandDefinition': return 'BloggerOperatorOperand'
      case 'operatorOverload': return 'BloggerOperatorOverload'
      case 'syntaxVariants': return 'BloggerOperatorSyntax'
      case 'precedenceLevel': return 'BloggerPrecedenceHierarchyLevel'
      case 'modifierDefinition': return 'BloggerTypeModifierDefinition'
      case 'typeDefinition': return 'BloggerTypeDefinition'
      case 'skinMetadata': return 'Record<string, any>'
      case 'canonicalSetting': return 'BloggerCanonicalSetting'
      case 'parameterDefinition': return 'BloggerMessageParameterDefinition'
      default: return 'any'
    }
  }

  function schemaTypeToTs(schema: any): string {
    if (!schema)
      return 'any'
    if (schema.$ref)
      return resolveRef(schema.$ref)
    if (schema.enum && Array.isArray(schema.enum)) {
      return schema.enum.map((v: any) => typeof v === 'string' ? `'${v}'` : String(v)).join(' | ')
    }
    if (schema.const !== undefined) {
      return typeof schema.const === 'string' ? `'${schema.const}'` : String(schema.const)
    }

    const t = schema.type
    if (Array.isArray(t)) {
      return t.map(sub => schemaTypeToTs({ ...schema, type: sub })).join(' | ')
    }

    if (t === 'string')
      return 'string'
    if (t === 'integer' || t === 'number')
      return 'number'
    if (t === 'boolean')
      return 'boolean'
    if (t === 'null')
      return 'null'

    if (t === 'array') {
      if (schema.items) {
        const itemType = schemaTypeToTs(schema.items)
        return itemType.includes('|') ? `(${itemType})[]` : `${itemType}[]`
      }
      return 'any[]'
    }

    if (t === 'object') {
      if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        return `Record<string, ${schemaTypeToTs(schema.additionalProperties)}>`
      }
      return 'Record<string, any>'
    }

    return 'any'
  }

  function generateInterface(name: string, schema: any, description?: string): string {
    const out: string[] = []
    if (description || schema.description) {
      out.push(`/** ${(description || schema.description).replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */`)
    }
    out.push(`export interface ${name} {`)
    const props = schema.properties || {}
    const required = new Set(schema.required || [])

    for (const [propName, propDef] of Object.entries(props)) {
      const pDef = propDef as any
      if (pDef.description) {
        out.push(`  /** ${pDef.description.replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */`)
      }
      const opt = required.has(propName) ? '' : '?'
      const tsType = schemaTypeToTs(pDef)
      out.push(`  ${propName}${opt}: ${tsType};`)
    }

    out.push('  [key: string]: any;')
    out.push('}')
    out.push('')
    return out.join('\n')
  }

  // --- Diagnostics Catalog Models ---
  lines.push('// =========================================================================')
  lines.push('// Diagnostics Catalog Models (SSoT: diagnostics.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerDiagnosticRule', diagSchema.$defs.diagnosticRule))
  lines.push('export interface BloggerDiagnosticsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  rules: Record<string, BloggerDiagnosticRule>;')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')

  // --- Directives Catalog Models ---
  lines.push('// =========================================================================')
  lines.push('// Directives & Nesting Catalog Models (SSoT: directives.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('DirectiveNestingPolicyAction', dirSchema.$defs.invalidNestingPolicyAction))
  lines.push('export interface DirectiveInvalidNestingPolicy {')
  lines.push('  on_invalid_parent?: DirectiveNestingPolicyAction;')
  lines.push('  on_invalid_child?: DirectiveNestingPolicyAction & {')
  lines.push('    exceptions?: Record<string, DirectiveNestingPolicyAction>;')
  lines.push('  };')
  lines.push('}')
  lines.push('')
  lines.push(generateInterface('BloggerDirectiveGrammar', dirSchema.$defs.grammarDefinition))
  lines.push(generateInterface('BloggerDirectiveAttributeInversion', dirSchema.$defs.directiveAttributeInversion))
  lines.push(generateInterface('BloggerDirectiveTypeAttributeDefinition', dirSchema.$defs.directiveTypeAttributeDefinition))
  lines.push(generateInterface('BloggerDirectiveAttribute', dirSchema.$defs.attributeDefinition))
  lines.push(generateInterface('BloggerDirectiveDefinition', dirSchema.$defs.directiveDefinition))
  lines.push(`export type BloggerLayoutVersion = ${layoutVersions.join(' | ') || 'never'};`)
  lines.push('')
  lines.push('export interface BloggerLayoutVersionDefinition {')
  lines.push('  version: BloggerLayoutVersion;')
  lines.push('  name: string;')
  lines.push('  description: string;')
  lines.push('  structural_markers?: string[];')
  lines.push('  prohibited_markers?: string[];')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerLayoutVersionsCatalog {')
  lines.push('  supported_versions: BloggerLayoutVersion[];')
  lines.push('  default_version: BloggerLayoutVersion;')
  lines.push('  explicit_attributes: string[];')
  lines.push('  versions: Record<string, BloggerLayoutVersionDefinition>;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerCompilerLimits {')
  lines.push('  max_directive_nesting_depth: number;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerDirectivesCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  directives: Record<string, BloggerDirectiveDefinition>;')
  lines.push('  domain_metadata?: {')
  lines.push('    theme_designer_descriptions?: string[];')
  lines.push('    grammar_groups?: Record<string, string[]>;')
  lines.push('    layout_versions?: BloggerLayoutVersionsCatalog;')
  lines.push('    compiler_limits?: BloggerCompilerLimits;')
  lines.push('    hallucinated_directives?: Record<string, BloggerDiagnosticCode>;')
  lines.push('    standard_diagnostics?: BloggerStandardDiagnostics;')
  lines.push('    [key: string]: any;')
  lines.push('  };')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')

  // --- Operators Catalog Models ---
  lines.push('// =========================================================================')
  lines.push('// Operators & Expressions Catalog Models (SSoT: operators.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerOperatorOperand', opSchema.$defs.operandDefinition))
  lines.push(generateInterface('BloggerOperatorOverload', opSchema.$defs.operatorOverload))
  lines.push(generateInterface('BloggerOperatorSyntax', opSchema.$defs.syntaxVariants))
  lines.push(generateInterface('BloggerOperatorDefinition', opSchema.$defs.operatorDefinition))
  lines.push(generateInterface('BloggerPrecedenceHierarchyLevel', opSchema.$defs.precedenceLevel))
  lines.push('export interface BloggerCompilerQuotas {')
  lines.push('  max_expression_tokens: number;')
  lines.push('  warning_expression_tokens: number;')
  lines.push('  token_cost_rules?: string;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerOperatorsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  precedence_hierarchy?: BloggerPrecedenceHierarchyLevel[];')
  lines.push('  operators: Record<string, BloggerOperatorDefinition>;')
  lines.push('  families?: Record<string, any>;')
  lines.push('  evaluation_contexts?: {')
  lines.push('    compiler_quotas?: BloggerCompilerQuotas;')
  lines.push('    dynamic_attributes?: string[];')
  lines.push('    inert_contexts?: string[];')
  lines.push('    default_allowed_contexts?: string[];')
  lines.push('    [key: string]: any;')
  lines.push('  };')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')

  // --- Types Catalog Models ---
  lines.push('// =========================================================================')
  lines.push('// Types & Coercion Catalog Models (SSoT: types.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerTypeModifierDefinition', typesSchema.$defs.modifierDefinition))
  lines.push(generateInterface('BloggerTypeDefinition', typesSchema.$defs.typeDefinition))
  lines.push('export interface BloggerTypesCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  coercion_rules?: Record<string, any>;')
  lines.push('  truthiness_matrix?: {')
  lines.push('    truthy: string[];')
  lines.push('    falsy: string[];')
  lines.push('    falsy_string_literals?: string[];')
  lines.push('    truthy_string_literals?: string[];')
  lines.push('  };')
  lines.push('  scalar_types?: string[];')
  lines.push('  types: Record<string, BloggerTypeDefinition>;')
  lines.push('  modifiers?: Record<string, any>;')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')

  // --- Globals & Widgets Models ---
  lines.push('// =========================================================================')
  lines.push('// Globals & Data Properties Catalog Models (SSoT: globals.schema.json, widgets.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerCanonicalProperty', commonSchema.$defs.canonicalProperty))
  lines.push(generateInterface('BloggerGlobalObjectDefinition', globalsSchema.$defs.globalObject))
  lines.push('export interface BloggerGlobalsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  objects: Record<string, BloggerGlobalObjectDefinition>;')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')
  lines.push(generateInterface('BloggerWidgetDefinition', widgetsSchema.$defs.widgetEntry))
  lines.push('export interface BloggerWidgetsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  widgets: Record<string, BloggerWidgetDefinition>;')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')

  // --- Settings Models ---
  lines.push('// =========================================================================')
  lines.push('// Settings Catalog Models (SSoT: settings.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerCanonicalSetting', settingsSchema.$defs.canonicalSetting))
  lines.push(generateInterface('BloggerWidgetSettingsDefinition', settingsSchema.$defs.widgetEntry))
  lines.push('export interface BloggerSettingsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  widgets: Record<string, BloggerWidgetSettingsDefinition>;')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')

  // --- Messages Models ---
  lines.push('// =========================================================================')
  lines.push('// Messages Catalog Models (SSoT: messages.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerMessageParameterDefinition', messagesSchema.$defs.parameterDefinition))
  lines.push(generateInterface('BloggerMessageDefinition', messagesSchema.$defs.messageDefinition))
  lines.push('export interface BloggerMessagesCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  patterns?: any[];')
  lines.push('  messages: Record<string, BloggerMessageDefinition>;')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')

  // --- Scopes Models ---
  lines.push('// =========================================================================')
  lines.push('// Scopes Catalog Models (SSoT: scopes.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerScopeDefinition', scopesSchema.$defs.scopeDefinition))
  lines.push('export interface BloggerScopesCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  resolution_precedence?: string[];')
  lines.push('  scopes: Record<string, BloggerScopeDefinition>;')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')

  // --- Inclusions Models ---
  lines.push('// =========================================================================')
  lines.push('// Inclusions Catalog Models (SSoT: inclusions.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerInclusionDefinition', incSchema.$defs.inclusionDefinition))
  lines.push('export interface BloggerInclusionsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  super_prefix_rule: {')
  lines.push('    prefix: string;')
  lines.push('    description: string;')
  lines.push('    behavior: string;')
  lines.push('  };')
  lines.push('  inclusions: Record<string, BloggerInclusionDefinition>;')
  lines.push('  [key: string]: any;')
  lines.push('}')
  lines.push('')

  // --- Aggregate Catalog Names & Maps ---
  lines.push('// =========================================================================')
  lines.push('// Aggregate Catalog Names & Maps')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push('export type BloggerCatalogName')
  lines.push('  = | \'directives\'')
  lines.push('    | \'operators\'')
  lines.push('    | \'types\'')
  lines.push('    | \'widgets\'')
  lines.push('    | \'settings\'')
  lines.push('    | \'globals\'')
  lines.push('    | \'messages\'')
  lines.push('    | \'scopes\'')
  lines.push('    | \'diagnostics\'')
  lines.push('    | \'inclusions\';')
  lines.push('')
  lines.push('export interface BloggerCatalogMap {')
  lines.push('  directives: BloggerDirectivesCatalog;')
  lines.push('  operators: BloggerOperatorsCatalog;')
  lines.push('  types: BloggerTypesCatalog;')
  lines.push('  widgets: BloggerWidgetsCatalog;')
  lines.push('  settings: BloggerSettingsCatalog;')
  lines.push('  globals: BloggerGlobalsCatalog;')
  lines.push('  messages: BloggerMessagesCatalog;')
  lines.push('  scopes: BloggerScopesCatalog;')
  lines.push('  diagnostics: BloggerDiagnosticsCatalog;')
  lines.push('  inclusions: BloggerInclusionsCatalog;')
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}
