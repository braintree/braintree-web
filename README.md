# braintree-web

A suite of tools for integrating Braintree in the browser.

This is the repo to submit issues if you have any problems or questions about a Braintree JavaScript integration.

For a ready-made payment UI, see [Braintree Web Drop-in](https://github.com/braintree/braintree-web-drop-in).

# Install

```
npm install braintree-web
```

```
bower install braintree-web
```

# Usage

For more thorough documentation, visit [the JavaScript client SDK docs](https://developer.paypal.com/braintree/docs/guides/client-sdk/setup/javascript/v3).

If you are upgrading from version 2.x, take a look at our [migration guide](https://developer.paypal.com/braintree/docs/guides/client-sdk/migration/javascript/v3).

#### Hosted Fields integration

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

# Storybook

[Storybook](https://storybook.js.org/) is used for isolated component demonstration and integration testing.

#### Setup

Retrieve your sandbox tokenization key from your Braintree sandbox account and add it to `.env`.

For full functionality, add the following to your `.env` file:

```
BRAINTREE_JS_ENV=development
STORYBOOK_BRAINTREE_TOKENIZATION_KEY="your-sandbox-tokenization-key"
```

The `BRAINTREE_JS_ENV=development` setting is required for:

- Using local assets in Storybook instead of CDN files
- Making hosted-fields iframe URLs load from local resources
- Running integration tests with local builds

Ensure the sandbox account used for testing is fully configured to use any payment methods that will be tested.

#### Development server

To run the Storybook development server

```
npm run storybook:dev
```

#### Local build testing

To test local development builds in Storybook instead of published CDN versions:

```
npm run build
npm run storybook:dev-local
```

This will:

1. Copy your local build files to Storybook's static directory
2. Start Storybook with "Assets from local build" available in the version selector
3. Allow testing of local changes before they're published to CDN

The version selector dropdown will show "Assets from local build" when local builds are available. Select this option to load scripts from your local `dist/` directory instead of the CDN.

#### Static build

To run the Storybook static build on a local secure server(required for Apple Pay flow to initialize)

First create a private key and certificate in the root directory of the repo

```
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem -subj "/CN=127.0.0.1"
```

Build the Storybook static files

```
npm run storybook:build
```

Start the secure server

```
npm run storybook:run-build
```

# Browserstack Testing

## Setup for Integration Tests

1. Follow the [setup](#setup) instructions to create your `.env` file, including your browserstack credentials:

   ```shell
   BRAINTREE_JS_ENV=development
   STORYBOOK_BRAINTREE_TOKENIZATION_KEY=<from_your_sandbox_account>
   BROWSERSTACK_USERNAME=username
   BROWSERSTACK_ACCESS_KEY=password
   ```

   You can use your own Browserstack account or team credentials.

2. Create SSL certificates for local HTTPS server:
   ```shell
   openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem -subj "/CN=127.0.0.1"
   ```

## Testing with CDN versions (default)

To run BrowserStack tests with published CDN versions:

```shell
npm run test:integration
```

## Testing with local builds

To test your local development builds on BrowserStack, use this complete workflow:

```shell
# 1. One command to build SDK, prepare Storybook, and start HTTPS server
npm run build:integration

# 2. In a new terminal, start the local development server
npm run storybook:dev-local

# 3. In a new terminal, run tests using your local builds
npm run test:integration:local
```

This is equivalent to:

```shell
# 1. Build the SDK
npm run build

# 2. Copy local builds to Storybook
npm run storybook:copy-local-build

# 3. Start the local Storybook development server with local builds
npm run storybook:dev-local

# 4. Build Storybook static files
npm run storybook:build

# 5. Start HTTPS server
npm run storybook:run-build

# 6. Run tests with LOCAL_BUILD=true
LOCAL_BUILD=true npm run test:integration
```

The integration build commands handle all the setup automatically:

- `build:integration`: One-time build
  - Builds your local SDK changes
  - Copies local builds to Storybook static directory
  - Builds Storybook with local assets included
  - Starts HTTPS server for BrowserStack access

**Important:** You must also run `npm run storybook:dev-local` in a separate terminal while running the integration tests. This starts a local Storybook development server that serves the components being tested.

When testing with local builds, the Storybook version selector will show "Assets from local build" as an option (version: `dev`). Tests can select this to validate local changes before they're published to CDN.

## Running specific tests

To run a single test file instead of the entire test suite:

```shell
npm run test:integration -- --spec .storybook/tests/your-test-file.test.ts
```

With local builds:

```shell
npm run test:integration:local -- --spec .storybook/tests/your-test-file.test.ts
```

To run only a specific test case within a file, temporarily add `.only` to the test:

```typescript
it("should test something", async function () {
  // test code here
});

it.only("should test something", async function () {
  // test code here
});
```

Test results will be viewable in the terminal. A link will also be output in the terminal to view test runs in the Browserstack UI.

# Releases

Subscribe to this repo to be notified when SDK releases go out.

# Versions

This SDK abides by our Client SDK Deprecation Policy. For more information on the potential statuses of an SDK check our [developer docs](https://developer.paypal.com/braintree/docs/guides/client-sdk/migration/javascript/v3).

| Major version number | Status      | Released      | Deprecated    | Unsupported   |
| -------------------- | ----------- | ------------- | ------------- | ------------- |
| 3.x.x                | Active      | August 2016   | TBA           | TBA           |
| 2.x.x                | Unsupported | November 2014 | February 2022 | February 2023 |

# License

The Braintree JavaScript SDK is open source and available under the MIT license. See the [LICENSE](LICENSE) file for more info.
