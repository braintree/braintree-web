braintree-web
=============

A suite of tools for integrating Braintree in the browser.

This is the repo to submit issues if you have any problems or questions about a Braintree JavaScript integration.

For a ready-made payment UI, see [Braintree Web Drop-in](https://github.com/braintree/braintree-web-drop-in).

Install
=======

```
npm install braintree-web ```

```
bower install braintree-web
```

Usage
=====

For more thorough documentation, visit [the JavaScript client SDK docs](https://developers.braintreepayments.com/guides/client-sdk/javascript/v3).

If you are upgrading from version 2.x, take a look at our [migration guide](https://developers.braintreepayments.com/guides/client-sdk/migration/javascript/v3).

#### Hosted Fields integration

```html
<form action="/" id="my-sample-form">
  <input type="hidden" name="payment_method_nonce">
  <label for="card-number">Card Number</label>
  <div id="card-number"></div>

  <label for="cvv">CVV</label>
  <div id="cvv"></div>

  <label for="expiration-date">Expiration Date</label>
  <div id="expiration-date"></div>

  <input id="my-submit" type="submit" value="Pay" disabled/>
</form>
```

```javascript
var submitBtn = document.getElementById('my-submit');
var form = document.getElementById('my-sample-form');

braintree.client.create({
  authorization: CLIENT_AUTHORIZATION
}, clientDidCreate);

function clientDidCreate(err, client) {
  braintree.hostedFields.create({
    client: client,
    styles: {
      'input': {
        'font-size': '16pt',
        'color': '#3A3A3A'
      },

      '.number': {
        'font-family': 'monospace'
      },

      '.valid': {
        'color': 'green'
      }
    },
    fields: {
      number: {
        selector: '#card-number'
      },
      cvv: {
        selector: '#cvv'
      },
      expirationDate: {
        selector: '#expiration-date'
      }
    }
  }, hostedFieldsDidCreate);
}

function hostedFieldsDidCreate(err, hostedFields) {
  submitBtn.addEventListener('click', submitHandler.bind(null, hostedFields));
  submitBtn.removeAttribute('disabled');
}

function submitHandler(hostedFields, event) {
  event.preventDefault();
  submitBtn.setAttribute('disabled', 'disabled');

  hostedFields.tokenize(function (err, payload) {
    if (err) {
      submitBtn.removeAttribute('disabled');
      console.error(err);
    } else {
      form['payment_method_nonce'].value = payload.nonce;
      form.submit();
    }
  });
}
```

#### Advanced integration

To be eligible for the easiest level of PCI compliance (SAQ A), payment fields cannot be hosted on your checkout page. For an alternative to the following, use Hosted Fields.

```javascript
braintree.client.create({
  authorization: CLIENT_AUTHORIZATION
}, function (err, client) {
  client.request({
    endpoint: 'payment_methods/credit_cards',
    method: 'post',
    data: {
      creditCard: {
        number: '4111111111111111',
        expirationDate: '10/20',
        cvv: '123',
        billingAddress: {
          postalCode: '12345'
        }
      }
    }
  }, function (err, response) {
    // Send response.creditCards[0].nonce to your server
  });
});
```

For more examples, [see the reference](https://braintree.github.io/braintree-web/current/Client.html#request).

#### Promises

All the asynchronous methods will return a `Promise` if no callback is provided.

```js
var submitBtn = document.getElementById('my-submit');
var yourStylesConfig = { /* your Hosted Fields `styles` config */ };
var yourFieldsConfig = { /* your Hosted Hields `fields` config */ };

braintree.client.create({authorization: CLIENT_AUTHORIZATION}).then(function (client) {
  return braintree.hostedFields.create({
    client: client,
    styles: yourStylesConfig,
    fields: yourFieldsConfig
  });
}).then(function (hostedFields) {
  submitBtn.addEventListener('click', function (event) {
    event.preventDefault();
    submitBtn.setAttribute('disabled', 'disabled');

    hostedFields.tokenize().then(function (payload) {
      // send payload.nonce to your server
    }).catch(function (err) {
      submitBtn.removeAttribute('disabled');
      console.error(err);
    });
  });
});
```

Releases
========

Subscribe to this repo to be notified when SDK releases go out.

Versions
========

This SDK abides by our Client SDK Deprecation Policy. For more information on the potential statuses of an SDK check our [developer docs](http://developers.braintreepayments.com/guides/client-sdk/deprecation-policy).

| Major version number | Status   | Released      | Deprecated | Unsupported |
|----------------------|----------|---------------|------------|-------------|
| 3.x.x                | Active   | August 2016   | TBA        | TBA         |
| 2.x.x                | Inactive | November 2014 | TBA        | TBA         |

License
=======

The Braintree JavaScript SDK is open source and available under the MIT license. See the [LICENSE](LICENSE) file for more info.
