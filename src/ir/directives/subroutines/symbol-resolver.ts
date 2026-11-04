import type { BirIncludable } from '../../types.js'

export function findIncludableInSymbolTable(
  targetId: string,
  symbolTable: Record<string, BirIncludable>,
  widgetId?: string,
  widgetType?: string,
): BirIncludable | undefined {
  const isSuper = targetId.startsWith('super.')

  if (!isSuper) {
    const inWidgetScope = Boolean(widgetId || widgetType)

    // 1. widget:${widgetId}:${targetId} (local_widget)
    if (widgetId && `widget:${widgetId}:${targetId}` in symbolTable) {
      return symbolTable[`widget:${widgetId}:${targetId}`]
    }

    // 2. gadget:${widgetType}:${targetId} (gadget_specific)
    if (widgetType && `gadget:${widgetType}:${targetId}` in symbolTable) {
      return symbolTable[`gadget:${widgetType}:${targetId}`]
    }

    // 3. all:${targetId} (universal_widget)
    if (inWidgetScope && `all:${targetId}` in symbolTable) {
      return symbolTable[`all:${targetId}`]
    }

    // 4. common:${targetId} (shared_common)
    if (`common:${targetId}` in symbolTable) {
      return symbolTable[`common:${targetId}`]
    }
  }

  // 5. server:${targetId} (platform_server)
  if (`server:${targetId}` in symbolTable) {
    return symbolTable[`server:${targetId}`]
  }

  return undefined
}
