Development Notes
=================

Throughout this page, replace `<component>` with the name of any SDK component (`client`, `paypal`, etc).

## Table of Contents

* [Project Structure](#project-structure)
* [Project Environment](#project-environment)
* [Building](#building)
* [Linting](#linting)
* [Testing](#testing)
* [Generating Documentation](#generating-documentation)
* [Releasing](#releasing)

## Project Structure

```
braintree.js
├── dist/hosted        <- assets output
├── dist/published/    <- npm/bower package output
├── publishing/        <- npm/bower-specific sources
├── scripts/           <- build helper scripts
├── src/               <- source code
│   ├── <component>/
│   └── ...
├── tasks/             <- gulp tasks
└── test/              <- testing suite
    ├── <component>/
    └── ...
```

## Project Environment

This section only applies to internal braintree development and deployments.

This library makes use of environment variables specified in a `.env` file. This file is not committed and is ignored via `.gitignore`. You will need to create this file and set some variables within it.

Here's an example `.env` file:
```
BRAINTREE_JS_API_HOST=development.gateway.hostname
BRAINTREE_JS_API_PORT=443
BRAINTREE_JS_API_PROTOCOL=https
BRAINTREE_JS_HOSTED_DEST=/absolute/path/to/assets/directory
BRAINTREE_JS_BOWER_DEST=/absolute/path/to/braintree-web-bower/repository
BRAINTREE_JS_SOURCE_DEST=/absolute/path/to/braintree-web/repository
```

* __BRAINTREE_JS_API_HOST__ identifies the host where a development gateway is running.
* __BRAINTREE_JS_API_PORT__ identifies the port where a development gateway is running.
* __BRAINTREE_JS_API_PROTOCOL__ identifies the protocol where a development gateway is running.
* __BRAINTREE_JS_HOSTED_DEST__ identifies where to copy `dist/hosted` assets for release.
* __BRAINTREE_JS_BOWER_DEST__ identifies where to copy `dist/published` assets for bower release.
* __BRAINTREE_JS_SOURCE_DEST__ identifies where to patch code deltas as a source release.

## Building

For all components

```
npm run build
```

For a single component

```
npm run build -- <component>
```

This will create the following `dist` structure:

```
├── dist/published/
│   ├── index.js
│   ├── LICENSE
│   ├── package.json
│   ├── <component>.js
│   ├── <component>.min.js
│   └── ...
└── dist/hosted/
    └── web/
        ├── 3.0.0/
        │   ├── css/
        │   ├── html/
        │   ├── images/
        │   └── js/
        └── dev@ -> 3.0.0/
```

`dist/published` contains exactly what the `braintree-web` npm and bower modules will contain: the externally linkable and `require`able javascript files. These will also be present in `dist/hosted` under `dist/histed/web/@VERSION/js`.

`dist/hosted` has a file structure that mirrors what will be available at https://assets.braintreegateway.com. All component libraries' `js`, `css`, and `html` will be merged under a common, versioned path at https://assets.braintreegateway.com:

```
https://assets.braintreegateway.com/
└── web/
    └── 3.0.0/
        ├── css/
        ├── html/
        ├── images/
        └── js/
```

The `web/dev` symlink will be a copy of one of the versioned directories, such as `web/3.0.0`. It will only be present during development and never deployed.

## Linting

For all code

```
npm run lint
```

For a single component

```
npm run lint -- <component>
```

## Testing

For all tests

```
npm test
```

For a single component

```
npm test -- <component>
```

## Generating Documentation

```
npm run jsdoc
```

This will populate the `./dist/jsdoc/<version>/` directory, with `index.html` being the home page..

In a new tmux window, under the `js-sdk-integration` repo, run

```
npm run assets
```

This will serve the currently built JSDocs on port `9292`, and can be reached at `pairXX.chi.braintreepayments.com:9292/<version>`.

## Releasing

The following will build and copy all appropriate files into `BRAINTREE_JS_HOSTED_DEST`

```
npm run release -- hosted
```

The following will build and copy all appropriate files into `BRAINTREE_JS_BOWER_DEST`

```
npm run release -- bower
```

The following will build and deploy the appropriate [JSDocs](https://braintree.github.io/braintree-web/).

```
npm run release -- jsdoc
```

The following will prepare source changes for release to [braintree-web](https://github.com/braintree/braintree-web)

```
npm run release -- source
```
