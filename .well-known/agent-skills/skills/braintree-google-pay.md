---
name: braintree-google-pay
description: Google Pay v2 integration via Google Pay API - PaymentsClient, payment data request, and response parsing
---

# Google Pay Integration

## Setup

### 1. Load Google Pay Script

```html
<script src="https://pay.google.com/gp/p/js/pay.js"></script>
```

### 2. Create Components

```javascript
var paymentsClient = new google.payments.api.PaymentsClient({
  environment: 'TEST'   // 'TEST' or 'PRODUCTION'
});

braintree.client.create({ authorization: CLIENT_TOKEN })
  .then(function (clientInstance) {
    return braintree.googlePayment.create({
      client: clientInstance,
      googlePayVersion: 2,                    // Required: use v2
      googleMerchantId: 'your-merchant-id'    // Required for PRODUCTION
    });
  })
  .then(function (googlePaymentInstance) {
    // Ready
  });
```

### 3. Check Readiness

```javascript
paymentsClient.isReadyToPay({
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: googlePaymentInstance.createPaymentDataRequest().allowedPaymentMethods
}).then(function (response) {
  if (response.result) {
    document.getElementById('google-pay-button').style.display = 'block';
  }
});
```

### 4. Handle Payment

```javascript
document.getElementById('google-pay-button').addEventListener('click', function () {
  var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
    transactionInfo: {
      currencyCode: 'USD',
      totalPriceStatus: 'FINAL',
      totalPrice: '100.00'    // Must be a string
    }
  });

  paymentsClient.loadPaymentData(paymentDataRequest)
    .then(function (paymentData) {
      return googlePaymentInstance.parseResponse(paymentData);
    })
    .then(function (result) {
      // result.nonce -- send to server
      // result.type -- 'AndroidPayCard' or 'PayPalAccount'
      // result.details.cardType, result.details.lastFour, result.details.bin
      submitNonceToServer(result.nonce);
    })
    .catch(function (err) {
      if (err.statusCode === 'CANCELED') {
        console.log('User cancelled');
      } else {
        console.error(err);
      }
    });
});
```

## Adding Billing/Shipping Address

`createPaymentDataRequest` merges top-level keys only. Modify nested objects after creation:

```javascript
var request = googlePaymentInstance.createPaymentDataRequest({
  transactionInfo: { currencyCode: 'USD', totalPriceStatus: 'FINAL', totalPrice: '25.00' }
});

// Add billing address requirement
var cardMethod = request.allowedPaymentMethods[0];
cardMethod.parameters.billingAddressRequired = true;
cardMethod.parameters.billingAddressParameters = {
  format: 'FULL',
  phoneNumberRequired: true
};

// Add shipping
request.shippingAddressRequired = true;
request.shippingAddressParameters = { allowedCountryCodes: ['US', 'CA'] };
request.emailRequired = true;

paymentsClient.loadPaymentData(request).then(/* ... */);
```

## PayPal via Google Pay

When the user pays with a PayPal account through Google Pay, `parseResponse` returns:

```javascript
{ nonce: 'tokenpaypal_xxx', type: 'PayPalAccount', description: 'PayPal' }
```

No additional configuration needed -- PayPal is automatically available if enabled.

## Production Checklist

1. Set `PaymentsClient` environment to `'PRODUCTION'`
2. Provide `googleMerchantId` from Google Pay Business Console
3. Enable Google Pay in Braintree control panel
4. Ensure HTTPS

## Common Errors

| Code | Type | Fix |
|------|------|-----|
| `GOOGLE_PAYMENT_NOT_ENABLED` | MERCHANT | Enable Google Pay in Braintree control panel |
| `GOOGLE_PAYMENT_UNSUPPORTED_VERSION` | MERCHANT | Use `googlePayVersion: 2` (or 1) |
| `GOOGLE_PAYMENT_GATEWAY_ERROR` | UNKNOWN | Check authorization validity, inspect err.details |

## Common issues

1. **`totalPrice` must be a string:** `'100.00'` not `100.00`
2. **`googleMerchantId` not needed for TEST:** Only required in `'PRODUCTION'` environment
3. **v1 is deprecated:** Always use `googlePayVersion: 2` for new integrations
4. **DEVELOPER_ERROR from Google:** Usually means malformed `transactionInfo` or missing required fields

## Migration from v1 to v2

```javascript
// OLD (v1, deprecated):
braintree.googlePayment.create({ client: clientInstance });
// googlePayVersion defaults to 1

// NEW (v2):
braintree.googlePayment.create({
  client: clientInstance,
  googlePayVersion: 2,
  googleMerchantId: 'your-id'  // Required for production
});
```

Response format changed: v1 used `paymentMethodToken.token`, v2 uses `paymentMethodData.tokenizationData.token`. The `parseResponse` method handles both.
