import type { BloggerExpressionNode } from '../../ast.js'

export interface OperatorContext {
  readonly context: Record<string, any>
  readonly locals: Record<string, any>
  evaluate: (node: BloggerExpressionNode, context?: Record<string, any>, locals?: Record<string, any>) => any
}
