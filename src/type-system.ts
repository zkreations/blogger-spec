import type {
  BloggerOperatorDefinition,
  BloggerTypeDefinition,
  BloggerTypeModifierDefinition,
} from './types.js'
import { getOperators, getSpecCatalog, getTypes } from './catalogs/index.js'

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

export function resolveModifierReturnType(
  targetType: string,
  modifierName: string,
): string {
  const modifiers = getTypeModifiers(targetType)
  const modDef = modifiers[modifierName]
  if (!modDef) {
    return 'unknown'
  }
  if (modDef.output_type === 'child_item') {
    if (targetType.startsWith('array[') && targetType.endsWith(']')) {
      return targetType.slice(6, -1)
    }
    return 'unknown'
  }
  return modDef.output_type
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

  if (normOp === '+') {
    if (isTypeAssignable(leftType, 'number') && (rightType === undefined || isTypeAssignable(rightType, 'number'))) {
      return 'number'
    }
    return 'string'
  }

  if (normOp === '?:' || normOp === '? :') {
    return leftType !== 'unknown' ? leftType : (rightType ?? 'unknown')
  }

  if (['filter', 'where', 'take', 'limit', 'skip', 'offset'].includes(normOp)) {
    return leftType === 'unknown' ? 'array' : leftType
  }

  if (normOp === 'first') {
    if (leftType.startsWith('array[') && leftType.endsWith(']')) {
      return leftType.slice(6, -1)
    }
    return 'unknown'
  }

  const opDef = getSpecCatalog().getOperator(operatorName)
  return opDef?.return_type ?? 'unknown'
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
