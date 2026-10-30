/**
 * Blogger Intermediate Representation (BIR) types.
 * Mirrors catalogs/schemas/bir.schema.json.
 */

import type { BloggerExpressionNode } from '../ast.js'
import type { BloggerIncludableResolutionTier, BloggerLayoutVersion } from '../types.js'

export type BirAttrValue
  = | { readonly kind: 'static', readonly value: string }
    | { readonly kind: 'expr', readonly expr: BloggerExpressionNode }

export interface BirAttribute {
  readonly name: string
  readonly value: BirAttrValue
  readonly cond?: BloggerExpressionNode
}

export interface BirClassMutation {
  readonly name: BirAttrValue
  readonly cond?: BloggerExpressionNode
}

export interface BirElement {
  readonly kind: 'element'
  readonly tag: string
  readonly isVoid: boolean
  readonly attributes: readonly BirAttribute[]
  readonly classes: readonly BirClassMutation[]
  readonly children: readonly BirNode[]
}

export interface BirText { readonly kind: 'text', readonly value: string }
export interface BirCData { readonly kind: 'cdata', readonly value: string }
export interface BirComment { readonly kind: 'comment', readonly value: string }

export interface BirTag {
  readonly kind: 'tag'
  readonly tag: BirAttrValue
  readonly cond?: BloggerExpressionNode
  readonly attributes: readonly BirAttribute[]
  readonly classes: readonly BirClassMutation[]
  readonly children: readonly BirNode[]
}

export interface BirIf {
  readonly kind: 'if'
  readonly branches: ReadonlyArray<{ readonly test?: BloggerExpressionNode, readonly children: readonly BirNode[] }>
}

export interface BirLoop {
  readonly kind: 'loop'
  readonly values: BloggerExpressionNode
  readonly var: string
  readonly index?: string
  readonly reverse?: boolean
  readonly children: readonly BirNode[]
}

export interface BirWith {
  readonly kind: 'with'
  readonly bindings: ReadonlyArray<{ readonly var: string, readonly value: BloggerExpressionNode }>
  readonly children: readonly BirNode[]
}

export interface BirSwitch {
  readonly kind: 'switch'
  readonly on: BloggerExpressionNode
  readonly cases: ReadonlyArray<{ readonly match?: BloggerExpressionNode, readonly children: readonly BirNode[] }>
}

export interface BirResolution {
  readonly tier: BloggerIncludableResolutionTier
  readonly resolved: boolean
  readonly failureComment?: string
}

export interface BirInclude {
  readonly kind: 'include'
  readonly target?: string
  readonly dynamicTarget?: BloggerExpressionNode
  readonly resolution?: BirResolution
  readonly args: Readonly<Record<string, BirAttrValue>>
}

export interface BirOutput { readonly kind: 'output', readonly expr: BloggerExpressionNode }

export interface BirContainer {
  readonly kind: 'container'
  readonly role: 'section' | 'widget'
  readonly id?: string
  readonly widgetType?: string
  readonly sectionId?: string
  readonly title?: string
  readonly className?: string
  readonly tag?: string
  readonly children: readonly BirNode[]
}

export interface BirAttrMutation {
  readonly kind: 'attrMutation'
  readonly name: BirAttrValue
  readonly value: BirAttrValue
  readonly cond?: BloggerExpressionNode
}

export interface BirClassMutationNode {
  readonly kind: 'classMutation'
  readonly name: BirAttrValue
  readonly cond?: BloggerExpressionNode
}

export type BirNode
  = | BirElement
    | BirText
    | BirCData
    | BirComment
    | BirTag
    | BirIf
    | BirLoop
    | BirWith
    | BirSwitch
    | BirInclude
    | BirOutput
    | BirContainer
    | BirAttrMutation
    | BirClassMutationNode

export interface BirIncludable {
  readonly id: string
  readonly tier: Exclude<BloggerIncludableResolutionTier, 'unresolved'>
  readonly ownerWidgetId?: string
  readonly params: readonly string[]
  readonly body: readonly BirNode[]
}

export interface BirSkin {
  readonly variables: ReadonlyArray<{ readonly name: string, readonly type: string, readonly default: string, readonly value?: string, readonly group?: string }>
  readonly css: ReadonlyArray<{ readonly kind: 'text', readonly value: string } | { readonly kind: 'variable', readonly variable: string }>
  readonly templateSkinCss?: ReadonlyArray<{ readonly kind: 'text', readonly value: string } | { readonly kind: 'variable', readonly variable: string }>
}

export interface BloggerIRDocument {
  readonly birVersion: '1'
  readonly layoutVersion: BloggerLayoutVersion
  readonly root: readonly BirNode[]
  readonly symbolTable: Readonly<Record<string, BirIncludable>>
  readonly skin: BirSkin
}
