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
  type: string
  loc?: BloggerSourceLocation
}

export interface BloggerLiteralNode extends BloggerNodeBase {
  type: 'Literal'
  value: string | number | boolean | null
  raw?: string
}

export interface BloggerIdentifierNode extends BloggerNodeBase {
  type: 'Identifier'
  name: string
}

export interface BloggerDataPathNode extends BloggerNodeBase {
  type: 'DataPath'
  raw: string
  root: string
  members: Array<{
    property: string
    computed: boolean
    expression?: BloggerExpressionNode
  }>
}

export interface BloggerUnaryExpressionNode extends BloggerNodeBase {
  type: 'UnaryExpression'
  operator: string
  argument: BloggerExpressionNode
  prefix: boolean
}

export interface BloggerBinaryExpressionNode extends BloggerNodeBase {
  type: 'BinaryExpression'
  operator: string
  left: BloggerExpressionNode
  right: BloggerExpressionNode
  precedence: number
}

export interface BloggerLogicalExpressionNode extends BloggerNodeBase {
  type: 'LogicalExpression'
  operator: '&&' | '||' | 'and' | 'or'
  left: BloggerExpressionNode
  right: BloggerExpressionNode
}

export interface BloggerConditionalExpressionNode extends BloggerNodeBase {
  type: 'ConditionalExpression'
  test: BloggerExpressionNode
  consequent: BloggerExpressionNode
  alternate?: BloggerExpressionNode
  isElvis?: boolean
}

export interface BloggerCallExpressionNode extends BloggerNodeBase {
  type: 'CallExpression'
  callee: string
  arguments: BloggerExpressionNode[]
}

export interface BloggerLambdaExpressionNode extends BloggerNodeBase {
  type: 'LambdaExpression'
  callee: BloggerExpressionNode
  operator: string
  parameter: string
  body: BloggerExpressionNode
}

export interface BloggerPropertyNode extends BloggerNodeBase {
  type: 'Property'
  key: string
  value: BloggerExpressionNode
}

export interface BloggerObjectExpressionNode extends BloggerNodeBase {
  type: 'ObjectExpression'
  properties: BloggerPropertyNode[]
}

export interface BloggerArrayExpressionNode extends BloggerNodeBase {
  type: 'ArrayExpression'
  elements: BloggerExpressionNode[]
}

export interface BloggerMemberExpressionNode extends BloggerNodeBase {
  type: 'MemberExpression'
  object: BloggerExpressionNode
  property: BloggerExpressionNode | BloggerIdentifierNode
  computed: boolean
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

export interface BloggerAttributeNode extends BloggerNodeBase {
  type: 'Attribute'
  name: string
  value: string | BloggerExpressionNode
  isExpression: boolean
}

export interface BloggerDirectiveNode extends BloggerNodeBase {
  type: 'Directive'
  name: BloggerDirectiveName
  attributes: BloggerAttributeNode[]
  children: BloggerTemplateNode[]
  selfClosing: boolean
}

export interface BloggerElementNode extends BloggerNodeBase {
  type: 'Element'
  name: string
  namespace?: string
  attributes: BloggerAttributeNode[]
  children: BloggerTemplateNode[]
  selfClosing: boolean
}

export interface BloggerTextNode extends BloggerNodeBase {
  type: 'Text'
  value: string
}

export interface BloggerCDataNode extends BloggerNodeBase {
  type: 'CData'
  value: string
}

export interface BloggerCommentNode extends BloggerNodeBase {
  type: 'Comment'
  value: string
}

export interface BloggerDocumentNode extends BloggerNodeBase {
  type: 'Document'
  children: BloggerTemplateNode[]
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

export { ExpressionParser, parseExpression } from './parser/expr-parser.js'
export { Lexer, type Token, tokenize, type TokenPosition, type TokenType } from './parser/lexer.js'
