braintree-web
=================

A suite of tools for integrating Braintree in the browser.

This is the repo to submit issues if you have any problems or questions about any v.zero JS integration.

Install
=======

```
npm install braintree-web
```

```
bower install braintree-web
```

Usage
=====

For more thorough documentation, visit [the JavaScript client SDK docs](https://developers.braintreepayments.com/guides/client-sdk/javascript/v2).

#### Drop-in integration

```html
<form action="/your/server/endpoint" method="post">
    <div id="dropin-container"></div>
</form>
```

```javascript
braintree.setup('your-client-token', 'dropin', {
  container: 'dropin-container'
});
```

#### Custom integration

```html
<form id="payment-form" action="/your/server/endpoint" method="post">
  <input data-braintree-name="number" value="4111111111111111" />
  <input data-braintree-name="expiration_date" value="10/20" />
  <input type="submit" value="Purchase" />
</form>
```

```javascript
braintree.setup('your-client-token', 'custom', {
  id: 'payment-form'
});
```

####Hosted Fields integration

```html
<form action="/" id="my-sample-form">
  <label for="card-number">Card Number</label>
  <div id="card-number"></div>

  <label for="cvv">CVV</label>
  <div id="cvv"></div>

  <label for="expiration-date">Expiration Date</label>
  <div id="expiration-date"></div>

  <input type="submit" value="Pay" />
</form>
```

```javascript
braintree.setup("YOUR_CLIENT_TOKEN", "custom", {
  id: "my-sample-form",
  hostedFields: {
    styles: {
      "input": {
        "font-size": "16pt",
        "color": "#3A3A3A"
      },

      ".number": {
        "font-family": "monospace"
      },

      ".valid": {
        "color": "green"
      }
    },
    number: {
      selector: "#card-number"
    },
    cvv: {
      selector: "#cvv"
    },
    expirationDate: {
      selector: "#expiration-date"
    }
  }
});
```

#### Advanced integration

```javascript
var client = new braintree.api.Client({
  clientToken: 'your-client-token'
});

client.tokenizeCard({
  number: '4111111111111111',
  expirationDate: '10/20'
}, function (err, nonce) {
  // Send nonce to your server
});
```

