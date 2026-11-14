---
title: Core
description: Signatures, parameters, and return types of the top-level BloggerSpec export functions.
weight: 1
---

The root entry point of `blogger-spec` exports high-level functions for parsing templates into ASTs, parsing and evaluating dynamic expressions, indexing includable subroutines, and generating canonical data contexts.

## parseTemplate

Parses a raw Blogger XML template string into a strongly typed AST.

**Returns:** {{< type "BloggerDocumentNode" >}}

```typescript
function parseTemplate(
  xml: string,
  options?: BloggerParseTemplateOptions
): BloggerDocumentNode
```

### Parameters

- `xml` (`string`): Raw template source text.
- `options` (`BloggerParseTemplateOptions`, optional):
  - `catalog` (`SpecCatalog`): Spec catalog instance (defaults to canonical catalog).
  - `tolerant` (`boolean`): Recover from non-fatal XML errors and record diagnostics. Defaults to `false`.
  - `parseExpressions` (`boolean`): Parse dynamic expression attributes into expression ASTs. Defaults to `true`.

---

## parseExpression

Parses a dynamic expression string into an expression AST using Pratt precedence.

**Returns:** {{< type "BloggerExpressionNode" >}}

```typescript
function parseExpression(
  expression: string,
  options?: BloggerParseExpressionOptions
): BloggerExpressionNode
```

### Parameters

- `expression` (`string`): Raw expression text.
- `options` (`BloggerParseExpressionOptions`, optional):
  - `catalog` (`SpecCatalog`): Spec catalog instance.
  - `tolerant` (`boolean`): Tolerant mode for resilient error recovery. Defaults to `false`.
  - `maxDepth` (`number`): Recursion depth limit. Defaults to `50`.

---

## evaluateExpression

Evaluates an expression AST or raw expression string safely against a runtime data context with relaxed equality and null-safety.

**Returns:** {{< type "any" >}}

```typescript
function evaluateExpression(
  exprOrNode: string | BloggerExpressionNode,
  context?: Record<string, any>
): any
```

---

## resolveBloggerContext

Asynchronously builds a canonical Blogger view context for one of the 12 canonical view types.

**Returns:** {{< type "Promise<Record<string, any>>" >}}

```typescript
async function resolveBloggerContext(
  config?: BloggerContextConfig
): Promise<Record<string, any>>
```

### Parameters

- `config` (`BloggerContextConfig`, optional):
  - `blogId` (`string`): Target blog ID (required in online mode when not provided in `config.blog.id`).
  - `view` (`BloggerViewId`): Canonical view ID (`'homepage'`, `'post'`, `'static_page'`, etc.). Defaults to `'homepage'`.
  - `targetId` (`string`): Target post or page ID when resolving `'post'` or `'static_page'`.
  - `targetUrl` (`string`): Current request URL path or full URI for routing context derivation.
  - `config` (`BloggerBlogConfiguration`): Local project configuration (`blogger.config.json`).
  - `urlMode` (`'remote' | 'local' | 'relative'`): Internal URL remapping strategy. Defaults to `'relative'`.
  - `baseUrl` (`string`): Base origin for local development remapping.
  - `offline` (`boolean`): Offline mode skipping external HTTP calls and falling back cleanly.
  - `templateXml` (`string`): Template XML markup for dynamic widget discovery and `<b:widget-settings>` hydration.
  - `templateAst` (`BloggerDocumentNode`): Pre-parsed AST as a high-performance alternative to `templateXml`.
  - `cookieChoices` (`boolean`): Injects the official cookie notice banner (`id="cookieChoiceInfo"`).
  - `commentFrameBaseUrl` (`string`): Custom origin for the comment iframe to avoid CORS issues.
  - `overrides` (`Record<string, any>`): Explicit top-precedence context property overrides.
  - `fetch` (`typeof fetch`): Custom fetch injection for hermetic environments and unit testing.
  - `cache` (`{ ttlMs?: number }`): In-memory cache TTL configuration.
```
