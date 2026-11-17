import type { SpecCatalog } from '../../../catalogs/index.js'
import type { BloggerSkinVariableSymbol } from '../../../data-path.js'
import type {
  BloggerDiagnosticFix,
  BloggerDirectiveToken,
  BloggerStructureDiagnostic,
} from '../../../types.js'
import { resolveDataPath } from '../../../data-path.js'
import { checkSkinVarSubpath, isPrimitiveScalarLiteral, pushDiagnostic } from '../helpers.js'

export function validateDirectiveAttributeRules(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (!catalog.isDirective(token.tagName)) {
    return
  }

  const attrValidation = catalog.validateDirectiveAttributes(token)

  for (const inv of attrValidation.inverted) {
    const canonicalAttr = catalog.getInvertedAttribute(inv.code)
    const fixes: BloggerDiagnosticFix[] = []
    if (canonicalAttr && inv.start !== undefined) {
      fixes.push({
        edits: [{
          end: inv.start + inv.attribute.length,
          newText: canonicalAttr,
          start: inv.start,
        }],
        isPreferred: true,
        title: `Change '${inv.attribute}' to '${canonicalAttr}'`,
      })
    }
    pushDiagnostic(diagnostics, catalog, inv.code, token, {
      attribute: inv.attribute,
      end: inv.end ?? token.tagEnd,
      fixes: fixes.length > 0 ? fixes : undefined,
      start: inv.start ?? token.tagStart,
      suggestedReplacement: canonicalAttr,
    })
  }

  const missingDiag = catalog.getStandardDiagnostic('missing_required_attribute')
  for (const missing of attrValidation.missingRequired) {
    pushDiagnostic(diagnostics, catalog, missingDiag, token, {
      message: `Mandatory attribute '${missing}' is missing on <${token.tagName}>.`,
    })
  }

  const deprecatedDiag = catalog.getStandardDiagnostic('deprecated_attribute')
  for (const dep of attrValidation.deprecated) {
    const fixes: BloggerDiagnosticFix[] = []
    if (dep.replacement && dep.start !== undefined) {
      fixes.push({
        edits: [{
          end: dep.start + dep.name.length,
          newText: dep.replacement,
          start: dep.start,
        }],
        isPreferred: true,
        title: `Migrate '${dep.name}' to '${dep.replacement}'`,
      })
    }
    else if (!dep.replacement && dep.start !== undefined && dep.end !== undefined) {
      fixes.push({
        edits: [{
          end: dep.end,
          newText: '',
          start: dep.start,
        }],
        isPreferred: true,
        title: `Remove deprecated attribute '${dep.name}'`,
      })
    }
    pushDiagnostic(diagnostics, catalog, deprecatedDiag, token, {
      attribute: dep.name,
      end: dep.end ?? token.tagEnd,
      fixes: fixes.length > 0 ? fixes : undefined,
      message: `Attribute '${dep.name}' on <${token.tagName}> is deprecated. ${dep.reason || ''}`.trim(),
      start: dep.start ?? token.tagStart,
      suggestedReplacement: dep.replacement ?? undefined,
    })
  }

  const invalidExprDiag = catalog.getStandardDiagnostic('disallowed_expression_attribute')
  for (const invalidExpr of attrValidation.invalidExpressions) {
    const attrToken = token.attributes[invalidExpr]
    pushDiagnostic(diagnostics, catalog, invalidExprDiag, token, {
      end: attrToken?.end ?? token.tagEnd,
      message: `Attribute '${invalidExpr}' on <${token.tagName}> does not support expressions.`,
      start: attrToken?.start ?? token.tagStart,
    })
  }

  const disallowedValueDiag = catalog.getStandardDiagnostic('disallowed_attribute_value')
  for (const disallowed of attrValidation.disallowedValues) {
    pushDiagnostic(diagnostics, catalog, disallowedValueDiag, token, {
      end: disallowed.valueEnd ?? disallowed.end ?? token.tagEnd,
      message: `Value '${disallowed.value}' is not allowed for attribute '${disallowed.attribute}' on <${token.tagName}>. Allowed values: ${disallowed.allowed.join(', ')}.`,
      start: disallowed.valueStart ?? disallowed.start ?? token.tagStart,
    })
  }

  const emptyDiag = catalog.getStandardDiagnostic('empty_required_attribute')
  const allowedAttrs = catalog.getDirectiveAttributes(token.tagName) || {}
  const directive = catalog.getDirective(token.tagName)
  const rawTypeVal = token.attributes.type?.value
  const subTypeValue = typeof rawTypeVal === 'string' ? rawTypeVal.trim().toLowerCase() : undefined
  const subtypeMeta = (directive?.type_attributes && subTypeValue)
    ? directive.type_attributes[subTypeValue]
    : undefined

  for (const [attrName, meta] of Object.entries(allowedAttrs)) {
    if (token.tagName === 'Variable' && attrName === 'value' && subTypeValue === 'string') {
      continue
    }

    const isRequired = subtypeMeta?.required ? subtypeMeta.required.includes(attrName) : Boolean(meta.required)
    if (isRequired && !meta.allow_empty) {
      const attrToken = token.attributes[attrName] || token.attributes[`expr:${attrName}`]
      if (attrToken && !attrToken.value.trim()) {
        pushDiagnostic(diagnostics, catalog, emptyDiag, token, {
          end: attrToken.end,
          message: `Element <${token.tagName}> has an empty '${attrToken.name}' attribute.`,
          start: attrToken.start,
        })
      }
    }
  }
}

export function validateRootAttributes(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  const root = catalog.getRootAttributes()
  if (!root || token.isClosing || token.tagName !== 'html') {
    return
  }
  for (const [attr, expected] of Object.entries(root.required)) {
    const actual = token.attributes[attr]
    const replacement = `${attr}='${expected}'`
    if (!actual) {
      pushDiagnostic(diagnostics, catalog, root.missing_diagnostic, token, {
        attribute: attr,
        message: `Missing recommended root attribute '${attr}' on <html>. Expected value: '${expected}'.`,
        suggestedReplacement: replacement,
      })
    }
    else if (actual.value.trim() !== expected) {
      pushDiagnostic(diagnostics, catalog, root.invalid_value_diagnostic, token, {
        attribute: attr,
        end: actual.end,
        message: `Non-recommended value '${actual.value}' for root attribute '${attr}' on <html>. Expected: '${expected}' to prevent unmanaged platform resource injection.`,
        start: actual.start,
        suggestedReplacement: replacement,
      })
    }
  }
}

export function validateDataElement(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
  skinVariables?: Record<string, string | BloggerSkinVariableSymbol>,
  widgetType?: string,
): void {
  if (!token.tagName.startsWith('data:')) {
    return
  }

  // 1. BX1027: Direct parameterized message invocation (<data:messages.byAuthor/>)
  if (token.tagName.startsWith('data:messages.')) {
    const messageKey = token.tagName.slice('data:messages.'.length)
    const msgDef = catalog.getMessage(messageKey)
    if (msgDef && msgDef.direct_invocation === false) {
      const diagCode = msgDef.diagnostic || catalog.getMessageDiagnostic('direct_parameterized_invocation')
      const diagRule = catalog.getDiagnostic(diagCode)
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        end: token.tagEnd,
        message: diagRule?.message ?? `Parameterized message '${messageKey}' cannot be evaluated via direct tag invocation (<data:messages.${messageKey}/>). Use <b:message name='messages.${messageKey}'> with child <b:param> tags.`,
        start: token.tagStart,
      })
    }
  }

  // BX1054: Dot syntax in <data:skin.vars.admin.name/>
  if (token.tagName.startsWith('data:skin.vars.')) {
    const idPart = token.tagName.slice('data:skin.vars.'.length)
    const check = checkSkinVarSubpath(idPart, catalog, skinVariables)
    if (check.isInvalid && check.normalizedSubpath) {
      const normalized = `data:skin.vars.${check.normalizedSubpath}`
      pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('invalid_skin_var_data_path'), token, {
        end: token.tagEnd,
        fixes: [{
          edits: [{ end: token.tagEnd, newText: `<${normalized}/>`, start: token.tagStart }],
          isPreferred: true,
          title: `Normalize to '<${normalized}/>'`,
        }],
        message: `Skin variable tag '<${token.tagName}/>' must use underscore notation '<${normalized}/>' instead of dots.`,
        start: token.tagStart,
        suggestedReplacement: `<${normalized}/>`,
      })
    }
  }

  // BX1050: Deprecated data property on <data:.../>
  const resolved = resolveDataPath(token.tagName, { catalog, skinVariables, widgetType })
  if (resolved?.isDeprecated) {
    const replacement = resolved.definition?.replacement as string | undefined
    const fixes = replacement
      ? [{
          edits: [{ end: token.tagEnd, newText: `<${replacement}/>`, start: token.tagStart }],
          isPreferred: true,
          title: `Replace with '<${replacement}/>'`,
        }]
      : undefined
    pushDiagnostic(diagnostics, catalog, catalog.getStandardDiagnostic('deprecated_data_property'), token, {
      end: token.tagEnd,
      fixes,
      message: `Tag '<${token.tagName}/>' is deprecated in Layouts v3.${resolved.description ? ` ${resolved.description}` : ''}`,
      start: token.tagStart,
      suggestedReplacement: replacement ? `<${replacement}/>` : undefined,
    })
  }

  const rawTail = token.attributesText ? token.attributesText.trim() : ''
  if (!rawTail) {
    return
  }

  // 2. BX1032: Direct bracket indexing in data:* tag (<data:items[0]/>)
  if (rawTail.includes('[') || rawTail.includes(']')) {
    const bracketIndex = token.attributesText.indexOf('[')
    const start = bracketIndex !== -1 ? token.attributesOffset + bracketIndex : token.attributesOffset
    const end = token.tagEnd
    const diagCode = catalog.getStandardDiagnostic('prohibited_bracket_indexing_in_data_tag')
    pushDiagnostic(diagnostics, catalog, diagCode, token, {
      end,
      message: `Direct bracket indexing is forbidden in <${token.tagName}> tags. Use <b:eval expr='...'/> to index collections.`,
      start,
    })
    return
  }

  // 3. BX1048: Expression operators in data:* tag (<data:post.title ?: 'Default'/>)
  const hasOperator = /[?:+\-*%!=<>&|/]|\b(?:and|or|not|in|contains)\b/.test(rawTail) || /["']/.test(rawTail)
  if (hasOperator) {
    const diagCode = catalog.getStandardDiagnostic('prohibited_operator_in_data_tag')
    pushDiagnostic(diagnostics, catalog, diagCode, token, {
      end: token.tagEnd,
      message: `Expression operators are not permitted inside <${token.tagName}> tags. Use <b:eval expr='...'/> for expressions and computations.`,
      start: token.attributesOffset,
    })
    return
  }

  // 4. Regular attributes on data:* tag (<data:post.title class="x"/>)
  if (Object.keys(token.attributes).length > 0) {
    for (const [attrName, attrToken] of Object.entries(token.attributes)) {
      const diagCode = catalog.getStandardDiagnostic('unknown_directive')
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        attribute: attrName,
        end: attrToken.end,
        message: `Tag <${token.tagName}> does not accept attributes (found '${attrName}').`,
        start: attrToken.start,
      })
    }
  }
}

export function validateIncludeElement(
  token: BloggerDirectiveToken,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (token.tagName !== 'b:include') {
    return
  }

  // 1. BX1031: Non-object scalar payload or direct bracket array in data attribute
  const dataAttr = token.attributes.data || token.attributes['expr:data']
  if (dataAttr) {
    const val = dataAttr.value.trim()
    const isDirectBracketArray = val.startsWith('[') && val.endsWith(']')
    if (isPrimitiveScalarLiteral(val) || isDirectBracketArray) {
      const diagCode = catalog.getStandardDiagnostic('non_object_include_data_payload')
      const diagRule = catalog.getDiagnostic(diagCode)
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        attribute: dataAttr.name,
        end: dataAttr.end,
        message: diagRule?.message ?? 'The \'data\' attribute of <b:include> strictly requires an object reference, object literal { ... }, or brace-delimited array { ... }; passing direct bracket arrays [ ... ] or primitive scalars is prohibited.',
        start: dataAttr.start,
      })
    }
  }

  const nameAttr = token.attributes.name
  if (nameAttr?.value) {
    const rawName = nameAttr.value.trim()

    // 2. BX1058: Super inclusion warning in custom themes
    if (rawName.startsWith('super.')) {
      const diagCode = catalog.getInclusionDiagnostic('super_inclusion_warning')
      const diagRule = catalog.getDiagnostic(diagCode)
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        attribute: 'name',
        end: nameAttr.end,
        message: diagRule?.message ?? 'Referencing platform super.* inclusions delegates execution to Blogger\'s internal official theme templates. Avoid in custom themes to maintain visual and markup consistency.',
        start: nameAttr.start,
      })
    }

    const incName = rawName.startsWith('super.') ? rawName.slice('super.'.length) : rawName
    const incDef = catalog.getInclusion(incName)

    // 3. BX1059: Theme-bound inclusion warning
    if (incDef?.safety === 'theme_bound') {
      const diagCode = catalog.getInclusionDiagnostic('theme_bound_inclusion_warning')
      const diagRule = catalog.getDiagnostic(diagCode)
      const depMsg = incDef.theme_dependency ? ` (${incDef.theme_dependency.failure_reason})` : ''
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        attribute: 'name',
        end: nameAttr.end,
        message: `${diagRule?.message ?? 'Referenced server inclusion is bound to an official Blogger theme and fails in independent themes.'}${depMsg}`.trim(),
        start: nameAttr.start,
      })
    }

    // 4. BX1024: Deprecated server inclusion
    if (incDef?.deprecated || incDef?.safety === 'deprecated') {
      const diagCode = catalog.getStandardDiagnostic('deprecated_attribute')
      pushDiagnostic(diagnostics, catalog, diagCode, token, {
        attribute: 'name',
        end: nameAttr.end,
        message: `Server inclusion '${incName}' is deprecated. ${incDef?.deprecated?.reason ?? ''}`.trim(),
        start: nameAttr.start,
      })
    }
  }
}
