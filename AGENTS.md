# Blogger Spec — Agent Guidelines

Zero-runtime-dependency specification authority and execution engine for Blogger XML templates and expressions. Houses canonical catalogs, parser, type system, compiler quota, and empirical conformance fixtures.

## Architecture

- `catalogs/*.json`: **Single Source of Truth** (SSOT for all 11 domains). Never hardcode catalog domain knowledge in `src/`.
- `catalogs/schemas/`: Draft 2020-12 canonical validation schemas.
- `fixtures/`: Empirical test suite (`expressions/`, `templates/`, `diagnostics/`).
- `src/`: Engine implementation and validation logic.
- **Generated artifacts**: `dist/`, `fixtures/index.json`, `src/generated/` are gitignored and never edited directly; generated automatically via `pnpm run build` (or `pnpm install` via `prepare`).

## Verification Loop

Run via `pnpm.cmd` on Windows (`pnpm` on POSIX):

```bash
pnpm.cmd run build        # Compile dist/, generated artifacts & sync fixtures manifest
pnpm.cmd run test:spec    # Validate schemas (AJV Draft 2020-12), integrity & .d.ts freshness
pnpm.cmd run typecheck    # Strict TypeScript check (tsc --noEmit)
pnpm.cmd run lint         # ESLint check (@antfu/eslint-config)
pnpm.cmd run test         # Vitest conformance suite
```

## Invariants

- **Catalog edit cycle**: Edit `catalogs/<catalog>.json` -> `pnpm.cmd run build` -> `pnpm.cmd run test:spec`.
- **Fixture contract**: Conforms to `BloggerFixture` union (`input.kind`, `expected.outcome`, `covers[]`, `verified_at`).
- **Zero runtime dependencies**: Production export strictly maintains `"dependencies": {}`.
- **Type ontology**: Platform subtypes inherit directly from `string` (depth 1). Theme variables (`skin:*`) are strictly isolated (`parent_type: null`) and do not receive template string modifiers (`.length`, `.escaped`).
- **Layout versioning**: Layouts v1, v2, v3 metadata resides in `catalogs/directives.json`. Detection runs via `detectTemplateVersion(xmlText)` with explicit attribute precedence and fallback to Layouts v3.
- **Directive scanning**: Tokenizer (`directive-scanner.ts`) maintains exact byte offsets by whitespace-masking comments and non-variable CDATA blocks in a unified single pass without heap string cloning.
- **Parser recursion limit**: Expression parser (`expr-parser.ts`) enforces `maxDepth: 50` preventing call stack exhaustion (`RangeError`) on deeply nested expressions in strict and tolerant modes.
- **Directive nesting**: Rules reside in `catalogs/directives.json` (`valid_parents`, `valid_children`, `invalid_nesting_policy`). Content models map via `@flow_instructions`, `@flow_containers`, `@template_markup`, `@any_container`. Validation returns `DirectiveNestingViolation` with recovery actions (`reject`, `strip`, `ignore`).
- **Section parents**: `<b:section>` is permitted only under `<body>`, `<b:tag>`, structural HTML containers (`html:*`), and conditional/scoping containers (`<b:if>`, `<b:with>`, `<b:switch>`); forbidden under `<head>`, widgets, loops, or nested sections (`BX1035`).
- **Skin variables**: Theme Designer tags (`<Variable>`, `<Group>`) reside strictly within `<b:skin>` CDATA; forbidden in `<b:template-skin>`, generic CDATA, or `<body>` (`BX1023`).
- **Boolean values**: Exactly 4 valid values: `yes`, `no`, `true`, `false` (`yes`/`true` = truthy; `no`/`false` = falsy). Boolean attributes accept only these four.
- **Data path navigation**: `resolveDataPath` provides canonical deep member traversal across globals, widgets, types, modifiers, variables, and Theme Designer skin variables (`skinVariables`, `data:skin.vars.*`) without editor AST coupling.
- **Scope environment**: `ScopeEnvironment` strictly enforces `resolution_precedence` (`lambda` -> `loop` -> `with` -> `includable` -> `widget` -> `global`) and shadowing (`local-wins`) per `catalogs/scopes.json`. Lambda iterators prohibit `data:` prefix (`BX1019`).
- **Snippet quotation**: Directive XML attributes default to single quotes (`'...'`) to avoid collisions with double-quoted string literals (`expr='data:title ?: "Default"'`). CDATA Theme Designer tags (`<Variable>`, `<Group>`) strictly use double quotes (`"..."`).
- **Template expression validation**: `validateTemplateExpressions` scans dynamic expression attributes (`expr:*`, `cond`, `values`, `value`) across directives and HTML elements, reporting diagnostics (`BX1017`, `BX1018`, `BX1019`, `BX1020`, `BX1021`, `BX1026`, `BX1030`, `BX1038`, `BX1044`, `BX1045`, `BX1046`, `BX1049`, `BX1055`) and automated fix suggestions (`suggestedReplacement`).
- **Empirical authority**: Catalogs and schemas must never include external documentation links (`documentation_urls`, `references`). Canonical truth is proven exclusively via empirical fixtures (`fixtures/`) and self-contained syntax examples.

