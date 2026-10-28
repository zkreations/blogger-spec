import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getWorkspacePaths } from '../paths.js'

function readCatalog(name: string): any {
  const paths = getWorkspacePaths()
  const filePath = join(paths.catalogs, `${name}.json`)
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function readSchema(name: string): any {
  const paths = getWorkspacePaths()
  const filePath = join(paths.schemas, `${name}.schema.json`)
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

export function toPascalCase(name: string): string {
  const cleaned = name.replace(/^b:/, '').replace(/[^a-z0-9]/gi, ' ')
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

export function sanitizePropName(name: string): string {
  if (/^[A-Z_$][\w$]*$/i.test(name)) {
    return name
  }
  return JSON.stringify(name)
}

export function mapPropertyTypeToTs(type: string, typeDefinitions?: Record<string, { ts_type?: string }>): string {
  if (!type) {
    return 'any'
  }
  if (type.includes('|')) {
    return type.split('|').map(t => mapPropertyTypeToTs(t.trim(), typeDefinitions)).join(' | ')
  }
  const definition = typeDefinitions?.[type]
  if (definition?.ts_type) {
    return definition.ts_type
  }
  if (type.startsWith('array[') && type.endsWith(']')) {
    const inner = type.slice(6, -1).trim()
    const innerTs = mapPropertyTypeToTs(inner, typeDefinitions)
    return innerTs.includes('|') ? `(${innerTs})[]` : `${innerTs}[]`
  }
  if (typeDefinitions) {
    throw new Error(`Unknown canonical type '${type}' while generating TypeScript declarations.`)
  }
  return 'any'
}

export function generateCanonicalSchemaTypes(): string {
  const paths = getWorkspacePaths()
  // 1. Read Catalogs for dynamic domain union types and models
  const directivesData = readCatalog('directives')
  const operatorsData = readCatalog('operators')
  const diagnosticsData = readCatalog('diagnostics')
  const widgetsData = readCatalog('widgets')
  const settingsData = readCatalog('settings')
  const messagesData = readCatalog('messages')
  const globalsData = readCatalog('globals')
  const typesData = readCatalog('types')

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
  const viewIdEnum = (commonSchema.$defs?.viewId?.enum as string[]) || ['homepage', 'post_listing', 'search_query', 'label_search', 'archive_yearly', 'archive_monthly', 'archive_weekly_daily', 'post', 'static_page', 'error_404', 'preview', 'layout_mode']
  const viewFlagStateEnum = (globalsSchema.$defs?.viewFlagState?.enum as string[]) || ['true', 'false', 'missing']
  const diagRuleProps = diagSchema.$defs?.diagnosticRule?.properties || {}
  const categoryEnum = (diagRuleProps.category?.enum as string[]) || ['hallucination', 'syntax', 'expressions', 'quota', 'structure', 'deprecation', 'runtime']
  const severityEnum = (diagRuleProps.severity?.enum as string[]) || ['error', 'warning', 'info']

  const nestingActionEnum = (dirSchema.$defs?.invalidNestingPolicyAction?.properties?.action?.enum as string[]) || ['reject', 'strip', 'ignore']

  const deprecationStatusEnum = (commonSchema.$defs?.deprecationStatus?.enum as string[]) || ['deprecated_in_widget_v2', 'deprecated_in_layout_v3', 'ignored_in_layout_v3', 'obsolete', 'legacy']
  const deprecationActionEnum = (commonSchema.$defs?.deprecationAction?.enum as string[]) || ['migrate', 'remove']

  const incDefProps = incSchema.$defs?.inclusionDefinition?.properties || {}
  const incCategoryEnum = (incDefProps.category?.enum as string[]) || ['universal', 'common', 'icon', 'theme', 'deprecated']
  const incSafetyEnum = (incDefProps.safety?.enum as string[]) || ['portable', 'theme_bound', 'internal', 'deprecated']

  const stdDiagProps = dirSchema.properties?.domain_metadata?.properties?.standard_diagnostics?.properties || {}
  const stdDiagKeys = Object.keys(stdDiagProps).sort()

  const propertyTypeNames = Object.keys(typesData.types || {}).sort()

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
    `export type BloggerViewId = ${viewIdEnum.map(v => `'${v}'`).join(' | ')};`,
    '',
    `export type BloggerViewFlagState = ${viewFlagStateEnum.map(s => `'${s}'`).join(' | ')};`,
    '',
    `export type BloggerDiagnosticCategory = ${categoryEnum.map(c => `'${c}'`).join(' | ')};`,
    '',
    `export type BloggerDiagnosticSeverity = ${severityEnum.map(s => `'${s}'`).join(' | ')};`,
    '',
    `export type BloggerDirectiveNestingAction = ${nestingActionEnum.map(a => `'${a}'`).join(' | ')};`,
    '',
    `export type BloggerDeprecationStatus = ${deprecationStatusEnum.map(s => `'${s}'`).join(' | ')};`,
    '',
    `export type BloggerDeprecationAction = ${deprecationActionEnum.map(a => `'${a}'`).join(' | ')};`,
    '',
    `export type BloggerInclusionCategory = ${incCategoryEnum.map(c => `'${c}'`).join(' | ')};`,
    '',
    `export type BloggerInclusionSafety = ${incSafetyEnum.map(s => `'${s}'`).join(' | ')};`,
    '',
    `export type BloggerCanonicalPropertyType = ${propertyTypeNames.map(t => `'${t}'`).join(' | ')} | (string & {});`,
    '',
    `export type BloggerStandardDiagnosticKey = ${stdDiagKeys.map(k => `'${k}'`).join(' | ')};`,
    '',
    'export type BloggerStandardDiagnostics = Record<BloggerStandardDiagnosticKey, BloggerDiagnosticCode>;',
    '',
  ]

  const explicitRefTypeMap: Record<string, string> = {
    evidenceLevel: 'BloggerEvidenceLevel',
    verified_at: 'string',
    diagnosticCode: 'BloggerDiagnosticCode',
    canonicalProperty: 'BloggerCanonicalProperty',
    deprecatedEntry: 'BloggerDeprecatedEntry',
    deprecationStatus: 'BloggerDeprecationStatus',
    deprecationAction: 'BloggerDeprecationAction',
    patternDefinition: 'BloggerPatternDefinition',
    canonicalPropertyType: 'BloggerCanonicalPropertyType',
    empiricalMetadata: 'BloggerEmpiricalMetadata',
    operatorDataType: 'string',
    widgetSettingType: 'string',
    directiveAttributeType: 'string',
    invalidNestingPolicyAction: 'DirectiveNestingPolicyAction',
    invalidNestingPolicy: 'DirectiveInvalidNestingPolicy',
    directiveAttributeInversion: 'BloggerDirectiveAttributeInversion',
    directiveTypeAttributeDefinition: 'BloggerDirectiveTypeAttributeDefinition',
    attributeDefinition: 'BloggerDirectiveAttribute',
    grammarDefinition: 'BloggerDirectiveGrammar',
    operandDefinition: 'BloggerOperatorOperand',
    operatorOverload: 'BloggerOperatorOverload',
    syntaxVariants: 'BloggerOperatorSyntax',
    precedenceLevel: 'BloggerPrecedenceHierarchyLevel',
    operatorFamily: 'BloggerOperatorFamily',
    modifierDefinition: 'BloggerTypeModifierDefinition',
    typeDefinition: 'BloggerTypeDefinition',
    skinMetadata: 'BloggerSkinMetadata',
    coercionRule: 'BloggerCoercionRule',
    canonicalSetting: 'BloggerCanonicalSetting',
    parameterDefinition: 'BloggerMessageParameterDefinition',
  }

  function resolveRef(ref: string): string {
    const def = ref.includes('#/$defs/') ? ref.split('#/$defs/')[1] : ref
    if (explicitRefTypeMap[def]) {
      return explicitRefTypeMap[def]
    }
    const pascal = toPascalCase(def)
    if (pascal.startsWith('Blogger') || pascal.startsWith('Directive')) {
      return pascal
    }
    return `Blogger${pascal}`
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

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      out.push(`  [key: string]: ${schemaTypeToTs(schema.additionalProperties)};`)
    }

    out.push('}')
    out.push('')
    return out.join('\n')
  }

  // --- Common Reusable Schema Models ---
  lines.push('// =========================================================================')
  lines.push('// Common Reusable Schema Models (SSoT: common.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerDeprecatedEntry', commonSchema.$defs.deprecatedEntry))
  lines.push(generateInterface('BloggerPatternDefinition', commonSchema.$defs.patternDefinition))
  lines.push(generateInterface('BloggerCanonicalProperty', commonSchema.$defs.canonicalProperty))
  lines.push(generateInterface('BloggerEmpiricalMetadata', commonSchema.$defs.empiricalMetadata))

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
  lines.push('  domain_metadata?: {')
  lines.push('    subsystems: string[];')
  lines.push('  };')
  lines.push('  rules: Record<string, BloggerDiagnosticRule>;')
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
  lines.push('export type BloggerDeprecatedAttributeEntry = BloggerDeprecatedEntry;')
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
  lines.push('export interface BloggerRootAttributesCatalog {')
  lines.push('  required: Record<string, string>;')
  lines.push('  optional?: string[];')
  lines.push('  missing_diagnostic: BloggerDiagnosticCode;')
  lines.push('  invalid_value_diagnostic: BloggerDiagnosticCode;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerIncludableResolutionLevel {')
  lines.push('  level: number;')
  lines.push('  name: string;')
  lines.push('  scope: \'widget\' | \'global\' | \'all\';')
  lines.push('  description: string;')
  lines.push('  precedence_rule?: string;')
  lines.push('  diagnostic?: BloggerDiagnosticCode;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerIncludableResolutionHierarchy {')
  lines.push('  model: string;')
  lines.push('  description: string;')
  lines.push('  levels: BloggerIncludableResolutionLevel[];')
  lines.push('  collision_rules: {')
  lines.push('    same_level_containers: string;')
  lines.push('    same_level_blocks: string;')
  lines.push('  };')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerDomMutationPseudoAttribute {')
  lines.push('  value: string;')
  lines.push('  suppressed_from_output: boolean;')
  lines.push('  target_elements: string;')
  lines.push('  collapses_inner_whitespace: boolean;')
  lines.push('  forces_clean_void_closure: boolean;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerDomMutationPipelineCatalog {')
  lines.push('  target_resolution: {')
  lines.push('    description: string;')
  lines.push('    traversed_containers: string[];')
  lines.push('    boundary_crossings: string[];')
  lines.push('    widget_synthetic_wrapper_binding: string;')
  lines.push('  };')
  lines.push('  class_mutation: {')
  lines.push('    mode: string;')
  lines.push('    separator: string;')
  lines.push('    existing_class_policy: string;')
  lines.push('    loop_accumulation: boolean;')
  lines.push('  };')
  lines.push('  attr_mutation: {')
  lines.push('    mode: string;')
  lines.push('    empty_value_policy: string;')
  lines.push('    overwrite_policy: string;')
  lines.push('    allows_id_override: boolean;')
  lines.push('    special_pseudo_attributes: Record<string, BloggerDomMutationPseudoAttribute>;')
  lines.push('  };')
  lines.push('  tag_unwrapping: {')
  lines.push('    false_condition_behavior: string;')
  lines.push('  };')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerSkinCompilationCatalog {')
  lines.push('  page_skin: {')
  lines.push('    output_wrapper: string;')
  lines.push('    variable_substitution: {')
  lines.push('      syntax: string;')
  lines.push('      value_precedence: string;')
  lines.push('      composite_font_decomposition: string[];')
  lines.push('    };')
  lines.push('    metadata_cleanup: string;')
  lines.push('  };')
  lines.push('  template_skin: {')
  lines.push('    output_wrapper: string;')
  lines.push('    recommended_guard: string;')
  lines.push('  };')
  lines.push('  google_fonts_strategy: {')
  lines.push('    local_compiler_policy: string;')
  lines.push('    link_template: string;')
  lines.push('  };')
  lines.push('  expression_projection: {')
  lines.push('    dot_replacement: string;')
  lines.push('    target_namespace: string;')
  lines.push('  };')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerDirectivesCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  directives: Record<string, BloggerDirectiveDefinition>;')
  lines.push('  domain_metadata?: {')
  lines.push('    compiler_limits: BloggerCompilerLimits;')
  lines.push('    hallucinated_directives?: Record<string, BloggerDiagnosticCode>;')
  lines.push('    standard_diagnostics?: BloggerStandardDiagnostics;')
  lines.push('    html_void_elements?: string[];')
  lines.push('    layout_versions?: BloggerLayoutVersionsCatalog;')
  lines.push('    root_attributes?: BloggerRootAttributesCatalog;')
  lines.push('    includable_resolution_hierarchy?: BloggerIncludableResolutionHierarchy;')
  lines.push('    dom_mutation_pipeline?: BloggerDomMutationPipelineCatalog;')
  lines.push('    skin_compilation?: BloggerSkinCompilationCatalog;')
  lines.push('    grammar_groups?: Record<string, string[]>;')
  lines.push('  };')
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
  lines.push(generateInterface('BloggerOperatorFamily', opSchema.$defs.operatorFamily))
  lines.push(generateInterface('BloggerOperatorExample', opSchema.$defs.operatorExample))
  lines.push('export interface BloggerCompilerQuotas {')
  lines.push('  max_expression_tokens: number;')
  lines.push('  warning_expression_tokens: number;')
  lines.push('  token_cost_rules?: string;')
  lines.push('  diagnostic?: BloggerDiagnosticCode;')
  lines.push('  warning_diagnostic?: BloggerDiagnosticCode;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerEvaluationContexts {')
  lines.push('  compiler_quotas: BloggerCompilerQuotas;')
  lines.push('  dynamic_attributes: string[];')
  lines.push('  inert_contexts: string[];')
  lines.push('  default_allowed_contexts: string[];')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerOperatorsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  domain_metadata?: {')
  lines.push('    precedence_hierarchy: BloggerPrecedenceHierarchyLevel[];')
  lines.push('    evaluation_contexts: BloggerEvaluationContexts;')
  lines.push('    families: Record<string, BloggerOperatorFamily>;')
  lines.push('  };')
  lines.push('  operators: Record<string, BloggerOperatorDefinition>;')
  lines.push('}')
  lines.push('')

  // --- Types Catalog Models ---
  lines.push('// =========================================================================')
  lines.push('// Types & Coercion Catalog Models (SSoT: types.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerTypeModifierDefinition', typesSchema.$defs.modifierDefinition))
  lines.push(generateInterface('BloggerSkinMetadata', typesSchema.$defs.skinMetadata))
  lines.push(generateInterface('BloggerCoercionRule', typesSchema.$defs.coercionRule))
  lines.push(generateInterface('BloggerTypeDefinition', typesSchema.$defs.typeDefinition))
  lines.push('export interface BloggerTruthinessMatrix {')
  lines.push('  truthy: string[];')
  lines.push('  falsy: string[];')
  lines.push('  falsy_string_literals?: string[];')
  lines.push('  truthy_string_literals?: string[];')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerTypesCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  domain_metadata?: {')
  lines.push('    coercion_rules: Record<string, BloggerCoercionRule>;')
  lines.push('    truthiness_matrix: BloggerTruthinessMatrix;')
  lines.push('    scalar_types: string[];')
  lines.push('    theme_designer_descriptions?: string[];')
  lines.push('    semantics?: string[];')
  lines.push('  };')
  lines.push('  types: Record<string, BloggerTypeDefinition>;')
  lines.push('  modifiers?: Record<string, any>;')
  lines.push('}')
  lines.push('')

  // --- Globals & Widgets Models ---
  lines.push('// =========================================================================')
  lines.push('// Globals & Data Properties Catalog Models (SSoT: globals.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerRuntimeEvaluationState', globalsSchema.$defs.runtimeEvaluationState))
  lines.push('export interface BloggerViewFlagsMatrix {')
  lines.push('  isHomepage: BloggerViewFlagState;')
  lines.push('  isPost: BloggerViewFlagState;')
  lines.push('  isPage: BloggerViewFlagState;')
  lines.push('  isArchive: BloggerViewFlagState;')
  lines.push('  isSearch: BloggerViewFlagState;')
  lines.push('  isLabelSearch: BloggerViewFlagState;')
  lines.push('  isError: BloggerViewFlagState;')
  lines.push('  isPreview: BloggerViewFlagState;')
  lines.push('  isLayoutMode: BloggerViewFlagState;')
  lines.push('  isMultipleItems: BloggerViewFlagState;')
  lines.push('  isSingleItem: BloggerViewFlagState;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerViewMatrixEntry {')
  lines.push('  description: string;')
  lines.push('  url_patterns: string[];')
  lines.push('  blog_page_type: \'index\' | \'item\' | \'static_page\' | \'archive\' | \'error_page\';')
  lines.push('  view_type: \'feed\' | \'item\' | \'error\';')
  lines.push('  flags: BloggerViewFlagsMatrix;')
  lines.push('  notes?: string;')
  lines.push('}')
  lines.push('')
  lines.push(generateInterface('BloggerGlobalObjectDefinition', globalsSchema.$defs.globalObject))
  lines.push('export interface BloggerGlobalsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  domain_metadata?: {')
  lines.push('    root_datasets: string[];')
  lines.push('    runtime_evaluation_states?: Record<string, BloggerRuntimeEvaluationState>;')
  lines.push('    views?: Record<BloggerViewId, BloggerViewMatrixEntry>;')
  lines.push('  };')
  lines.push('  objects: Record<string, BloggerGlobalObjectDefinition>;')
  lines.push('}')
  lines.push('')
  lines.push(generateInterface('BloggerWidgetDefinition', widgetsSchema.$defs.widgetEntry))
  lines.push('')
  lines.push('export interface BloggerWidgetsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  domain_metadata?: {')
  lines.push('    layout_versions: number[];')
  lines.push('  };')
  lines.push('  common: BloggerWidgetDefinition;')
  lines.push('  widgets: Record<string, BloggerWidgetDefinition>;')
  lines.push('}')
  lines.push('')
  lines.push('// =========================================================================')
  lines.push('// Settings Catalog Models (SSoT: settings.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push(generateInterface('BloggerCanonicalSetting', settingsSchema.$defs.canonicalSetting))
  lines.push(generateInterface('BloggerWidgetSettingEntry', settingsSchema.$defs.widgetSettingEntry))
  lines.push('export type BloggerWidgetSettingsDefinition = BloggerWidgetSettingEntry;')
  lines.push('')
  lines.push('export interface BloggerSettingsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  domain_metadata?: {')
  lines.push('    layout_versions: number[];')
  lines.push('  };')
  lines.push('  widgets: Record<string, BloggerWidgetSettingEntry>;')
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
  lines.push('  domain_metadata?: {')
  lines.push('    patterns?: BloggerPatternDefinition[];')
  lines.push('  };')
  lines.push('  messages: Record<string, BloggerMessageDefinition>;')
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
  lines.push('  domain_metadata?: {')
  lines.push('    resolution_precedence: string[];')
  lines.push('  };')
  lines.push('  scopes: Record<string, BloggerScopeDefinition>;')
  lines.push('}')
  lines.push('')

  // --- Inclusions Models ---
  lines.push('// =========================================================================')
  lines.push('// Inclusions Catalog Models (SSoT: inclusions.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  if (incSchema.$defs?.inclusionThemeDependency) {
    lines.push(generateInterface('BloggerInclusionThemeDependency', incSchema.$defs.inclusionThemeDependency))
  }
  if (incSchema.$defs?.inclusionParameter) {
    lines.push(generateInterface('BloggerInclusionParameter', incSchema.$defs.inclusionParameter))
  }
  lines.push(generateInterface('BloggerInclusionDefinition', incSchema.$defs.inclusionDefinition))
  lines.push('export interface BloggerSuperPrefixRule {')
  lines.push('  prefix: string;')
  lines.push('  description: string;')
  lines.push('  behavior: string;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerSuperDelegationRule {')
  lines.push('  supported_widgets?: string[];')
  lines.push('  supported_subroutines?: string[];')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerInclusionsCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  domain_metadata?: {')
  lines.push('    super_prefix_rule: BloggerSuperPrefixRule;')
  lines.push('    standard_diagnostics?: Record<string, BloggerDiagnosticCode>;')
  lines.push('    super_delegation?: BloggerSuperDelegationRule;')
  lines.push('    widget_default_inclusions?: Record<string, string[]>;')
  lines.push('  };')
  lines.push('  inclusions: Record<string, BloggerInclusionDefinition>;')
  lines.push('}')
  lines.push('')

  // --- Locales Catalog Models ---
  lines.push('// =========================================================================')
  lines.push('// Locales Catalog Models (SSoT: locales.schema.json)')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push('export interface BloggerLocaleRecord {')
  lines.push('  bcp47: string;')
  lines.push('  underscore_code: string;')
  lines.push('  name: string;')
  lines.push('  language: string;')
  lines.push('  country: string;')
  lines.push('  script: string;')
  lines.push('  variant: string;')
  lines.push('  language_direction: \'ltr\' | \'rtl\';')
  lines.push('  language_alignment: \'left\' | \'right\';')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerMessageTranslationEntry {')
  lines.push('  default?: string;')
  lines.push('  pattern?: string;')
  lines.push('  direct_invocation: boolean;')
  lines.push('  values?: Record<string, string>;')
  lines.push('  plural_forms?: Record<string, Record<string, string>>;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerPropertyTranslationEntry {')
  lines.push('  default: string | null;')
  lines.push('  values: Record<string, string>;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerSharingPlatformTranslationEntry {')
  lines.push('  name: BloggerPropertyTranslationEntry;')
  lines.push('  share_message: BloggerPropertyTranslationEntry;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerLocalesCatalog {')
  lines.push('  $schema?: string;')
  lines.push('  version?: string;')
  lines.push('  title?: string;')
  lines.push('  description?: string;')
  lines.push('  domain_metadata?: {')
  lines.push('    total_locales: number;')
  lines.push('    default_locale: string;')
  lines.push('    rtl_locales: string[];')
  lines.push('    evidence: BloggerEvidenceLevel;')
  lines.push('    verified_at: string;')
  lines.push('  };')
  lines.push('  locales: Record<string, BloggerLocaleRecord>;')
  lines.push('  translations: {')
  lines.push('    messages: Record<string, BloggerMessageTranslationEntry>;')
  lines.push('    globals: Record<string, BloggerPropertyTranslationEntry | Record<string, BloggerSharingPlatformTranslationEntry>>;')
  lines.push('    widgets: Record<string, Record<string, BloggerPropertyTranslationEntry>>;')
  lines.push('  };')
  lines.push('}')
  lines.push('')

  // --- Subtypes & Modifiers ---
  lines.push('// =========================================================================')
  lines.push('// Subtypes & Modifiers')
  lines.push('// =========================================================================')
  lines.push('')

  const typeDefinitions: Record<string, any> = typesData.types || {}
  const stringModifiers = typesData.types?.string?.modifiers || {}
  const platformSubtypes = Object.entries(typeDefinitions)
    .filter(([, definition]) => (definition as any).category === 'subtype')
    .map(([name]) => name)
    .sort()

  for (const st of platformSubtypes) {
    const pascal = toPascalCase(st)
    const typeDef = typesData.types?.[st]
    const isStringSubtype = typeDef?.parent_type === 'string'
    const ownMods = typeDef?.modifiers || {}
    lines.push(`export interface Blogger${pascal}Modifiers {`)
    for (const [mName, mDef] of Object.entries(ownMods)) {
      if ((mDef as any).description) {
        lines.push(`  /** ${(mDef as any).description.replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */`)
      }
      let propType: string
      if (Array.isArray((mDef as any).allowed_values) && (mDef as any).allowed_values.length > 0) {
        propType = (mDef as any).allowed_values.map((v: any) => `'${v}'`).join(' | ')
      }
      else {
        propType = mapPropertyTypeToTs((mDef as any).output_type, typeDefinitions)
      }
      lines.push(`  ${sanitizePropName(mName)}?: ${propType};`)
    }
    if (isStringSubtype) {
      for (const [sName, sDef] of Object.entries(stringModifiers)) {
        if (!ownMods[sName]) {
          if ((sDef as any).description) {
            lines.push(`  /** ${(sDef as any).description.replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */`)
          }
          const propType = mapPropertyTypeToTs((sDef as any).output_type, typeDefinitions)
          lines.push(`  ${sanitizePropName(sName)}?: ${propType};`)
        }
      }
    }
    lines.push('}')
    if (isStringSubtype) {
      lines.push(`export type Blogger${pascal} = string & Blogger${pascal}Modifiers;`)
    }
    else {
      lines.push(`export type Blogger${pascal} = Blogger${pascal}Modifiers;`)
    }
    lines.push('')
  }

  lines.push('export type BloggerExpression = string;')
  lines.push('')

  // --- Directive Attribute Models ---
  lines.push('// =========================================================================')
  lines.push('// Directive Attribute Models')
  lines.push('// =========================================================================')
  lines.push('')

  const directives = directivesData.directives || {}
  const dirNamesSorted = Object.keys(directives).sort()

  for (const dName of dirNamesSorted) {
    const dInfo = directives[dName]
    const pascal = toPascalCase(dName)
    lines.push(`/** Attributes for directive \`<${dName}>\` */`)
    lines.push(`export interface Blogger${pascal}DirectiveAttributes {`)
    const attrs = dInfo.attributes || {}
    for (const aName of Object.keys(attrs).sort()) {
      const aInfo = attrs[aName]
      const opt = aInfo.required ? '' : '?'
      let tsType = 'any'
      if (aInfo.type === 'string')
        tsType = 'string'
      else if (aInfo.type === 'number')
        tsType = 'number'
      else if (aInfo.type === 'boolean')
        tsType = 'boolean'
      else if (aInfo.type === 'expression')
        tsType = 'BloggerExpression'

      if (aInfo.description) {
        lines.push(`  /** ${aInfo.description.replace(/\n/g, ' ')} */`)
      }
      lines.push(`  ${sanitizePropName(aName)}${opt}: ${tsType};`)

      if (aInfo.expr) {
        lines.push(`  /** Dynamic expression for \`${aName}\` */`)
        lines.push(`  ${sanitizePropName(`expr:${aName}`)}?: BloggerExpression;`)
      }
    }
    lines.push('}')
    lines.push('')
  }

  // --- Global Data Models ---
  lines.push('// =========================================================================')
  lines.push('// Global Data Models')
  lines.push('// =========================================================================')
  lines.push('')

  lines.push('/** Universal widget descriptor metadata in Layouts v3 */')
  lines.push('export interface BloggerWidgetDescriptor {')
  lines.push('  /** Unique widget instance ID (e.g. \'Blog1\', \'Header1\'). */')
  lines.push('  id?: string;')
  lines.push('  /** Parent <b:section> identifier containing the widget. */')
  lines.push('  sectionId?: string;')
  lines.push('  /** Configured widget header title. */')
  lines.push('  title?: string;')
  lines.push('  /** Canonical widget type name (e.g. \'Blog\', \'AdSense\'). */')
  lines.push('  type?: string;')
  lines.push('}')
  lines.push('')

  const messages = messagesData.messages || {}
  const globals = globalsData.objects || {}
  for (const gName of Object.keys(globals).sort()) {
    const cleanName = gName.replace(/^data:/, '')
    const pascal = toPascalCase(cleanName)
    lines.push(`/** Schema for global object \`${gName}\` */`)
    lines.push(`export interface Blogger${pascal}Global {`)
    const props = globals[gName]?.canonical || {}
    for (const [pName, pDef] of Object.entries(props).sort(([a], [b]) => a.localeCompare(b))) {
      const tsType = (Array.isArray((pDef as any).allowed_values) && (pDef as any).allowed_values.length > 0)
        ? (pDef as any).allowed_values.map((v: any) => `'${v}'`).join(' | ')
        : mapPropertyTypeToTs((pDef as any).type, typeDefinitions)
      if ((pDef as any).description) {
        lines.push(`  /** ${(pDef as any).description.replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */`)
      }
      lines.push(`  ${sanitizePropName(pName)}?: ${tsType};`)
    }
    if (cleanName === 'widgets') {
      for (const wType of widgetTypes) {
        if (!props[wType]) {
          lines.push(`  /** Collection of visible ${wType} gadget descriptors. */`)
          lines.push(`  ${sanitizePropName(wType)}?: BloggerWidgetDescriptor[];`)
        }
      }
      lines.push('  [instanceId: string]: any;')
    }
    if (globals[gName]?.catalog_ref === 'messages.json') {
      for (const [mName, mDef] of Object.entries(messages).sort(([a], [b]) => a.localeCompare(b))) {
        if ((mDef as any).description) {
          lines.push(`  /** ${(mDef as any).description.replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */`)
        }
        lines.push(`  ${sanitizePropName(mName)}?: BloggerMessage;`)
      }
    }
    lines.push('}')
    lines.push('')
  }

  // --- Widget Data Models ---
  lines.push('// =========================================================================')
  lines.push('// Widget Data Dictionaries')
  lines.push('// =========================================================================')
  lines.push('')

  const widgets = widgetsData.widgets || {}
  for (const wName of Object.keys(widgets).sort()) {
    const pascal = toPascalCase(wName)
    lines.push(`/** Canonical data dictionary for widget \`${wName}\` */`)
    lines.push(`export interface Blogger${pascal}WidgetData {`)
    const props = widgets[wName]?.canonical || {}
    for (const [pName, pDef] of Object.entries(props).sort(([a], [b]) => a.localeCompare(b))) {
      const tsType = (Array.isArray((pDef as any).allowed_values) && (pDef as any).allowed_values.length > 0)
        ? (pDef as any).allowed_values.map((v: any) => `'${v}'`).join(' | ')
        : mapPropertyTypeToTs((pDef as any).type, typeDefinitions)
      if ((pDef as any).description) {
        lines.push(`  /** ${(pDef as any).description.replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */`)
      }
      lines.push(`  ${sanitizePropName(pName)}?: ${tsType};`)
    }
    lines.push('}')
    lines.push('')
  }

  // --- Widget Settings Models ---
  lines.push('// =========================================================================')
  lines.push('// Widget Settings Dictionaries')
  lines.push('// =========================================================================')
  lines.push('')

  const settings = settingsData.widgets || {}
  for (const wName of Object.keys(settings).sort()) {
    const pascal = toPascalCase(wName)
    lines.push(`/** Schema settings dictionary for widget \`${wName}\` */`)
    lines.push(`export interface Blogger${pascal}WidgetSettings {`)
    const props = settings[wName]?.canonical || {}
    for (const [pName, pDef] of Object.entries(props).sort(([a], [b]) => a.localeCompare(b))) {
      const tsType = (Array.isArray((pDef as any).allowed_values) && (pDef as any).allowed_values.length > 0)
        ? (pDef as any).allowed_values.map((v: any) => `'${v}'`).join(' | ')
        : mapPropertyTypeToTs((pDef as any).type, typeDefinitions)
      if ((pDef as any).description) {
        lines.push(`  /** ${(pDef as any).description.replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */`)
      }
      lines.push(`  ${sanitizePropName(pName)}?: ${tsType};`)
    }
    lines.push('}')
    lines.push('')
  }

  // --- Aggregate Catalog Names & Maps ---
  lines.push('// =========================================================================')
  lines.push('// Aggregate Catalog Names & Maps')
  lines.push('// =========================================================================')
  lines.push('')

  const catalogFiles = readdirSync(paths.catalogs)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''))
    .sort()

  lines.push('export type BloggerCatalogName')
  lines.push(`  = | ${catalogFiles.map(c => `'${c}'`).join('\n    | ')};`)
  lines.push('')
  lines.push('export interface BloggerCatalogMap {')
  for (const c of catalogFiles) {
    lines.push(`  ${c}: Blogger${toPascalCase(c)}Catalog;`)
  }
  lines.push('}')
  lines.push('')
  lines.push('// =========================================================================')
  lines.push('// Conformance Fixtures & Manifest Models')
  lines.push('// =========================================================================')
  lines.push('')
  lines.push('export interface BloggerFixtureInput {')
  lines.push('  kind: \'expression\' | \'template\';')
  lines.push('  source: string;')
  lines.push('  mode?: \'fragment\' | \'full_document\';')
  lines.push('  context?: Record<string, any>;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerFixtureExpected {')
  lines.push('  outcome: \'value\' | \'html\' | \'rejected\';')
  lines.push('  value?: any;')
  lines.push('  html?: string;')
  lines.push('  canonicalDom?: boolean;')
  lines.push('  diagnosticCodes?: BloggerDiagnosticCode[];')
  lines.push('  stage?: \'parser\' | \'compiler\' | \'quota\' | \'linter\';')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerFixture {')
  lines.push('  id: string;')
  lines.push('  title: string;')
  lines.push('  evidence: BloggerEvidenceLevel;')
  lines.push('  verified_at: string;')
  lines.push('  covers: string[];')
  lines.push('  input: BloggerFixtureInput;')
  lines.push('  expected: BloggerFixtureExpected;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerFixtureSuite {')
  lines.push('  subsystem: string;')
  lines.push('  fixtures: BloggerFixture[];')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerFixturesManifestMetrics {')
  lines.push('  totalFixtures: number;')
  lines.push('  positiveFixtures: number;')
  lines.push('  negativeFixtures: number;')
  lines.push('  coveredSpecEntities: number;')
  lines.push('}')
  lines.push('')
  lines.push('export interface BloggerFixturesManifest {')
  lines.push('  version: string;')
  lines.push('  generatedAt: string;')
  lines.push('  metrics: BloggerFixturesManifestMetrics;')
  lines.push('  fixtures: BloggerFixture[];')
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}
