braintree-web
=============

A suite of tools for integrating Braintree in the browser.

This is the repo to submit issues if you have any problems or questions about any v.zero JavaScript integration.

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

For more thorough documentation, visit [the JavaScript client SDK docs](https://developers.braintreepayments.com/guides/client-sdk/javascript/v3).

If you are upgrading from version 2.x, take a look at our [migration guide](https://developers.braintreepayments.com/guides/client-sdk/migration/javascript/v3).

####Hosted Fields integration

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
});

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
