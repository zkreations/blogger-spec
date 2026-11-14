---
title: Directives
description: Normative specification of XML flow directives, content models, and DOM mutation hoisting.
weight: 1
---

Blogger XML templates blend standard HTML5 structure with namespaced XML flow instructions (`<b:...>`). This specification establishes the formal content models, closing modes, tag nesting restrictions, and the DOM mutation pipeline that governs how directives manipulate parent markup during rendering.

## Directives Overview

- **Conditionals:** `<b:if>`, `<b:elseif>`, `<b:else>`, `<b:switch>`, `<b:case>`, `<b:default>`.
- **Iteration:** `<b:loop>` (array iteration and range loops).
- **Scope & Variables:** `<b:with>` (local identifier scoping).
- **Subroutines:** `<b:includable>` (subroutine definition) and `<b:include>` (subroutine invocation).
- **Output:** `<data:.../>`, `<b:eval>`, `<b:comment>`, `<b:message>`.
- **DOM Mutations:** `<b:class>`, `<b:attr>`, `<b:tag>`.

## DOM Mutation Pipeline

DOM mutation directives do not emit HTML directly; they modify the nearest enclosing HTML element or widget container during the template rendering phase.

{{< annotated >}}
```xml
<div class='card'>
  <b:class name='is-featured'/>
  <b:attr name='role' value='banner'/>
</div>
```
---
**Mutation Mechanics:**
- `<b:class>` (*accumulate* mode): Appends `is-featured` to existing classes, deduplicating whitespace.
- `<b:attr>` (*upsert_or_omit* mode): Injects `role="banner"`. Falsy, empty, or undefined values omit the attribute entirely.
{{< /annotated >}}

### Hoisting Through Flow Containers

Mutations pass through transparent control and subroutine boundaries without barrier:

- `<b:if>`, `<b:elseif>`, `<b:else>`
- `<b:switch>`, `<b:case>`, `<b:default>`
- `<b:with>`
- `<b:loop>` (classes accumulate across all iterations)
- `<b:tag cond='false'>` (unwrapped container passes mutations to parent)
- `<b:include>` (subroutine boundaries)

### Whitespace Stripping

Applied to void HTML elements (`<input>`, `<img>`, `<hr>`, `<br>`):
- Strips trailing whitespace inside the tag.
- Removes the `b:whitespace` attribute from the compiled output.
- Enforces XML-style self-closing syntax: `<img alt="Hero" src="https://example.com/hero.jpg"/>`.

{{< hint warning >}}
**Section Nesting Constraints (`BX1035`):** `<b:section>` elements are strictly permitted only directly under `<body>`, `<b:tag>`, structural HTML containers, or conditional branches (`<b:if>`, `<b:switch>`). They are forbidden under `<head>`, inside widgets, within loops, or nested directly inside another section.
{{< /hint >}}
