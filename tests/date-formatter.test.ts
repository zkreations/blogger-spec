import { describe, expect, it } from 'vitest'
import { formatIcuDate } from '../src/context/date-formatter.js'
import { evaluateExpression, parseExpression } from '../src/index.js'

describe('date-formatter and TR35 format operator', () => {
  const sampleDate = new Date('2026-10-15T14:30:45Z')

  it('formats year tokens (yyyy, yy, YYYY, YY)', () => {
    expect(formatIcuDate(sampleDate, 'yyyy')).toBe('2026')
    expect(formatIcuDate(sampleDate, 'YYYY')).toBe('2026')
    expect(formatIcuDate(sampleDate, 'yy')).toBe('26')
    expect(formatIcuDate(sampleDate, 'YY')).toBe('26')
  })

  it('formats month tokens in english (M, MM, MMM, MMMM, MMMMM)', () => {
    expect(formatIcuDate(sampleDate, 'M', 'en')).toBe('10')
    expect(formatIcuDate(sampleDate, 'MM', 'en')).toBe('10')
    expect(formatIcuDate(sampleDate, 'MMM', 'en')).toBe('Oct')
    expect(formatIcuDate(sampleDate, 'MMMM', 'en')).toBe('October')
    expect(formatIcuDate(sampleDate, 'MMMMM', 'en')).toBe('O')
  })

  it('formats month tokens in spanish', () => {
    expect(formatIcuDate(sampleDate, 'MMMM', 'es')).toMatch(/octubre/i)
    expect(formatIcuDate(sampleDate, 'MMM', 'es')).toMatch(/oct/i)
  })

  it('formats day tokens (d, dd, D)', () => {
    expect(formatIcuDate(sampleDate, 'd')).toBe(String(sampleDate.getDate()))
    expect(formatIcuDate(sampleDate, 'dd')).toBe(String(sampleDate.getDate()).padStart(2, '0'))
    expect(formatIcuDate(sampleDate, 'D')).toBeTruthy()
  })

  it('formats weekday tokens in english and spanish (EEEE, EEE)', () => {
    expect(formatIcuDate(sampleDate, 'EEEE', 'en')).toBe('Thursday')
    expect(formatIcuDate(sampleDate, 'EEE', 'en')).toBe('Thu')
    expect(formatIcuDate(sampleDate, 'EEEE', 'es')).toMatch(/jueves/i)
  })

  it('formats time tokens (HH, H, hh, h, mm, ss)', () => {
    expect(formatIcuDate(sampleDate, 'mm')).toBe('30')
    expect(formatIcuDate(sampleDate, 'ss')).toBe('45')
  })

  it('preserves single-quoted literal text without substitution', () => {
    const formatted = formatIcuDate(sampleDate, 'd \'de\' MMMM \'del\' yyyy', 'es')
    expect(formatted).toMatch(/15 de octubre del 2026/i)
  })

  it('evaluates infix format operator in template expressions', () => {
    const expr = parseExpression('data:post.date format "MMMM d, yyyy"')
    const ctx = {
      blog: { locale: 'en' },
      post: { date: sampleDate },
    }
    const res = evaluateExpression(expr, ctx)
    expect(res).toBe('October 15, 2026')
  })

  it('evaluates functional format operator in template expressions with locale', () => {
    const expr = parseExpression('format(data:post.date, "EEEE, d \'de\' MMMM", "es")')
    const ctx = {
      blog: { locale: 'es' },
      post: { date: sampleDate },
    }
    const res = evaluateExpression(expr, ctx)
    expect(res).toMatch(/jueves, 15 de octubre/i)
  })

  it('returns empty string on null or undefined input', () => {
    expect(formatIcuDate(null, 'yyyy')).toBe('')
    expect(formatIcuDate(undefined, 'yyyy')).toBe('')
  })
})
