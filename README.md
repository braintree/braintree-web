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

For full functionality please ensure the sandbox account used for testing is fully configured to use any payment methods that will be tested

```
STORYBOOK_BRAINTREE_TOKENIZATION_KEY="your-sandbox-tokenization-key"
```

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

Follow [setup](#setup) and [static build](#static-build) instructions for Storybook.

Add the following environment variables to your `.env`. Utilize credentials from either your own Browserstack account or utilize team Browserstack account credentials.

```shell
export BROWSERSTACK_USERNAME="******"
export BROWSERSTACK_ACCESS_KEY="******"
```

## Testing with CDN versions (default)

To run BrowserStack tests with published CDN versions:

```shell
npm run test:integration
```

## Testing with local builds

To test your local development builds on BrowserStack:

```shell
npm run build:integration        # Build SDK + Storybook + start HTTPS server
npm run test:integration:local   # Run tests using local builds
```

Or manually specify the environment variable:

```shell
npm run build:integration
LOCAL_BUILD=true npm run test:integration
```

The integration build commands handle all the setup automatically:

- `build:integration`: One-time build
  - Builds your local SDK changes
  - Copies local builds to Storybook static directory
  - Builds Storybook with local assets included
  - Starts HTTPS server for BrowserStack access

When testing with local builds, the Storybook version selector will show "Assets from local build" as an option (version: `dev`). Tests can select this to validate local changes before they're published to CDN.

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
