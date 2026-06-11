# braintree-web

A suite of tools for integrating Braintree in the browser.

This is the repo to submit issues if you have any problems or questions about a Braintree JavaScript integration.

For a ready-made payment UI, see [Braintree Web Drop-in](https://github.com/braintree/braintree-web-drop-in).

## Install

```shell
npm install braintree-web
```

## Usage

For more thorough documentation, visit [the JavaScript client SDK docs](https://developer.paypal.com/braintree/docs/guides/client-sdk/setup/javascript/v3).

If you are upgrading from version 2.x, take a look at our [migration guide](https://developer.paypal.com/braintree/docs/guides/client-sdk/migration/javascript/v3). For migrations related to removed components (e.g., the deprecated PayPal component), see [MIGRATION.md](MIGRATION.md).

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
var submitBtn = document.getElementById("my-submit");
var form = document.getElementById("my-sample-form");

braintree.client.create(
  {
    authorization: CLIENT_AUTHORIZATION,
  },
  clientDidCreate
);

function clientDidCreate(err, client) {
  braintree.hostedFields.create(
    {
      client: client,
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
    },
    hostedFieldsDidCreate
  );
}

function hostedFieldsDidCreate(err, hostedFields) {
  submitBtn.addEventListener("click", submitHandler.bind(null, hostedFields));
  submitBtn.removeAttribute("disabled");
}

function submitHandler(hostedFields, event) {
  event.preventDefault();
  submitBtn.setAttribute("disabled", "disabled");

  hostedFields.tokenize(function (err, payload) {
    if (err) {
      submitBtn.removeAttribute("disabled");
      console.error(err);
    } else {
      form["payment_method_nonce"].value = payload.nonce;
      form.submit();
    }
  });
}
```

#### Advanced integration

To be eligible for the easiest level of PCI compliance (SAQ A), payment fields cannot be hosted on your checkout page. For an alternative to the following, use Hosted Fields.

```javascript
braintree.client.create(
  {
    authorization: CLIENT_AUTHORIZATION,
  },
  function (err, client) {
    client.request(
      {
        endpoint: "payment_methods/credit_cards",
        method: "post",
        data: {
          creditCard: {
            number: "4111111111111111",
            expirationDate: "10/20",
            cvv: "123",
            billingAddress: {
              postalCode: "12345",
            },
          },
        },
      },
      function (err, response) {
        // Send response.creditCards[0].nonce to your server
      }
    );
  }
);
```

For more examples, [see the reference](https://braintree.github.io/braintree-web/current/Client.html#request).

#### Promises

All the asynchronous methods will return a `Promise` if no callback is provided.

```js
var submitBtn = document.getElementById("my-submit");
var yourStylesConfig = {
  /* your Hosted Fields `styles` config */
};
var yourFieldsConfig = {
  /* your Hosted Hields `fields` config */
};

braintree.client
  .create({ authorization: CLIENT_AUTHORIZATION })
  .then(function (client) {
    return braintree.hostedFields.create({
      client: client,
      styles: yourStylesConfig,
      fields: yourFieldsConfig,
    });
  })
  .then(function (hostedFields) {
    submitBtn.addEventListener("click", function (event) {
      event.preventDefault();
      submitBtn.setAttribute("disabled", "disabled");

      hostedFields
        .tokenize()
        .then(function (payload) {
          // send payload.nonce to your server
        })
        .catch(function (err) {
          submitBtn.removeAttribute("disabled");
          console.error(err);
        });
    });
  });
```

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

To run the Storybook development server

```shell
npm run storybook:dev
```

### Local build testing

To test local development builds in Storybook instead of published CDN versions:

```shell
npm run build
npm run storybook:dev-local
```

This will:

1. Copy your local build files to Storybook's static directory
2. Start Storybook with "Assets from local build" available in the version selector
3. Allow testing of local changes before they're published to CDN

The version selector dropdown will show "Assets from local build" when local builds are available. Select this option to load scripts from your local `dist/` directory instead of the CDN.

### Static build

To run the Storybook static build on a local secure server(required for Apple Pay flow to initialize)

First create a private key and certificate in the root directory of the repo

```shell
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem -subj "/CN=127.0.0.1"
```

Build the Storybook static files

```shell
npm run storybook:build
```

Start the secure server

```shell
npm run storybook:run-build
```

## Unit Tests (with Jest)

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

To run the Apple Pay tests, generate SSL certificates for the local HTTPS server:

```shell
 .storybook/scripts/generate-test-certs.sh
```

### Running

```shell
npm run test:integration
```

This builds the SDK with coverage flags (keeps `*-internal.js` + source maps), copies it into Storybook, builds Storybook, then runs the Chromium Playwright suite.

### Running specific tests

After one initial `npm run test:integration` (or `npm run build:integration` alone) to build assets, invoke Playwright directly for iteration:

```shell
npx playwright test --config=.storybook/tests/playwright.config.ts .storybook/tests/your-test-file.test.ts
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

V8 → Istanbul coverage is collected only when `PLAYWRIGHT_INTEGRATION_COVERAGE=true` is set. Default `npm run test:integration` skips coverage so iteration stays fast.

```shell
PLAYWRIGHT_INTEGRATION_COVERAGE=true npm run test:integration
```

Reports land in `coverage/integration/`:

- `html/index.html` — per-file line/branch/function coverage
- `lcov.info` — machine-readable LCOV
- `coverage-summary.txt` — console-friendly table
- `coverage-totals.txt` — top-line percentages (consumed by the PR coverage comment)

## Releases

Subscribe to this repo to be notified when SDK releases go out.

## Versions

This SDK abides by our Client SDK Deprecation Policy. For more information on the potential statuses of an SDK check our [developer docs](https://developer.paypal.com/braintree/docs/guides/client-sdk/migration/javascript/v3).

| Major version number | Status      | Released      | Deprecated    | Unsupported   |
| -------------------- | ----------- | ------------- | ------------- | ------------- |
| 3.x.x                | Active      | August 2016   | TBA           | TBA           |
| 2.x.x                | Unsupported | November 2014 | February 2022 | February 2023 |

## License

The Braintree JavaScript SDK is open source and available under the MIT license. See the [LICENSE](LICENSE) file for more info.

## Troubleshooting

### General Notes

- If running your dev-local instance, remember you will likely need to rebuild your integration and restart your server. Run `npm run build:integration` again. A manual server restart via `npm run storybook:dev-local` may be necessary.
- We have had some issues with authorization tokens being held in caches when trying to refresh, so remember to clear your browser caches.

#### `Authentication credentials are invalid. Either the client token has expired and a new one should be generated or the tokenization key has been deactivated or deleted.`

We have come across this error when trying to run ApplePay locally, when using a shared sandbox tokenization key. While we could generate new sandbox tokens, we were unsure of what login information or account is associated with the shared merchant token. Visiting [this link](https://braintree-sample-merchant.herokuapp.com/client_token) generates a client token for that merchant, which can be used in place of `STORYBOOK_BRAINTREE_TOKENIZATION_KEY` instead, e.g.:

```plaintext
STORYBOOK_BRAINTREE_TOKENIZATION_KEY="eyJ2ZXJzaW9uIjoyLCJ..."
```

Note that the generated token is only valid for 24 hours.

### HTTPS Test Server

Apple Pay and other HTTPS-only flows require local SSL certificates. Generate them with:

```sh
npm run generate-test-certs
```

This creates `.storybook/certs/localhost.key` and `.storybook/certs/localhost.crt` (self-signed, testing only).

To enable HTTPS for a specific test, pass `useHttps: true` via the `testServer` fixture options and set `ignoreHTTPSErrors: true` on the Playwright `use` block:

```typescript
test.use({
  testServerOptions: { useHttps: true },
  ignoreHTTPSErrors: true,
});
```
