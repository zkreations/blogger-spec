# blogger-spec (`@bloggerspec`)

> Monorepo for the Blogger XML template language specification, intermediate representation (BIR v2), and ecosystem tooling.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Packages

| Package | Status | Description |
| :--- | :--- | :--- |
| [`@bloggerspec/spec`](packages/spec/README.md) | Active | Canonical SSOT catalogs, schemas, XML/expression parser, evaluator, context resolver, BIR v2 compiler, and conformance fixtures (zero runtime dependencies). |
| `@bloggerspec/render` | Planned | BIR v2 to HTML rendering engine (streaming & synchronous SSR). |
| `@bloggerspec/builder` | Planned | Handlebars-based Blogger XML template builder validated against `@bloggerspec/spec`. |
| `blogger-syntax` | Planned | VS Code extension and LSP powered by `@bloggerspec/spec`. |
| `@bloggerspec/cli` | Planned | Unified CLI (`check`, `render`, `build`, `dev`). |

## Development

Requires Node.js >= 22 and `pnpm` (`11.28.5`).

```bash
pnpm install
pnpm run build    # Generate artifacts and compile packages
pnpm run verify   # Hermetic check, schema validation, tsc -b, lint, and tests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for catalog contracts, empirical fixture standards, and verification guidelines.

## Acknowledgments

Thanks to **Soraya Lambrechts** and [bloggercode.orbiona.com](https://bloggercode.orbiona.com), whose documentation of the Blogger template language was the starting point for this project.

## License

Code and tooling: [MIT](LICENSE). Catalog metadata, schemas, and fixtures: [CC0 1.0](LICENSE).
