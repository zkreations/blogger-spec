import { HTML_VOID_ELEMENTS } from '../../parser/directive-scanner.js'

export { HTML_VOID_ELEMENTS }

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function escapeAttr(str: string): string {
  return str
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function normalizeProtocolUrl(val: string, enable = false): string {
  if (enable && val.startsWith('//')) {
    return `https:${val}`
  }
  return val
}
