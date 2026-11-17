---
name: Specification Inconsistency
about: Report a discrepancy between @bloggerspec/spec and Google Blogger's actual behavior
title: "[Inconsistency]: "
labels: ["bug", "catalog"]
---

### Summary of Inconsistency
<!-- Describe the difference between @bloggerspec/spec and Blogger engine behavior -->

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
<!-- What should @bloggerspec/spec permit, reject, parse, or declare instead -->

### Affected Component / Catalog
- [ ] Canonical Catalog (`packages/spec/catalogs/<catalog>.json`)
- [ ] Expression Parser & AST (`packages/spec/src/parser/expr-parser.ts`, `packages/spec/src/ast.ts`)
- [ ] Directive Scanner & Structural Validator (`packages/spec/src/parser/directive-scanner.ts`, `packages/spec/src/parser/validation/`)
- [ ] BIR v2 Lowering (`packages/spec/src/ir/`)
- [ ] Context Resolution (`packages/spec/src/context/`)
- [ ] Template Layouts Version Detection (`packages/spec/src/version.ts`)
- [ ] Type System & Coercion (`packages/spec/src/type-system.ts`)
- [ ] Token Quota Engine (`packages/spec/src/quota.ts`)
- [ ] Test Fixtures (`packages/spec/fixtures/`)
- **Entity / Rule**: <!-- e.g. operator:?:, directive:b:loop, type:image, BX1021 -->
