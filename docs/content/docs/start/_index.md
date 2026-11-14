---
title: Start
description: Package installation, runtime requirements, and rapid onboarding.
icon: rocket
weight: 10
---

BloggerSpec serves as the authoritative specification authority, canonical data catalog, and universal AST engine for modern and legacy Blogger XML templates. It provides the formal foundations, type safety, and runtime evaluation algorithms required to build robust compilers, language servers, preview environments, and static analyzers without relying on undocumented platform quirks.

## Purpose

For over two decades, Blogger template development relied on undocumented platform quirks and trial-and-error reverse engineering. BloggerSpec establishes a reliable standard:

- **Normative Single Source of Truth (SSOT):** 11 canonical JSON catalogs and Draft 2020-12 JSON schemas defining the complete semantics of the Blogger platform.
- **Empirical Conformance:** Validated against hundreds of empirical test fixtures executed against Blogger's production engine.
- **Zero Runtime Dependencies:** Standalone universal ESM package running in Node.js, browsers, Cloudflare Workers, and edge isolates.

## Architectural Boundary

BloggerSpec provides AST parsing, type analysis, and expression evaluation. It is intentionally decoupled from end-to-end HTML rendering, local preview servers, or file watching, which are responsibilities of consuming tools.

{{< hint info >}}
All execution algorithms in the engine read rules dynamically from the 11 catalogs. No platform rules or domain constants are hardcoded in the source code.
{{< /hint >}}

## Documentation Sections

| Section | Scope | Target Audience |
| :--- | :--- | :--- |
| [Language](/docs/language) | XML directives, Pratt expressions, type ontology, layouts, and skins. | Template authors & parser developers. |
| [Engine](/docs/engine) | Parser architecture, BIR v2 lowering, view contexts, and reference renderer. | Tool authors & runtime implementors. |
| [Catalogs](/docs/catalogs) | 11 SSOT JSON catalogs, JSON schemas, and compiler diagnostics. | Specification auditors & linter authors. |
| [Guides](/docs/guides) | Building compilers, AST linters, and empirical test certification. | Integration engineers. |
| [API](/docs/api) | Function signatures, parameters, types, and modular subpaths. | Application developers. |

## Next Steps

{{< pagelink href="/docs/start/installation" title="Installation" description="Install the package and configure package managers" icon="download" >}}

{{< pagelink href="/docs/start/quickstart" title="Quickstart" description="Parse templates and evaluate expressions in minutes" icon="bolt" >}}
