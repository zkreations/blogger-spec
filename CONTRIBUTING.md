# Contributing to blogger-spec (`@bloggerspec`)

`blogger-spec` is the `@bloggerspec` monorepo housing the canonical specification (`@bloggerspec/spec`) and ecosystem tooling for Blogger XML templates and expressions.

---

## Core Invariants

1. **Catalogs are the SSOT**: All directive grammar, operator precedence tiers, types, globals, diagnostics, and system inclusion rules live in [`packages/spec/catalogs/<catalog>.json`](packages/spec/catalogs/). Never hardcode domain knowledge in `src/`.
2. **Never Edit Generated Artifacts Directly**: Generated artifacts (`packages/*/dist/`, `packages/spec/fixtures/index.json`, `packages/spec/src/generated/`, `.turbo/`) are gitignored and generated via `pnpm run codegen` or `pnpm run build` (or `pnpm install` via `prepare`).
3. **Zero Runtime Dependencies in `@bloggerspec/spec`**: Production exports in `packages/spec/package.json` must strictly maintain `"dependencies": {}` and Universal ESM compatibility (no `node:*` imports outside `packages/spec/src/node/` and `src/node.ts`).
4. **Strict Acyclic DAG**: `@bloggerspec/spec` is the root dependency and must never depend (runtime or dev) on `@bloggerspec/render`, `@bloggerspec/builder`, or `@bloggerspec/cli`.
5. **Empirical Verification**: Any spec change or fix requires empirical verification against the Blogger production engine and a corresponding test fixture under [`packages/spec/fixtures/`](packages/spec/fixtures/) with evidence attribution (`official` or `observed`).
6. **Flat Type Hierarchy & Skin Variable Isolation**: Platform subtypes (`url`, `image`, `date`, `locale`, `message`) inherit directly from `string` (1-level depth). Theme variables (`skin:*`) have `parent_type: null` and remain strictly isolated from template string modifiers (`.length`, `.escaped`).
7. **Declarative Directive Grammar**: Directive nesting rules (`valid_parents`, `valid_children`) and recovery behaviors (`invalid_nesting_policy`: `reject`, `strip`, `ignore`) reside in [`packages/spec/catalogs/directives.json`](packages/spec/catalogs/directives.json). Query via `canNest` and `validateDirectiveNesting`.
8. **No External Documentation Links**: Catalogs and schemas must never include external links (`documentation_urls`, `references`). Canonical behavior is self-contained and verified via empirical fixtures.
9. **Transitional Renderer Boundary**: `BloggerReferenceRenderer` currently resides in `packages/spec/src/ir/reference-renderer.ts` as a transitional oracle (`@deprecated`) until `@bloggerspec/render` is implemented and certified 0-diff.

---

## Monorepo Overview

```text
blogger-spec/
├── packages/
│   ├── spec/                 # @bloggerspec/spec — Canonical SSOT, parsers, IR & fixtures
│   │   ├── catalogs/         # 11 master JSON catalogs + Draft 2020-12 schemas/
│   │   ├── fixtures/         # Empirical test cases (contexts, expressions, templates, diagnostics)
│   │   ├── src/              # ast, catalogs, context, core, ir, node, parser, tooling
│   │   └── tests/            # Hermetic Vitest suite
│   ├── render/               # @bloggerspec/render — [Scaffold] BIR v2 → HTML renderer
│   ├── builder/              # @bloggerspec/builder — [Scaffold] Handlebars theme builder
│   └── cli/                  # @bloggerspec/cli — [Scaffold] Unified CLI entrypoint
├── tooling/
│   ├── tsconfig/             # @bloggerspec/tsconfig — Shared TypeScript presets
│   └── eslint/               # @bloggerspec/eslint — Shared @antfu/eslint-config preset
├── release-please-config.json      # Release Please versioning and changelog config
├── .release-please-manifest.json   # Tracked released package versions
├── turbo.json                      # Turborepo task graph
└── pnpm-workspace.yaml             # Workspace packages, catalogs, and supply-chain policies
```

---

## Contribution Workflow

### 1. Catalog Changes (`packages/spec/catalogs/`)
Edit the target catalog (`directives.json`, `operators.json`, `types.json`, `widgets.json`, `settings.json`, `globals.json`, `messages.json`, `scopes.json`, `diagnostics.json`, `inclusions.json`, `locales.json`) and update [`packages/spec/catalogs/schemas/`](packages/spec/catalogs/schemas/) if metadata structures change. Keep schema backward compatibility intact.

### 2. Spec Engine & Parser Changes (`packages/spec/src/`)
- **Expression Parser & Evaluators**: [`lexer.ts`](packages/spec/src/parser/lexer.ts), [`expr-parser.ts`](packages/spec/src/parser/expr-parser.ts), [`expr-evaluator.ts`](packages/spec/src/parser/expr-evaluator.ts), and modular handlers under [`packages/spec/src/parser/operators/`](packages/spec/src/parser/operators/).
- **Template Parser & Validation**: [`template-parser.ts`](packages/spec/src/parser/template-parser.ts), [`directive-scanner.ts`](packages/spec/src/parser/directive-scanner.ts), [`template-validator.ts`](packages/spec/src/parser/template-validator.ts), and rules under [`packages/spec/src/parser/validation/rules/`](packages/spec/src/parser/validation/rules/).
- **IR Lowering (BIR v2)**: [`lowering.ts`](packages/spec/src/ir/lowering.ts) and directive handlers under [`packages/spec/src/ir/directives/`](packages/spec/src/ir/directives/) (`flow/`, `dom/`, `output/`, `subroutines/`, `containers/`).
- **Context Resolution & Routing**: [`packages/spec/src/context/`](packages/spec/src/context/) (`resolver.ts`, `routing.ts`, `normalizer.ts`, `pipeline/`).
- **Core Domain Modules**: [`ast.ts`](packages/spec/src/ast.ts), [`data-path.ts`](packages/spec/src/data-path.ts), [`scope.ts`](packages/spec/src/scope.ts), [`type-system.ts`](packages/spec/src/type-system.ts), [`quota.ts`](packages/spec/src/quota.ts), [`version.ts`](packages/spec/src/version.ts), [`widget-settings.ts`](packages/spec/src/widget-settings.ts), and [`skin-compiler.ts`](packages/spec/src/skin-compiler.ts).

### 3. Add Conformance Fixtures
Add empirical test cases under [`packages/spec/fixtures/`](packages/spec/fixtures/) adhering to the `BloggerFixture` discriminated union contract (`input.kind`, `expected.outcome`, `covers[]`, `verified_at`).

### 4. Build & Verify Loop
Run the full monorepo verification pipeline before submitting changes:

```bash
pnpm run build        # Runs codegen & tsdown across workspace packages
pnpm run verify       # Runs check:hermetic, test:spec, typecheck (tsc -b), lint & test
```

Versioning and `CHANGELOG.md` updates are derived automatically from [Conventional Commits](https://www.conventionalcommits.org/) via Release Please.

---

## Reporting Issues

Use the GitHub Issue templates when submitting reports:

- **[Specification Inconsistency](.github/ISSUE_TEMPLATE/spec_inconsistency.md)**: Discrepancies between `@bloggerspec/spec` and the actual Blogger engine behavior.
- **[New Spec Entity Discovery](.github/ISSUE_TEMPLATE/new_spec_entity.md)**: Newly discovered operators, directive attributes, inclusions, or globals.

---

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(spec)` / `feat(catalog)`: New directive, operator, type, inclusion, or parser/IR capability.
- `feat(render)` / `feat(builder)` / `feat(syntax)` / `feat(cli)`: Features in ecosystem packages.
- `fix(spec)` / `fix(catalog)`: Correction to an existing attribute, precedence level, or constraint.
- `test(fixtures)`: New or updated conformance fixtures.
- `docs`: Documentation updates.
- `chore(monorepo)`: Workspace, tooling, or CI/build pipeline maintenance.
