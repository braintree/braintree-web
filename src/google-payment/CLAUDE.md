# Google Payment Component - CLAUDE.md

This file provides component-specific guidance for working with the Google Payment component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Google Payment component integrates with **Google Pay API** (`pay.js`) to enable Google Pay payments on the web. It generates configuration objects for Google's `PaymentsClient`, handles tokenization, and parses payment responses.

**Key Features:**

- Google Pay v1 and v2 API support
- Payment request generation with Braintree defaults
- Response parsing and tokenization
- PayPal via Google Pay support
- Deferred client creation support
- Browser and customer compatibility checking

**Docs:** [Braintree Google Pay Guide](https://developer.paypal.com/braintree/docs/guides/google-pay/overview)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `google-payment.js` - Main GooglePayment class (2 public methods)
- `errors.js` - Google Payment error codes (3 errors)
- `browser-detection.js` - Browser capability detection

**Note:** This is a relatively simple component (4 files) that acts as a bridge between Braintree and Google's Pay API.

## How It Works

### Google Pay Flow

```
1. Load Google Pay Script
   (https://pay.google.com/gp/p/js/pay.js)
   ↓
2. Create Google Payment Instance
   ↓
3. Create PaymentsClient
   (Google's API client)
   ↓
4. Check Readiness
   (isReadyToPay)
   ↓
5. Create Payment Data Request
   (with Braintree configuration)
   ↓
6. Load Payment Data
   (Google Pay sheet)
   ↓
7. Parse Response
   (Extract nonce from Google Pay token)
   ↓
8. Send Nonce to Server
```

### API Versions

**Google Pay v1 (Deprecated):**

- Used by default if `googlePayVersion` not specified
- Will be unsupported in future SDK versions
- Uses `androidPayCards` response format

**Google Pay v2 (Current):**

- Set `googlePayVersion: 2` during creation
- Uses [current Google Pay API schema](https://developers.google.com/pay/api/web/reference/object)
- Recommended for all new integrations

## Basic Usage

### Setup (Google Pay v2)

**1. Include Google Pay Script:**

```html
<script src="https://pay.google.com/gp/p/js/pay.js"></script>
```

**2. Create Components:**

```javascript
var paymentsClient = new google.payments.api.PaymentsClient({
  environment: "TEST", // or 'PRODUCTION'
});

braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.googlePayment.create({
      client: clientInstance,
      googlePayVersion: 2,
      googleMerchantId: "your-google-merchant-id", // Required in PRODUCTION
    });
  })
  .then(function (googlePaymentInstance) {
    // Ready to use
  });
```

**3. Check Readiness:**

```javascript
paymentsClient
  .isReadyToPay({
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods:
      googlePaymentInstance.createPaymentDataRequest().allowedPaymentMethods,
    existingPaymentMethodRequired: true,
  })
  .then(function (response) {
    if (response.result) {
      // Show Google Pay button
      document.getElementById("google-pay-button").style.display = "block";
    }
  });
```

**4. Handle Payment:**

```javascript
document
  .getElementById("google-pay-button")
  .addEventListener("click", function () {
    var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
      transactionInfo: {
        currencyCode: "USD",
        totalPriceStatus: "FINAL",
        totalPrice: "100.00",
      },
    });

    paymentsClient
      .loadPaymentData(paymentDataRequest)
      .then(function (paymentData) {
        return googlePaymentInstance.parseResponse(paymentData);
      })
      .then(function (result) {
        // Send result.nonce to server
        submitNonceToServer(result.nonce);
      })
      .catch(function (err) {
        console.error("Google Pay error:", err);
      });
  });
```

## Configuration Options

### Creation Options

```javascript
braintree.googlePayment.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
  googlePayVersion: 2, // Required: 1 or 2 (use 2 for new integrations)
  googleMerchantId: "merchant-id", // Required for PRODUCTION environment
  useDeferredClient: true, // Optional: Immediate availability
});
```

**Important:**

- `googlePayVersion: 2` is required for v2 API schema
- `googleMerchantId` required when `PaymentsClient` environment is `PRODUCTION`
- v1 is deprecated but remains default for backwards compatibility

### Payment Data Request Options

**Required (v2):**

```javascript
{
  transactionInfo: {
    currencyCode: 'USD',
    totalPriceStatus: 'FINAL',  // or 'ESTIMATED'
    totalPrice: '100.00'        // String format
  }
}
```

**Optional Fields:**

```javascript
{
  transactionInfo: {
    currencyCode: 'USD',
    totalPriceStatus: 'FINAL',
    totalPrice: '100.00',
    displayItems: [
      {
        label: 'Subtotal',
        type: 'SUBTOTAL',
        price: '90.00'
      },
      {
        label: 'Tax',
        type: 'TAX',
        price: '10.00'
      }
    ],
    countryCode: 'US',
    checkoutOption: 'COMPLETE_IMMEDIATE_PURCHASE'
  },

  merchantInfo: {
    merchantId: 'your-google-merchant-id',
    merchantName: 'My Store'
  },

  callbackIntents: ['SHIPPING_ADDRESS', 'SHIPPING_OPTION'],

  shippingAddressRequired: true,
  shippingAddressParameters: {
    phoneNumberRequired: true,
    allowedCountryCodes: ['US', 'CA']
  },

  shippingOptionRequired: true,
  shippingOptionParameters: {
    defaultSelectedOptionId: 'shipping-001',
    shippingOptions: [
      {
        id: 'shipping-001',
        label: 'Standard',
        description: '5-7 business days'
      },
      {
        id: 'shipping-002',
        label: 'Express',
        description: '2-3 business days'
      }
    ]
  },

  emailRequired: true
}
```

### Braintree Default Configuration

The SDK automatically provides these defaults (merged with your overrides):

**For Google Pay v2:**

```javascript
{
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: [
    {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA']  // From gateway config
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: 'braintree',
          braintree:environment: 'production',  // or 'sandbox'
          braintree:apiVersion: 'v1',
          braintree:sdkVersion: '3.x.x',
          braintree:merchantId: 'your-braintree-merchant-id',
          braintree:authorization: 'tokenization-key-or-client-token'
        }
      }
    }
  ]
}
```

**For Google Pay v1 (Deprecated):**

```javascript
{
  environment: 'PRODUCTION',  // or 'TEST'
  apiVersion: 1,
  allowedPaymentMethods: ['CARD', 'TOKENIZED_CARD'],
  paymentMethodTokenizationParameters: {
    tokenizationType: 'PAYMENT_GATEWAY',
    parameters: {
      gateway: 'braintree',
      'braintree:apiVersion': 'v1',
      'braintree:sdkVersion': '3.x.x',
      'braintree:merchantId': 'your-braintree-merchant-id',
      'braintree:clientKey': 'tokenization-key-or-client-token'
    }
  },
  cardRequirements: {
    allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA']
  }
}
```

## Methods

### createPaymentDataRequest()

Creates a Google Pay `PaymentDataRequest` configuration object with Braintree defaults.

**Signature:**

```javascript
var paymentDataRequest =
  googlePaymentInstance.createPaymentDataRequest(overrides);
// OR (with useDeferredClient)
googlePaymentInstance
  .createPaymentDataRequest(overrides)
  .then(function (paymentDataRequest) {
    // Use paymentDataRequest
  });
```

**Parameters:**

- `overrides` (object): Configuration options merged with Braintree defaults
- `overrides.transactionInfo` (object, required): Transaction details per [Google Pay API](https://developers.google.com/pay/api/web/reference/object#TransactionInfo)

**Returns:**

- Synchronous: `object` - PaymentDataRequest ready for `paymentsClient.loadPaymentData()`
- Deferred client: `Promise<object>` - Resolves with PaymentDataRequest

**Example:**

```javascript
var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
  transactionInfo: {
    currencyCode: "USD",
    totalPriceStatus: "FINAL",
    totalPrice: "19.99",
  },
});

paymentsClient.loadPaymentData(paymentDataRequest).then(function (paymentData) {
  // Process payment
});
```

**Modifying Deeply Nested Parameters:**

Since the method merges top-level keys, modify nested objects after creation:

```javascript
var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
  transactionInfo: {
    currencyCode: "USD",
    totalPriceStatus: "FINAL",
    totalPrice: "100.00",
  },
});

// Modify card payment method parameters
var cardPaymentMethod = paymentDataRequest.allowedPaymentMethods[0];
cardPaymentMethod.parameters.billingAddressRequired = true;
cardPaymentMethod.parameters.billingAddressParameters = {
  format: "FULL",
  phoneNumberRequired: true,
};

paymentsClient.loadPaymentData(paymentDataRequest).then(/* ... */);
```

### parseResponse()

Parses the Google Pay response and extracts the Braintree payment method nonce.

**Signature:**

```javascript
googlePaymentInstance.parseResponse(response, callback);
// OR
googlePaymentInstance.parseResponse(response).then(function (payload) {
  // Use payload
});
```

**Parameters:**

- `response` (object): The response from `paymentsClient.loadPaymentData()`

**Returns:**

- `Promise<tokenizePayload>` - Parsed tokenization result

**Payload Structure (Credit Card):**

```javascript
{
  nonce: 'tokencc_abc123',
  type: 'AndroidPayCard',  // or 'CreditCard' in some cases
  description: 'Android Pay',
  details: {
    cardType: 'Visa',
    lastFour: '1234',
    lastTwo: '34',
    isNetworkTokenized: false,
    bin: '411111'
  },
  binData: {
    commercial: 'Unknown',
    countryOfIssuance: 'USA',
    debit: 'No',
    durbinRegulated: 'Yes',
    healthcare: 'No',
    issuingBank: 'Wells Fargo',
    payroll: 'No',
    prepaid: 'No',
    productId: '123',
    business: 'No',
    consumer: 'Yes',
    purchase: 'Yes',
    corporate: 'No'
  }
}
```

**Payload Structure (PayPal via Google Pay):**

```javascript
{
  nonce: 'tokenpaypal_abc123',
  type: 'PayPalAccount',
  description: 'PayPal'
}
```

**Example:**

```javascript
paymentsClient
  .loadPaymentData(paymentDataRequest)
  .then(function (paymentData) {
    return googlePaymentInstance.parseResponse(paymentData);
  })
  .then(function (parsedResponse) {
    // Send parsedResponse.nonce to server
    return fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonce: parsedResponse.nonce }),
    });
  })
  .catch(function (err) {
    console.error("Error:", err);
  });
```

## Error Handling

### Error Codes

From `errors.js`:

**Creation Errors:**

1. **`GOOGLE_PAYMENT_NOT_ENABLED`** (MERCHANT)
   - Google Pay not enabled in Braintree control panel
   - Fix: Enable Google Pay in Braintree settings
   - Fix: Verify merchant account supports Google Pay

2. **`GOOGLE_PAYMENT_UNSUPPORTED_VERSION`** (MERCHANT)
   - Invalid `googlePayVersion` specified
   - Fix: Use version 1 or 2 only
   - Fix: Upgrade SDK if version is too new

**Parsing Errors:**

3. **`GOOGLE_PAYMENT_GATEWAY_ERROR`** (UNKNOWN)
   - Tokenization failed
   - Gateway returned error
   - Fix: Check error details
   - Fix: Verify authorization is valid
   - Fix: Check network connectivity

## Testing

### Sandbox Testing

**1. Use Test Environment:**

```javascript
var paymentsClient = new google.payments.api.PaymentsClient({
  environment: "TEST",
});
```

**2. Test Cards:**
Google Pay TEST environment uses test card networks automatically. No special cards needed.

**3. Merchant Setup:**

- No Google Merchant ID required in TEST
- Can omit `googleMerchantId` option

**Example:**

```javascript
braintree.googlePayment
  .create({
    client: clientInstance,
    googlePayVersion: 2,
    // googleMerchantId not needed in TEST
  })
  .then(function (googlePaymentInstance) {
    // Use with TEST PaymentsClient
  });
```

### Unit Tests

Location: `test/google-payment/unit/`

**Test Categories:**

- Component creation
- Payment data request generation (v1 and v2)
- Response parsing
- Error scenarios
- Deferred client
- Browser detection

## Debugging

### Common Issues

**1. "Google Pay is not enabled"**

**Symptoms:**

- `GOOGLE_PAYMENT_NOT_ENABLED` on creation

**Debug:**

1. Verify Google Pay enabled in Braintree control panel
2. Check if using correct merchant account
3. Verify authorization is for correct environment

**Fix:**

```
Braintree Control Panel → Settings → Processing → Google Pay
Enable "Accept Google Pay"
```

**2. "User doesn't have payment method"**

**Symptoms:**

- `isReadyToPay()` returns `result: false`
- Google Pay button doesn't show

**Debug:**

1. Check if user has cards in Google Pay
2. Verify card networks match `allowedCardNetworks`
3. Try without `existingPaymentMethodRequired`

**Example:**

```javascript
paymentsClient
  .isReadyToPay({
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods:
      googlePaymentInstance.createPaymentDataRequest().allowedPaymentMethods,
    // Remove existingPaymentMethodRequired to check API availability only
  })
  .then(function (response) {
    console.log("API available:", response.result);
  });
```

**3. "DEVELOPER_ERROR from Google"**

**Symptoms:**

- Error from `loadPaymentData()` with "DEVELOPER_ERROR"
- Payment request configuration issues

**Debug:**

1. Verify `transactionInfo.totalPrice` is a string
2. Check all required fields present
3. Validate against Google Pay schema
4. Check browser console for detailed error

**Common Fixes:**

```javascript
// BAD: Number
transactionInfo: {
  totalPrice: 100.0; // Should be string
}

// GOOD: String
transactionInfo: {
  totalPrice: "100.00";
}
```

**4. "Tokenization failed"**

**Symptoms:**

- `GOOGLE_PAYMENT_GATEWAY_ERROR` from `parseResponse()`
- Error in payment data response

**Debug:**

1. Check authorization is valid and not expired
2. Verify network request succeeded
3. Inspect `paymentData` object structure
4. Check server-side logs

**5. "Version mismatch errors"**

**Symptoms:**

- Deprecated warnings
- Unexpected response format

**Fix:**

```javascript
// Ensure googlePayVersion matches your integration
braintree.googlePayment.create({
  client: clientInstance,
  googlePayVersion: 2, // Match API version in documentation you're following
});
```

## Implementation Examples

### Basic Integration (v2)

```javascript
// Include Google Pay script in HTML
// <script src="https://pay.google.com/gp/p/js/pay.js"></script>

var paymentsClient = new google.payments.api.PaymentsClient({
  environment: "TEST",
});

braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.googlePayment.create({
      client: clientInstance,
      googlePayVersion: 2,
    });
  })
  .then(function (googlePaymentInstance) {
    // Check readiness
    return paymentsClient
      .isReadyToPay({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods:
          googlePaymentInstance.createPaymentDataRequest()
            .allowedPaymentMethods,
      })
      .then(function (response) {
        if (response.result) {
          // Setup button
          setupGooglePayButton(googlePaymentInstance, paymentsClient);
        }
      });
  });

function setupGooglePayButton(googlePaymentInstance, paymentsClient) {
  var button = document.getElementById("google-pay-button");
  button.style.display = "block";

  button.addEventListener("click", function () {
    var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
      transactionInfo: {
        currencyCode: "USD",
        totalPriceStatus: "FINAL",
        totalPrice: "10.00",
      },
    });

    paymentsClient
      .loadPaymentData(paymentDataRequest)
      .then(function (paymentData) {
        return googlePaymentInstance.parseResponse(paymentData);
      })
      .then(function (result) {
        // Send result.nonce to server
        return fetch("/checkout", {
          method: "POST",
          body: JSON.stringify({ nonce: result.nonce }),
        });
      })
      .catch(function (err) {
        console.error(err);
      });
  });
}
```

### With Billing Address

```javascript
var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
  transactionInfo: {
    currencyCode: "USD",
    totalPriceStatus: "FINAL",
    totalPrice: "25.00",
  },
});

// Modify to require billing address
var cardPaymentMethod = paymentDataRequest.allowedPaymentMethods[0];
cardPaymentMethod.parameters.billingAddressRequired = true;
cardPaymentMethod.parameters.billingAddressParameters = {
  format: "FULL",
  phoneNumberRequired: true,
};

paymentsClient
  .loadPaymentData(paymentDataRequest)
  .then(function (paymentData) {
    console.log(
      "Billing address:",
      paymentData.paymentMethodData.info.billingAddress
    );

    return googlePaymentInstance.parseResponse(paymentData);
  })
  .then(function (result) {
    submitToServer(result.nonce);
  });
```

### With Shipping

```javascript
var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
  transactionInfo: {
    currencyCode: "USD",
    totalPriceStatus: "FINAL",
    totalPrice: "27.00",
    displayItems: [
      {
        label: "Subtotal",
        type: "SUBTOTAL",
        price: "25.00",
      },
      {
        label: "Shipping",
        type: "LINE_ITEM",
        price: "2.00",
      },
    ],
  },
  shippingAddressRequired: true,
  shippingAddressParameters: {
    phoneNumberRequired: true,
  },
  callbackIntents: ["SHIPPING_ADDRESS", "SHIPPING_OPTION"],
});

paymentsClient.loadPaymentData(paymentDataRequest).then(function (paymentData) {
  console.log("Shipping address:", paymentData.shippingAddress);

  return googlePaymentInstance.parseResponse(paymentData);
});
```

### Production Environment

```javascript
var paymentsClient = new google.payments.api.PaymentsClient({
  environment: "PRODUCTION",
});

braintree.googlePayment
  .create({
    client: clientInstance,
    googlePayVersion: 2,
    googleMerchantId: "BCR2DN6TR54A7BKE", // Required for PRODUCTION
  })
  .then(function (googlePaymentInstance) {
    // Production-ready instance
  });
```

## Migration from v1 to v2

If migrating from Google Pay v1 to v2:

**Old (v1):**

```javascript
braintree.googlePayment.create({
  client: clientInstance,
  // googlePayVersion defaults to 1
});
```

**New (v2):**

```javascript
braintree.googlePayment.create({
  client: clientInstance,
  googlePayVersion: 2,
  googleMerchantId: "your-merchant-id", // Required for PRODUCTION
});
```

**Request Format Changes:**

- v1: `cardRequirements.allowedCardNetworks`
- v2: `allowedPaymentMethods[0].parameters.allowedCardNetworks`

**Response Format Changes:**

- v1: `response.paymentMethodToken.token`
- v2: `response.paymentMethodData.tokenizationData.token`

See [Google's migration guide](https://developers.google.com/pay/api/web/guides/resources/update-to-latest-version) for complete details.

## Browser Support

**Supported Browsers:**

- Chrome 61+ (Android and Desktop)
- Safari (with Apple Pay configured)
- Firefox
- Edge

**Requirements:**

- User must have Google account
- User must have payment method saved in Google Pay
- HTTPS required (except localhost)
