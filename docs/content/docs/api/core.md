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
  options?: ParseTemplateOptions
): BloggerDocumentNode
```

### Parameters

- `xml` (`string`): Raw template source text.
- `options` (`ParseTemplateOptions`, optional):
  - `tolerant` (`boolean`): Recover from non-fatal XML errors. Defaults to `false`.
  - `parseExpressions` (`boolean`): Parse dynamic expression attributes into expression ASTs. Defaults to `true`.

---

## parseExpression

Parses a dynamic expression string into an expression AST using Pratt precedence.

**Returns:** {{< type "BloggerExpressionNode" >}}

```typescript
function parseExpression(
  expression: string,
  options?: ParseExpressionOptions
): BloggerExpressionNode
```

---

## evaluateExpression

Evaluates an expression AST safely against a runtime data context with relaxed equality and null-safety.

**Returns:** {{< type "BloggerPrimitiveValue" >}}

```typescript
function evaluateExpression(
  node: BloggerExpressionNode,
  context: BloggerEvaluationContext
): BloggerPrimitiveValue
```

---

## resolveBloggerContext

Builds a canonical Blogger view context for one of the 12 canonical view types.

**Returns:** {{< type "BloggerContext" >}}

```typescript
function resolveBloggerContext(
  options: ResolveBloggerContextOptions
): BloggerContext
```
