# Vite+ Build System

The hosted-JS build for all 17 components. Uses [Vite+](https://viteplus.dev) (`vite-plus` npm package) with Rolldown for ESM and IIFE browser bundles. The npm distribution runs through `vp pack`.

**Epic:** [DTBTWEB-1454](https://paypal.atlassian.net/browse/DTBTWEB-1454)

## Code Style

Build scripts use **TypeScript + ESM** (Node v24 native strip-types). Source code in `src/` stays ES5 syntax for now, but build output targets ES2017 — no IE11 support.

## Prerequisites

```bash
# System-level vp CLI (one-time)
curl -fsSL https://vite.plus | bash

# Project deps (vite-plus installed as devDependency)
npm install
```

## Quick Start

```bash
# Build all components
npm run build:cdn

# Build specific component(s)
npm run build:cdn -- hosted-fields
npm run build:cdn -- hosted-fields frame-service

# Validate output (env leaks, CSP hashes, IIFE namespace, etc.)
npm run build:validate
```

## Output

All output goes to `dist/hosted/web/{VERSION}/`:

```
dist/hosted/web/3.x.x/
  js/
    paypal-checkout-v6.js       # Unminified IIFE
    paypal-checkout-v6.min.js   # Minified IIFE
    hosted-fields.js
    hosted-fields.min.js
  html/
    dispatch-frame.html         # Inlined JS + minified companion
    dispatch-frame.min.html
    cancel-frame.html
    cancel-frame.min.html
    redirect-frame.html
    redirect-frame.min.html
    hosted-fields-frame.html    # Inlined JS + CSP meta tag
    hosted-fields-frame.min.html
```

## Tests

```bash
# Plugin unit tests
npm run test:build-scripts

# Type check build scripts
npm run typecheck:build-scripts
```

## How It Works

### Build Pipeline

```
src/{component}/index.js
  → Rolldown (bundler, inside vite-plus)
  → Rolldown minifier       (for .min.js only; target: es2017)
  → dist/hosted/web/{VERSION}/js/{component}.js
```

### Frame Pipeline (hosted-fields, frame-service)

```
src/.../index.js (or {frame}-frame.js)
  → Rolldown bundle
  → inline-html-entry-plugin   bundles JS, inlines into HTML template via <script type="module">
  → csp-hash-plugin            SHA-256 hashes inline scripts, injects <meta> CSP tag (hosted-fields only)
  → emit-min-html-plugin       emits .min.html companion
  → dist/hosted/web/{VERSION}/html/{frame}.html + .min.html
```

### Key Config

- Task graph: `scripts/build/run.config.ts` (consumed by `vp run` via the root `vite.config.ts`)
- ESM components: `scripts/build/configs/components.ts` (declarative `vp build -c`)
- IIFE components: `scripts/build/build-legacy-components.ts` (per-component `vite-plus` build; dotted `braintree.*` nested-global namespace accumulation)
- Shared `define` replaces all `process.env.*` at compile time (replaces envify + removeIf markers): `scripts/build/vite/configs/shared.ts`
- Target: `es2017` — IE11 not supported on the Vite path

### Custom Rolldown Plugins

| Plugin                     | Hook             | Enforce | Purpose                                                             |
| -------------------------- | ---------------- | ------- | ------------------------------------------------------------------- |
| `inline-html-entry-plugin` | `generateBundle` | normal  | Finds `<script type="module">`, inlines bundle, emits `.html`       |
| `csp-hash-plugin`          | `generateBundle` | post    | SHA-256 CSP hashes for inline scripts, injects `<meta>` via cheerio |
| `emit-min-html-plugin`     | `generateBundle` | post    | Emits `.min.html` companion via `html-minifier-terser`              |

Plugin order matters: `inline-html-entry → csp-hash → emit-min-html` ensures CSP hashes are computed before minification.
