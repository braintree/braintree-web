# Development Notes

Throughout this page, replace `<component>` with the name of any SDK component (`client`, `paypal`, etc).

## Table of Contents

- [Development Notes](#development-notes)
  - [Table of Contents](#table-of-contents)
  - [Project Structure](#project-structure)
  - [Prerequisites](#prerequisites)
  - [Project Environment](#project-environment)
  - [Building](#building)
  - [Linting](#linting)
  - [Testing](#testing)
  - [Generating Documentation](#generating-documentation)
  - [Storybook Integration](#storybook-integration)

## Project Structure

```sh
braintree.js
├── dist/hosted        <- assets output
├── dist/npm/          <- npm package output
├── scripts/           <- build helper scripts
├── src/               <- source code
│   ├── <component>/
│   └── ...
└── test/              <- testing suite
    ├── <component>/
    └── ...
```

## Prerequisites

- Grab [nvm](https://github.com/nvm-sh/nvm) if you don't have it
- `nvm install && nvm use`
- `npm install`
- `.npmrc` blocks auto git hooks, run `npx husky` once.

## Project Environment

This section only applies to internal braintree development and deployments.

This library makes use of environment variables specified in a `.env` file. This file is not committed and is ignored via `.gitignore`. You will need to create this file and set some variables within it.

Here's an example `.env` file:

```sh
BRAINTREE_JS_API_HOST=development.gateway.hostname
BRAINTREE_JS_API_PORT=443
BRAINTREE_JS_API_PROTOCOL=https
BRAINTREE_JS_HOSTED_DEST=/absolute/path/to/assets/directory
BRAINTREE_JS_SOURCE_DEST=/absolute/path/to/braintree-web/repository
```

- **BRAINTREE_JS_API_HOST** identifies the host where a development gateway is running.
- **BRAINTREE_JS_API_PORT** identifies the port where a development gateway is running.
- **BRAINTREE_JS_API_PROTOCOL** identifies the protocol where a development gateway is running.
- **BRAINTREE_JS_HOSTED_DEST** identifies where to copy `dist/hosted` assets for release.
- **BRAINTREE_JS_SOURCE_DEST** identifies where to patch code deltas as a source release.

## Building

```sh
npm run build
```

This will create the following `dist` structure:

```sh
├── dist/npm/
│   └── ... (mirrors src/)
└── dist/hosted/
    └── web/
        ├── x.y.z/
        │   ├── css/
        │   ├── html/
        │   ├── images/
        │   └── js/
        └── dev@ -> x.y.z/
```

`dist/npm` contains the pre-processed src tree that is published to npm, ready for use within a CommonJS environment.

`dist/hosted` has a file structure that mirrors what will be available at <https://assets.braintreegateway.com>. All component libraries' `js`, `css`, and `html` will be merged under a common, versioned path at <https://assets.braintreegateway.com>:

```sh
https://assets.braintreegateway.com/
└── web/
    └── x.y.z/
        ├── css/
        ├── html/
        ├── images/
        └── js/
```

The `web/dev` symlink will be a copy of one of the versioned directories, such as `web/x.y.z`. It will only be present during development and never deployed.

## Linting

For all code

```sh
npm run lint
```

For a single component

```sh
npm run lint src/<component>
```

## Testing

For all tests

```sh
npm test
```

For a single component

```sh
npm test <component>
```

For one test file

```sh
npm test test/apple-pay/unit/apple-pay.js
```

## Generating Documentation

```sh
npm run jsdoc
```

This will populate the `./dist/jsdoc/<version>/` directory, with `index.html` being the home page..

## Storybook Integration

For interactive local development, run Storybook against your local build:

```sh
npm run storybook
```

This builds the SDK's `.js`/`.mjs` bundles, copies them into Storybook, and starts the dev server on port 6006.

To build the integration bundle used by the Playwright suite (coverage SDK build, local-build symlink, static Storybook, and SSL certs):

```sh
npm run playwright:build
```

This produces `storybook-static/` and `.storybook/certs/`; it does not start a server. Run `npm run playwright:test` to build and then drive the Chromium Playwright suite.
