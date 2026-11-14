---
title: Engine
description: Internal mechanics of the BloggerSpec parser, intermediate representation (BIR v2), context normalization, and reference renderer.
icon: microchip
weight: 30
---

The `@hamlet/blogger-spec` engine provides a high-performance, zero-runtime-dependency execution pipeline designed to parse, validate, lower, and evaluate Blogger XML templates across universal JavaScript and TypeScript environments. This section documents the internal subsystems, data structures, and algorithms powering the engine.

## Modular Architecture

The engine decouples template syntax from runtime execution across distinct subsystems:

1. **Parser & Tokenizer (`src/parser/`):** Performs single-pass XML directive scanning with whitespace masking for comments and CDATA, converting templates into typed `BloggerDocumentNode` ASTs without external parser dependencies.
2. **Intermediate Representation (`src/ir/`):** Lowers ASTs into Blogger Intermediate Representation (BIR v2), indexing subroutine dispatch tables and deserializing widget settings.
3. **Context Normalization (`src/context/`):** Ingests blog metadata, Atom feeds, and URL paths to synthesize canonical runtime contexts across all 12 Blogger views.
4. **Reference Implementation (`src/ir/renderer/`):** Implements `BloggerReferenceRenderer` as a strict testing oracle verifying output parity against Blogger's production servers.

## Subsystems Reference

| Subsystem | Primary Function | Core Responsibility |
| :--- | :--- | :--- |
| Parsing & AST | `parseTemplate`, `parseExpression` | XML well-formedness, byte-offset scanner, and Pratt AST trees. |
| Intermediate Representation | `lowerTemplate`, `compileToIR` | BIR v2 descriptors, symbol tables, and widget settings hydration. |
| Context Synthesis | `resolveBloggerContext` | View routing, Atom feed normalization, and dynamic widget synthesis. |
| Reference Renderer | `BloggerReferenceRenderer` | Testing oracle enforcing `maxIncludeDepth: 43` and entity decoding. |

## Subsystems

{{< pagelink href="/docs/engine/parser" title="Parser" description="Zero-dependency parsing for XML templates and Pratt expressions" icon="git-commit" >}}

{{< pagelink href="/docs/engine/bir" title="BIR" description="Intermediate representation (BIR v2), symbol tables, and settings hydration" icon="shuffle" >}}

{{< pagelink href="/docs/engine/context" title="Context" description="12 canonical view contexts, widget extraction, and Atom feed normalizer" icon="git-merge" >}}

{{< pagelink href="/docs/engine/renderer" title="Renderer" description="Testing oracle, zero-dependency renderer, and recursion depth limits" icon="circle-check" >}}
