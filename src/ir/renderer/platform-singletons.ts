import type { BirSkin } from '../types.js'
import { getSpecCatalog } from '../../catalogs/index.js'

export function injectSkinVariables(
  skin: BirSkin | undefined,
  context: Record<string, unknown>,
): Record<string, any> {
  const effectiveContext: Record<string, any> = { ...context }
  if (skin && skin.variables.length > 0) {
    const skinVars: Record<string, string> = { ...((effectiveContext.skin as any)?.vars || {}) }
    for (const v of skin.variables) {
      const val = v.value ?? v.default ?? ''
      skinVars[v.name] = skinVars[v.name] ?? val
      if (v.name.includes('.')) {
        const underscoreName = v.name.replace(/\./g, '_')
        skinVars[underscoreName] = skinVars[underscoreName] ?? val
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

export function renderSkinStyles(
  skin: BirSkin | undefined,
  ctx: Record<string, unknown>,
): string {
  if (!skin || !skin.css || skin.css.length === 0) {
    return ''
  }
  let out = ''
  for (const chunk of skin.css) {
    if (chunk.kind === 'text') {
      out += chunk.value
    }
    else {
      const varVal = (ctx.skin as any)?.vars?.[chunk.variable]
        ?? skin.variables.find(v => v.name === chunk.variable)?.default
        ?? ''
      out += varVal
    }
  }
  return out.trim() ? `<style id='page-skin-1' type='text/css'><!--\n${out.trim()}\n--></style>` : ''
}

export function injectCookieNotice(
  html: string,
  context: Record<string, unknown>,
): string {
  const cookieChoices = (context.blog as any)?.cookieChoices ?? (context.data as any)?.blog?.cookieChoices
  if (cookieChoices !== true) {
    return html
  }

  if (html.includes('id="cookieChoiceInfo"')) {
    return html
  }

  const messages = (context.messages as any) ?? (context.data as any)?.messages ?? {}
  const spec = getSpecCatalog()
  const locale = (context.blog as any)?.locale ?? (context.data as any)?.blog?.locale ?? 'en'

  const text = messages.euCookieNotice2018 || spec.getLocalizedMessage('euCookieNotice2018', locale) || 'This site uses cookies from Google to deliver its services and to analyze traffic.'
  const learnMore = messages.learnMore || spec.getLocalizedMessage('learnMore', locale) || 'Learn more'
  const dismiss = messages.euCookieNoticeCloseButton || spec.getLocalizedMessage('euCookieNoticeCloseButton', locale) || 'Got it'

  const cookieHtml = `<div id="cookieChoiceInfo" class="cookie-choices-info singleton-element"><div class="cookie-choices-inner"><span class="cookie-choices-text">${text}</span><span class="cookie-choices-buttons"><a href="https://www.blogger.com/go/blogspot-cookies" target="_blank" class="cookie-choices-button">${learnMore}</a><a id="cookieChoiceDismiss" href="#" class="cookie-choices-button">${dismiss}</a></span></div></div>`

  if (html.includes('</body>')) {
    return html.replace('</body>', `${cookieHtml}</body>`)
  }
  return html + cookieHtml
}

