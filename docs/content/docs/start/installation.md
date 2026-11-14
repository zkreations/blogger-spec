---
title: Installation
description: Installing BloggerSpec and setting up your project environment.
weight: 1
---

BloggerSpec is distributed as a zero-dependency universal ESM package available on the npm registry. It is designed to work seamlessly out of the box across modern JavaScript runtimes, including Node.js, Deno, Bun, Cloudflare Workers, and browser environments, without requiring polyfills or native compilation steps.

## Package Manager

Install the package using your preferred package manager:

{{< tabs >}}
{{< tab "pnpm" >}}
```bash
pnpm add blogger-spec
```
{{< /tab >}}
{{< tab "npm" >}}
```bash
npm install blogger-spec
```
{{< /tab >}}
{{< tab "yarn" >}}
```bash
yarn add blogger-spec
```
{{< /tab >}}
{{< tab "bun" >}}
```bash
bun add blogger-spec
```
{{< /tab >}}
{{< /tabs >}}

## Environment Requirements

- **Node.js:** `>= 18.0.0` (native ESM support)
- **TypeScript:** `>= 5.0.0` (optional, for type-checking and autocompletion)
- **Universal Environments:** Compatible with browsers, Cloudflare Workers, Deno, and Edge runtimes with zero polyfills.

{{< hint info >}}
For tree-shaking and targeted imports in lightweight bundles, consult the [Subpaths Reference](/docs/api/subpaths).
{{< /hint >}}
