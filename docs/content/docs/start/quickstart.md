---
title: Quickstart
description: Basic usage examples for parsing templates, evaluating expressions, and resolving view contexts.
weight: 2
---

Get started with BloggerSpec in minutes. This guide demonstrates the three core capabilities of the library: parsing dynamic Blogger expressions with Pratt precedence, converting XML template source into typed ASTs, and resolving canonical view contexts for testing and offline development.

## 1. Evaluating Expressions

Parse expression strings into ASTs and evaluate them safely against data contexts:

```typescript
import { evaluateExpression, parseExpression } from 'blogger-spec'

const ast = parseExpression('data:blog.title ?: "Default Title"')
const context = {
  blog: {
    title: 'Engineering Blog'
  }
}

const result = evaluateExpression(ast, context)
console.log(result) // 'Engineering Blog'
```

## 2. Parsing XML Templates

Transform complete Blogger XML templates into strongly typed `BloggerDocumentNode` ASTs:

```typescript
import { parseTemplate } from 'blogger-spec'

const xml = `
<b:section id='main'>
  <b:widget id='Blog1' type='Blog'>
    <b:includable id='main'>
      <h1><data:blog.title/></h1>
    </b:includable>
  </b:widget>
</b:section>
`

const doc = parseTemplate(xml)
console.log(doc.children.length) // 1
```

## 3. Resolving Canonical Contexts

Synthesize canonical data structures for any of the 12 canonical Blogger views:

```typescript
import { resolveBloggerContext } from 'blogger-spec'

const context = await resolveBloggerContext({
  view: 'post',
  blogId: '123456789'
})

console.log(context.view.isPost) // true
console.log(context.view.isHomepage) // false
```
