/**
 * Blogger Includable Resolver
 * Canonical 6-tier ontological dispatch and collision resolution engine for Blogger Layouts v3.
 */

import type {
  BloggerDirectiveNode,
  BloggerDocumentNode,
  BloggerTemplateNode,
} from './ast.js'
import type { SpecCatalog } from './catalogs/spec-catalog.js'
import type { BloggerInclusionExpansionResult } from './inclusion-expander.js'
import type {
  BloggerIncludableResolutionContext,
  BloggerIncludableResolutionResult,
} from './types.js'
import { getSpecCatalog } from './catalogs/spec-catalog.js'
import { expandServerInclusion } from './inclusion-expander.js'
import { formatGadgetAbortComment } from './types.js'

export interface BloggerIncludableRegistry {
  /**
   * Local includables declared directly inside the calling widget.
   */
  readonly localIncludables?:
    | readonly BloggerDirectiveNode[]
    | Map<string, BloggerDirectiveNode>
    | Record<string, BloggerDirectiveNode>
  /**
   * <b:defaultmarkup> directive nodes collected from <b:defaultmarkups>.
   */
  readonly defaultmarkups?: readonly BloggerDirectiveNode[]
  /**
   * Complete template document AST (optional convenience; defaultmarkups are scanned automatically if provided).
   */
  readonly document?: BloggerDocumentNode
}

export interface IncludableResolutionOptions {
  /**
   * Custom SpecCatalog instance (defaults to canonical catalog).
   */
  catalog?: SpecCatalog
  /**
   * If true, server inclusions in Tier 5 will utilize local offline stubs when available.
   */
  useLocalStub?: boolean
}

export interface ResolvedIncludableResult extends BloggerIncludableResolutionResult {
  /**
   * Matched AST directive node when resolved at Tiers 1-4.
   */
  readonly includableNode?: BloggerDirectiveNode
  /**
   * Platform server inclusion result when resolved at Tier 5.
   */
  readonly serverInclusion?: BloggerInclusionExpansionResult
  /**
   * Formatted failure comment when unresolvable (Tier 6).
   */
  readonly failureComment?: string
}

function getDirectiveAttrValue(node: BloggerDirectiveNode, attrName: string): string | undefined {
  if (!node.attributes)
    return undefined
  const attr = node.attributes.find(a => a.name === attrName)
  if (!attr)
    return undefined
  return typeof attr.value === 'string' ? attr.value : (attr.value as any)?.raw ?? undefined
}

/**
 * Scans a BloggerDocumentNode AST collecting all <b:defaultmarkup> container directives in document order.
 */
export function collectDefaultMarkups(doc: BloggerDocumentNode): BloggerDirectiveNode[] {
  const markups: BloggerDirectiveNode[] = []

  function walk(node: BloggerTemplateNode | BloggerDocumentNode) {
    if (node.type === 'Directive' && node.name === 'b:defaultmarkup') {
      markups.push(node)
    }
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child)
      }
    }
  }

  walk(doc)
  return markups
}

/**
 * Extracts child <b:includable> blocks from a container or array of nodes into a Map keyed by includable id.
 * Follows last_block_wins if duplicate includables exist within the same container.
 */
export function indexIncludables(
  container: BloggerDirectiveNode | readonly BloggerTemplateNode[],
): Map<string, BloggerDirectiveNode> {
  const map = new Map<string, BloggerDirectiveNode>()
  const nodes = Array.isArray(container)
    ? container
    : ((container as BloggerDirectiveNode).children || [])

  for (const child of nodes) {
    if (child.type === 'Directive' && child.name === 'b:includable') {
      const id = getDirectiveAttrValue(child as BloggerDirectiveNode, 'id')
      if (id) {
        map.set(id, child as BloggerDirectiveNode)
      }
    }
  }

  return map
}

function normalizeLocalIncludables(
  locals?: readonly BloggerDirectiveNode[] | Map<string, BloggerDirectiveNode> | Record<string, BloggerDirectiveNode>,
): Map<string, BloggerDirectiveNode> {
  if (!locals)
    return new Map()

  if (locals instanceof Map)
    return locals

  if (Array.isArray(locals)) {
    return indexIncludables(locals)
  }

  const map = new Map<string, BloggerDirectiveNode>()
  for (const [key, node] of Object.entries(locals)) {
    if (node && node.type === 'Directive') {
      map.set(key, node)
    }
  }
  return map
}

/**
 * Resolves an includable target against the 6-tier ontological hierarchy with collision handling.
 *
 * Precedence:
 * 1. local_widget (private widget includables)
 * 2. gadget_specific (<b:defaultmarkup type='WidgetType'>, matching last_block_wins)
 * 3. universal_widget (<b:defaultmarkup type='All'>, matching last_block_wins)
 * 4. shared_common (<b:defaultmarkup type='Common'>, matching last_block_wins)
 * 5. platform_server (canonical Blogger backend inclusions)
 * 6. unresolved (aborts gadget execution and outputs canonical comment)
 */
export function resolveIncludable(
  context: BloggerIncludableResolutionContext,
  registry?: BloggerIncludableRegistry,
  options?: IncludableResolutionOptions,
): ResolvedIncludableResult {
  const targetId = context.targetId
  const widgetType = context.widgetType || ''
  const widgetId = context.widgetId || 'Widget'
  const catalog = options?.catalog ?? getSpecCatalog()

  // Tier 1: local_widget (only applicable when not in pure global scope)
  if (!context.isGlobalScope && registry?.localIncludables) {
    const localMap = normalizeLocalIncludables(registry.localIncludables)
    const localNode = localMap.get(targetId)
    if (localNode) {
      return {
        targetId,
        tier: 'local_widget',
        resolved: true,
        includableNode: localNode,
        sourceContainer: widgetId,
      }
    }
  }

  let defaultmarkups: readonly BloggerDirectiveNode[] = registry?.defaultmarkups || []
  if (defaultmarkups.length === 0 && registry?.document) {
    defaultmarkups = collectDefaultMarkups(registry.document)
  }

  // Tier 2: gadget_specific (<b:defaultmarkup type='WidgetType'>)
  if (!context.isGlobalScope && widgetType && defaultmarkups.length > 0) {
    // Iterate in reverse document order to strictly enforce `last_block_wins`
    for (let i = defaultmarkups.length - 1; i >= 0; i--) {
      const dm = defaultmarkups[i]!
      const dmType = getDirectiveAttrValue(dm, 'type')
      if (!dmType)
        continue

      const targetTypes = dmType.split(',').map(s => s.trim())
      if (targetTypes.includes(widgetType)) {
        const includables = indexIncludables(dm)
        const match = includables.get(targetId)
        if (match) {
          return {
            targetId,
            tier: 'gadget_specific',
            resolved: true,
            includableNode: match,
            sourceContainer: dmType,
          }
        }
      }
    }
  }

  // Tier 3: universal_widget (<b:defaultmarkup type='All'>)
  if (defaultmarkups.length > 0) {
    // Iterate in reverse to enforce `last_block_wins`
    for (let i = defaultmarkups.length - 1; i >= 0; i--) {
      const dm = defaultmarkups[i]!
      const dmType = getDirectiveAttrValue(dm, 'type')
      if (dmType === 'All') {
        const includables = indexIncludables(dm)
        const match = includables.get(targetId)
        if (match) {
          return {
            targetId,
            tier: 'universal_widget',
            resolved: true,
            includableNode: match,
            sourceContainer: 'All',
          }
        }
      }
    }
  }

  // Tier 4: shared_common (<b:defaultmarkup type='Common'>)
  if (defaultmarkups.length > 0) {
    // Iterate in reverse to enforce `last_block_wins`
    for (let i = defaultmarkups.length - 1; i >= 0; i--) {
      const dm = defaultmarkups[i]!
      const dmType = getDirectiveAttrValue(dm, 'type')
      if (dmType === 'Common') {
        const includables = indexIncludables(dm)
        const match = includables.get(targetId)
        if (match) {
          return {
            targetId,
            tier: 'shared_common',
            resolved: true,
            includableNode: match,
            sourceContainer: 'Common',
          }
        }
      }
    }
  }

  // Tier 5: platform_server (Standard platform inclusions from catalog)
  const isSuper = targetId.startsWith('super.')
  const baseName = isSuper ? targetId.slice('super.'.length) : targetId
  if (catalog.isServerInclusion(baseName) || isSuper) {
    const serverResult = expandServerInclusion(targetId, {
      catalog,
      useLocalStub: options?.useLocalStub ?? true,
    })
    return {
      targetId,
      tier: 'platform_server',
      resolved: true,
      serverInclusion: serverResult,
      sourceContainer: 'platform_server',
    }
  }

  // Tier 6: unresolved (abort widget execution with canonical error comment)
  const failureComment = formatGadgetAbortComment(widgetId)
  return {
    targetId,
    tier: 'unresolved',
    resolved: false,
    diagnostic: 'BX1037',
    failureComment,
  }
}
