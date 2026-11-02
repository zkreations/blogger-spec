export function formatIcuDate(
  input: Date | string | number | null | undefined,
  pattern: string,
  locale = 'en',
): string {
  if (input === null || input === undefined || input === '') {
    return ''
  }

  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    return String(input)
  }

  const cleanLocale = locale.replace(/_/g, '-')
  const intlLocale = cleanLocale.startsWith('es')
    ? 'es-ES'
    : (cleanLocale.startsWith('en') && !cleanLocale.includes('-') ? 'en-US' : cleanLocale)

  const fullWeekday = date.toLocaleString(intlLocale, { weekday: 'long' })
  const shortWeekday = date.toLocaleString(intlLocale, { weekday: 'short' })
  const narrowWeekday = date.toLocaleString(intlLocale, { weekday: 'narrow' })
  const fullMonth = date.toLocaleString(intlLocale, { month: 'long' })
  const shortMonth = date.toLocaleString(intlLocale, { month: 'short' })
  const narrowMonth = date.toLocaleString(intlLocale, { month: 'narrow' })

  const yearFull = String(date.getFullYear())
  const yearShort = yearFull.slice(-2)
  const monthNum = String(date.getMonth() + 1)
  const month2 = monthNum.padStart(2, '0')
  const dayNum = String(date.getDate())
  const day2 = dayNum.padStart(2, '0')

  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const dayOfYearNum = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1
  const dayOfYearStr = String(dayOfYearNum)
  const dayOfYear2 = dayOfYearStr.padStart(2, '0')
  const dayOfYear3 = dayOfYearStr.padStart(3, '0')

  const weekOfYearNum = Math.ceil((dayOfYearNum + startOfYear.getDay()) / 7)
  const weekOfYearStr = String(weekOfYearNum)
  const weekOfYear2 = weekOfYearStr.padStart(2, '0')
  const weekOfMonthStr = String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7))

  const h24Num = String(date.getHours())
  const h24_2 = h24Num.padStart(2, '0')
  const h12 = date.getHours() % 12 || 12
  const h12Num = String(h12)
  const h12_2 = h12Num.padStart(2, '0')
  const minNum = String(date.getMinutes())
  const min2 = minNum.padStart(2, '0')
  const secNum = String(date.getSeconds())
  const sec2 = secNum.padStart(2, '0')

  let dayPeriod = ''
  try {
    const parts = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric', hour12: true }).formatToParts(date)
    dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value
      || (date.getHours() >= 12 ? (cleanLocale.startsWith('es') ? 'p. m.' : 'PM') : (cleanLocale.startsWith('es') ? 'a. m.' : 'AM'))
  }
  catch {
    dayPeriod = date.getHours() >= 12 ? (cleanLocale.startsWith('es') ? 'p. m.' : 'PM') : (cleanLocale.startsWith('es') ? 'a. m.' : 'AM')
  }

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
        return 'UTC'
      default:
        return match
    }
  })
}
