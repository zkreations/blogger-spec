import type {
  BloggerDirectiveNode,
  BloggerExpressionNode,
  BloggerTemplateNode,
} from '../../ast.js'
import type { SpecCatalog } from '../../catalogs/index.js'
import type { BirIf, BirLoop, BirNode, BirSwitch, BirWith } from '../types.js'

export interface DirectiveLowerContext {
  readonly catalog: SpecCatalog
  readonly lowerNodes: (nodes: readonly BloggerTemplateNode[]) => BirNode[]
  readonly ensureExpression: (val: string | BloggerExpressionNode | undefined) => BloggerExpressionNode
  readonly filterContainerChildren: (nodes: readonly BloggerTemplateNode[]) => BloggerTemplateNode[]
  readonly isWhitespaceOnly: (node: BloggerTemplateNode) => boolean
}

export interface DirectiveRenderContext {
  readonly renderNodes: (nodes: readonly BirNode[], ctx: Record<string, any>) => string
}

export type FlowBirNode = BirIf | BirSwitch | BirLoop | BirWith

export interface FlowDirectiveHandler<TBirNode extends FlowBirNode = FlowBirNode> {
  readonly tagName: string
  readonly kind: TBirNode['kind']
  readonly lower: (node: BloggerDirectiveNode, ctx: DirectiveLowerContext) => TBirNode
  readonly render: (node: TBirNode, ctx: Record<string, any>, renderCtx: DirectiveRenderContext) => string
}

