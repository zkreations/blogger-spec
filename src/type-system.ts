import type { BloggerExpressionNode } from './ast.js'
import type { SpecCatalog } from './catalogs/index.js'
import type {
  BloggerCompatibleOperator,
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
    return catalog.getScalarTypes().some(scalarType => isTypeAssignable(source, scalarType, catalog))
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
): BloggerCompatibleOperator[] {
  const operatorsCatalog = catalog.getAllOperators()
  const compatible: BloggerCompatibleOperator[] = []

  for (const [opName, opDef] of Object.entries(operatorsCatalog)) {
    const allowedContexts = opDef.allowed_contexts
    const isLoopOnly = Array.isArray(allowedContexts)
      && allowedContexts.includes('values')
      && !allowedContexts.includes('expr')

    if (isLoopOnly) {
      if (isLoopContext) {
        const firstOperand = opDef.operands?.[0]
        if (firstOperand && Array.isArray(firstOperand.types)) {
          const isMatch = firstOperand.types.some(t => isTypeAssignable(typeName, t, catalog))
          if (isMatch) {
            compatible.push({ name: opName, ...opDef })
          }
        }
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
  return getCompatibleOperators(typeName, isLoopContext, catalog).map(op => op.name).filter(Boolean)
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

  if (opDef.return_type_rule === 'element_type') {
    if (leftType.startsWith('array[') && leftType.endsWith(']')) {
      return leftType.slice(6, -1)
    }
    return 'unknown'
  }

  if (opDef.return_type_rule === 'self_or_array') {
    return leftType.startsWith('array[') ? leftType : (leftType === 'unknown' ? 'array' : leftType)
  }

  return opDef.return_type ?? 'unknown'
}

export function isTruthy(
  value: any,
  catalog: SpecCatalog = getSpecCatalog(),
): boolean {
  return catalog.isTruthy(value)
}

export interface TypeContext {
  readonly variables?: Record<string, string>
  readonly globals?: Record<string, string>
  readonly widgetType?: string
  readonly catalog?: SpecCatalog
}

export function inferExpressionType(
  node: BloggerExpressionNode,
  context?: TypeContext,
): string {
  const catalog = context?.catalog ?? getSpecCatalog()

  switch (node.type) {
    case 'Literal': {
      if (node.value === null) {
        return 'null'
      }
      if (typeof node.value === 'string') {
        return 'string'
      }
      if (typeof node.value === 'number') {
        return 'number'
      }
      if (typeof node.value === 'boolean') {
        return 'boolean'
      }
      return 'unknown'
    }

    case 'Identifier': {
      const lower = node.name.toLowerCase()
      if (lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no') {
        return 'boolean'
      }
      if (lower === 'null') {
        return 'null'
      }
      if (context?.variables?.[node.name]) {
        return context.variables[node.name]!
      }
      if (context?.globals?.[node.name]) {
        return context.globals[node.name]!
      }
      return 'unknown'
    }

    case 'DataPath': {
      if (!node.members || node.members.length === 0) {
        return 'unknown'
      }

      const first = node.members[0]!
      let currentType = 'unknown'

      if (context?.variables?.[first.property]) {
        currentType = context.variables[first.property]!
      }
      else if (context?.variables?.[`data:${first.property}`]) {
        currentType = context.variables[`data:${first.property}`]!
      }
      else {
        const globalKey = `data:${first.property}`
        const globalDef = catalog.getGlobal(globalKey)
        if (globalDef) {
          const rootType = globalDef.cardinality === 'collection'
            ? (globalDef.item_type ? `array[${globalDef.item_type}]` : 'array')
            : 'object'
          if (node.members.length === 1) {
            return rootType
          }
          currentType = rootType
        }
        else {
          const widgetName = context?.widgetType ?? 'Blog'
          const widget = catalog.getWidget(widgetName)
          const widgetPropDef = widget?.canonical?.[first.property]
          if (widgetPropDef) {
            const rootType = widgetPropDef.type ?? 'object'
            if (node.members.length === 1) {
              return rootType
            }
            currentType = rootType
          }
          else if (context?.globals?.[first.property]) {
            currentType = context.globals[first.property]!
          }
        }
      }

      if (node.members.length === 1) {
        return currentType
      }

      const globalDef = catalog.getGlobal(`data:${first.property}`)
      const widgetName = context?.widgetType ?? 'Blog'
      const widget = catalog.getWidget(widgetName)
      const widgetPropDef = widget?.canonical?.[first.property]

      for (let i = 1; i < node.members.length; i++) {
        const member = node.members[i]!
        if (member.computed && member.expression) {
          if (currentType.startsWith('array[') && currentType.endsWith(']')) {
            currentType = currentType.slice(6, -1)
            continue
          }
          if (currentType === 'array') {
            currentType = 'unknown'
            continue
          }
        }

        if (first.property === 'messages' && (catalog.isMessage(member.property) || globalDef?.catalog_ref === 'messages.json')) {
          currentType = 'string'
          continue
        }

        if (i === 1 && globalDef?.canonical?.[member.property]) {
          currentType = globalDef.canonical[member.property]!.type ?? 'unknown'
          continue
        }

        if (globalDef?.item_properties?.[member.property]) {
          currentType = globalDef.item_properties[member.property]!.type ?? 'unknown'
          continue
        }

        if (i === 1 && (widgetPropDef as any)?.properties?.[member.property]) {
          currentType = (widgetPropDef as any).properties[member.property]!.type ?? 'unknown'
          continue
        }

        if ((widgetPropDef as any)?.item_properties?.[member.property]) {
          currentType = (widgetPropDef as any).item_properties[member.property]!.type ?? 'unknown'
          continue
        }

        const modType = resolveModifierReturnType(currentType, member.property, catalog)
        if (modType !== 'unknown') {
          currentType = modType
          continue
        }

        if (currentType.startsWith('array[') && currentType.endsWith(']')) {
          const itemType = currentType.slice(6, -1)
          if (member.property === 'first' || member.property === 'last') {
            currentType = itemType
            continue
          }
        }

        currentType = 'unknown'
      }

      return currentType
    }

    case 'UnaryExpression': {
      if (node.operator === '!' || node.operator === 'not') {
        return 'boolean'
      }
      if (node.operator === '-') {
        return 'number'
      }
      return 'unknown'
    }

    case 'BinaryExpression': {
      const leftType = inferExpressionType(node.left, context)
      const rightType = inferExpressionType(node.right, context)
      return resolveOperatorReturnType(node.operator, leftType, rightType, catalog)
    }

    case 'LogicalExpression': {
      return 'boolean'
    }

    case 'ConditionalExpression': {
      if (node.isElvis) {
        const testType = inferExpressionType(node.test, context)
        const altType = node.alternate
          ? inferExpressionType(node.alternate, context)
          : inferExpressionType(node.consequent, context)
        return resolveOperatorReturnType('?:', testType, altType, catalog)
      }
      const consType = inferExpressionType(node.consequent, context)
      if (node.alternate) {
        const altType = inferExpressionType(node.alternate, context)
        if (consType === altType) {
          return consType
        }
        if (isTypeAssignable(consType, altType, catalog)) {
          return altType
        }
        if (isTypeAssignable(altType, consType, catalog)) {
          return consType
        }
      }
      return consType
    }

    case 'CallExpression': {
      const opDef = catalog.getOperator(node.callee)
      if (opDef) {
        const firstArgType = node.arguments[0] ? inferExpressionType(node.arguments[0], context) : undefined
        const secondArgType = node.arguments[1] ? inferExpressionType(node.arguments[1], context) : undefined
        return resolveOperatorReturnType(node.callee, firstArgType, secondArgType, catalog)
      }
      return 'unknown'
    }

    case 'LambdaExpression': {
      const calleeType = inferExpressionType(node.callee, context)
      const op = node.operator.toLowerCase()

      if (op === 'count') {
        return 'number'
      }
      if (op === 'any' || op === 'all' || op === 'none') {
        return 'boolean'
      }
      if (op === 'first') {
        if (calleeType.startsWith('array[') && calleeType.endsWith(']')) {
          return calleeType.slice(6, -1)
        }
        return 'unknown'
      }
      if (op === 'filter') {
        return calleeType
      }
      if (op === 'map') {
        let itemType = 'unknown'
        if (calleeType.startsWith('array[') && calleeType.endsWith(']')) {
          itemType = calleeType.slice(6, -1)
        }
        const lambdaContext: TypeContext = {
          ...context,
          variables: {
            ...(context?.variables || {}),
            [node.parameter]: itemType,
          },
        }
        const bodyType = inferExpressionType(node.body, lambdaContext)
        return `array[${bodyType}]`
      }

      return calleeType
    }

    case 'ArrayExpression': {
      if (node.elements.length === 0) {
        return 'array'
      }
      const firstType = inferExpressionType(node.elements[0]!, context)
      const allSame = node.elements.every(elem => inferExpressionType(elem, context) === firstType)
      return allSame && firstType !== 'unknown' ? `array[${firstType}]` : 'array'
    }

    case 'ObjectExpression': {
      return 'object'
    }

    case 'MemberExpression': {
      const objType = inferExpressionType(node.object, context)
      if (node.computed) {
        if (objType.startsWith('array[') && objType.endsWith(']')) {
          return objType.slice(6, -1)
        }
        return 'unknown'
      }
      const propName = node.property.type === 'Identifier' ? node.property.name : ''
      if (!propName) {
        return 'unknown'
      }
      const modType = resolveModifierReturnType(objType, propName, catalog)
      if (modType !== 'unknown') {
        return modType
      }
      if (objType === 'post' || objType === 'object') {
        const blogWidget = catalog.getWidget('Blog')
        if (blogWidget?.canonical?.posts?.item_properties?.[propName]) {
          return blogWidget.canonical.posts.item_properties[propName]!.type ?? 'unknown'
        }
      }
      return 'unknown'
    }

    case 'Error': {
      return 'unknown'
    }

    default: {
      return 'unknown'
    }
  }
}
