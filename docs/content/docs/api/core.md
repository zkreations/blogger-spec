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
  - `view` (`BloggerViewId`): Canonical view ID (e.g. `'homepage'`, `'post'`, `'static_page'`). Defaults to `'homepage'`.
  - `blogId` (`string`): Target blog ID.
  - `targetUrl` (`string`): Current URL route for context derivation.
  - `locale` (`string`): BCP 47 language tag (e.g. `'es'`, `'en'`).
  - `config` (`BloggerProjectConfig`): Local project configuration.
  - `templateXml` (`string`): Template XML for dynamic widget discovery.
  - `overrides` (`Record<string, any>`): Custom context overrides.
```
