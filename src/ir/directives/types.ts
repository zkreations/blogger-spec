import type {
  BloggerAttributeNode,
  BloggerDirectiveNode,
  BloggerExpressionNode,
  BloggerTemplateNode,
} from '../../ast.js'
import type { SpecCatalog } from '../../catalogs/index.js'
import type { BloggerLayoutVersion } from '../../types.js'
import type { DomMutationPipeline } from '../renderer/dom-mutation-pipeline.js'
import type {
  BirAttrMutation,
  BirAttrValue,
  BirClassMutation,
  BirComment,
  BirContainer,
  BirIf,
  BirIncludable,
  BirInclude,
  BirLoop,
  BirNode,
  BirOutput,
  BirSwitch,
  BirTag,
  BirWith,
} from '../types.js'

export interface DirectiveLowerContext {
  readonly catalog: SpecCatalog
  readonly layoutVersion?: BloggerLayoutVersion
  readonly defaultWidgetVersion?: number
  symbolTable?: Record<string, BirIncludable>
  readonly defaultmarkups?: readonly BloggerDirectiveNode[]
  currentWidgetId?: string
  currentWidgetType?: string
  currentWidgetLocals?: Map<string, BloggerDirectiveNode>
  currentDefaultMarkupType?: string
  currentSectionId?: string
  readonly lowerNodes: (nodes: readonly BloggerTemplateNode[]) => BirNode[]
  readonly ensureExpression: (val: string | BloggerExpressionNode | undefined) => BloggerExpressionNode
  readonly filterContainerChildren: (nodes: readonly BloggerTemplateNode[]) => BloggerTemplateNode[]
  readonly isWhitespaceOnly: (node: BloggerTemplateNode) => boolean
  readonly toBirAttrValue: (attr: BloggerAttributeNode | undefined) => BirAttrValue
}

export interface DirectiveRenderContext {
  readonly catalog?: SpecCatalog
  readonly pipeline?: DomMutationPipeline
  readonly normalizeUrls?: boolean
  readonly selfClosingVoid?: boolean
  readonly emitWrappers?: boolean
  readonly maxIncludeDepth?: number
  includeDepth?: number
  readonly renderNodes: (nodes: readonly BirNode[], ctx: Record<string, any>) => string
  readonly findIncludable?: (targetId: string, widgetId?: string, widgetType?: string) => BirIncludable | undefined
}

export type FlowBirNode = BirIf | BirSwitch | BirLoop | BirWith
export type DomBirNode = BirTag | BirAttrMutation | BirClassMutation
export type OutputBirNode = BirOutput | BirComment
export type SubroutineBirNode = BirInclude | BirIncludable
export type ContainerBirNode = BirContainer

export interface FlowDirectiveHandler<TBirNode extends FlowBirNode = FlowBirNode> {
  readonly tagName: string
  readonly kind: TBirNode['kind']
  readonly lower: (node: BloggerDirectiveNode, ctx: DirectiveLowerContext) => TBirNode
  readonly render: (node: TBirNode, ctx: Record<string, any>, renderCtx: DirectiveRenderContext) => string
}
