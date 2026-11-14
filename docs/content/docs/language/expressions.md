---
title: Expressions
description: Grammar, operator precedence, dual syntax, collections, lambdas, and runtime quotas.
weight: 2
---

Blogger supports dynamic, functional, and infix expressions within dynamic attributes (`expr:*`, `cond`, `values`, `value`) and output directives (`<b:eval expr='...'/>`). This document defines the formal grammar, the 11-tier Pratt operator precedence hierarchy, collection filtering with lambdas, canonical relaxed equality rules, and compile-time complexity quotas.

## Syntax Modes

Blogger expressions support two equivalent syntactic forms:

{{< tabs >}}
{{< tab "Infix Syntax" >}}
```text
data:title ?: "Default Title"
data:posts.notEmpty and data:view.isHomepage
```
{{< /tab >}}
{{< tab "Functional Syntax" >}}
```text
?:(data:title, "Default Title")
and(data:posts.notEmpty, data:view.isHomepage)
```
{{< /tab >}}
{{< /tabs >}}

{{< hint info >}}
**Variadic Functional Chaining:** Associative operators permitting 2+ operands (`+`, `and`, `or`, `?:`) accept 3 or more comma-separated arguments in functional syntax: `?:(data:post.snippet, data:post.body, data:blog.metaDescription, "Default")`.
{{< /hint >}}

## Pratt Precedence Hierarchy

Expressions are evaluated across 11 deterministic precedence tiers matching `catalogs/operators.json`:

| Priority | Category | Operators / Aliases | Associativity |
| :---: | :--- | :--- | :---: |
| **1 (Highest)** | Grouping | `( ... )` | Inner to outer |
| **2** | Null Coalescence / Primary Fallback | `?:` | Right to left |
| **3** | Arithmetic (Multiplicative) | `*`, `/`, `%` | Left to right |
| **4** | Additive, URL, Date, Image & Snippet | `+`, `-`, `path`, `params`, `appendParams`, `fragment`, `format`, `resizeImage`, `sourceSet`, `snippet` | Left to right |
| **5** | Relational, Comparisons & Collection Slices | `==`, `!=`, `<`, `>`, `<=`, `>=`, `eq`, `neq`, `lt`, `gt`, `lte`, `gte`, `take`, `skip`, `limit`, `offset`, `to` | Left to right |
| **6** | Membership & Content | `in`, `contains`, `not in`, `not contains` | Left to right |
| **7** | Logical NOT | `!`, `not` | Right to left |
| **8** | Logical AND | `&&`, `and` | Left to right |
| **9** | Logical OR | `\|\|`, `or` | Left to right |
| **10** | Ternary / Conditional | `? :` | Right to left |
| **11 (Lowest)** | Lambdas & Collection Pipelines | `any`, `all`, `none`, `count`, `map`, `select`, `filter`, `where`, `first` | Left to right |

{{< hint info >}}
Canonical equality comparisons (`eq`, `neq`, `==`, `!=`) use Blogger's relaxed equality (`isEqual`), safely comparing string-coerced numbers, booleans, and nulls. Comparison aliases are strictly `eq`, `neq`, `lt`, `gt`, `lte`, `gte`; aliases such as `ne`, `le`, `ge` do not exist.
{{< /hint >}}

## Collections and Lambdas

Filter and map operations on arrays use lambda expressions (infix syntax only):

- **Filter (`where` / `filter`):** `data:posts where (p => p.hasSnippet)`
- **Map (`select` / `map`):** `data:posts select (p => p.title)`
- **Presence checks:** Use `.notEmpty` or `.size gt 0` (e.g. `cond='data:post.labels.notEmpty'`) instead of raw length checks.
- **Lambda scoping (`BX1019`):** Lambda iterators prohibit the `data:` prefix. Writing `(p => p.title)` resolves `p` within Level 1 lambda scope, whereas `data:p` bypasses lambda scope and searches the outer environment.

## Compiler Quotas & Safety Limits

To guarantee deterministic evaluation and prevent denial of service:
- **Complexity Quota (`BX1021`):** Every expression attribute enforces a hard platform ceiling of **40 tokens**. Exceeding 40 tokens aborts compilation with a fatal `Invalid expression` platform error. Each grouping pair `(...)` consumes 1 token. Complex expressions must be decomposed into `<b:with>` scopes.
- **Multiline Flattening:** Line breaks inside expressions consume 0 tokens; multiline expressions flatten cleanly on save with exact token parity.
- **Recursion Guard (`maxDepth: 50`):** The Pratt expression parser enforces a maximum depth of 50 frames, preventing `RangeError` call stack exhaustion in strict and tolerant modes.
