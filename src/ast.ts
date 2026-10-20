/**
 * Blogger AST Specification
 * Canonical Abstract Syntax Tree nodes for Blogger XML templates and expression DSL.
 */

import type { BloggerDirectiveName } from './types.js'

export interface BloggerSourcePosition {
  line: number
  column: number
  offset?: number
}

export interface BloggerSourceLocation {
  start: BloggerSourcePosition
  end: BloggerSourcePosition
  source?: string
}

export interface BloggerNodeBase {
  readonly type: string
  readonly loc?: BloggerSourceLocation
}

export interface BloggerLiteralNode extends BloggerNodeBase {
  readonly type: 'Literal'
  readonly value: string | number | boolean | null
  readonly raw?: string
}

export interface BloggerIdentifierNode extends BloggerNodeBase {
  readonly type: 'Identifier'
  readonly name: string
}

export interface BloggerDataPathNode extends BloggerNodeBase {
  readonly type: 'DataPath'
  readonly raw: string
  readonly root: string
  readonly members: Array<{
    readonly property: string
    readonly computed: boolean
    readonly expression?: BloggerExpressionNode
  }>
}

export interface BloggerUnaryExpressionNode extends BloggerNodeBase {
  readonly type: 'UnaryExpression'
  readonly operator: string
  readonly argument: BloggerExpressionNode
  readonly prefix: boolean
}

export interface BloggerBinaryExpressionNode extends BloggerNodeBase {
  readonly type: 'BinaryExpression'
  readonly operator: string
  readonly left: BloggerExpressionNode
  readonly right: BloggerExpressionNode
  readonly precedence: number
}

export interface BloggerLogicalExpressionNode extends BloggerNodeBase {
  readonly type: 'LogicalExpression'
  readonly operator: '&&' | '||' | 'and' | 'or'
  readonly left: BloggerExpressionNode
  readonly right: BloggerExpressionNode
}

export interface BloggerConditionalExpressionNode extends BloggerNodeBase {
  readonly type: 'ConditionalExpression'
  readonly test: BloggerExpressionNode
  readonly consequent: BloggerExpressionNode
  readonly alternate?: BloggerExpressionNode
  readonly isElvis?: boolean
}

export interface BloggerCallExpressionNode extends BloggerNodeBase {
  readonly type: 'CallExpression'
  readonly callee: string
  readonly arguments: BloggerExpressionNode[]
}

export interface BloggerLambdaExpressionNode extends BloggerNodeBase {
  readonly type: 'LambdaExpression'
  readonly callee: BloggerExpressionNode
  readonly operator: string
  readonly parameter: string
  readonly body: BloggerExpressionNode
}

export interface BloggerPropertyNode extends BloggerNodeBase {
  readonly type: 'Property'
  readonly key: string
  readonly value: BloggerExpressionNode
}

export interface BloggerObjectExpressionNode extends BloggerNodeBase {
  readonly type: 'ObjectExpression'
  readonly properties: BloggerPropertyNode[]
}

export interface BloggerArrayExpressionNode extends BloggerNodeBase {
  readonly type: 'ArrayExpression'
  readonly elements: BloggerExpressionNode[]
  readonly isBraced?: boolean
}

export interface BloggerMemberExpressionNode extends BloggerNodeBase {
  readonly type: 'MemberExpression'
  readonly object: BloggerExpressionNode
  readonly property: BloggerExpressionNode | BloggerIdentifierNode
  readonly computed: boolean
}

export interface BloggerErrorNode extends BloggerNodeBase {
  readonly type: 'Error'
  readonly message: string
  readonly raw?: string
  readonly unexpectedToken?: string
}

export type BloggerExpressionNode
  = | BloggerLiteralNode
    | BloggerIdentifierNode
    | BloggerDataPathNode
    | BloggerUnaryExpressionNode
    | BloggerBinaryExpressionNode
    | BloggerLogicalExpressionNode
    | BloggerConditionalExpressionNode
    | BloggerCallExpressionNode
    | BloggerLambdaExpressionNode
    | BloggerObjectExpressionNode
    | BloggerArrayExpressionNode
    | BloggerMemberExpressionNode
    | BloggerErrorNode

export interface BloggerAttributeNode extends BloggerNodeBase {
  readonly type: 'Attribute'
  readonly name: string
  readonly value: string | BloggerExpressionNode
  readonly isExpression: boolean
}

export interface BloggerDirectiveNode extends BloggerNodeBase {
  readonly type: 'Directive'
  readonly name: BloggerDirectiveName
  readonly attributes: BloggerAttributeNode[]
  readonly children: BloggerTemplateNode[]
  readonly selfClosing: boolean
}

export interface BloggerElementNode extends BloggerNodeBase {
  readonly type: 'Element'
  readonly name: string
  readonly namespace?: string
  readonly attributes: BloggerAttributeNode[]
  readonly children: BloggerTemplateNode[]
  readonly selfClosing: boolean
}

export interface BloggerTextNode extends BloggerNodeBase {
  readonly type: 'Text'
  readonly value: string
}

export interface BloggerCDataNode extends BloggerNodeBase {
  readonly type: 'CData'
  readonly value: string
}

export interface BloggerCommentNode extends BloggerNodeBase {
  readonly type: 'Comment'
  readonly value: string
}

export interface BloggerDocumentNode extends BloggerNodeBase {
  readonly type: 'Document'
  readonly children: BloggerTemplateNode[]
}

export type BloggerTemplateNode
  = | BloggerDirectiveNode
    | BloggerElementNode
    | BloggerTextNode
    | BloggerCDataNode
    | BloggerCommentNode

export type BloggerASTNode
  = | BloggerDocumentNode
    | BloggerTemplateNode
    | BloggerAttributeNode
    | BloggerExpressionNode
    | BloggerPropertyNode

export * from './parser/directive-scanner.js'
export { ExpressionParser, parseExpression, type ParseExpressionOptions } from './parser/expr-parser.js'
export { Lexer, type Token, tokenize, type TokenPosition, type TokenType } from './parser/lexer.js'
