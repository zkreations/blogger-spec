---
title: Guides
description: Practical workflows, tutorials, and step-by-step guides for tool developers using BloggerSpec.
icon: book-marked
weight: 40
---

Practical workflows, implementation patterns, and step-by-step guides for tool developers building template compilers, static analysis linters, language servers, and conformance verification suites with BloggerSpec.

## Integration Architecture

BloggerSpec provides the formal AST parsers, expression evaluators, and canonical catalogs. The consuming tool implements traversal, file watching, and output emission according to its use case:

- **Compilers & Previewers:** Walk the AST or BIR, maintaining the DOM mutation buffer to emit production HTML.
- **Linters & Analyzers:** Inspect AST nodes and dynamic expressions, reporting diagnostic codes and automated fix suggestions.
- **Test Certification:** Validate engine output parity against hundreds of empirical fixtures.

## Workflows Reference

| Tool Goal | Key Engine Interfaces | Canonical Guide |
| :--- | :--- | :--- |
| Build an HTML Compiler / Dev Server | `parseTemplate`, `indexIncludables`, `compileSkinCss`, `ScopeEnvironment` | [Compiler](/docs/guides/compiler) |
| Implement a Linter or IDE Extension | `validateTemplate`, `validateTemplateExpressions`, AST visitors | [Linters](/docs/guides/linters) |
| Certify External Engine Compatibility | `runConformance`, `BloggerFixture` contract | [Conformance](/docs/guides/conformance) |

## Guides

{{< pagelink href="/docs/guides/compiler" title="Compiler" description="How to consume AST and BIR to render final HTML templates" icon="code" >}}

{{< pagelink href="/docs/guides/linters" title="Linters" description="Building linters, diagnostics analyzers, and IDE extensions" icon="circle-info" >}}

{{< pagelink href="/docs/guides/conformance" title="Conformance" description="Certifying engine compatibility using BloggerFixture suites" icon="shield" >}}
