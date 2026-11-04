import { formatIcuDate } from '../../context/date-formatter.js'

export function format(dateVal: any, pattern: string, locale = 'en', timeZone?: string): string {
  if (dateVal === null || dateVal === undefined)
    return ''
  return formatIcuDate(dateVal, String(pattern), locale, timeZone)
}

export function evaluateBinaryFormat(leftVal: any, rightVal: any, context: Record<string, any>): string {
  const locale = context.blog?.locale || (context as any)?.locale || 'en'
  const timeZone = context.blog?.timeZone || (context as any)?.timeZone
  return format(leftVal, String(rightVal), locale, timeZone)
}

export function evaluateCallFormat(args: any[], context: Record<string, any>): string {
  const locale = context.blog?.locale || (context as any)?.locale || 'en'
  const timeZone = context.blog?.timeZone || (context as any)?.timeZone
  return format(args[0], args[1], locale, timeZone)
}
