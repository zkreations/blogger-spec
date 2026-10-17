---
name: Specification Inconsistency
about: Report a discrepancy between blogger-spec and Google Blogger's actual behavior
title: "[Inconsistency]: "
labels: ["bug", "catalog"]
---

### Summary of Inconsistency
<!-- Describe the difference between blogger-spec and Blogger engine behavior -->

### Evidence Level
- [ ] `official` (documented in official Google Blogger resources)
- [ ] `observed` (empirically observed on a live Blogger blog)

### Blogger Environment Details
- **Layouts Version**: [ ] v1 | [ ] v2 | [ ] v3
- **Widget Version**: [ ] 1 | [ ] 2
- **Theme**: <!-- e.g., Soho, Contempo, Notable, Essential, or custom -->

### Minimal Reproducible XML / Expression
```xml
<!-- Minimal snippet that reproduces the issue -->
```

### Actual Blogger Engine Behavior
<!-- Error message, rendered output, or silent fallback -->

### Expected Spec Behavior
<!-- What should blogger-spec permit, reject, parse, or declare instead -->

### Affected Component / Catalog
- [ ] Canonical Catalog (`catalogs/<catalog>.json`)
- [ ] Expression Parser & AST (`src/parser/expr-parser.ts`, `src/ast.ts`)
- [ ] Directive Scanner & Structural Validator (`src/parser/directive-scanner.ts`, `src/parser/template-validator.ts`)
- [ ] Template Layouts Version Detection (`src/version.ts`)
- [ ] Type System & Coercion (`src/type-system.ts`)
- [ ] Token Quota Engine (`src/quota.ts`)
- [ ] Test Fixtures (`fixtures/`)
- **Entity / Rule**: <!-- e.g. operator:?:, directive:b:loop, type:image, BX1021 -->
