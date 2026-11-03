import type { SpecCatalog } from '../../catalogs/index.js'
import type { BirSkin } from '../types.js'
import { getSpecCatalog } from '../../catalogs/index.js'
import { toSkinVarIdentifier } from '../../data-path.js'
import { createSkinRuntimeValue, resolveSkinCssVariable } from '../../skin-compiler.js'

export function injectSkinVariables(
  skin: BirSkin | undefined,
  context: Record<string, unknown>,
): Record<string, any> {
  const effectiveContext: Record<string, any> = { ...context }
  if (skin && skin.variables.length > 0) {
    const rawOverrides: Record<string, unknown> = { ...((effectiveContext.skin as any)?.vars || {}) }
    const skinVars: Record<string, any> = { ...rawOverrides }
    for (const v of skin.variables) {
      const normName = toSkinVarIdentifier(v.name)
      const directRaw = rawOverrides[v.name] !== undefined
        ? String(rawOverrides[v.name])
        : (v.value ?? v.default ?? '')
      skinVars[v.name] = createSkinRuntimeValue(v.type, directRaw, { includeBackgroundImage: true })
      if (normName !== v.name) {
        const normRaw = rawOverrides[v.name] !== undefined
          ? String(rawOverrides[v.name])
          : (rawOverrides[normName] !== undefined ? String(rawOverrides[normName]) : (v.value ?? v.default ?? ''))
        skinVars[normName] = createSkinRuntimeValue(v.type, normRaw, { includeBackgroundImage: true })
      }
    }
    effectiveContext.skin = {
      ...(effectiveContext.skin as any || {}),
      vars: skinVars,
    }
    if (effectiveContext.data && typeof effectiveContext.data === 'object') {
      effectiveContext.data = {
        ...effectiveContext.data,
        skin: effectiveContext.skin,
      }
    }
  }
  return effectiveContext
}

export function renderSkinNode(
  role: 'page-skin' | 'template-skin',
  skin: BirSkin | undefined,
  ctx: Record<string, unknown>,
): string {
  const chunks = role === 'page-skin' ? skin?.css : skin?.templateSkinCss
  if (!chunks) {
    return ''
  }

  const resolvedVariables: Record<string, string> = {}
  const variableTypes: Record<string, string> = {}

  for (const v of skin?.variables ?? []) {
    const val = v.value ?? v.default ?? ''
    const norm = toSkinVarIdentifier(v.name)
    resolvedVariables[v.name] = val
    resolvedVariables[norm] = val
    variableTypes[v.name] = v.type
    variableTypes[norm] = v.type
  }

  const ctxVars = (ctx.skin as any)?.vars ?? (ctx.data as any)?.skin?.vars
  if (ctxVars && typeof ctxVars === 'object') {
    for (const [k, v] of Object.entries(ctxVars)) {
      if (v !== undefined && v !== null) {
        const strVal = String(v)
        resolvedVariables[k] = strVal
        if (k.includes('.')) {
          resolvedVariables[toSkinVarIdentifier(k)] = strVal
        }
      }
    }
  }

  let out = ''
  for (const chunk of chunks) {
    if (chunk.kind === 'text') {
      out += chunk.value
    }
    else {
      const resolved = resolveSkinCssVariable(chunk.variable, resolvedVariables, variableTypes)
      out += resolved !== undefined ? resolved : ''
    }
  }

  const id = role === 'template-skin' ? 'template-skin-1' : 'page-skin-1'
  return `<style id='${id}' type='text/css'><!--\n${out.trim()}\n--></style>`
}

export function renderSkinStyles(
  skin: BirSkin | undefined,
  ctx: Record<string, unknown>,
): string {
  if (!skin || !skin.css || skin.css.length === 0) {
    return ''
  }
  return renderSkinNode('page-skin', skin, ctx)
}

export function injectCookieNotice(
  html: string,
  context: Record<string, unknown>,
  catalog: SpecCatalog = getSpecCatalog(),
): string {
  const cookieChoices = (context.blog as any)?.cookieChoices ?? (context.data as any)?.blog?.cookieChoices
  if (cookieChoices !== true) {
    return html
  }

  if (html.includes('id="cookieChoiceInfo"')) {
    return html
  }

  const messages = (context.messages as any) ?? (context.data as any)?.messages ?? {}
  const locale = (context.blog as any)?.locale ?? (context.data as any)?.blog?.locale ?? 'en'

  const text = messages.euCookieNotice2018 ?? catalog.getLocalizedMessage('euCookieNotice2018', locale) ?? ''
  const learnMore = messages.learnMore ?? catalog.getLocalizedMessage('learnMore', locale) ?? ''
  const dismiss = messages.euCookieNoticeCloseButton ?? catalog.getLocalizedMessage('euCookieNoticeCloseButton', locale) ?? ''

  const cookieHtml = `<div id="cookieChoiceInfo" class="cookie-choices-info singleton-element"><div class="cookie-choices-inner"><span class="cookie-choices-text">${text}</span><span class="cookie-choices-buttons"><a href="https://www.blogger.com/go/blogspot-cookies" target="_blank" class="cookie-choices-button">${learnMore}</a><a id="cookieChoiceDismiss" href="#" class="cookie-choices-button">${dismiss}</a></span></div></div>`

  if (html.includes('</body>')) {
    return html.replace('</body>', `${cookieHtml}</body>`)
  }
  return html + cookieHtml
}
