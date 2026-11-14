---
title: Compiler
description: How to architect and implement an HTML template compiler and local preview server.
weight: 1
---

Learn how to architect and implement a production-grade HTML template compiler and local preview dev server using BloggerSpec. While BloggerSpec provides AST parsing, expression evaluation, subroutine resolution, and stylesheet compilation, traversing the AST, maintaining the DOM mutation buffer, and emitting final HTML markup belongs to the consuming compiler.

## Pipeline Architecture

A conforming Blogger compiler processes templates through 5 sequential phases:

| Phase | Stage | Primary API | Core Responsibility |
| :---: | :--- | :--- | :--- |
| **1** | Parser AST | `parseTemplate(xml)` | Converts raw template XML into a `BloggerDocumentNode` AST. |
| **2** | Subroutine Registry | `indexIncludables(doc)` | Builds the 6-tier subroutine dispatch and collision table. |
| **3** | Skin Compilation | `compileSkinCss(skin)` | Decomposes compound variables and compiles CSS for `<head>`. |
| **4** | Scope & Context | `ScopeEnvironment` | Initializes the lexical scope stack with `resolveBloggerContext`. |
| **5** | DOM Mutation Buffer | `pushTarget` / `flushTarget` | Accumulates and hoists `b:class` and `b:attr` mutations. |

## Step-by-Step Implementation

### Step 1: Parsing the Template into an AST

Convert raw template XML into a `BloggerDocumentNode`:

```typescript
import { parseTemplate } from 'blogger-spec'

const doc = parseTemplate(xmlSource, {
  tolerant: false,
  parseExpressions: true,
})
```

### Step 2: Indexing Subroutines and Includables

Register global `<b:defaultmarkup>` blocks and local widget `<b:includable>` subroutines into a dispatch table:

```typescript
import { indexIncludables, resolveIncludable } from 'blogger-spec'

const registry = indexIncludables(doc)
const resolved = resolveIncludable('post:card', 'Blog1', 'Blog', registry)
```

### Step 3: Compiling Styles and Extracting Variables

Extract stylesheet variables and compile CSS ready for injection into `<head>`:

```typescript
import { compileSkinCss } from 'blogger-spec'

const skinResult = compileSkinCss(skinCData, {
  wrap: 'page-skin',
  stripMetadataTags: true,
})
```

### Step 4: Initializing Scopes and Context

Set up the lexical environment using `ScopeEnvironment` and canonical context:

```typescript
import { resolveBloggerContext, ScopeEnvironment } from 'blogger-spec'

const context = await resolveBloggerContext({ view: 'post' })
const scope = new ScopeEnvironment()
scope.pushScope('global', { symbols: context })
```

### Step 5: Walking AST Nodes with DOM Mutation Buffer

Walk nodes while buffering `<b:class>` and `<b:attr>` mutations on the active element stack top. Continuous mutations pierce transparent control containers (`<b:if>`, `<b:loop>`, `<b:with>`) and subroutine boundaries (`<b:include>`).

## Minimal Reference Compiler

The following is a complete functional compiler illustrating zero-dependency AST traversal and DOM mutation handling:

```typescript
import type {
  BloggerDirectiveNode,
  BloggerElementNode,
  BloggerTemplateNode,
} from 'blogger-spec'
import {
  evaluateExpression,
  indexIncludables,
  parseTemplate,
  resolveBloggerContext,
  ScopeEnvironment,
} from 'blogger-spec'

export class SimpleBloggerCompiler {
  private scope = new ScopeEnvironment()
  private classStack: string[][] = []
  private attrStack: Array<Record<string, string>> = []

  async compile(xml: string, view = 'homepage'): Promise<string> {
    const doc = parseTemplate(xml)
    const registry = indexIncludables(doc)
    const context = await resolveBloggerContext({ view })

    this.scope = new ScopeEnvironment()
    this.scope.pushScope('global', { symbols: context })

    return this.walkNodes(doc.children, registry)
  }

  private walkNodes(nodes: readonly BloggerTemplateNode[], registry: any): string {
    let out = ''
    for (const node of nodes) {
      out += this.walkNode(node, registry)
    }
    return out
  }

  private walkNode(node: BloggerTemplateNode, registry: any): string {
    switch (node.type) {
      case 'Text':
        return node.value

      case 'Element':
        return this.renderElement(node, registry)

      case 'Directive':
        return this.renderDirective(node, registry)

      default:
        return ''
    }
  }

  private renderElement(elem: BloggerElementNode, registry: any): string {
    this.classStack.push(elem.attributes.class?.value ? [elem.attributes.class.value] : [])
    this.attrStack.push({})

    const innerHtml = this.walkNodes(elem.children, registry)

    const accumulatedClasses = this.classStack.pop()!.join(' ').trim()
    const upsertedAttrs = this.attrStack.pop()!

    const attrs = { ...elem.attributes, ...upsertedAttrs }
    if (accumulatedClasses) {
      attrs.class = { name: 'class', value: accumulatedClasses } as any
    }

    const attrStr = Object.values(attrs)
      .filter(a => a.value !== '' && a.value !== undefined && a.name !== 'b:whitespace')
      .map(a => ` ${a.name}="${a.value}"`)
      .join('')

    return elem.selfClosing ? `<${elem.name}${attrStr}/>` : `<${elem.name}${attrStr}>${innerHtml}</${elem.name}>`
  }

  private renderDirective(dir: BloggerDirectiveNode, registry: any): string {
    switch (dir.name) {
      case 'b:if': {
        const condNode = dir.attributes.cond?.expression
        const isTrue = condNode ? evaluateExpression(condNode, this.scope.currentContext) : false
        return isTrue ? this.walkNodes(dir.children, registry) : ''
      }

      case 'b:class': {
        const name = dir.attributes.name?.value
        if (name && this.classStack.length > 0) {
          this.classStack[this.classStack.length - 1]!.push(name)
        }
        return ''
      }

      case 'b:attr': {
        const name = dir.attributes.name?.value
        const value = dir.attributes.value?.value ?? ''
        if (name && this.attrStack.length > 0) {
          this.attrStack[this.attrStack.length - 1]![name] = value
        }
        return ''
      }

      default:
        return this.walkNodes(dir.children, registry)
    }
  }
}
```
