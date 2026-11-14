---
title: Types
description: Type hierarchy, platform subtypes, skin variable isolation, and member navigation with resolveDataPath.
weight: 3
---

Blogger templates operate on a strongly typed data model encompassing primitives, specialized platform subtypes, collections, and isolated Theme Designer tokens. This specification defines the platform type ontology, applicable modifiers, canonical member traversal using `resolveDataPath`, and the 6-tier lexical scope resolution stack.

## Type Ontology

- **Primitives:** `string`, `number`, `boolean`, `null`.
- **Collections:** Arrays of typed elements (`posts[]`, `labels[]`).
- **Platform Subtypes:** Inherit directly from `string` at depth 1 (`url`, `image`, `date`, `locale`, `message`). Fully assignable to `string`, supporting standard string operations while exposing specialized modifiers.
- **Boolean Literals:** Blogger recognizes exactly four canonical boolean literals: `true` and `yes` (truthy); `false` and `no` (falsy).

{{< hint warning >}}
**Theme Designer Isolation (`skin:*`):** Variables declared inside `<b:skin>` via `<Variable>` tags (`skin:color`, `skin:font`, `skin:background`, `skin:length`) have `parent_type: null`. They are completely isolated from `string` and cannot receive template string modifiers (`.length`, `.escaped`).
{{< /hint >}}

## Type Modifiers

Modifiers are computed properties accessed via dot notation:

### Template Modifiers (Outside-Skin)

| Target Type | Modifier | Output Type | Description |
| :--- | :--- | :--- | :--- |
| `string` | `.escaped` | {{< type "string" >}} | Escapes HTML entities for safe attribute interpolation. |
| `string` | `.length` / `.size` | {{< type "number" >}} | Character length of the string. |
| `string` | `.jsonEscaped` | {{< type "string" >}} | Escapes quotes and slashes for inline JSON. |
| `string` | `.jsEscaped` | {{< type "string" >}} | Escapes line breaks and control characters for JavaScript strings. |
| `image` | `.isResizable` | {{< type "boolean" >}} | `true` if hosted on Google CDN and supports `resizeImage`. |
| `image` | `.isYouTube` | {{< type "boolean" >}} | `true` if URL is a YouTube thumbnail. |
| `image` | `.youtubeMaxResDefaultUrl` | {{< type "url" >}} | Max-resolution URL (`maxresdefault.jpg`) for YouTube thumbnails. |
| `array` | `.length` / `.size` | {{< type "number" >}} | Number of elements in the collection. |
| `array` | `.empty` | {{< type "boolean" >}} | `true` if the collection length is 0. |
| `array` | `.notEmpty` | {{< type "boolean" >}} | `true` if the collection has 1 or more elements. |
| `array` | `.first` | {{< type "element" >}} | First item of the array (or `undefined` if empty). |
| `array` | `.last` | {{< type "element" >}} | Last item of the array. |

### Skin Modifiers (Compound Properties)

| Skin Type | Modifier | Scope | Description |
| :--- | :--- | :--- | :--- |
| `skin:font` | `.family`, `.size` | CSS & `data:skin.vars.*` | Font family stack and font size with unit. |
| `skin:font` | `.style`, `.weight` | CSS only | Font style (`normal`, `italic`) and weight (`bold`, `700`). |
| `skin:background` | `.color` | CSS & `data:skin.vars.*` | Background color hex or rgb string. |
| `skin:background` | `.image` | `data:skin.vars.*` only | Background image URL (available outside `<b:skin>` only). |
| `skin:color` | `.red`, `.green`, `.blue` | CSS & `data:skin.vars.*` | Integer RGB channels (0 to 255). |
| `skin:color` | `.alpha` | CSS & `data:skin.vars.*` | Alpha transparency channel (0.0 to 1.0). |
| `skin:color` | `.transparent` | CSS & `data:skin.vars.*` | Fully transparent `rgba(0,0,0,0)` representation. |
| `skin:color` | `.inverse` | CSS & `data:skin.vars.*` | Inverted complementary hex or rgba color value. |

## Data Traversal with resolveDataPath

The `resolveDataPath` function provides canonical member resolution across globals, widgets, types, modifiers, and Theme Designer variables:

```typescript
import { resolveDataPath } from 'blogger-spec/data-path'

// 1. Resolve typed global property with modifier
const urlProp = resolveDataPath('data:view.url.canonical')
// { name: 'canonical', type: 'url', sourceCatalog: 'types' }

// 2. Resolve widget property
const posts = resolveDataPath('data:posts.first.title')
// { name: 'title', type: 'string', sourceCatalog: 'widgets' }
```

## Scope Environment

Identifier resolution enforces 6-tier lexical precedence from innermost to outermost:

`lambda` → `loop` → `with` → `includable` → `widget` → `global`

| Priority | Scope Level | Template Syntax | Resolution Policy |
| :---: | :--- | :--- | :--- |
| **1** | `lambda` | Iterator in collection expressions | Innermost; prohibits `data:` prefix (`BX1019`). |
| **2** | `loop` | Loop variable `<b:loop var='item'>` | Bound per iteration; shadows outer scopes. |
| **3** | `with` | Scoped alias `<b:with var='x'>` | Lexical shadowing for the duration of the container. |
| **4** | `includable` | Subroutine parameters | Declared on `<b:includable id='...' var='...'>`; bound via `<b:include name='...' data='...'>`. |
| **5** | `widget` | Active gadget properties | Exposes widget fields (`data:title`, `data:posts`) and `data:widget` metadata. |
| **6** | `global` | Universal platform objects | Always accessible (`data:blog`, `data:view`, `data:messages`, `data:skin`, `data:widgets`, `data:template`). |
