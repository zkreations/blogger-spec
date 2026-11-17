import type { SpecCatalog } from '../../../catalogs/index.js'
import type { BloggerDirectiveToken, BloggerStructureDiagnostic } from '../../../types.js'
import { validateDirectiveNesting } from '../../../catalogs/index.js'
import { buildHallucinatedDirectiveFixes, pushDiagnostic } from '../helpers.js'

export { validateDirectiveNesting }

export function validateNestingRules(
  token: BloggerDirectiveToken,
  tagStack: readonly BloggerDirectiveToken[],
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
  allTokens?: readonly BloggerDirectiveToken[],
): void {
  if (catalog.isHallucinatedDirective(token.tagName)) {
    const diagCode = catalog.getHallucinatedDirectiveDiagnostic(token.tagName)
      ?? catalog.getStandardDiagnostic('prohibited_nesting')
    const fixes = buildHallucinatedDirectiveFixes(token, diagCode, catalog, allTokens)
    const transform = catalog.getHallucinatedDirectiveTransform(diagCode)
    pushDiagnostic(diagnostics, catalog, diagCode, token, {
      fixes: fixes.length > 0 ? fixes : undefined,
      suggestedReplacement: transform ? `<${transform.targetTag}>` : undefined,
    })
    return
  }

  const lowerTag = token.tagName.toLowerCase()
  if (lowerTag.startsWith('b:') && !catalog.isDirective(token.tagName) && !catalog.isDirective(lowerTag)) {
    const diagCode = catalog.getStandardDiagnostic('unknown_directive')
    const diagRule = catalog.getDiagnostic(diagCode)
    pushDiagnostic(diagnostics, catalog, diagCode, token, {
      message: diagRule?.message ?? `Unknown directive '<${token.tagName}>' in Blogger 'b:' XML namespace.`,
      rule: diagRule,
    })
    return
  }

  const isSection = token.tagName === 'b:section'
  const parentToken = tagStack.length > 0 ? tagStack[tagStack.length - 1] : undefined

  if (isSection && tagStack.some(t => t.tagName === 'b:section')) {
    const violation = validateDirectiveNesting('b:section', 'b:section', catalog)
    if (violation) {
      pushDiagnostic(diagnostics, catalog, violation.code, token, {
        message: violation.message,
        rule: violation.rule,
      })
    }
    return
  }

  if (isSection) {
    const invalidAncestor = tagStack.find(t =>
      t.tagName === 'b:widget' || t.tagName === 'b:includable' || t.tagName === 'b:defaultmarkup' || t.tagName === 'head' || t.tagName === 'b:loop',
    )
    if (invalidAncestor) {
      const defaultProhibited = catalog.getStandardDiagnostic('prohibited_nesting')
      pushDiagnostic(diagnostics, catalog, defaultProhibited, token, {
        message: `Tag <b:section> cannot be placed inside <${invalidAncestor.tagName}>.`,
      })
      return
    }
  }

  const isSkin = token.tagName === 'b:skin' || token.tagName === 'b:template-skin'
  if (isSkin && tagStack.some(t => t.tagName === 'b:widget')) {
    const violation = validateDirectiveNesting('b:widget', token.tagName, catalog)
      ?? catalog.validateDirectiveNesting('b:widget', token.tagName)
    if (violation) {
      pushDiagnostic(diagnostics, catalog, violation.code, token, {
        message: `Tag <${token.tagName}> cannot be placed inside widgets (Blogger formats it as self-closing <${token.tagName}/> and strips its content).`,
        rule: violation.rule,
      })
      return
    }
  }

  if (parentToken) {
    const violation = validateDirectiveNesting(parentToken.tagName, token.tagName, catalog)
    if (violation) {
      pushDiagnostic(diagnostics, catalog, violation.code, token, {
        message: violation.message,
        rule: violation.rule,
      })
    }
  }
  else if (!catalog.canBeAtRoot(token.tagName)) {
    const directiveDef = catalog.getDirective(token.tagName)
    const policyDiag = directiveDef?.grammar?.invalid_nesting_policy?.on_invalid_parent?.diagnostic
      ?? catalog.getStandardDiagnostic('prohibited_nesting')
    const rule = catalog.getDiagnostic(policyDiag)
    pushDiagnostic(diagnostics, catalog, policyDiag, token, {
      message: rule?.message,
      rule,
    })
  }
}
