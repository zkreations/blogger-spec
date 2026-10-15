# Blogger Spec — Agent Guidelines

Zero-runtime-dependency specification authority and execution engine for Blogger XML templates and expressions. Houses canonical catalogs, parser, type system, compiler quota, and empirical conformance fixtures.

## Architecture

- `catalogs/*.json`: **Single Source of Truth** (SSOT for all 10 domains). Never hardcode catalog domain knowledge in `src/`.
- `catalogs/schemas/`: Draft 2020-12 canonical validation schemas.
- `fixtures/`: Empirical test suite (`expressions/`, `templates/`, `diagnostics/`).
- `src/`: Engine and tooling (`ast.ts`, `parser/` [`expr-parser.ts`, `lexer.ts`, `directive-scanner.ts`], `version.ts`, `quota.ts`, `type-system.ts`, `catalogs/`, `helpers.ts`, `runner.ts`, `tooling/`, `types.ts`).
- **Generated artifacts**: `dist/`, `fixtures/index.json`, and `src/catalogs/embedded.generated.ts`. Never edit directly.

## Verification Loop

Run via `pnpm.cmd` on Windows (`pnpm` on POSIX):

```bash
pnpm.cmd run build        # Compile dist/, embedded.generated.ts & sync fixtures manifest
pnpm.cmd run test:spec    # Validate schemas (AJV Draft 2020-12), integrity & .d.ts freshness
pnpm.cmd run typecheck    # Strict TypeScript check (tsc --noEmit)
pnpm.cmd run lint         # ESLint check (@antfu/eslint-config)
pnpm.cmd run test         # Vitest conformance suite
```

## Invariants

- **Catalog edit cycle**: Edit `catalogs/<catalog>.json` -> `pnpm.cmd run build` -> `pnpm.cmd run test:spec`.
- **Fixture contract**: Conforms to `BloggerFixture` union (`input.kind`, `expected.outcome`, `covers[]`, `verifiedAt`).
- **Zero runtime dependencies**: Production export strictly maintains `"dependencies": {}`.
- **Type ontology**: Platform subtypes inherit directly from `string` (depth 1). Theme variables (`skin:*`) are strictly isolated (`parent_type: null`) and do not receive template string modifiers (`.length`, `.escaped`).
- **Layout versioning**: Layouts v1, v2, v3 metadata resides in `catalogs/directives.json`. Pure detection is executed via `detectTemplateVersion(xmlText)` with explicit attribute precedence and fallback to modern Layouts v3.
- **Directive scanning**: Fault-tolerant tokenizer (`directive-scanner.ts`) maintains exact byte offsets by whitespace-masking comments and non-variable CDATA blocks.
