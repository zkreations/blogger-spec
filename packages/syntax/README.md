# `blogger-syntax`

> Structural scaffold reserved for the VS Code extension and LSP server (subsequent plan).

## Planned Scope

- LSP server directly consuming `@bloggerspec/spec` (`BX*` diagnostics, Quick Fixes, autocompletion via `cursor-context`, and hover).
- TextMate grammar automatically synchronized with `catalogs/directives.json` and `catalogs/operators.json`.
- Private package excluded from npm (`private: true`), distributed as a `.vsix` extension.
