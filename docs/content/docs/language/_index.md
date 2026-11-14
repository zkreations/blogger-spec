---
title: Language
description: Normative specification of Blogger XML templates, directives, expressions, typing, and skin syntax.
icon: code
weight: 20
---

The Blogger template language is a declarative domain-specific language blending standard HTML5 markup with namespaced XML flow directives, top-down Pratt dynamic expressions, and isolated stylesheet variables. This section establishes the normative grammar, execution semantics, scope resolution rules, and compile-time constraints of the language.

## Architectural Model

Blogger templates operate under a three-layer execution model:

1. **Document Skeleton:** Structural `<b:section>` containers and `<b:widget>` functional units partitioned across Layouts versions (v1, v2, v3).
2. **Control Directives:** XML flow instructions (`<b:if>`, `<b:loop>`, `<b:with>`, `<b:include>`) and transparent DOM mutation emitters (`<b:class>`, `<b:attr>`).
3. **Expression Engine:** Dynamic expressions evaluated within attributes (`expr:*`, `cond`, `values`, `value`) using Pratt operator precedence, relaxed equality, and collection lambdas.

## Language Invariants

- **Layouts v3 Target:** Modern templates enforce root attributes `b:css='false'`, `b:js='false'`, `b:defaultwidgetversion='2'`, and `b:layoutsVersion='3'`.
- **DOM Mutation Hoisting:** `b:class` (accumulate) and `b:attr` (upsert or omit) pierce through transparent control containers (`<b:if>`, `<b:loop>`, `<b:with>`) and subroutine boundaries (`<b:include>`).
- **Skin Isolation:** Theme Designer variables declared inside `<b:skin>` have `parent_type: null` and never inherit string methods.

## Topic Reference

| Topic | Primary Scope | Canonical Document |
| :--- | :--- | :--- |
| Directives & Mutations | Conditionals, iteration, subroutines, `<b:class>`, `<b:attr>`. | [Directives](/docs/language/directives) |
| Expression Grammar | Dual syntax, 10-tier Pratt precedence, lambdas, quotas. | [Expressions](/docs/language/expressions) |
| Type System & Scope | Primitives, subtypes, `skin:*` isolation, 6-tier lexical scope. | [Types](/docs/language/types) |
| Structural Layouts | Sections, widgets, canonical IDs, 6-tier includable dispatch. | [Layouts](/docs/language/layouts) |
| Stylesheet Theming | Theme Designer tags, compound fonts/backgrounds, `compileSkinCss`. | [Skins](/docs/language/skins) |

## Specifications

{{< pagelink href="/docs/language/directives" title="Directives" description="Flow instructions, nesting models, and DOM mutation hoisting" icon="layers" >}}

{{< pagelink href="/docs/language/expressions" title="Expressions" description="Syntax, Pratt operator precedence, lambdas, and runtime quotas" icon="sliders" >}}

{{< pagelink href="/docs/language/types" title="Types" description="Platform type hierarchy, skin variables, and data path traversal" icon="grid" >}}

{{< pagelink href="/docs/language/layouts" title="Layouts" description="Layout versions (v1-v3), sections, widgets, and 6-tier subroutine dispatch" icon="layout" >}}

{{< pagelink href="/docs/language/skins" title="Skins" description="Theme Designer tokens, compound properties, and CSS compilation" icon="palette" >}}
