---
title: Linters
description: Building diagnostic analyzers, linters, and IDE language servers using BloggerSpec diagnostics.
weight: 2
---

Learn how to build template linters, diagnostics analyzers, continuous integration validators, and IDE language server plugins using BloggerSpec's AST visitors and semantic diagnostic rules.

## Validation Functions

- **`validateTemplate(ast, options)`:** Checks directive nesting constraints, required attributes, root HTML layout attributes (`BX1061`), and forbidden widget hierarchies (`BX1035`).
- **`validateTemplateExpressions(ast)`:** Scans dynamic expression attributes (`expr:*`, `cond`, `values`, `value`) for syntax errors, unknown variables, operator precedence issues, and token quota exhaustion (`BX1021`).

## Automated Fixes

Diagnostics provide machine-readable automated fix recommendations whenever possible, facilitating quick fixes in IDEs:

```typescript
import { parseTemplate, validateTemplate } from 'blogger-spec'

const doc = parseTemplate(xmlSource)
const diagnostics = validateTemplate(doc)

for (const diag of diagnostics) {
  console.log(`[${diag.code}] ${diag.message} at line ${diag.location.start.line}`)
  if (diag.suggestedReplacement) {
    console.log(`  Suggested fix: ${diag.suggestedReplacement}`)
  }
}
```
