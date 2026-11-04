import type { BloggerSkinVariableSymbol } from '../../data-path.js'
import type {
  BloggerDirectiveNestingViolation,
  BloggerStructureDiagnostic,
} from '../../types.js'

export type {
  BloggerDirectiveNestingViolation,
  BloggerStructureDiagnostic,
}

export interface BloggerExpressionValidationContext {
  readonly tagName?: string
  readonly tagStart?: number
  readonly tagEnd?: number
  readonly attributeName?: string
  readonly valueStart?: number
  readonly valueEnd?: number
  readonly widgetType?: string
  readonly skinVariables?: Record<string, string | BloggerSkinVariableSymbol>
}

export interface ValidateTemplateStructureOptions {
  readonly validateExpressions?: boolean
  readonly skinVariables?: Record<string, string | BloggerSkinVariableSymbol>
}
