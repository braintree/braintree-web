# braintree-web

> [!IMPORTANT]
> You are viewing the README for **v4** of the Braintree Web SDK, which is
> currently a prerelease and not recommended for production use. For the latest
> stable release, see the [`v3.x` branch](https://github.com/braintree/braintree-web/tree/v3.x).

A suite of tools for integrating Braintree in the browser.

## Install

```shell
npm install braintree-web
```

## Usage

For more thorough documentation, visit [the JavaScript client SDK docs](https://developer.paypal.com/braintree/docs/guides/client-sdk/setup/javascript/v4).

If you are upgrading from version 3.x, take a look at our [migration guide](MIGRATION.md).

### Hosted Fields integration

```html
<form action="/" id="my-sample-form">
  <input type="hidden" name="payment_method_nonce" />
  <label for="card-number">Card Number</label>
  <div id="card-number"></div>

  <label for="cvv">CVV</label>
  <div id="cvv"></div>

  <label for="expiration-date">Expiration Date</label>
  <div id="expiration-date"></div>

  <input id="my-submit" type="submit" value="Pay" disabled />
</form>
```

```javascript
const initBraintree = async () => {
  const submitBtn = document.getElementById("my-submit");
  const form = document.getElementById("my-sample-form");

  const clientInstance = await braintree.client.create({
    authorization: CLIENT_AUTHORIZATION,
  });

  const hostedFieldsInstance = await braintree.hostedFields.create({
    client: clientInstance,
    styles: {
      input: {
        "font-size": "16pt",
        color: "#3A3A3A",
      },

      ".number": {
        "font-family": "monospace",
      },

      ".valid": {
        color: "green",
      },
    },
    fields: {
      number: {
        selector: "#card-number",
      },
      cvv: {
        selector: "#cvv",
      },
      expirationDate: {
        selector: "#expiration-date",
      },
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    submitBtn.setAttribute("disabled", "disabled");

    try {
      const { nonce } = await hostedFieldsInstance.tokenize();

      form["payment_method_nonce"].value = nonce;
      form.submit();
    } catch (err) {
      submitBtn.removeAttribute("disabled");
      console.error(err);
    }
  };

  submitBtn.addEventListener("click", handleSubmit);
  submitBtn.removeAttribute("disabled");
};

initBraintree().catch(console.error);
```

## Code Generation

To generate Typescript types for the GraphQL service run `npm run codegen`. You must have `GITHUB_TOKEN` set in your shell or `.env` file for this to work. If you have the gh cli installed `gh auth token` will give you your token.

## Building the SDK

There are a few build scripts, and they produce different assets:

- `npm run build:cdn` builds the hosted/CDN assets: per-component ESM (`.mjs` / `.min.mjs`) and IIFE (`.js` / `.min.js`) bundles plus the inlined and landing HTML frames, all written to `dist/hosted/web/<version>/`. This is what gets served from the CDN.
- `npm run build:npm` builds the npm package. Bundled per-component CommonJS plus the top-level index, written to `dist/npm/`. This is what ships to npm.
- `npm run build` builds both the CDN and NPM formats
- `npm run build:dev` development build for Storybook

[Would you like to know how the build pipeline actually works?](scripts/build/README.md)

## Storybook

[Storybook](https://storybook.js.org/) is used for isolated component demonstration and integration testing.

### Setup

Retrieve your sandbox tokenization key from your Braintree sandbox account and add it to `.env`.

For full functionality, add _at least_ the following to your `.env` file:

```shell
BRAINTREE_JS_ENV=development
STORYBOOK_BRAINTREE_TOKENIZATION_KEY="your-sandbox-tokenization-key"
```

The `BRAINTREE_JS_ENV=development` setting is required for:

- Using local assets in Storybook instead of CDN files
- Making hosted-fields iframe URLs load from local resources
- Running integration tests with local builds

Ensure the sandbox account used for testing is fully configured to use any payment methods that will be tested. For full testing capabilities, follow the steps in [Integration Tests](#integration-tests).

### Development server

To run the Storybook development server against your local SDK build:

```shell
npm run storybook
```

This single command will:

1. Build the SDK to `dist/` — per-component `.js` and `.mjs` bundles (via `build:cdn`)
2. Copy your local build files to Storybook's static directory
3. Start Storybook with "Assets from local build" available in the version selector

The version selector dropdown will show "Assets from local build" when local builds are available. Select this option to load scripts from your local `dist/` directory instead of the CDN, or pick a published CDN version. Note: every launch does a full SDK rebuild.

## Unit Tests

Unit tests can be run to test the functionality of each individual component. These tests can be run with:

```shell
npm run test
```

## Integration Tests

Playwright drives the suite on local Chromium.

### Credentials

From your **Braintree sandbox account**, find your _merchant ID_, _public key_, _private key_, and _tokenization key_.

To test PPCPv6 functionality, you will need to follow the steps [to link your Braintree Sandbox and Paypal developer account](https://developer.paypal.com/braintree/docs/guides/paypal/testing-go-live/javascript/v3/#linked-paypal-testing). From your **Paypal developer account**, you will need the _email_ and _password_.

### Setup

Follow the [setup](#setup) instructions to create your `.env` file, update the file to include these credentials:

```shell
BRAINTREE_JS_ENV=development
STORYBOOK_BRAINTREE_MERCHANT_ID=merchant_id
STORYBOOK_BRAINTREE_PUBLIC_KEY=public_key
STORYBOOK_BRAINTREE_PRIVATE_KEY=private_key
STORYBOOK_BRAINTREE_TOKENIZATION_KEY=tokenization_key
PAYPAL_SANDBOX_BUYER_EMAIL=paypal_sandbox_email
PAYPAL_SANDBOX_BUYER_PASSWORD=paypal_sandbox_password
```

### Running

```shell
vp run playwright:test
```

This builds the SDK with coverage flags (keeps `*-internal.js` + source maps), copies it into Storybook, builds Storybook, then runs the Chromium Playwright suite.

### Running specific tests

```shell
vp run playwright:test -- .storybook/tests/your-test-file.test.ts
```

To run only a specific test case within a file, temporarily add `.only` to the test:

```typescript
test("should test something", async function () {
  // test code here
});

test.only("should test something", async function () {
  // test code here
});
```

### Coverage (opt-in)

V8 → Istanbul coverage is collected only when `PLAYWRIGHT_INTEGRATION_COVERAGE=true` is set. Default `vp run test:playwright` skips coverage so iteration stays fast.

```shell
PLAYWRIGHT_INTEGRATION_COVERAGE=true vp run test:playwright
```

Reports land in `coverage/integration/`:

- `html/index.html` — per-file line/branch/function coverage
- `lcov.info` — machine-readable LCOV
- `coverage-summary.txt` — console-friendly table
- `coverage-totals.txt` — top-line percentages (consumed by the PR coverage comment)

## Releases

Subscribe to this repo to be notified when SDK releases go out.

## Versions

This SDK abides by our Client SDK Deprecation Policy. For more information on the potential statuses of an SDK check our [developer docs](https://developer.paypal.com/braintree/docs/guides/client-sdk/deprecation-policy/javascript/v4).

| Major version number | Status      | Released      | Deprecated    | Unsupported   |
| -------------------- | ----------- | ------------- | ------------- | ------------- |
| 4.x.x                | Prerelease  | TBA           | TBA           | TBA           |
| 3.x.x                | Active      | August 2016   | TBA           | TBA           |
| 2.x.x                | Unsupported | November 2014 | February 2022 | February 2023 |

## License

The Braintree JavaScript SDK is open source and available under the MIT license. See the [LICENSE](LICENSE) file for more info.

## Troubleshooting

### General Notes

- If running your local Storybook instance, remember to restart after SDK changes. `npm run storybook` rebuilds the SDK and re-copies it on every launch, so a restart picks up your changes.
- We have had some issues with authorization tokens being held in caches when trying to refresh, so remember to clear your browser caches.

#### `Authentication credentials are invalid. Either the client token has expired and a new one should be generated or the tokenization key has been deactivated or deleted.`

We have come across this error when trying to run ApplePay locally, when using a shared sandbox tokenization key. While we could generate new sandbox tokens, we were unsure of what login information or account is associated with the shared merchant token. Visiting [this link](https://braintree-sample-merchant.herokuapp.com/client_token) generates a client token for that merchant, which can be used in place of `STORYBOOK_BRAINTREE_TOKENIZATION_KEY` instead, e.g.:

```plaintext
STORYBOOK_BRAINTREE_TOKENIZATION_KEY="eyJ2ZXJzaW9uIjoyLCJ..."
```

Note that the generated token is only valid for 24 hours.

### HTTPS Test Server

Apple Pay and other HTTPS-only flows require local SSL certificates. `npm run playwright:build` generates them automatically; to create them standalone (for example when iterating on a test without rebuilding Storybook), run:

```sh
.storybook/scripts/generate-test-certs.sh
```

This creates `.storybook/certs/localhost.key` and `.storybook/certs/localhost.crt` (self-signed, testing only).

To enable HTTPS for a specific test, pass `useHttps: true` via the `testServer` fixture options and set `ignoreHTTPSErrors: true` on the Playwright `use` block:

```typescript
test.use({
  testServerOptions: { useHttps: true },
  ignoreHTTPSErrors: true,
});
```
