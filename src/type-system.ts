import type {
  BloggerOperatorDefinition,
  BloggerTypeDefinition,
  BloggerTypeModifierDefinition,
} from './types.js'
import { getOperators, getTypes } from './catalogs/index.js'

export function isTypeAssignable(source: string, target: string): boolean {
  if (source === target) {
    return true
  }

  if (target === 'any' || target === 'unknown' || source === 'any' || source === 'unknown') {
    return true
  }

  if (target === 'scalar') {
    return (
      isTypeAssignable(source, 'string')
      || isTypeAssignable(source, 'number')
      || isTypeAssignable(source, 'boolean')
    )
  }

  if (source.startsWith('array[') && target === 'array') {
    return true
  }

  if (source.startsWith('array[') && target.startsWith('array[') && source.endsWith(']') && target.endsWith(']')) {
    const sourceItem = source.slice(6, -1)
    const targetItem = target.slice(6, -1)
    return isTypeAssignable(sourceItem, targetItem)
  }

  const typesCatalog = getTypes().types
  let current: string | null | undefined = typesCatalog[source]?.parent_type

  while (current) {
    if (current === target) {
      return true
    }
    current = typesCatalog[current]?.parent_type
  }

  return false
}

export function getTypeDefinition(typeName: string): BloggerTypeDefinition | undefined {
  return getTypes().types[typeName]
}

export function getTypeModifiers(typeName: string): Record<string, BloggerTypeModifierDefinition> {
  const typesCatalog = getTypes().types

  let resolvedName = typeName
  if (typeName.startsWith('array[') && !typesCatalog[typeName]?.modifiers) {
    resolvedName = 'array'
  }

  const def = typesCatalog[resolvedName]
  if (!def) {
    return {}
  }

  let inheritedModifiers: Record<string, BloggerTypeModifierDefinition> = {}
  if (def.parent_type) {
    inheritedModifiers = getTypeModifiers(def.parent_type)
  }

  return {
    ...inheritedModifiers,
    ...(def.modifiers || {}),
  }
}

export function getCompatibleOperators(
  typeName: string,
  isLoopContext: boolean = false,
): BloggerOperatorDefinition[] {
  const operatorsCatalog = getOperators().operators
  const compatible: BloggerOperatorDefinition[] = []

  for (const [opName, opDef] of Object.entries(operatorsCatalog)) {
    if (opName === 'to') {
      if (isLoopContext && isTypeAssignable(typeName, 'number')) {
        compatible.push({ name: opName, ...opDef })
      }
      continue
    }

    const firstOperand = opDef.operands?.[0]
    if (!firstOperand || !Array.isArray(firstOperand.types)) {
      continue
    }

    const isMatch = firstOperand.types.some((acceptedType) => {
      if (acceptedType === 'collection' || acceptedType === 'array') {
        return typeName === 'array' || typeName.startsWith('array[')
      }
      return isTypeAssignable(typeName, acceptedType)
    })

    if (isMatch) {
      compatible.push({ name: opName, ...opDef })
    }
  }

  return compatible
}

export function getCompatibleOperatorNames(
  typeName: string,
  isLoopContext: boolean = false,
): string[] {
  return getCompatibleOperators(typeName, isLoopContext).map(op => op.name ?? '').filter(Boolean)
}

export function resolveOperatorReturnType(
  operatorName: string,
  leftType: string = 'unknown',
  rightType?: string,
): string {
  const normOp = operatorName.toLowerCase()

  switch (normOp) {
    case 'filter':
    case 'where':
    case 'take':
    case 'limit':
    case 'skip':
    case 'offset':
      return leftType === 'unknown' ? 'array' : leftType

    case 'map':
    case 'select':
    case 'to':
      return 'array'

    case 'count':
      return 'number'

    case 'first':
    case 'last':
      if (leftType.startsWith('array[') && leftType.endsWith(']')) {
        return leftType.slice(6, -1)
      }
      return 'unknown'

    case 'any':
    case 'all':
    case 'none':
    case 'in':
    case 'contains':
    case 'and':
    case 'or':
    case 'not':
    case '!':
    case '&&':
    case '||':
    case '==':
    case '!=':
    case 'eq':
    case 'neq':
    case '<':
    case '>':
    case '<=':
    case '>=':
    case 'lt':
    case 'gt':
    case 'lte':
    case 'gte':
      return 'boolean'

    case '-':
    case '*':
    case '/':
    case '%':
      return 'number'

    case '+':
      if (isTypeAssignable(leftType, 'number') && (rightType === undefined || isTypeAssignable(rightType, 'number'))) {
        return 'number'
      }
      return 'string'

    case 'resizeimage':
      return 'image'

    case 'snippet':
    case 'format':
    case 'sourceset':
      return 'string'

    case 'path':
    case 'params':
    case 'appendparams':
    case 'fragment':
      return 'url'

    case '?:':
    case '? :':
      return leftType !== 'unknown' ? leftType : (rightType ?? 'unknown')

    default:
      return getOperators().operators[operatorName]?.return_type ?? 'unknown'
  }
}

export function isTruthy(value: any): boolean {
  if (value === true || value === 'yes') {
    return true
  }
  if (value === false || value === 'no' || value === null || value === undefined) {
    return false
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  if (typeof value === 'string') {
    return value.length > 0
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0
  }
  return Boolean(value)
}
