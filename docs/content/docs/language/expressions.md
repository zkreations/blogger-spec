---
title: Expressions
description: Grammar, operator precedence, dual syntax, collections, lambdas, and runtime quotas.
weight: 2
---

Blogger supports dynamic, functional, and infix expressions within dynamic attributes (`expr:*`, `cond`, `values`, `value`) and output directives (`<b:eval expr='...'/>`). This document defines the formal grammar, the 11-tier Pratt operator precedence hierarchy, collection filtering with lambdas, canonical relaxed equality rules, image transformations, and compile-time complexity quotas.

## Syntax Modes

Blogger expressions support two primary syntactic forms:

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

### Infix vs. Functional Syntax Availability

While most arithmetic, comparison, and logical operators support both infix and functional syntax, `catalogs/operators.json` strictly enforces syntax restrictions for specific operator families:

- **Strictly Infix Operators (`supports_functional: false`):** Exactly 11 operators can only be invoked using infix syntax:
  - **Slices & Membership:** `to` (e.g. `1 to 10`), `not in`, `not contains`.
  - **Collection Pipelines & Lambdas:** `any`, `all`, `none`, `count`, `map` (alias `select`), `filter` (alias `where`), `first`.
- **Strictly Prefix / Functional Operators (`supports_infix: false`):** The logical negation operator `not` (alias `!`) only exists as a prefix unary operator (`not data:view.isPost`, `!data:view.isError`) or functional call (`not(data:view.isPost)`), never infix.

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

## Image Transforms: `resizeImage` & `sourceSet`

Blogger provides native operators for dynamic image resizing and HTML responsive image set generation hosted on Google CDN infrastructure:

### `resizeImage`
- **Scalar Resize:** Rewrites a Google CDN image URL to target dimension (e.g. `data:post.featuredImage resizeImage 400`). Returns an `image` descriptor that serializes to the resized URL in string contexts and exposes `.width` and `.height` modifiers.
- **Responsive Array Resize:** When given an array of dimensions (e.g. `data:post.featuredImage resizeImage [320, 640, 1024]`), returns an `array[object]` of `image_variant` items with `.url` and `.size`. If the source image is non-Google/external, the array structure is preserved with original URLs for seamless template looping.
- **3-Operand Infix Chaining:** Aspect ratio crops chain via a second infix operand:
  ```text
  data:post.featuredImage resizeImage 400 resizeImage "1:1"
  ```
  Or in functional syntax: `resizeImage(data:post.featuredImage, 400, "1:1")`.

### `sourceSet`
Generates a comma-separated HTML `srcset` attribute value formatted as `<resized_url> <size>w, ...`:
```text
data:post.featuredImage sourceSet [320, 640, 1024]
```
Aspect ratio strings can also be chained: `data:post.featuredImage sourceSet [320, 640] sourceSet "16:9"`.

{{< hint warning >}}
**Anti-Pattern:** The first argument to `sourceSet` must be a raw Google CDN image URL or image reference (`data:post.featuredImage`), never the result of `resizeImage(...)`.
{{< /hint >}}

## Collections and Lambdas

Filter and map operations on arrays use lambda expressions (infix syntax only):

- **Filter (`where` / `filter`):** `data:posts where (p => p.hasSnippet)`
- **Map (`select` / `map`):** `data:posts select (p => p.title)`
- **Presence checks:** Use `.notEmpty` or `.size gt 0` (e.g. `cond='data:post.labels.notEmpty'`) instead of raw length checks.
- **Lambda scoping (`BX1019`):** Lambda iterators prohibit the `data:` prefix. Writing `(p => p.title)` resolves `p` within Level 1 lambda scope, whereas `data:p` bypasses lambda scope and searches the outer environment.

## Compiler Quotas & Safety Limits

To guarantee deterministic evaluation and prevent denial of service, Blogger enforces strict compiler quotas (`catalogs/operators.json`):

- **Complexity Ceiling (`BX1021`, `BX1045`):** Every dynamic expression enforces a hard platform ceiling of **40 tokens** (`BX1021`). Exceeding 40 tokens aborts compilation with a fatal `Invalid expression` platform error. Approaching the ceiling (≥ **34 tokens**) triggers a compiler warning (`BX1045`).
- **Token Cost Rules:** Tokens are calculated deterministically:
  1. **Operators:** `1 token` per operator (`2 tokens` for ternary `? :`).
  2. **Operands / Literals:** `1 token` per literal or operand (including unary negative numbers like `-1`).
  3. **Data Paths:** `1 token` per data path traversal (including static `data:post.title` and dynamic bracket access `data:posts[0]`).
  4. **Containers:** `1 token` per structured collection container (bracketed array `[...]` or braced object `{...}`).
  5. **Grouping:** `1 token` per grouping parentheses pair `( ... )`.
  6. **Call & Lambda Parentheses:** `0 tokens` for function argument parentheses and lambda parameter lists.
  7. **Delimiters & Keys:** `0 tokens` for punctuation delimiters (`,` and `:`) and object property keys.
- **Multiline Flattening:** Line breaks inside expressions consume 0 tokens; multiline expressions flatten cleanly on save with exact token parity.
- **Recursion Guard (`maxDepth: 50`):** The Pratt expression parser enforces a maximum depth of 50 frames, preventing `RangeError` call stack exhaustion in strict and tolerant modes.
