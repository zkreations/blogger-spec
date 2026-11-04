import type {
  BloggerDirectiveNode,
  BloggerTemplateNode,
} from '../../../ast.js'
import type { BirAttribute, BirClassMutation, BirTag } from '../../types.js'
import type { DirectiveLowerContext, DirectiveRenderContext } from '../types.js'
import { evaluateExpression } from '../../../parser/index.js'
import { isTruthy } from '../../../type-system.js'
import { HTML_VOID_ELEMENTS } from '../../renderer/html-serializer.js'

export function lowerTagDirective(
  node: BloggerDirectiveNode,
  ctx: DirectiveLowerContext,
): BirTag {
  const nameAttr = node.attributes.find(a => a.name === 'name' || a.name === 'expr:name')
  const condAttr = node.attributes.find(a => a.name === 'cond' || a.name === 'expr:cond')

  const baseClasses: BirClassMutation[] = []
  const baseAttributes: BirAttribute[] = []
  let whitespaceRemove = false

  for (const attr of node.attributes) {
    if (attr.name === 'name' || attr.name === 'expr:name' || attr.name === 'cond' || attr.name === 'expr:cond') {
      continue
    }
    if (attr.name === 'b:whitespace' && String(attr.value) === 'remove') {
      whitespaceRemove = true
      continue
    }
    if (attr.name === 'class') {
      baseClasses.push({ name: { kind: 'static', value: String(attr.value) } })
    }
    else if (attr.name === 'expr:class') {
      baseClasses.push({ name: { kind: 'expr', expr: ctx.ensureExpression(attr.value) } })
    }
    else if (attr.name.startsWith('expr:')) {
      baseAttributes.push({
        name: attr.name.slice(5),
        value: { kind: 'expr', expr: ctx.ensureExpression(attr.value) },
      })
    }
    else {
      baseAttributes.push({
        name: attr.name,
        value: { kind: 'static', value: String(attr.value) },
      })
    }
  }

  let hadDirectiveChild = false
  const filteredRawChildren: BloggerTemplateNode[] = []
  for (const child of node.children) {
    if (child.type === 'Directive') {
      hadDirectiveChild = true
      if (child.name === 'b:attr') {
        const attrName = String(child.attributes.find(a => a.name === 'name')?.value ?? '')
        const attrVal = String(child.attributes.find(a => a.name === 'value')?.value ?? '')
        if (attrName === 'b:whitespace') {
          if (attrVal === 'remove') {
            whitespaceRemove = true
          }
          continue
        }
      }
    }
    filteredRawChildren.push(child)
  }

  const finalChildren = (hadDirectiveChild || whitespaceRemove)
    ? filteredRawChildren.filter(c => !ctx.isWhitespaceOnly(c))
    : filteredRawChildren

  return {
    attributes: baseAttributes,
    classes: baseClasses,
    ...(condAttr ? { cond: ctx.ensureExpression(condAttr.value) } : {}),
    children: ctx.lowerNodes(finalChildren),
    kind: 'tag',
    tag: ctx.toBirAttrValue(nameAttr),
    ...(whitespaceRemove ? { whitespaceRemove: true } : {}),
  }
}

export function renderTagDirective(
  node: BirTag,
  ctx: Record<string, any>,
  renderCtx: DirectiveRenderContext,
): string {
  if (node.cond !== undefined && !isTruthy(evaluateExpression(node.cond, ctx))) {
    return renderCtx.renderNodes(node.children, ctx)
  }

  const tagName = node.tag.kind === 'static'
    ? node.tag.value
    : String(evaluateExpression(node.tag.expr, ctx) ?? '')

  if (!tagName) {
    return renderCtx.renderNodes(node.children, ctx)
  }

  const isVoid = HTML_VOID_ELEMENTS.has(tagName.toLowerCase())
  const pipeline = renderCtx.pipeline

  if (!pipeline) {
    return renderCtx.renderNodes(node.children, ctx)
  }

  const target = pipeline.createTarget(node.attributes, node.classes, ctx, renderCtx.normalizeUrls)
  pipeline.pushTarget(target)

  const innerHtml = renderCtx.renderNodes(node.children, ctx)

  pipeline.popTarget()
  const attrStr = pipeline.serializeAttributes(target, renderCtx.normalizeUrls)

  if (isVoid && node.whitespaceRemove && !innerHtml.trim()) {
    const selfClosing = renderCtx.selfClosingVoid !== false
    return selfClosing ? `<${tagName}${attrStr}/>` : `<${tagName}${attrStr}>`
  }

  return `<${tagName}${attrStr}>${innerHtml}</${tagName}>`
}

export const bTagHandler = {
  kind: 'tag' as const,
  lower: lowerTagDirective,
  render: renderTagDirective,
  tagName: 'b:tag',
}
