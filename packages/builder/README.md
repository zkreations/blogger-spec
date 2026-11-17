# `@bloggerspec/builder`

> Structural scaffold reserved for the Handlebars-based Blogger template builder (subsequent plan).

## Planned Scope

- Modular compilation of `.hbs` templates, partials, and helpers powered by `@bloggerspec/spec` catalogs.
- Asset bundling and safe CDATA inlining with automatic build-time validation (`BX*`, `BX1021` token budgets).
- Optional `./preview` subpath backed by `@bloggerspec/render` consuming precompiled `BloggerIRDocument`.
