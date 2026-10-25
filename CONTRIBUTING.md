# Contributing to blogger-spec

`blogger-spec` is the canonical, standalone, zero-runtime-dependency specification authority and execution engine for Blogger XML templates and expressions.

---

## Core Invariants

1. **Catalogs are the SSOT**: All directive grammar, operator precedence tiers, types, globals, and system inclusion rules live in [`catalogs/<catalog>.json`](catalogs/). Never hardcode domain knowledge in `src/`.
2. **Never Edit Generated Artifacts Directly**: Generated artifacts (`dist/`, `fixtures/index.json`, `src/catalogs/embedded.generated.ts`, and `src/catalogs/types.generated.ts`) are ignored by Git and generated automatically on `pnpm install` (via `prepare`) or `pnpm run build`. Do not edit them manually or force-commit them.
3. **Zero Runtime Dependencies**: Production exports must strictly maintain `"dependencies": {}` in `package.json`.
4. **Empirical Verification**: Any spec change or fix requires empirical verification against the Google Blogger production engine and a corresponding test fixture under [`fixtures/`](fixtures/) with evidence attribution (`official` or `observed`).
5. **Flat Type Hierarchy & Skin Variable Isolation**: Platform subtypes (`url`, `image`, `date`, `locale`, `message`) inherit directly from `string` (1-level depth). Theme variables (`skin:*`) have `parent_type: null` and must remain strictly isolated from template string modifiers (`.length`, `.escaped`).
6. **Declarative Directive Grammar & Symbolic Groups**: Directive nesting rules (`valid_parents`, `valid_children`) and recovery behaviors (`invalid_nesting_policy` with `reject`, `strip`, `ignore`) reside in [`catalogs/directives.json`](catalogs/directives.json). Do not hardcode tag hierarchy assumptions in validators; query via `canNest` and `validateDirectiveNesting`.
7. **No External Documentation Links**: Catalogs and schemas must never include external links (`documentation_urls`, `references`). Official documentation is obsolete and community sources are frozen; all canonical behavior is self-contained and verified via empirical fixtures (`fixtures/`).

---

## Architecture Overview

```
blogger-spec/
├── catalogs/                 # Canonical Single Source of Truth (10 Master JSON Catalogs)
│   ├── directives.json       # b:* tags, attributes, closure modes, constraints, layout versions
│   ├── operators.json        # Operators, 10 precedence tiers, dual syntax, token costs
│   ├── types.json            # Types ontology, modifiers, truthiness matrix, coercion rules
│   ├── widgets.json          # Widget definitions, schema declarations, allowed sections
│   ├── settings.json         # Widget settings configuration dictionaries
│   ├── globals.json          # Global data objects (data:blog, data:view, data:skin...)
│   ├── messages.json         # Localized UI string definitions (data:messages.*)
│   ├── scopes.json           # Variable scope resolution rules & precedence
│   ├── diagnostics.json      # Diagnostic compiler/linter rules (BX1001-BX1049)
│   ├── inclusions.json       # System inclusions, layouts versions 1-3, super.* prefix
│   └── schemas/              # Draft 2020-12 canonical JSON schemas
├── fixtures/                 # Empirical conformance test cases
│   ├── expressions/          # Expression evaluation fixtures
│   ├── templates/            # Template rendering fixtures
│   ├── diagnostics/          # Negative validation fixtures (rejected by Blogger)
│   └── index.json            # Compiled fixtures manifest (generated)
├── src/                      # Spec modules, runtime helpers, parser, and tooling
│   ├── index.ts              # Canonical package entry point (ESM exports)
│   ├── ast.ts                # Formal AST interfaces and parseExpression export
│   ├── data-path.ts          # Canonical deep data path navigator (resolveDataPath)
│   ├── scope.ts              # Formalized ScopeEnvironment symbol table & scope stack
│   ├── parser/               # Pratt expression parser, directive scanner, lexer, validator
│   │   ├── lexer.ts          # Deterministic expression lexer with loc tracking
│   │   ├── expr-parser.ts    # Pratt parser guided by operators.json precedence
│   │   ├── directive-scanner.ts # Fault-tolerant XML directive & tag tokenizer
│   │   └── template-validator.ts # Directive nesting & structural template validator
│   ├── version.ts            # Canonical template layout version detector (v1, v2, v3)
│   ├── quota.ts              # Canonical token quota calculator (BX1021 rules)
│   ├── type-system.ts        # Type assignability, modifiers, and operator compatibility
│   ├── catalogs/             # Typed CatalogStore and SpecCatalog domain models
│   ├── paths.ts              # Workspace path resolution utilities
│   ├── runner.ts             # Conformance test runner engine
│   ├── tooling/              # Build pipeline, schema validator, and compiler
│   └── types.ts              # Canonical models, catalog types, and fixture interfaces
└── dist/                     # ESM bundles and generated type definitions
```

---

## Contribution Workflow

### 1. Catalog Changes
- **Directives & Attributes**: Edit [`catalogs/directives.json`](catalogs/directives.json).
- **Operators & Precedence**: Edit [`catalogs/operators.json`](catalogs/operators.json). Ensure both `precedence_hierarchy` and the `operators` dictionary remain synchronized.
- **Data Types & Modifiers**: Edit [`catalogs/types.json`](catalogs/types.json).
- **Widgets**: Edit [`catalogs/widgets.json`](catalogs/widgets.json).
- **Widget Settings**: Edit [`catalogs/settings.json`](catalogs/settings.json).
- **Globals**: Edit [`catalogs/globals.json`](catalogs/globals.json).
- **Messages**: Edit [`catalogs/messages.json`](catalogs/messages.json).
- **Scopes**: Edit [`catalogs/scopes.json`](catalogs/scopes.json).
- **Diagnostics**: Edit [`catalogs/diagnostics.json`](catalogs/diagnostics.json).
- **System Inclusions**: Edit [`catalogs/inclusions.json`](catalogs/inclusions.json).
- **Schemas**: If metadata structures change, update [`catalogs/schemas/`](catalogs/schemas/).

### 2. Engine & Parser Changes
- **Expression Parser**: If grammar, lexing, recursion limits, or operator binding power changes, update [`src/parser/lexer.ts`](src/parser/lexer.ts) and [`src/parser/expr-parser.ts`](src/parser/expr-parser.ts).
- **Directive Scanner**: If XML tag tokenization, attribute parsing, or CDATA/comment masking changes, update [`src/parser/directive-scanner.ts`](src/parser/directive-scanner.ts).
- **Data Path Navigator & Scope Environment**: If deep data path traversal or scope stack resolution semantics change, update [`src/data-path.ts`](src/data-path.ts) and [`src/scope.ts`](src/scope.ts).
- **Layout Versions**: If layout version heuristics change, update `domain_metadata.layout_versions` in [`catalogs/directives.json`](catalogs/directives.json) and [`src/version.ts`](src/version.ts).
- **Token Quota**: If token cost rules or quota thresholds change, update [`src/quota.ts`](src/quota.ts).
- **Type Checking**: If coercion matrices, truthiness, or assignability change, update [`src/type-system.ts`](src/type-system.ts).
- **Structural Validation & Expression Audits**: If directive nesting, grammar groups, expression attribute validation, or snippet generators change, update [`catalogs/directives.json`](catalogs/directives.json), [`src/catalogs/spec-catalog.ts`](src/catalogs/spec-catalog.ts), and [`src/parser/template-validator.ts`](src/parser/template-validator.ts). Ensure `canNest`, `validateDirectiveNesting`, and `validateTemplateExpressions` reflect canonical policies.

### 3. Add Conformance Fixtures
Add empirical test cases under [`fixtures/`](fixtures/) adhering to the `BloggerFixture` discriminated union contract (`input.kind`, `expected.outcome`, `covers[]`, `verifiedAt`).

### 4. Build & Verify Loop
Run the complete verification pipeline before submitting any changes:

```bash
pnpm run build        # Compiles dist/, embedded.generated.ts, types.generated.ts, and fixtures manifest
pnpm run test:spec    # Validates schemas (AJV Draft 2020-12), referential integrity & d.ts
pnpm run typecheck    # Strict TypeScript typecheck (tsc --noEmit)
pnpm run lint         # ESLint code style check
pnpm run test         # Runs Vitest unit and conformance test suites
```

---

## Reporting Issues

Use the GitHub Issue templates when submitting reports:

- **[Specification Inconsistency](.github/ISSUE_TEMPLATE/spec_inconsistency.md)**: Discrepancies between `blogger-spec` and the actual Blogger engine behavior.
- **[New Spec Entity Discovery](.github/ISSUE_TEMPLATE/new_spec_entity.md)**: Newly discovered operators, directive attributes, inclusions, or globals.

---

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(catalog)`: New directive, operator, type, or system inclusion.
- `feat(parser)`: Parser enhancements or grammar features.
- `feat(type-system)`: Type assignability, modifiers, or coercion rules.
- `fix(catalog)`: Correction to an existing attribute, precedence level, or constraint.
- `test(fixtures)`: New or updated conformance fixtures.
- `docs`: Documentation updates.
- `chore`: Tooling or build pipeline maintenance.
