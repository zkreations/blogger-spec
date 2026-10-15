import type { SpecCatalog } from './catalogs/index.js'
import type {
  BloggerOperatorDefinition,
  BloggerTypeDefinition,
  BloggerTypeModifierDefinition,
} from './types.js'
import { getSpecCatalog } from './catalogs/index.js'

export function isTypeAssignable(
  source: string,
  target: string,
  catalog: SpecCatalog = getSpecCatalog(),
): boolean {
  if (source === target) {
    return true
  }

  if (target === 'any' || target === 'unknown' || source === 'any' || source === 'unknown') {
    return true
  }

  if (target === 'scalar') {
    return (
      isTypeAssignable(source, 'string', catalog)
      || isTypeAssignable(source, 'number', catalog)
      || isTypeAssignable(source, 'boolean', catalog)
    )
  }

  if (source.startsWith('array[') && target === 'array') {
    return true
  }

  if (source.startsWith('array[') && target.startsWith('array[') && source.endsWith(']') && target.endsWith(']')) {
    const sourceItem = source.slice(6, -1)
    const targetItem = target.slice(6, -1)
    return isTypeAssignable(sourceItem, targetItem, catalog)
  }

  let current: string | null | undefined = catalog.getType(source)?.parent_type

  while (current) {
    if (current === target) {
      return true
    }
    current = catalog.getType(current)?.parent_type
  }

  return false
}

export function getTypeDefinition(
  typeName: string,
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerTypeDefinition | undefined {
  return catalog.getType(typeName)
}

export function getTypeModifiers(
  typeName: string,
  catalog: SpecCatalog = getSpecCatalog(),
): Record<string, BloggerTypeModifierDefinition> {
  let resolvedName = typeName
  if (typeName.startsWith('array[') && !catalog.getType(typeName)?.modifiers) {
    resolvedName = 'array'
  }

  const def = catalog.getType(resolvedName)
  if (!def) {
    return {}
  }

  let inheritedModifiers: Record<string, BloggerTypeModifierDefinition> = {}
  if (def.parent_type) {
    inheritedModifiers = getTypeModifiers(def.parent_type, catalog)
  }

  return {
    ...inheritedModifiers,
    ...(def.modifiers || {}),
  }
}

export function resolveModifierReturnType(
  targetType: string,
  modifierName: string,
  catalog: SpecCatalog = getSpecCatalog(),
): string {
  const modifiers = getTypeModifiers(targetType, catalog)
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
  catalog: SpecCatalog = getSpecCatalog(),
): BloggerOperatorDefinition[] {
  const operatorsCatalog = catalog.getAllOperators()
  const compatible: BloggerOperatorDefinition[] = []

  for (const [opName, opDef] of Object.entries(operatorsCatalog)) {
    if (opName === 'to') {
      if (isLoopContext && isTypeAssignable(typeName, 'number', catalog)) {
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
      return isTypeAssignable(typeName, acceptedType, catalog)
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
  catalog: SpecCatalog = getSpecCatalog(),
): string[] {
  return getCompatibleOperators(typeName, isLoopContext, catalog).map(op => op.name ?? '').filter(Boolean)
}

export function resolveOperatorReturnType(
  operatorName: string,
  leftType: string = 'unknown',
  rightType?: string,
  catalog: SpecCatalog = getSpecCatalog(),
): string {
  const opDef = catalog.getOperator(operatorName)
  if (!opDef) {
    return 'unknown'
  }

  if (opDef.overloads && opDef.overloads.length > 0) {
    for (const overload of opDef.overloads) {
      const op1 = overload.operands[0]
      const op2 = overload.operands[1]

      const leftMatches = op1
        ? op1.types.some(t => isTypeAssignable(leftType, t, catalog))
        : true

      if (!leftMatches) {
        continue
      }

      if (op2 && op2.required) {
        if (rightType !== undefined) {
          const rightMatches = op2.types.some(t => isTypeAssignable(rightType, t, catalog))
          if (rightMatches) {
            return overload.return_type
          }
        }
      }
      else if (!op2) {
        if (rightType === undefined) {
          return overload.return_type
        }
      }
      else {
        if (rightType === undefined || op2.types.some(t => isTypeAssignable(rightType, t, catalog))) {
          return overload.return_type
        }
      }
    }
  }

  if (opDef.family === 'elvis' || opDef.family === 'ternary') {
    return leftType !== 'unknown' ? leftType : (rightType ?? 'unknown')
  }

  const canonicalName = opDef.syntax?.functional_identifier || operatorName.toLowerCase()
  if (canonicalName === 'first' || opDef.description.includes('Extracts the first element')) {
    if (leftType.startsWith('array[') && leftType.endsWith(']')) {
      return leftType.slice(6, -1)
    }
    return 'unknown'
  }

  if (opDef.return_type === 'array' && canonicalName !== 'map') {
    return leftType.startsWith('array[') ? leftType : (leftType === 'unknown' ? 'array' : leftType)
  }

  return opDef.return_type ?? 'unknown'
}

export function isTruthy(value: any): boolean {
  if (value === null || value === undefined) {
    return false
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return !Number.isNaN(value) && value !== 0
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase()
    if (trimmed === '' || trimmed === 'false' || trimmed === 'no' || trimmed === '0') {
      return false
    }
    if (trimmed === 'true' || trimmed === 'yes') {
      return true
    }
    return true
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0
  }
  return Boolean(value)
}
