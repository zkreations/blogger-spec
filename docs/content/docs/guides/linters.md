---
title: Linters
description: Building diagnostic analyzers, linters, and IDE language servers using BloggerSpec diagnostics.
weight: 2
---

Learn how to build template linters, diagnostics analyzers, continuous integration validators, and IDE language server plugins using BloggerSpec's AST visitors and semantic diagnostic rules.

## Validation Functions

- **`validateTemplateStructure(tokensOrXml, catalog?, options?)`:** Checks directive nesting constraints, required attributes, root HTML layout attributes (`BX1061`), and forbidden widget hierarchies (`BX1035`).
- **`validateTemplateExpressions(tokensOrXml, catalog?, skinVariables?)`:** Scans dynamic expression attributes (`expr:*`, `cond`, `values`, `value`) for syntax errors, unknown variables, operator precedence issues, and token quota exhaustion (`BX1021`, `BX1045`).

## Automated Fixes

Diagnostics provide machine-readable automated fix recommendations whenever possible, facilitating quick fixes in IDEs:

```typescript
import { validateTemplateExpressions, validateTemplateStructure } from 'blogger-spec'

const structureDiags = validateTemplateStructure(xmlSource)
const expressionDiags = validateTemplateExpressions(xmlSource)
const diagnostics = [...structureDiags, ...expressionDiags]

for (const diag of diagnostics) {
  console.log(`[${diag.code}] ${diag.message} (offset: ${diag.tagStart ?? 0})`)
  if (diag.suggestedReplacement) {
    console.log(`  Suggested fix: ${diag.suggestedReplacement}`)
  }
}
```
