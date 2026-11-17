import { getSpecCatalog } from '../catalogs/index.js'

const ISO_OFFSET_REGEX = /([+-])(\d{2}):?(\d{2})$/

export function formatIcuDate(
  input: Date | string | number | null | undefined,
  pattern: string,
  locale = 'en',
  timeZone?: string,
): string {
  if (input === null || input === undefined || input === '') {
    return ''
  }

  const rawDate = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(rawDate.getTime())) {
    return String(input)
  }

  let effectiveDate = rawDate
  let effectiveTimeZone = timeZone || 'UTC'
  let fixedTzLabel = effectiveTimeZone

  if (!timeZone && typeof input === 'string') {
    const offsetMatch = ISO_OFFSET_REGEX.exec(input.trim())
    if (offsetMatch) {
      const sign = offsetMatch[1] === '-' ? -1 : 1
      const offsetHours = Number.parseInt(offsetMatch[2]!, 10)
      const offsetMins = Number.parseInt(offsetMatch[3]!, 10)
      const totalOffsetMs = sign * (offsetHours * 60 + offsetMins) * 60000
      effectiveDate = new Date(rawDate.getTime() + totalOffsetMs)
      effectiveTimeZone = 'UTC'
      fixedTzLabel = `GMT${offsetMatch[1]}${offsetMatch[2]}:${offsetMatch[3]}`
    }
  }

  const intlLocale = getSpecCatalog().resolveBcp47Locale(locale)

  let yearNum = effectiveDate.getUTCFullYear()
  let monthIdx = effectiveDate.getUTCMonth() + 1
  let dayVal = effectiveDate.getUTCDate()
  let hour24 = effectiveDate.getUTCHours()
  let minVal = effectiveDate.getUTCMinutes()
  let secVal = effectiveDate.getUTCSeconds()

  if (effectiveTimeZone !== 'UTC') {
    try {
      const numParts = new Intl.DateTimeFormat('en-US', {
        timeZone: effectiveTimeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hourCycle: 'h23',
      }).formatToParts(effectiveDate)
      for (const p of numParts) {
        if (p.type === 'year')
          yearNum = Number.parseInt(p.value, 10)
        else if (p.type === 'month')
          monthIdx = Number.parseInt(p.value, 10)
        else if (p.type === 'day')
          dayVal = Number.parseInt(p.value, 10)
        else if (p.type === 'hour')
          hour24 = Number.parseInt(p.value, 10) % 24
        else if (p.type === 'minute')
          minVal = Number.parseInt(p.value, 10)
        else if (p.type === 'second')
          secVal = Number.parseInt(p.value, 10)
      }
      const tzParts = new Intl.DateTimeFormat(intlLocale, {
        timeZone: effectiveTimeZone,
        timeZoneName: 'short',
      }).formatToParts(effectiveDate)
      fixedTzLabel = tzParts.find(p => p.type === 'timeZoneName')?.value || effectiveTimeZone
    }
    catch {
      effectiveTimeZone = 'UTC'
      fixedTzLabel = 'UTC'
    }
  }

  const calendarInstant = new Date(Date.UTC(yearNum, monthIdx - 1, dayVal, hour24, minVal, secVal))

  const fullWeekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'long', timeZone: 'UTC' }).format(calendarInstant)
  const shortWeekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'short', timeZone: 'UTC' }).format(calendarInstant)
  const narrowWeekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'narrow', timeZone: 'UTC' }).format(calendarInstant)
  const fullMonth = new Intl.DateTimeFormat(intlLocale, { month: 'long', timeZone: 'UTC' }).format(calendarInstant)
  const shortMonth = new Intl.DateTimeFormat(intlLocale, { month: 'short', timeZone: 'UTC' }).format(calendarInstant)
  const narrowMonth = new Intl.DateTimeFormat(intlLocale, { month: 'narrow', timeZone: 'UTC' }).format(calendarInstant)

  const yearFull = String(yearNum)
  const yearShort = yearFull.slice(-2)
  const monthNum = String(monthIdx)
  const month2 = monthNum.padStart(2, '0')
  const dayNum = String(dayVal)
  const day2 = dayNum.padStart(2, '0')

  const startOfYearUtc = Date.UTC(yearNum, 0, 1)
  const currentDayUtc = Date.UTC(yearNum, monthIdx - 1, dayVal)
  const dayOfYearNum = Math.floor((currentDayUtc - startOfYearUtc) / 86400000) + 1
  const dayOfYearStr = String(dayOfYearNum)
  const dayOfYear2 = dayOfYearStr.padStart(2, '0')
  const dayOfYear3 = dayOfYearStr.padStart(3, '0')

  const startOfYearDow = new Date(startOfYearUtc).getUTCDay()
  const weekOfYearNum = Math.ceil((dayOfYearNum + startOfYearDow) / 7)
  const weekOfYearStr = String(weekOfYearNum)
  const weekOfYear2 = weekOfYearStr.padStart(2, '0')

  const startOfMonthDow = new Date(Date.UTC(yearNum, monthIdx - 1, 1)).getUTCDay()
  const weekOfMonthStr = String(Math.ceil((dayVal + startOfMonthDow) / 7))

  const h24Num = String(hour24)
  const h24_2 = h24Num.padStart(2, '0')
  const h12 = hour24 % 12 || 12
  const h12Num = String(h12)
  const h12_2 = h12Num.padStart(2, '0')
  const minNum = String(minVal)
  const min2 = minNum.padStart(2, '0')
  const secNum = String(secVal)
  const sec2 = secNum.padStart(2, '0')

  let dayPeriod = hour24 >= 12 ? 'PM' : 'AM'
  try {
    const parts = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric', hour12: true, timeZone: 'UTC' }).formatToParts(calendarInstant)
    dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || dayPeriod
  }
  catch {}

  // eslint-disable-next-line regexp/prefer-character-class
  const tokenRegex = /'([^']+)'|YYYY|yyyy|YY|yy|MMMMM|MMMM|MMM|MM|M|dd|d|DDD|DD|D|ww|w|W|EEEE|EEE|EE|E|HH|H|hh|h|mm|m|ss|s|aaaa|a|bbbb|BBBB|z/g

  return pattern.replace(tokenRegex, (match, quoted) => {
    if (quoted !== undefined) {
      return quoted
    }
    switch (match) {
      case 'YYYY':
      case 'yyyy':
        return yearFull
      case 'YY':
      case 'yy':
        return yearShort
      case 'MMMMM':
        return narrowMonth
      case 'MMMM':
        return fullMonth
      case 'MMM':
        return shortMonth
      case 'MM':
        return month2
      case 'M':
        return monthNum
      case 'dd':
        return day2
      case 'd':
        return dayNum
      case 'DDD':
        return dayOfYear3
      case 'DD':
        return dayOfYear2
      case 'D':
        return dayOfYearStr
      case 'ww':
        return weekOfYear2
      case 'w':
        return weekOfYearStr
      case 'W':
        return weekOfMonthStr
      case 'EEEE':
        return fullWeekday
      case 'EEE':
        return shortWeekday
      case 'EE':
        return shortWeekday.slice(0, 2)
      case 'E':
        return narrowWeekday
      case 'HH':
        return h24_2
      case 'H':
        return h24Num
      case 'hh':
        return h12_2
      case 'h':
        return h12Num
      case 'mm':
        return min2
      case 'm':
        return minNum
      case 'ss':
        return sec2
      case 's':
        return secNum
      case 'aaaa':
      case 'a':
      case 'bbbb':
      case 'BBBB':
        return dayPeriod
      case 'z':
        return fixedTzLabel
      default:
        return match
    }
  })
}
