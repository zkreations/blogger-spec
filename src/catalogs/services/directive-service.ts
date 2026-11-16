import type {
  BloggerCompilerLimits,
  BloggerDiagnosticCode,
  BloggerDiagnosticRule,
  BloggerDirectiveAttribute,
  BloggerDirectiveAttributesValidationResult,
  BloggerDirectiveAttributeToken,
  BloggerDirectiveAttributeViolation,
  BloggerDirectiveDefinition,
  BloggerDirectiveName,
  BloggerDirectiveNestingAction,
  BloggerDirectiveNestingViolation,
  BloggerDirectivesCatalog,
  BloggerDirectiveToken,
  BloggerDomMutationPipelineCatalog,
  BloggerHallucinatedDirectiveConfig,
  BloggerIncludableResolutionHierarchy,
  BloggerLayoutVersionsCatalog,
  BloggerRenderPipelineCatalog,
  BloggerRootAttributesCatalog,
  BloggerSkinCompilationCatalog,
  BloggerStandardDiagnosticKey,
} from '../../types.js'
import type { CatalogStore } from '../store.js'
import { BLOGGER_BOOLEAN_VALUES } from '../../types.js'

export type DirectiveAttributesValidationTarget
  = | BloggerDirectiveToken
    | { tagName: string, attributes: Record<string, BloggerDirectiveAttributeToken | { value?: string }> | string[] }

export interface DirectiveSnippetOptions {
  readonly selfClosing?: boolean
  readonly indent?: string
  readonly quote?: '\'' | '"'
}

export interface DirectiveDiagnosticResolver {
  getStandardDiagnostic: (key: BloggerStandardDiagnosticKey) => BloggerDiagnosticCode
  getDiagnostic: (code: string) => BloggerDiagnosticRule | undefined
}

export class DirectiveCatalogService {
  private readonly directiveMap = new Map<string, BloggerDirectiveDefinition>()
  private readonly grammarGroupMap = new Map<string, string[]>()
  private readonly expandedValidChildrenMap = new Map<string, Set<string>>()
  private readonly expandedValidParentsMap = new Map<string, Set<string>>()
  private readonly hallucinatedDirectives = new Map<string, BloggerDiagnosticCode>()
  private readonly hallucinatedDirectiveTransforms = new Map<string, BloggerHallucinatedDirectiveConfig>()
  private readonly invertedAttributeMaps = new Map<string, string>()
  private readonly htmlVoidElements = new Set<string>()

  constructor(
    private readonly store: CatalogStore,
    private readonly diagnostics: DirectiveDiagnosticResolver,
  ) {
    this.index()
  }

  private index(): void {
    const dirCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    const directives = dirCatalog?.directives || {}
    const groups = (dirCatalog?.domain_metadata?.grammar_groups as Record<string, string[]>) || {}
    for (const [groupName, members] of Object.entries(groups)) {
      if (Array.isArray(members)) {
        this.grammarGroupMap.set(groupName, members)
      }
    }

    const hallucinated = dirCatalog?.domain_metadata?.hallucinated_directives || {}
    for (const [tag, code] of Object.entries(hallucinated)) {
      this.hallucinatedDirectives.set(tag.toLowerCase(), code as BloggerDiagnosticCode)
    }

    const transforms = dirCatalog?.domain_metadata?.hallucinated_directive_transforms || {}
    for (const [code, config] of Object.entries(transforms)) {
      this.hallucinatedDirectiveTransforms.set(code, config)
    }

    const inverted = dirCatalog?.domain_metadata?.inverted_attribute_maps || {}
    for (const [code, attr] of Object.entries(inverted)) {
      this.invertedAttributeMaps.set(code, attr)
    }

    const voidElements = (dirCatalog?.domain_metadata?.html_void_elements as string[]) || []
    for (const el of voidElements) {
      this.htmlVoidElements.add(el.toLowerCase())
    }

    for (const [name, def] of Object.entries(directives)) {
      this.directiveMap.set(name, def)
    }

    for (const [name, def] of Object.entries(directives)) {
      if (def.grammar?.valid_children) {
        this.expandedValidChildrenMap.set(name, this.expandGroupTokens(def.grammar.valid_children))
      }
      if (def.grammar?.valid_parents) {
        this.expandedValidParentsMap.set(name, this.expandGroupTokens(def.grammar.valid_parents))
      }
    }
  }

  private expandGroupTokens(tokens: readonly string[]): Set<string> {
    const result = new Set<string>()
    const visited = new Set<string>()

    const walk = (token: string) => {
      if (visited.has(token)) {
        return
      }
      visited.add(token)

      if (token.startsWith('@')) {
        const members = this.grammarGroupMap.get(token) || []
        for (const member of members) {
          walk(member)
        }
      }
      else {
        result.add(token)
      }
    }

    for (const token of tokens) {
      walk(token)
    }

    return result
  }

  private isTagAllowedInSet(tag: string, allowedSet: Set<string>): boolean {
    if (allowedSet.has(tag)) {
      return true
    }
    if (tag.startsWith('data:') && allowedSet.has('data:*')) {
      return true
    }
    const lower = tag.toLowerCase()
    if (allowedSet.has(lower)) {
      return true
    }
    if (!this.isDirective(tag) && lower !== 'head' && lower !== 'html' && lower !== 'body' && allowedSet.has('html:*')) {
      return true
    }
    return false
  }

  isDirective(tagName: string): tagName is BloggerDirectiveName {
    return this.directiveMap.has(tagName) || tagName.startsWith('data:')
  }

  getDirective(tagName: string): BloggerDirectiveDefinition | undefined {
    if (this.directiveMap.has(tagName)) {
      return this.directiveMap.get(tagName)
    }
    if (tagName.startsWith('data:')) {
      return this.directiveMap.get('data:*')
    }
    return undefined
  }

  getAllDirectives(): Record<string, BloggerDirectiveDefinition> {
    const result: Record<string, BloggerDirectiveDefinition> = {}
    for (const [k, v] of this.directiveMap.entries()) {
      result[k] = v
    }
    return result
  }

  isSelfClosingDirective(tagName: string): boolean {
    const def = this.getDirective(tagName)
    return Boolean(def?.closure_mode === 'self_closing')
  }

  canNest(parentTag: string, childTag: string): boolean {
    const parentDef = this.getDirective(parentTag)
    const childDef = this.getDirective(childTag)

    if (parentDef) {
      if (this.isSelfClosingDirective(parentTag)) {
        return false
      }
      const canonicalParent = parentTag.startsWith('data:') ? 'data:*' : parentTag
      const allowedChildren = this.expandedValidChildrenMap.get(canonicalParent)
      if (allowedChildren) {
        if (!this.isTagAllowedInSet(childTag, allowedChildren)) {
          return false
        }
      }
    }

    if (childDef) {
      const canonicalChild = childTag.startsWith('data:') ? 'data:*' : childTag
      const allowedParents = this.expandedValidParentsMap.get(canonicalChild)
      if (allowedParents) {
        if (!this.isTagAllowedInSet(parentTag, allowedParents)) {
          return false
        }
      }
    }

    return true
  }

  validateDirectiveNesting(parentTag: string, childTag: string): BloggerDirectiveNestingViolation | null {
    if (this.canNest(parentTag, childTag)) {
      return null
    }

    const parentDef = this.getDirective(parentTag)
    const childDef = this.getDirective(childTag)

    const defaultProhibitedCode = this.diagnostics.getStandardDiagnostic('prohibited_nesting')
    let diagCode = defaultProhibitedCode
    let action: BloggerDirectiveNestingAction = 'reject'

    const parentPolicy = parentDef?.grammar?.invalid_nesting_policy?.on_invalid_child
    if (parentPolicy) {
      const exception = parentPolicy.exceptions?.[childTag]
      if (exception) {
        diagCode = exception.diagnostic
        action = exception.action
      }
      else {
        diagCode = parentPolicy.diagnostic
        action = parentPolicy.action
      }
    }
    else {
      const childPolicy = childDef?.grammar?.invalid_nesting_policy?.on_invalid_parent
      if (childPolicy) {
        diagCode = childPolicy.diagnostic
        action = childPolicy.action
      }
    }

    const rule = this.diagnostics.getDiagnostic(diagCode)
      ?? this.diagnostics.getDiagnostic(defaultProhibitedCode)
      ?? {
        code: diagCode,
        name: `Nesting Diagnostic ${diagCode}`,
        category: 'syntax',
        severity: 'error',
        message: `Tag <${childTag}> is not permitted inside <${parentTag}>.`,
        evidence: 'unknown',
        verified_at: '2026-01-01',
      }

    let message = rule.message
    if (rule.code === defaultProhibitedCode) {
      message = `Tag <${childTag}> is not permitted inside <${parentTag}>.`
    }

    return {
      code: (rule.code ?? diagCode) as BloggerDiagnosticCode,
      rule,
      action,
      message,
    }
  }

  canBeAtRoot(tagName: string): boolean {
    const def = this.getDirective(tagName)
    if (!def) {
      return true
    }
    const validParents = def.grammar?.valid_parents
    if (!validParents) {
      return true
    }
    return validParents.some(p => p.startsWith('@') || p === 'body' || p === 'head' || p === 'html:*')
  }

  getDirectiveAttributes(tagName: string): Record<string, BloggerDirectiveAttribute> | undefined {
    return this.getDirective(tagName)?.attributes
  }

  validateDirectiveAttributes(
    target: string | DirectiveAttributesValidationTarget,
    attributesOrCatalog?: string[] | Record<string, BloggerDirectiveAttributeToken | { value?: string }> | any,
  ): BloggerDirectiveAttributesValidationResult {
    let tagName: string
    let attributesRecord: Record<string, { value?: string, start?: number, end?: number, valueStart?: number, valueEnd?: number }> = {}
    let presentAttributes: string[] = []

    if (typeof target === 'string') {
      tagName = target
      if (Array.isArray(attributesOrCatalog)) {
        presentAttributes = []
        for (const attr of attributesOrCatalog) {
          const eqIdx = attr.indexOf('=')
          if (eqIdx !== -1) {
            const attrName = attr.slice(0, eqIdx).trim()
            const val = attr.slice(eqIdx + 1).replace(/^["']|["']$/g, '').trim()
            attributesRecord[attrName] = { value: val }
            presentAttributes.push(attrName)
          }
          else {
            attributesRecord[attr] = {}
            presentAttributes.push(attr)
          }
        }
      }
      else if (attributesOrCatalog && typeof attributesOrCatalog === 'object' && !('getAllDirectives' in attributesOrCatalog)) {
        attributesRecord = attributesOrCatalog as any
        presentAttributes = Object.keys(attributesRecord)
      }
    }
    else {
      tagName = target.tagName
      if (Array.isArray(target.attributes)) {
        presentAttributes = []
        for (const attr of target.attributes) {
          const eqIdx = attr.indexOf('=')
          if (eqIdx !== -1) {
            const attrName = attr.slice(0, eqIdx).trim()
            const val = attr.slice(eqIdx + 1).replace(/^["']|["']$/g, '').trim()
            attributesRecord[attrName] = { value: val }
            presentAttributes.push(attrName)
          }
          else {
            attributesRecord[attr] = {}
            presentAttributes.push(attr)
          }
        }
      }
      else if (target.attributes && typeof target.attributes === 'object') {
        attributesRecord = target.attributes as any
        presentAttributes = Object.keys(attributesRecord)
      }
    }

    for (const [k, v] of Object.entries(attributesRecord as Record<string, any>)) {
      if (typeof v === 'string') {
        attributesRecord[k] = { value: v }
      }
    }

    const directive = this.getDirective(tagName)
    if (!directive) {
      return {
        valid: false,
        missingRequired: [],
        unknown: presentAttributes,
        deprecated: [],
        invalidExpressions: [],
        inverted: [],
        disallowedValues: [],
        violations: presentAttributes.map(attr => ({
          attribute: attr,
          code: this.diagnostics.getStandardDiagnostic('unknown_directive'),
          message: `Unknown directive <${tagName}>.`,
          ...attributesRecord[attr],
        })),
      }
    }

    const allowedAttrs = directive.attributes || {}
    const deprecatedMap = directive.deprecated_attributes || {}
    const allowsArbitrary = Boolean(directive.grammar?.arbitrary_attributes)

    const unknown: string[] = []
    const deprecated: BloggerDirectiveAttributesValidationResult['deprecated'] = []
    const invalidExpressions: string[] = []
    const inverted: BloggerDirectiveAttributesValidationResult['inverted'] = []
    const disallowedValues: BloggerDirectiveAttributesValidationResult['disallowedValues'] = []
    const violations: BloggerDirectiveAttributeViolation[] = []

    const inversions = directive.attribute_inversions || {}
    for (const [invAttr, invDef] of Object.entries(inversions)) {
      const expectedAttr = invDef.expected
      const hasInv = presentAttributes.includes(invAttr)
      const hasExpected = presentAttributes.includes(expectedAttr) || presentAttributes.includes(`expr:${expectedAttr}`)
      if (hasInv && !hasExpected) {
        const tokenInfo = attributesRecord[invAttr]
        const invCode = invDef.diagnostic as BloggerDiagnosticCode
        inverted.push({
          code: invCode,
          attribute: invAttr,
          expected: expectedAttr,
          start: tokenInfo?.start,
          end: tokenInfo?.end,
          valueStart: tokenInfo?.valueStart,
          valueEnd: tokenInfo?.valueEnd,
        })
        violations.push({
          attribute: invAttr,
          code: invCode,
          message: `Attribute '${invAttr}' is inverted; expected '${expectedAttr}' on <${tagName}>.`,
          ...tokenInfo,
        })
      }
    }

    for (const attr of presentAttributes) {
      const hasExpr = attr.startsWith('expr:')
      const canonicalAttr = hasExpr ? attr.slice(5) : attr
      const tokenInfo = attributesRecord[attr]

      if (deprecatedMap[canonicalAttr]) {
        const depMeta = deprecatedMap[canonicalAttr]!
        deprecated.push({
          name: attr,
          reason: depMeta.reason,
          replacement: depMeta.replacement,
          start: tokenInfo?.start,
          end: tokenInfo?.end,
          valueStart: tokenInfo?.valueStart,
          valueEnd: tokenInfo?.valueEnd,
        })
        violations.push({
          attribute: attr,
          code: this.diagnostics.getStandardDiagnostic('deprecated_attribute'),
          message: `Attribute '${attr}' on <${tagName}> is deprecated. ${depMeta.reason || ''}`.trim(),
          ...tokenInfo,
        })
      }
      else if (allowedAttrs[canonicalAttr]) {
        const meta = allowedAttrs[canonicalAttr]!
        if (hasExpr && (meta.expr === false || meta.attribute_kind === 'static_literal')) {
          invalidExpressions.push(attr)
          violations.push({
            attribute: attr,
            code: this.diagnostics.getStandardDiagnostic('disallowed_expression_attribute'),
            message: `Attribute '${attr}' on <${tagName}> does not support expressions.`,
            ...tokenInfo,
          })
        }
        else if (!hasExpr && meta.attribute_kind !== 'native_expression') {
          const isBooleanAttr = meta.type === 'boolean'
          const allowedValues = meta.allowed_values ?? (isBooleanAttr ? BLOGGER_BOOLEAN_VALUES : undefined)

          if (allowedValues && Array.isArray(allowedValues)) {
            const val = tokenInfo?.value
            if (val !== undefined && val !== '') {
              const isAllowed = isBooleanAttr
                ? allowedValues.some(a => a.toLowerCase() === val.toLowerCase())
                : allowedValues.includes(val)

              if (!isAllowed) {
                disallowedValues.push({
                  attribute: attr,
                  value: val,
                  allowed: allowedValues,
                  start: tokenInfo?.start,
                  end: tokenInfo?.end,
                  valueStart: tokenInfo?.valueStart,
                  valueEnd: tokenInfo?.valueEnd,
                })
                const disallowedCode = (this.diagnostics.getStandardDiagnostic('disallowed_attribute_value') ?? 'BX1043') as BloggerDiagnosticCode
                violations.push({
                  attribute: attr,
                  code: disallowedCode,
                  message: `Value '${val}' is not allowed for attribute '${attr}' on <${tagName}>. Allowed values: ${allowedValues.join(', ')}.`,
                  ...tokenInfo,
                })
              }
            }
          }
        }
      }
      else if (inverted.some(inv => inv.attribute === canonicalAttr)) {
        // Handled as specific inverted diagnostic
      }
      else if (!allowsArbitrary) {
        unknown.push(attr)
        violations.push({
          attribute: attr,
          code: this.diagnostics.getStandardDiagnostic('unknown_directive'),
          message: `Unknown attribute '${attr}' on <${tagName}>.`,
          ...tokenInfo,
        })
      }
    }

    const rawTypeVal = attributesRecord.type?.value
    const subTypeValue = typeof rawTypeVal === 'string' ? rawTypeVal.trim().toLowerCase() : undefined
    const subtypeMeta = (directive.type_attributes && subTypeValue)
      ? directive.type_attributes[subTypeValue]
      : undefined

    const missingRequired: string[] = []
    const requiredAttrsToCheck = subtypeMeta?.required
      ? subtypeMeta.required
      : Object.entries(allowedAttrs).filter(([_, meta]) => meta.required).map(([name]) => name)

    for (const attrName of requiredAttrsToCheck) {
      if (inverted.some(inv => inv.expected === attrName)) {
        continue
      }

      const meta = allowedAttrs[attrName]
      const hasLiteral = presentAttributes.includes(attrName)
      const allowsExpr = meta ? (meta.expr !== false && meta.attribute_kind !== 'static_literal') : false
      const hasExpr = allowsExpr && presentAttributes.includes(`expr:${attrName}`)

      if (!hasLiteral && !hasExpr) {
        missingRequired.push(attrName)
        violations.push({
          attribute: attrName,
          code: this.diagnostics.getStandardDiagnostic('missing_required_attribute'),
          message: `Mandatory attribute '${attrName}' is missing on <${tagName}>.`,
        })
      }
    }

    return {
      valid: missingRequired.length === 0
        && unknown.length === 0
        && invalidExpressions.length === 0
        && inverted.length === 0
        && disallowedValues.length === 0,
      missingRequired,
      unknown,
      deprecated,
      invalidExpressions,
      inverted,
      disallowedValues,
      violations,
    }
  }

  getLayoutVersions(): BloggerLayoutVersionsCatalog | undefined {
    const directivesCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return directivesCatalog?.domain_metadata?.layout_versions
  }

  getRootAttributes(): BloggerRootAttributesCatalog | undefined {
    const directivesCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return directivesCatalog?.domain_metadata?.root_attributes
  }

  getIncludableResolutionHierarchy(): BloggerIncludableResolutionHierarchy | undefined {
    const directivesCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return directivesCatalog?.domain_metadata?.includable_resolution_hierarchy
  }

  getDomMutationPipeline(): BloggerDomMutationPipelineCatalog | undefined {
    const directivesCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return directivesCatalog?.domain_metadata?.dom_mutation_pipeline
  }

  getSkinCompilation(): BloggerSkinCompilationCatalog | undefined {
    const directivesCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return directivesCatalog?.domain_metadata?.skin_compilation
  }

  getRenderPipeline(): BloggerRenderPipelineCatalog | undefined {
    const directivesCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return directivesCatalog?.domain_metadata?.render_pipeline
  }

  getHtmlVoidElements(): ReadonlySet<string> {
    return this.htmlVoidElements
  }

  getCompilerLimits(): BloggerCompilerLimits | undefined {
    const dirCatalog = this.store.getCatalog('directives') as BloggerDirectivesCatalog
    return dirCatalog?.domain_metadata?.compiler_limits
  }

  getDirectiveNestingLimit(): number {
    const limit = this.getCompilerLimits()?.max_directive_nesting_depth
    if (limit === undefined) {
      throw new Error('Missing compiler_limits.max_directive_nesting_depth in directives catalog')
    }
    return limit
  }

  getIncludeRecursionLimit(): number {
    const limit = this.getCompilerLimits()?.max_include_recursion_depth
    if (limit === undefined) {
      throw new Error('Missing compiler_limits.max_include_recursion_depth in directives catalog')
    }
    return limit
  }

  getHallucinatedDirectives(): ReadonlyMap<string, BloggerDiagnosticCode> {
    return this.hallucinatedDirectives
  }

  isHallucinatedDirective(tagName: string): boolean {
    return this.hallucinatedDirectives.has(tagName.toLowerCase())
  }

  getHallucinatedDirectiveDiagnostic(tagName: string): BloggerDiagnosticCode | undefined {
    return this.hallucinatedDirectives.get(tagName.toLowerCase())
  }

  getHallucinatedDirectiveTransform(code: string): BloggerHallucinatedDirectiveConfig | undefined {
    return this.hallucinatedDirectiveTransforms.get(code)
  }

  getInvertedAttribute(code: string): string | undefined {
    return this.invertedAttributeMaps.get(code)
  }

  isDirectiveExpressionAttribute(tagName: string, attrName: string): boolean {
    if (attrName.startsWith('expr:')) {
      return true
    }
    const def = this.getDirective(tagName)
    const attrDef = def?.attributes?.[attrName]
    return Boolean(attrDef?.attribute_kind === 'native_expression' || attrDef?.type === 'expression')
  }

  getDirectiveSnippet(tagName: string, options?: DirectiveSnippetOptions): string {
    const def = this.getDirective(tagName)
    if (!def) {
      return `<${tagName}>$0</${tagName}>`
    }

    const attrs = def.attributes || {}
    const requiredAttrNames = Object.keys(attrs).filter(attrName => attrs[attrName]?.required)

    let tabstopIndex = 1
    const attrSnippets: string[] = []

    const isThemeDesignerVar = tagName === 'Variable' || tagName === 'Group'
    const quote = options?.quote ?? (isThemeDesignerVar ? '"' : '\'')

    for (const attrName of requiredAttrNames) {
      let placeholder = attrName
      if (attrName === 'values') {
        placeholder = 'data:items'
      }
      else if (attrName === 'var') {
        placeholder = tagName === 'b:switch' ? 'data:view.type' : 'item'
      }
      else if (attrName === 'cond') {
        placeholder = 'data:condition'
      }
      else if (attrName === 'expr') {
        placeholder = 'data:expression'
      }
      else if (attrName === 'value') {
        placeholder = tagName === 'b:case' ? 'item' : 'value'
      }
      else if (attrName === 'name') {
        placeholder = 'name'
      }
      else if (attrName === 'id') {
        placeholder = 'id'
      }
      else if (attrName === 'type') {
        placeholder = 'type'
      }

      attrSnippets.push(`${attrName}=${quote}\${${tabstopIndex++}:${placeholder}}${quote}`)
    }

    const attrsString = attrSnippets.length > 0 ? ` ${attrSnippets.join(' ')}` : ''
    const isSelfClosing = options?.selfClosing ?? (def.closure_mode === 'self_closing')
    const indent = options?.indent ?? '  '

    if (isSelfClosing) {
      return `<${tagName}${attrsString}/>$0`
    }

    return `<${tagName}${attrsString}>\n${indent}$0\n</${tagName}>`
  }
}
