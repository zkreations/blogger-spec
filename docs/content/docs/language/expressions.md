---
title: Expressions
description: Grammar, operator precedence, dual syntax, collections, lambdas, and runtime quotas.
weight: 2
---

Blogger supports dynamic, functional, and infix expressions within dynamic attributes (`expr:*`, `cond`, `values`, `value`) and output directives (`<b:eval expr='...'/>`). This document defines the formal grammar, the 10-tier Pratt operator precedence hierarchy, collection filtering with lambdas, canonical relaxed equality rules, and compile-time complexity quotas.

## Syntax Modes

Blogger expressions support two equivalent syntactic forms:

{{< tabs >}}
{{< tab "Infix Syntax" >}}
```text
data:title ?: "Default Title"
data:posts.length > 0 and data:view.isHomepage
```
{{< /tab >}}
{{< tab "Functional Syntax" >}}
```text
default(data:title, "Default Title")
and(gt(data:posts.length, 0), data:view.isHomepage)
```
{{< /tab >}}
{{< /tabs >}}

## Pratt Precedence Hierarchy

Expressions are evaluated across 10 deterministic precedence tiers:

| Tier | Category | Operators / Aliases |
| :---: | :--- | :--- |
| **1** | Member access & grouping | `.`, `()` |
| **2** | Unary operators | `not`, `!`, `-` |
| **3** | Multiplicative | `*`, `/`, `%` |
| **4** | Additive | `+`, `-` |
| **5** | Relational | `lt`, `lte`, `gt`, `gte`, `<`, `<=`, `>`, `>=` |
| **6** | Equality | `eq`, `neq`, `==`, `!=` |
| **7** | Logical AND | `and` |
| **8** | Logical OR | `or` |
| **9** | Null-coalescing | `?:` |
| **10** | Ternary conditional | `? :` |

{{< hint info >}}
Canonical equality comparisons (`eq`, `neq`, `==`, `!=`) use Blogger's relaxed equality (`isEqual`), safely comparing string-coerced numbers, booleans, and nulls. Note that canonical comparison aliases are strictly `eq`, `neq`, `lt`, `gt`, `lte`, `gte`; aliases such as `ne`, `le`, `ge` do not exist.
{{< /hint >}}

## Collections and Lambdas

Filter and map operations on arrays use lambda expressions:

- **`where` (Filter):** `data:posts where (p => p.hasSnippet)`
- **`select` (Map):** `data:posts select (p => p.title)`
- **Lambda scoping (`BX1019`):** Lambda iterators prohibit the `data:` prefix. Writing `(p => p.title)` resolves `p` within Level 1 lambda scope, whereas `data:p` bypasses lambda scope and searches the outer environment.

## Compiler Quotas & Safety Limits

To guarantee process termination and prevent denial of service:
- **Complexity Quota (`BX1021`):** Every expression evaluates against a token budget limit.
- **Recursion Guard (`maxDepth: 50`):** The Pratt expression parser enforces a maximum depth of 50 frames, preventing `RangeError` call stack exhaustion in strict and tolerant modes.
