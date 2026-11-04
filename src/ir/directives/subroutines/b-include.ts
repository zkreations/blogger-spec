import type { BloggerDirectiveNode, BloggerExpressionNode } from '../../../ast.js'
import type { BirAttrValue, BirInclude, BirNode, BirResolution } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext } from '../types.js'
import { parseExpression } from '../../../ast.js'
import { getSpecCatalog } from '../../../catalogs/index.js'
import { resolveIncludable } from '../../../includable-resolver.js'
import { evaluateExpression } from '../../../parser/index.js'
import { parseTemplate } from '../../../parser/template-parser.js'
import { isTruthy } from '../../../type-system.js'
import { formatGadgetAbortComment } from '../../../types.js'
import { bindIncludeScope } from '../../renderer/scope-binder.js'

export function lowerIncludeDirective(
  node: BloggerDirectiveNode,
  context: DirectiveLowerContext,
): BirInclude {
  const nameAttr = node.attributes.find(a => a.name === 'name')
  const exprNameAttr = node.attributes.find(a => a.name === 'expr:name')

  const args: Record<string, BirAttrValue> = {}
  for (const attr of node.attributes) {
    if (attr.name === 'name' || attr.name === 'expr:name') {
      continue
    }
    const cleanName = attr.name.startsWith('expr:') ? attr.name.slice(5) : attr.name
    const isExpr = attr.name.startsWith('expr:') || attr.isExpression || attr.name === 'data' || attr.name === 'var'
    if (isExpr) {
      const expr = typeof attr.value === 'string'
        ? parseExpression(attr.value, { catalog: context.catalog })
        : (attr.value as BloggerExpressionNode)
      args[cleanName] = { kind: 'expr', expr }
    }
    else {
      args[cleanName] = context.toBirAttrValue(attr)
    }
  }

  const target = nameAttr?.value ? String(nameAttr.value) : undefined
  const dynamicTarget = exprNameAttr?.value ? context.ensureExpression(exprNameAttr.value) : undefined

  let resolution: BirResolution | undefined
  if (target) {
    const res = resolveIncludable(
      {
        isGlobalScope: !context.currentWidgetId,
        targetId: target,
        widgetId: context.currentWidgetId,
        widgetType: context.currentWidgetType,
      },
      {
        defaultmarkups: context.defaultmarkups ?? [],
        localIncludables: context.currentWidgetLocals,
      },
      { catalog: context.catalog, useLocalStub: true },
    )

    resolution = {
      resolved: res.resolved,
      tier: res.tier,
      ...(res.failureComment ? { failureComment: res.failureComment } : {}),
    }

    if (res.tier === 'platform_server' && context.symbolTable && !context.symbolTable[`server:${target}`]) {
      const stubHtml = res.serverInclusion?.markup ?? ''
      const baseName = target.startsWith('super.') ? target.slice('super.'.length) : target
      const incDef = context.catalog.getInclusion(baseName)
      const varMatch = incDef?.server_markup ? /^<b:includable\b[^>]+\bvar=['"]([^'"]+)['"]/i.exec(incDef.server_markup.trim()) : null
      const serverParams = varMatch?.[1] ? [varMatch[1]] : []
      let stubBody: BirNode[] = []
      if (stubHtml) {
        try {
          const stubDoc = parseTemplate(stubHtml, { catalog: context.catalog })
          stubBody = context.lowerNodes(context.filterContainerChildren(stubDoc.children))
        }
        catch {
          stubBody = [{ kind: 'text', value: stubHtml }]
        }
      }
      context.symbolTable[`server:${target}`] = {
        body: stubBody,
        id: target,
        params: serverParams,
        tier: 'platform_server',
      }
    }
  }
  else if (dynamicTarget) {
    resolution = {
      resolved: false,
      tier: 'unresolved',
    }
  }

  return {
    args,
    kind: 'include',
    ...(target ? { target } : {}),
    ...(dynamicTarget ? { dynamicTarget } : {}),
    ...(resolution ? { resolution } : {}),
  }
}

export function renderIncludeDirective(
  node: BirInclude,
  ctx: Record<string, any>,
  renderCtx: DirectiveRenderContext,
): string {
  if (node.args.cond) {
    const condVal = node.args.cond.kind === 'static'
      ? (node.args.cond.value === 'true' || node.args.cond.value === 'yes')
      : evaluateExpression(node.args.cond.expr, ctx)
    if (!isTruthy(condVal)) {
      return ''
    }
  }

  const target = node.target ?? (node.dynamicTarget ? String(evaluateExpression(node.dynamicTarget, ctx) ?? '') : undefined)
  if (!target) {
    return ''
  }

  const catalog = renderCtx.catalog ?? getSpecCatalog()
  const maxDepth = renderCtx.maxIncludeDepth ?? catalog.getIncludeRecursionLimit()
  const currentDepth = renderCtx.includeDepth ?? 0

  if (currentDepth >= maxDepth) {
    return `<!-- recursion depth limit exceeded (${target}) -->`
  }

  const widgetId = (ctx.widget as any)?.id
  const widgetType = (ctx.widget as any)?.type

  const subroutine = renderCtx.findIncludable?.(target, widgetId, widgetType)
  if (!subroutine) {
    return node.resolution?.failureComment ?? formatGadgetAbortComment(widgetId || 'Widget')
  }

  renderCtx.includeDepth = currentDepth + 1
  try {
    const subCtx = bindIncludeScope(subroutine, node.args, ctx)
    return renderCtx.renderNodes(subroutine.body, subCtx)
  }
  finally {
    renderCtx.includeDepth = currentDepth
  }
}
