---
title: Directives
description: Normative specification of XML flow directives, content models, and DOM mutation hoisting.
weight: 1
---

Blogger XML templates blend standard HTML5 structure with namespaced XML flow instructions (`<b:...>`). This specification establishes the formal content models, closing modes, tag nesting restrictions, quotation conventions, and the DOM mutation pipeline that governs how directives manipulate parent markup during rendering.

## Directives Overview

Blogger XML provides 30 native constructs defined in `catalogs/directives.json`:

- **Layout & Packaging:** `<b:section>`, `<b:widget>`, `<b:widget-settings>`, `<b:widget-setting>`, `<b:defaultmarkups>`, `<b:defaultmarkup>`.
- **Conditionals & Branching:** `<b:if>`, `<b:elseif/>`, `<b:else/>`, `<b:switch>`, `<b:case/>`, `<b:default/>`.
- **Iteration:** `<b:loop>` (array iteration and numeric range loops `values='1 to 10'`).
- **Scope & Variables:** `<b:with>` (local identifier scoping to avoid 40-token quota overflow).
- **Subroutines:** `<b:includable>` (subroutine definition) and `<b:include/>` (subroutine invocation).
- **Output & Messages:** `<data:.../>`, `<b:eval/>`, `<b:comment>`, `<b:message>` (with optional `<b:param/>`).
- **DOM Mutations:** `<b:class/>`, `<b:attr/>`, `<b:tag>`.
- **Assets & Styling:** `<b:skin>`, `<b:template-skin>`, `<b:template-script/>`, `<Variable/>`, `<Group>`.

## Directive Closure Taxonomy

Blogger directives enforce strict syntactic closure models:

1. **Strictly Self-Closing (12 Directives):** Closing tags `</...>` are forbidden and fail compilation:
   - `<b:include name='...' [data='...'] [cond='...']/>`
   - `<b:eval expr='...'/>`
   - `<b:attr name='...' value='...' [cond='...']/>`
   - `<b:class name='...' [cond='...']/>`
   - `<b:param name='...' value='...'/>`
   - `<b:case value='...'/>`
   - `<b:default/>`
   - `<b:elseif cond='...'/>`
   - `<b:else/>`
   - `<b:template-script name='...'/>`
   - `<data:PROPERTY_PATH/>`
   - `<Variable name="..." .../>` (inside `<b:skin>` CDATA)
2. **Dual-Syntax Directive (1 Directive):**
   - `<b:message name='...'/>` is self-closing when unparameterized.
   - `<b:message name='...'><b:param .../></b:message>` is a container tag exclusively when interpolating child `<b:param/>` elements.
3. **Strictly Container Directives (17 Constructs):** Require paired closing tags `</...>`:
   - `<b:section>`, `<b:widget>`, `<b:includable>`, `<b:defaultmarkups>`, `<b:defaultmarkup>`, `<b:widget-settings>`, `<b:widget-setting>`, `<b:loop>`, `<b:with>`, `<b:if>`, `<b:switch>`, `<b:tag>`, `<b:comment>`, `<b:skin>`, `<b:template-skin>`, `<Group>`, `<![CDATA[...]]>`.

## Attribute Quotation Convention

To prevent delimiter collisions with inner string literals in dynamic expression attributes:
- **Single Quotes for Directives & HTML:** All XML directives and HTML attributes should use single quotes (`'...'`) by convention (e.g. `<b:eval expr='data:view.isPost ? "post" : "item"'/>`). Double quotes (`"..."`) are reserved for internal expression string literals.
- **Double Quotes for `<Variable>` and `<Group>`:** Inside `<b:skin>` CDATA, Theme Designer declarations strictly use double quotes (`"..."`) (e.g. `<Variable name="primaryColor" type="color" default="#14b8a6" value="#14b8a6"/>`), as they are processed by the Theme Designer preprocessor rather than the XML engine.

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
- `<b:class/>` (*accumulate* mode): Appends `is-featured` to existing classes, deduplicating whitespace.
- `<b:attr/>` (*upsert_or_omit* mode): Injects `role="banner"`. Falsy, empty, or undefined values omit the attribute entirely.
{{< /annotated >}}

### Hoisting Through Flow Containers

Mutations pass through transparent control and subroutine boundaries without barrier:

- `<b:if>`, `<b:elseif/>`, `<b:else/>`
- `<b:switch>`, `<b:case/>`, `<b:default/>`
- `<b:with>`
- `<b:loop>` (classes accumulate across all iterations)
- `<b:tag cond='false'>` (unwrapped container passes mutations to parent)
- `<b:include/>` (subroutine boundaries)

### Whitespace Stripping

Applied to void HTML elements (`<input>`, `<img>`, `<hr>`, `<br>`):
- Strips trailing whitespace inside the tag.
- Removes the `b:whitespace` attribute from the compiled output.
- Enforces XML-style self-closing syntax: `<img alt="Hero" src="https://example.com/hero.jpg"/>`.

{{< hint warning >}}
**Section Nesting Constraints (`BX1035`):** `<b:section>` elements are strictly permitted only directly under `<body>`, `<b:tag>`, structural HTML containers, or conditional branches (`<b:if>`, `<b:switch>`). They are forbidden under `<head>`, inside widgets, within loops, or nested directly inside another section.
{{< /hint >}}
