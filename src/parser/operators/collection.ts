export function evaluateBinaryCollection(op: string, leftVal: any, rightVal: any): any {
  if (op === 'take') {
    const count = Number(rightVal)
    return Array.isArray(leftVal) ? leftVal.slice(0, count) : []
  }

  if (op === 'skip') {
    const count = Number(rightVal)
    return Array.isArray(leftVal) ? leftVal.slice(count) : []
  }

  if (op === 'to') {
    const start = Number(leftVal)
    const end = Number(rightVal)
    const result: number[] = []
    if (start <= end) {
      for (let i = start; i <= end; i++) result.push(i)
    }
    else {
      for (let i = start; i >= end; i--) result.push(i)
    }
    return result
  }

  return undefined
}

export function evaluateCallCollection(fn: string, args: any[]): any {
  if (fn === 'take' || fn === 'limit') {
    return Array.isArray(args[0]) ? args[0].slice(0, Number(args[1])) : []
  }

  if (fn === 'skip' || fn === 'offset') {
    return Array.isArray(args[0]) ? args[0].slice(Number(args[1])) : []
  }

  return undefined
}
