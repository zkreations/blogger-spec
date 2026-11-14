---
title: Parser
description: XML template parser, Pratt expression parser, AST node types, and tolerant error recovery.
weight: 1
---

BloggerSpec houses two specialized, zero-runtime-dependency parsing engines: a template parser that converts raw Blogger XML into a typed `BloggerDocumentNode` tree, and an 11-tier Pratt expression parser that analyzes dynamic expressions into formal AST nodes with localized error recovery.

## Template Parser

- **Input:** Raw Blogger XML template text.
- **Output:** Strongly typed `BloggerDocumentNode` AST.
- **Invariants:** Strictly enforces XML well-formedness, character entity references, and attribute expression parsing without third-party dependencies.
- **Directive Scanner:** Tokenizer (`directive-scanner.ts`) maintains exact byte offsets by whitespace-masking comments and non-variable CDATA blocks in a unified single pass without heap string cloning.
- **Nesting Guard:** Enforces `max_directive_nesting_depth: 50` (from `catalogs/directives.json` `compiler_limits`), preventing call stack overflow on deeply nested control directives.

## Expression Parser

- **Algorithm:** 11-tier Pratt top-down operator precedence parser.
- **Recursion Guard:** Enforces `maxDepth: 50` ceiling preventing `RangeError` call stack exhaustion in both strict and tolerant modes.
- **Tolerant Mode:** Supports parsing partial or syntactically invalid expressions, producing recovery AST nodes paired with diagnostic errors for IDE tooling.
