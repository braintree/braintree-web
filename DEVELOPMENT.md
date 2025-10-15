# Development Notes

Throughout this page, replace `<component>` with the name of any SDK component (`client`, `paypal`, etc).

## Table of Contents

- [Development Notes](#development-notes)
  - [Table of Contents](#table-of-contents)
  - [Project Structure](#project-structure)
  - [Project Environment](#project-environment)
  - [Building](#building)
    - [SJCL](#sjcl)
  - [Linting](#linting)
  - [Testing](#testing)
  - [Generating Documentation](#generating-documentation)
  - [Storybook Integration](#storybook-integration)
  - [Releasing](#releasing)

## Project Structure

```
braintree.js
├── dist/hosted        <- assets output
├── dist/bower/        <- bower package output
├── dist/npm/          <- npm package output
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

- **BRAINTREE_JS_API_HOST** identifies the host where a development gateway is running.
- **BRAINTREE_JS_API_PORT** identifies the port where a development gateway is running.
- **BRAINTREE_JS_API_PROTOCOL** identifies the protocol where a development gateway is running.
- **BRAINTREE_JS_HOSTED_DEST** identifies where to copy `dist/hosted` assets for release.
- **BRAINTREE_JS_BOWER_DEST** identifies where to copy `dist/bower` assets for bower release.
- **BRAINTREE_JS_SOURCE_DEST** identifies where to patch code deltas as a source release.

## Building

For all components

```
npm run build
```

For a single component

```
npm run build <component>
```

This will create the following `dist` structure:

```
├── dist/npm/
│   └── ... (mirrors src/)
├── dist/bower/
│   ├── index.js
│   ├── LICENSE
│   ├── bower.json
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

`dist/npm` contains the pre-processed src tree that is published to npm, ready for use within a CommonJS environment.

`dist/bower` contains exactly what the `braintree-web-bower` bower module will contain: the externally linkable and `require`able javascript files. These will also be present in `dist/hosted` under `dist/hosted/web/@VERSION/js`.

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

### SJCL

The Data Collector component uses a crypto library called [SJCL](https://github.com/bitwiseshiftleft/sjcl). We include a custom build that only includes the pieces we need.

To do this build yourself, do the following:

1. Clone [the SJCL repo](https://github.com/bitwiseshiftleft/sjcl) outside of any Braintree.js directory.
1. Check out a stable version. For example, if the latest stable SJCL version is `1.0.6`, run `git checkout 1.0.6`. We are using `1.0.6`.
1. Run `./configure --without-all --with-random --with-codecHex` to configure our special build.
1. Run `make sjcl.js` to build and minify the file.
1. Copy the newly-modified `sjcl.js` file into `/path/to/braintree.js/src/data-collector/vendor`.

## Linting

For all code

```
npm run lint
```

For a single component

```
npm run lint <component>
```

## Testing

For all tests

```
npm test
```

For a single component

```
npm test <component>
```

For the lib directory

```
npm test lib
```

For one test file

First install jest:

```
npm install jest --global
```

To run test:

```
jest <path to file>
Example: jest test/apple-pay/unit/apple-pay.js
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

## Storybook Integration

To build and integrate with Storybook for local development and testing:

```
npm run build:integration
```

This will:

1. Build the SDK
2. Copy local build files to Storybook's static directory
3. Build Storybook
4. Start an HTTPS server

After running this command, you can access Storybook at https://127.0.0.1:8080 and test with your local SDK build.

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
