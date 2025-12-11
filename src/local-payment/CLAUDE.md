# Local Payment Component - CLAUDE.md

This file provides component-specific guidance for working with the Local Payment component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Local Payment component enables integration with **local payment methods** specific to different countries and regions. It supports popular payment methods like **iDEAL** (Netherlands), **Sofort** (Germany/Europe), **Bancontact** (Belgium), **BLIK** (Poland), **MB WAY** (Portugal), and many others.

**Key Features:**

- Support for 25+ local payment methods across Europe, Asia-Pacific, and other regions
- Popup flow for bank selection and authentication
- Full-page redirect flow (alternative)
- Deferred payment types (Pay Upon Invoice, MB WAY, BANCOMAT PAY, BLIK seamless)
- Frame Service integration for secure popup UI
- Mobile app switching support with fallback URLs

**Docs:** [Braintree Local Payment Methods Guide](https://developer.paypal.com/braintree/docs/guides/local-payment-methods)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `external/local-payment.js` - Main LocalPayment class (4 public methods)
- `shared/errors.js` - Local Payment error codes (10 errors)
- `external/constants.js` - Required options for different payment types

**Note:** This component (4 files) uses Frame Service for popup/redirect flows and supports numerous payment types with varying requirements.

## How It Works

### Local Payment Flow (Standard)

```
1. Create Local Payment Instance
   ↓
2. User Clicks Payment Button
   (iDEAL, Sofort, etc.)
   ↓
3. startPayment() Called
   ↓
4. Create Payment Context
   (API call to Braintree)
   ↓
5. Open Popup/Redirect
   (Bank selection interface)
   ↓
6. User Selects Bank
   ↓
7. Bank Authentication
   (User logs into bank)
   ↓
8. Payment Authorization
   ↓
9. Popup Closes/Redirect Returns
   ↓
10. Tokenization
    ↓
11. Nonce Returned
```

### Deferred Payment Flow

For payment types like Pay Upon Invoice, MB WAY, BANCOMAT PAY, and BLIK seamless:

```
1. Create Local Payment Instance
   ↓
2. User Provides Information
   ↓
3. startPayment() Called
   ↓
4. Payment ID Generated
   ↓
5. onPaymentStart Callback
   (Store payment ID, setup webhooks)
   ↓
6. No Popup/Redirect
   ↓
7. Payment Completed Later
   (Email, SMS, or mobile app)
   ↓
8. Webhook Notification
```

## Supported Payment Methods

### Europe

- **iDEAL** (Netherlands) - Bank transfer
- **Sofort** (Germany, Austria, Belgium, Switzerland) - Real-time bank transfer
- **Bancontact** (Belgium) - Direct debit
- **giropay** (Germany) - Bank transfer
- **EPS** (Austria) - Electronic Payment Standard
- **MyBank** (Italy) - Bank transfer
- **Przelewy24** (Poland) - Bank transfer and e-wallet
- **BLIK** (Poland) - Mobile payment (seamless, one-click)
- **Trustly** (Sweden, Finland, Estonia) - Bank transfer
- **Pay Upon Invoice** (Germany) - Buy now, pay later via RatePay
- **MB WAY** (Portugal) - Mobile wallet
- **BANCOMAT PAY** (Italy) - Mobile payment
- **Satispay** (Italy) - Mobile payment

### Asia-Pacific

- **GrabPay** (Singapore, Malaysia) - Mobile wallet
- **Verkkopankki** (Finland) - Bank transfer
- And more...

**Full list:** See [Braintree Local Payment Methods](https://developer.paypal.com/braintree/docs/guides/local-payment-methods)

## Basic Usage

### iDEAL Example (Popup Flow)

```javascript
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.localPayment.create({
      client: clientInstance,
      merchantAccountId: "EUR_merchant_account", // Recommended
    });
  })
  .then(function (localPaymentInstance) {
    var idealButton = document.getElementById("ideal-button");
    idealButton.removeAttribute("disabled");

    idealButton.addEventListener("click", function () {
      localPaymentInstance
        .startPayment({
          paymentType: "ideal",
          paymentTypeCountryCode: "NL",
          amount: "10.00",
          currencyCode: "EUR",
          givenName: "John",
          surname: "Doe",
          email: "john.doe@example.com",
          phone: "0612345678",
          address: {
            countryCode: "NL",
          },
          fallback: {
            url: "https://example.com/checkout",
            buttonText: "Return to Merchant",
          },
          onPaymentStart: function (data, continueCallback) {
            // Store data.paymentId on server for webhook correlation
            console.log("Payment ID:", data.paymentId);

            // Call continueCallback to open popup
            continueCallback();
          },
        })
        .then(function (payload) {
          // Send payload.nonce to server
          submitNonceToServer(payload.nonce);
        })
        .catch(function (err) {
          if (err.code === "LOCAL_PAYMENT_WINDOW_CLOSED") {
            console.log("Customer closed payment window");
          } else {
            console.error("Error:", err);
          }
        });
    });
  });
```

### Sofort Example (Redirect Flow)

```javascript
braintree.localPayment
  .create({
    client: clientInstance,
    merchantAccountId: "EUR_merchant_account",
    redirectUrl: window.location.href, // Enable redirect flow
  })
  .then(function (localPaymentInstance) {
    // Check if returning from redirect
    if (localPaymentInstance.tokenizePayload) {
      // Tokenization completed
      var nonce = localPaymentInstance.tokenizePayload.nonce;
      submitNonceToServer(nonce);
    } else {
      // Normal page load - show payment button
      setupSofortButton(localPaymentInstance);
    }
  });

function setupSofortButton(localPaymentInstance) {
  var sofortButton = document.getElementById("sofort-button");

  sofortButton.addEventListener("click", function () {
    localPaymentInstance.startPayment({
      paymentType: "sofort",
      paymentTypeCountryCode: "DE",
      amount: "25.00",
      currencyCode: "EUR",
      givenName: "Max",
      surname: "Mustermann",
      email: "max@example.com",
      address: {
        countryCode: "DE",
      },
    });
    // Page will redirect - no promise resolution
  });
}
```

## Configuration Options

### Creation Options

```javascript
braintree.localPayment.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
  merchantAccountId: "EUR_account", // Strongly recommended
  redirectUrl: "https://...", // Optional: Enable redirect flow instead of popup
});
```

**Important:**

- `merchantAccountId`: Strongly recommended to specify the correct merchant account for the currency
- `redirectUrl`: When provided, uses full-page redirect instead of popup (better for mobile)

### Payment Options (Standard Flow)

**Required Fields:**

```javascript
{
  paymentType: 'ideal',              // Required: Payment method type
  paymentTypeCountryCode: 'NL',      // Required for some payment types
  amount: '10.00',                   // Required: String format
  currencyCode: 'EUR',               // Required: Three-character ISO-4217
  givenName: 'John',                 // Required: First name
  surname: 'Doe',                    // Required: Last name

  // Required only for popup flow:
  fallback: {
    url: 'https://...',              // Required: Fallback URL for mobile app switching
    buttonText: 'Return to Merchant' // Required: Button text
  },
  onPaymentStart: function (data, continueCallback) {
    // Required callback
    continueCallback();              // Must call to launch popup
  }
}
```

**Optional Fields:**

```javascript
{
  // All required fields above...

  email: 'customer@example.com',     // Payer email
  phone: '1234567890',               // Phone number
  phoneCountryCode: '31',            // Country calling code

  shippingAddressRequired: false,    // Shipping required (default: false)

  address: {                         // Shipping address
    streetAddress: '123 Main St',    // Line 1
    extendedAddress: 'Apt 4',        // Line 2 (optional)
    locality: 'Amsterdam',           // City
    region: 'NH',                    // State/region (optional)
    postalCode: '1012',              // Postal code
    countryCode: 'NL'                // Required: Two-character ISO
  },

  recurrent: true,                   // Enable recurring payments
  customerId: 'customer-123',        // Required if recurrent: true

  displayName: 'My Store',           // Merchant name shown in popup

  windowOptions: {                   // Popup window configuration
    width: 1282,                     // Width in pixels (default: 1282)
    height: 720                      // Height in pixels (default: 720)
  },

  fallback: {
    url: 'https://...',
    buttonText: 'Return to Merchant',
    cancelUrl: 'https://...',        // Optional: Different URL for cancellation
    cancelButtonText: 'Go Back'      // Optional: Different text for cancel
  }
}
```

### Pay Upon Invoice Options

Pay Upon Invoice is a deferred payment method (buy now, pay later via RatePay):

```javascript
localPaymentInstance.startPayment({
  paymentType: "pay_upon_invoice",
  amount: "100.00",
  currencyCode: "EUR",

  // Customer information (all required)
  givenName: "Max",
  surname: "Mustermann",
  email: "buyer@example.com",
  phone: "6912345678",
  phoneCountryCode: "49",
  birthDate: "1990-01-01", // Required: YYYY-MM-DD format

  // Shipping address (required)
  address: {
    streetAddress: "Taunusanlage 12",
    locality: "Frankfurt",
    postalCode: "60325",
    countryCode: "DE",
  },

  // Billing address (required)
  billingAddress: {
    streetAddress: "Schönhauser Allee 84",
    locality: "Berlin",
    postalCode: "10439",
    countryCode: "DE",
  },

  // Line items (required)
  lineItems: [
    {
      category: "PHYSICAL_GOODS", // PHYSICAL_GOODS, DIGITAL_GOODS, or DONATION
      name: "Basketball Shoes",
      quantity: "1",
      unitAmount: "81.00",
      unitTaxAmount: "19.00",
    },
  ],

  // Optional amounts
  shippingAmount: "5.00",
  discountAmount: "10.00",

  // Locale and support info (required)
  locale: "en-DE",
  customerServiceInstructions: "Customer service phone is +49 6912345678.",

  // Correlation ID (required)
  correlationId: dataCollectorInstance.deviceData,

  // Callback (required - no continueCallback for deferred)
  onPaymentStart: function (data) {
    // CRITICAL: Store data.paymentId for webhook correlation
    console.log("Payment ID:", data.paymentId);
  },
});
```

### BLIK Options

BLIK (Poland) supports three modes:

**1. BLIK Seamless (Level 0):**

```javascript
{
  paymentType: 'blik',
  paymentTypeCountryCode: 'PL',
  amount: '10.00',
  currencyCode: 'PLN',
  givenName: 'Jan',
  surname: 'Kowalski',
  phone: '123456789',
  address: {
    streetAddress: 'Mokotowska 1234',
    locality: 'Warsaw',
    postalCode: '02-697',
    countryCode: 'PL'
  },
  blikOptions: {
    level_0: {
      authCode: '123456'             // 6-digit code from BLIK app
    }
  },
  onPaymentStart: function (data) {
    console.log('Payment ID:', data.paymentId);
  }
}
```

**2. BLIK One-Click (First Payment):**

```javascript
{
  // ... same as above ...
  blikOptions: {
    oneClick: {
      authCode: '123456',            // 6-digit code
      consumerReference: 'ABCde123', // Unique customer ID
      aliasLabel: 'my uniq alias'    // Bank account display name
    }
  }
}
```

**3. BLIK One-Click (Subsequent Payment):**

```javascript
{
  // ... same as above ...
  blikOptions: {
    oneClick: {
      consumerReference: 'ABCde123', // Same customer ID
      aliasKey: '123456789'          // Alias from first payment
    }
  }
}
```

### MB WAY Options

```javascript
{
  paymentType: 'mbway',
  amount: '10.00',
  currencyCode: 'EUR',
  givenName: 'João',
  surname: 'Silva',
  phone: '912345678',
  phoneCountryCode: '351',           // Portugal country code
  address: {
    streetAddress: 'Rua Escura 12',
    locality: 'Porto',
    postalCode: '4465-283',
    countryCode: 'PT'
  },
  onPaymentStart: function (data) {
    console.log('Payment ID:', data.paymentId);
  }
}
```

### BANCOMAT PAY Options

```javascript
{
  paymentType: 'bancomatpay',
  amount: '10.00',
  currencyCode: 'EUR',
  givenName: 'Mario',
  surname: 'Rossi',
  phone: '3123456789',
  phoneCountryCode: '39',            // Italy country code
  address: {
    streetAddress: 'Via del Corso 12',
    locality: 'Roma',
    postalCode: '00100',
    countryCode: 'IT'
  },
  onPaymentStart: function (data) {
    console.log('Payment ID:', data.paymentId);
  }
}
```

## Methods

### startPayment()

Launches the local payment flow and returns a nonce payload.

**Signature:**

```javascript
localPaymentInstance.startPayment(options, callback);
// OR
localPaymentInstance.startPayment(options).then(function (payload) {
  // Use payload (standard flow only)
});
```

**Parameters:**

- `options` (object): Payment configuration (see Configuration Options above)

**Returns:**

- **Standard Flow (popup):** `Promise<tokenizePayload>` - Resolves after customer authorizes
- **Redirect Flow:** `Promise<void>` - Triggers redirect (no resolution)
- **Deferred Flow:** `Promise<void>` - Resolves immediately (payment happens later)

**Payload Structure:**

```javascript
{
  nonce: 'tokenlpm_abc123',
  type: 'PayPalAccount',
  details: {
    email: 'customer@example.com',
    firstName: 'John',
    lastName: 'Doe',
    // Additional payer info
  },
  correlationId: 'payment-id-123'
}
```

**Example (Standard Flow):**

```javascript
localPaymentInstance
  .startPayment({
    paymentType: "ideal",
    paymentTypeCountryCode: "NL",
    amount: "50.00",
    currencyCode: "EUR",
    givenName: "Pieter",
    surname: "de Vries",
    email: "pieter@example.com",
    address: {
      countryCode: "NL",
    },
    fallback: {
      url: "https://example.com/checkout",
      buttonText: "Return",
    },
    onPaymentStart: function (data, continueCallback) {
      savePaymentId(data.paymentId);
      continueCallback();
    },
  })
  .then(function (payload) {
    console.log("Nonce:", payload.nonce);
    submitToServer(payload.nonce);
  })
  .catch(function (err) {
    if (err.code === "LOCAL_PAYMENT_WINDOW_CLOSED") {
      console.log("User closed window");
    }
  });
```

### tokenize()

Manually tokenizes parameters received from a local payment. Used for fallback URL scenarios or redirect flow completion.

**Signature:**

```javascript
localPaymentInstance.tokenize(params, callback);
// OR
localPaymentInstance.tokenize(params).then(function (payload) {
  // Use payload
});
```

**Parameters:**

- `params` (object, optional): Tokenization parameters (defaults to URL query string)
  - `btLpToken` or `token`: Payment token
  - `btLpPaymentId` or `paymentId`: Payment ID
  - `btLpPayerId` or `PayerID`: Payer ID

**Returns:**

- `Promise<tokenizePayload>` - Tokenization result

**Example:**

```javascript
// Automatically parse from URL
localPaymentInstance
  .tokenize()
  .then(function (payload) {
    submitToServer(payload.nonce);
  })
  .catch(function (err) {
    console.error("Tokenization failed:", err);
  });

// Manual params
localPaymentInstance
  .tokenize({
    btLpToken: "token-abc",
    btLpPaymentId: "payment-123",
    btLpPayerId: "payer-456",
  })
  .then(function (payload) {
    // Process payload
  });
```

### hasTokenizationParams()

Checks if required tokenization parameters are present in the URL query string.

**Signature:**

```javascript
var hasParams = localPaymentInstance.hasTokenizationParams();
```

**Returns:**

- `Boolean` - `true` if tokenization params present, `false` otherwise

**Example:**

```javascript
if (localPaymentInstance.hasTokenizationParams()) {
  localPaymentInstance.tokenize().then(function (payload) {
    // Process completed payment
    submitToServer(payload.nonce);
  });
} else {
  // Show payment form
  showPaymentOptions();
}
```

### closeWindow()

Closes the local payment popup window if open.

**Signature:**

```javascript
localPaymentInstance.closeWindow();
```

**Example:**

```javascript
// Close popup when user cancels
cancelButton.addEventListener("click", function () {
  localPaymentInstance.closeWindow();
});
```

### focusWindow()

Brings the local payment popup window to focus if open.

**Signature:**

```javascript
localPaymentInstance.focusWindow();
```

**Example:**

```javascript
// Focus popup when user clicks "continue payment" link
continueLink.addEventListener("click", function () {
  localPaymentInstance.focusWindow();
});
```

## Payment Flows

### 1. Popup Flow (Default)

**When Used:**

- Desktop browsers
- Default when `redirectUrl` not provided

**Flow:**

1. `startPayment()` called in click handler
2. `onPaymentStart` callback fires
3. Call `continueCallback()` to open popup
4. Customer selects bank and authenticates
5. Popup closes automatically
6. Promise resolves with nonce
7. Send nonce to server

**Advantages:**

- Better user experience (stays on page)
- Immediate feedback
- Works well on desktop

**Popup Blocker Note:**

- Must call `startPayment()` directly in user action handler
- Async operations before opening popup will fail

### 2. Full-Page Redirect Flow

**When Used:**

- `redirectUrl` provided during creation
- Mobile environments
- Better mobile compatibility

**Flow:**

1. `startPayment()` called
2. `onPaymentStart` callback fires (no `continueCallback`)
3. Page redirects to bank
4. Customer authenticates
5. Redirects back to `redirectUrl`
6. SDK automatically tokenizes
7. `tokenizePayload` property contains nonce

**Advantages:**

- No popup blocker issues
- Better mobile experience
- Works in all environments

**Example:**

```javascript
braintree.localPayment
  .create({
    client: clientInstance,
    redirectUrl: window.location.href,
  })
  .then(function (localPaymentInstance) {
    if (localPaymentInstance.tokenizePayload) {
      // Returned from redirect
      handlePaymentComplete(localPaymentInstance.tokenizePayload.nonce);
    } else {
      // Initial load - show payment button
      setupPaymentButton(localPaymentInstance);
    }
  });
```

### 3. Deferred Payment Flow

**Payment Types:** Pay Upon Invoice, MB WAY, BANCOMAT PAY, BLIK seamless/one-click

**Flow:**

1. `startPayment()` called
2. Payment ID generated
3. `onPaymentStart` callback fires (no `continueCallback`)
4. Promise resolves immediately
5. Customer completes payment later (email, SMS, app)
6. Webhook notification to server

**Critical:** Store `paymentId` in `onPaymentStart` for webhook correlation

**Example:**

```javascript
localPaymentInstance
  .startPayment({
    paymentType: "mbway",
    // ... other options ...
    onPaymentStart: function (data) {
      // NO continueCallback parameter for deferred payments

      // CRITICAL: Save payment ID for webhook
      saveToServer({ paymentId: data.paymentId });
    },
  })
  .then(function () {
    // Promise resolves immediately
    showSuccessMessage("Check your phone to complete payment");
  });
```

### 4. Fallback Flow (Mobile App Switching)

**When Used:**

- Mobile device switches to banking app
- User returns via fallback URL

**Flow:**

1. Popup opens on mobile
2. User taps bank, switches to bank app
3. App context lost
4. User completes payment in app
5. Returns to fallback URL with query params
6. Use `hasTokenizationParams()` to detect
7. Call `tokenize()` to complete

**Example:**

```javascript
// On page load
braintree.localPayment
  .create({
    client: clientInstance,
  })
  .then(function (localPaymentInstance) {
    if (localPaymentInstance.hasTokenizationParams()) {
      // Returned from fallback
      localPaymentInstance.tokenize().then(function (payload) {
        submitToServer(payload.nonce);
      });
    } else {
      // Normal page load
      setupPaymentButton(localPaymentInstance);
    }
  });
```

## Error Handling

### Error Codes

From `shared/errors.js`:

**Creation Errors:**

1. **`LOCAL_PAYMENT_NOT_ENABLED`** (MERCHANT)
   - Local Payment not enabled in Braintree control panel
   - Fix: Enable in Braintree settings

**Payment Errors:**

2. **`LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION`** (MERCHANT)
   - Missing required option in `startPayment()` call
   - Fix: Provide all required fields for payment type
   - `error.details`: Specific missing option name

3. **`LOCAL_PAYMENT_ALREADY_IN_PROGRESS`** (MERCHANT)
   - Called `startPayment()` while another payment active
   - Fix: Wait for previous payment to complete
   - Fix: Disable payment button during flow

4. **`LOCAL_PAYMENT_INVALID_PAYMENT_OPTION`** (MERCHANT)
   - Invalid option value provided
   - Fix: Verify all option values match API requirements

5. **`LOCAL_PAYMENT_START_PAYMENT_FAILED`** (NETWORK)
   - Failed to create payment context
   - Fix: Check network connectivity
   - Fix: Verify all parameters valid

6. **`LOCAL_PAYMENT_START_PAYMENT_DEFERRED_PAYMENT_FAILED`** (UNKNOWN)
   - Deferred payment creation failed
   - Fix: Check logs for details

**Customer Errors:**

7. **`LOCAL_PAYMENT_CANCELED`** (CUSTOMER)
   - Customer canceled payment flow
   - Handling: Allow retry

8. **`LOCAL_PAYMENT_WINDOW_CLOSED`** (CUSTOMER)
   - Customer closed popup window
   - Handling: Allow retry
   - Common user behavior

**Window Errors:**

9. **`LOCAL_PAYMENT_WINDOW_OPEN_FAILED`** (MERCHANT)
   - Popup failed to open
   - Cause: Not called from user action (popup blocker)
   - Fix: Call `startPayment()` directly in click handler

**Tokenization Errors:**

10. **`LOCAL_PAYMENT_TOKENIZATION_FAILED`** (NETWORK)
    - Tokenization failed
    - Fix: Check network connectivity
    - Fix: Verify payment completed successfully

## Testing

### Sandbox Testing

**Test Payment Types:**
All local payment methods work in sandbox with test credentials.

**iDEAL Test:**

```javascript
localPaymentInstance.startPayment({
  paymentType: "ideal",
  paymentTypeCountryCode: "NL",
  amount: "10.00",
  currencyCode: "EUR",
  givenName: "Test",
  surname: "User",
  address: { countryCode: "NL" },
  fallback: {
    url: "http://localhost:3000/checkout",
    buttonText: "Return",
  },
  onPaymentStart: function (data, continueCallback) {
    console.log("Payment ID:", data.paymentId);
    continueCallback();
  },
});
```

In sandbox popup:

1. Select any test bank
2. Choose success or failure scenario
3. Complete flow

### Unit Tests

Location: `test/local-payment/unit/`

**Test Categories:**

- Component creation
- Standard payment flow
- Deferred payment flow
- Redirect flow
- Fallback URL handling
- Error scenarios
- All payment types

## Debugging

### Common Issues

**1. "Local payment not enabled"**

**Symptoms:**

- `LOCAL_PAYMENT_NOT_ENABLED` on creation

**Fix:**

```
Braintree Control Panel → Settings → Processing
Enable "PayPal" (Local Payment uses PayPal infrastructure)
```

**2. "Popup blocked"**

**Symptoms:**

- `LOCAL_PAYMENT_WINDOW_OPEN_FAILED`
- No popup appears

**Cause:**

- `startPayment()` not called directly from user action
- Async operation before opening popup

**Fix:**

```javascript
// BAD: Async operation before startPayment
button.addEventListener("click", function () {
  fetchConfig().then(function () {
    // TOO LATE - popup blocker will prevent this
    localPaymentInstance.startPayment(options);
  });
});

// GOOD: Call startPayment immediately
button.addEventListener("click", function () {
  localPaymentInstance.startPayment(options).then(function (payload) {
    // Process payload
  });
});
```

**3. "Missing required option"**

**Symptoms:**

- `LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION`
- `error.details`: "Missing required 'X' option."

**Debug:**
Check required options for payment type:

- Standard flow: `givenName`, `surname`, `currencyCode`, `paymentType`, `amount`, `fallback`, `onPaymentStart`
- Pay Upon Invoice: Many additional fields (see Configuration Options)
- BLIK: Different requirements based on mode

**Fix:**

```javascript
// Ensure all required fields present
var options = {
  paymentType: "ideal",
  paymentTypeCountryCode: "NL",
  amount: "10.00",
  currencyCode: "EUR",
  givenName: "John", // Required
  surname: "Doe", // Required
  address: {
    countryCode: "NL",
  },
  fallback: {
    // Required for popup flow
    url: "https://example.com/checkout",
    buttonText: "Return to Merchant",
  },
  onPaymentStart: function (data, continueCallback) {
    continueCallback(); // Required callback
  },
};
```

**4. "Payment already in progress"**

**Symptoms:**

- `LOCAL_PAYMENT_ALREADY_IN_PROGRESS`
- Multiple popups attempted

**Fix:**

```javascript
var isProcessing = false;

button.addEventListener("click", function () {
  if (isProcessing) {
    return; // Prevent duplicate calls
  }

  isProcessing = true;

  localPaymentInstance
    .startPayment(options)
    .then(function (payload) {
      isProcessing = false;
      // Handle success
    })
    .catch(function (err) {
      isProcessing = false;
      // Handle error
    });
});
```

**5. "Customer closed window"**

**Symptoms:**

- `LOCAL_PAYMENT_WINDOW_CLOSED`
- Common user behavior

**Handling:**

```javascript
localPaymentInstance.startPayment(options).catch(function (err) {
  if (err.code === "LOCAL_PAYMENT_WINDOW_CLOSED") {
    // Customer canceled - allow retry
    showMessage("Payment canceled. Click to try again.");
    showRetryButton();
  } else {
    // Other error
    showError(err.message);
  }
});
```

**6. "Redirect flow not completing"**

**Symptoms:**

- `tokenizePayload` undefined after redirect
- Redirect returns but tokenization doesn't happen

**Debug:**

1. Verify `redirectUrl` matches current page URL
2. Check URL query parameters after redirect
3. Ensure SDK re-initializes on page load

**Fix:**

```javascript
// Ensure redirectUrl matches exactly
braintree.localPayment.create({
  client: clientInstance,
  redirectUrl: window.location.origin + window.location.pathname,
  // NOT a different page URL
});
```

## Implementation Examples

### Complete Popup Flow

```javascript
var idealButton = document.getElementById("ideal-button");

braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.localPayment.create({
      client: clientInstance,
      merchantAccountId: "EUR_merchant_account",
    });
  })
  .then(function (localPaymentInstance) {
    idealButton.removeAttribute("disabled");

    idealButton.addEventListener("click", function () {
      idealButton.setAttribute("disabled", true);

      localPaymentInstance
        .startPayment({
          paymentType: "ideal",
          paymentTypeCountryCode: "NL",
          amount: document.getElementById("amount").value,
          currencyCode: "EUR",
          givenName: document.getElementById("first-name").value,
          surname: document.getElementById("last-name").value,
          email: document.getElementById("email").value,
          phone: document.getElementById("phone").value,
          address: {
            streetAddress: document.getElementById("address").value,
            locality: document.getElementById("city").value,
            postalCode: document.getElementById("postal-code").value,
            countryCode: "NL",
          },
          fallback: {
            url: window.location.href,
            buttonText: "Return to Checkout",
            cancelUrl: window.location.href,
            cancelButtonText: "Cancel Payment",
          },
          onPaymentStart: function (data, continueCallback) {
            // Save payment ID for webhook correlation
            fetch("/save-payment-id", {
              method: "POST",
              body: JSON.stringify({ paymentId: data.paymentId }),
            }).then(function () {
              // Open popup after saving ID
              continueCallback();
            });
          },
        })
        .then(function (payload) {
          // Success - send to server
          return fetch("/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nonce: payload.nonce,
              amount: document.getElementById("amount").value,
            }),
          });
        })
        .then(function (response) {
          if (response.ok) {
            window.location.href = "/success";
          }
        })
        .catch(function (err) {
          idealButton.removeAttribute("disabled");

          if (err.code === "LOCAL_PAYMENT_WINDOW_CLOSED") {
            showMessage("Payment canceled. Please try again.");
          } else {
            showError("Payment error: " + err.message);
          }
        });
    });
  });
```

### Complete Redirect Flow

```javascript
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.localPayment.create({
      client: clientInstance,
      merchantAccountId: "EUR_merchant_account",
      redirectUrl: window.location.href,
    });
  })
  .then(function (localPaymentInstance) {
    // Check if returning from redirect
    if (localPaymentInstance.tokenizePayload) {
      handleSuccessfulPayment(localPaymentInstance.tokenizePayload);
    } else if (localPaymentInstance.hasTokenizationParams()) {
      // Fallback URL scenario
      localPaymentInstance.tokenize().then(function (payload) {
        handleSuccessfulPayment(payload);
      });
    } else {
      // Normal page load - setup payment buttons
      setupPaymentButtons(localPaymentInstance);
    }
  });

function handleSuccessfulPayment(payload) {
  fetch("/process-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nonce: payload.nonce }),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (result) {
      if (result.success) {
        window.location.href = "/thank-you";
      }
    });
}

function setupPaymentButtons(localPaymentInstance) {
  // iDEAL button
  document
    .getElementById("ideal-button")
    .addEventListener("click", function () {
      localPaymentInstance.startPayment({
        paymentType: "ideal",
        paymentTypeCountryCode: "NL",
        amount: "10.00",
        currencyCode: "EUR",
        givenName: "Jan",
        surname: "Jansen",
        address: { countryCode: "NL" },
      });
      // Page will redirect - no promise handling
    });

  // Sofort button
  document
    .getElementById("sofort-button")
    .addEventListener("click", function () {
      localPaymentInstance.startPayment({
        paymentType: "sofort",
        paymentTypeCountryCode: "DE",
        amount: "10.00",
        currencyCode: "EUR",
        givenName: "Hans",
        surname: "Schmidt",
        address: { countryCode: "DE" },
      });
    });
}
```

### Pay Upon Invoice Example

```javascript
localPaymentInstance
  .startPayment({
    paymentType: "pay_upon_invoice",
    amount: "100.00",
    currencyCode: "EUR",

    // Customer info
    givenName: "Max",
    surname: "Mustermann",
    email: "buyer@example.com",
    phone: "6912345678",
    phoneCountryCode: "49",
    birthDate: "1990-01-01",

    // Shipping address
    address: {
      streetAddress: "Taunusanlage 12",
      locality: "Frankfurt",
      postalCode: "60325",
      countryCode: "DE",
    },

    // Billing address
    billingAddress: {
      streetAddress: "Schönhauser Allee 84",
      locality: "Berlin",
      postalCode: "10439",
      countryCode: "DE",
    },

    // Line items
    lineItems: [
      {
        category: "PHYSICAL_GOODS",
        name: "Basketball Shoes",
        quantity: "1",
        unitAmount: "81.00",
        unitTaxAmount: "19.00",
      },
      {
        category: "PHYSICAL_GOODS",
        name: "Socks",
        quantity: "2",
        unitAmount: "5.00",
        unitTaxAmount: "0.95",
      },
    ],

    shippingAmount: "5.00",
    discountAmount: "10.00",

    locale: "en-DE",
    customerServiceInstructions: "Customer service: +49 6912345678",
    correlationId: dataCollectorInstance.deviceData,

    onPaymentStart: function (data) {
      // CRITICAL: Store payment ID for webhook
      fetch("/store-payment", {
        method: "POST",
        body: JSON.stringify({ paymentId: data.paymentId }),
      }).then(function () {
        showMessage("Invoice will be sent to " + "buyer@example.com");
      });
    },
  })
  .then(function () {
    // Deferred payment - promise resolves immediately
    showSuccessMessage(
      "Order placed! Check your email for payment instructions."
    );
  })
  .catch(function (err) {
    showError(err.message);
  });
```

### Multi-Payment Method Form

```javascript
var paymentButtons = {
  ideal: { country: "NL", currency: "EUR", name: "iDEAL" },
  sofort: { country: "DE", currency: "EUR", name: "Sofort" },
  bancontact: { country: "BE", currency: "EUR", name: "Bancontact" },
  giropay: { country: "DE", currency: "EUR", name: "giropay" },
};

Object.keys(paymentButtons).forEach(function (paymentType) {
  var config = paymentButtons[paymentType];
  var button = document.getElementById(paymentType + "-button");

  button.addEventListener("click", function () {
    localPaymentInstance
      .startPayment({
        paymentType: paymentType,
        paymentTypeCountryCode: config.country,
        amount: getCartTotal(),
        currencyCode: config.currency,
        givenName: document.getElementById("first-name").value,
        surname: document.getElementById("last-name").value,
        email: document.getElementById("email").value,
        address: {
          countryCode: config.country,
        },
        fallback: {
          url: window.location.href,
          buttonText: "Return to Checkout",
        },
        displayName: "My Store",
        onPaymentStart: function (data, continueCallback) {
          savePaymentId(data.paymentId);
          continueCallback();
        },
      })
      .then(function (payload) {
        submitPayment(payload.nonce);
      })
      .catch(handlePaymentError);
  });
});
```

## Server-Side Usage

**Client-side:**

```javascript
localPaymentInstance.startPayment(options).then(function (payload) {
  return fetch("/checkout", {
    method: "POST",
    body: JSON.stringify({ nonce: payload.nonce }),
  });
});
```

**Server-side (Node.js):**

```javascript
app.post("/checkout", function (req, res) {
  var nonce = req.body.nonce;

  gateway.transaction.sale(
    {
      amount: "10.00",
      paymentMethodNonce: nonce,
      merchantAccountId: "EUR_merchant_account", // Important
      options: {
        submitForSettlement: true,
      },
    },
    function (err, result) {
      if (result.success) {
        res.send({ success: true, transactionId: result.transaction.id });
      } else {
        res.status(500).send({ error: result.message });
      }
    }
  );
});
```

**Webhook Handling:**
For deferred payment types, setup webhooks to receive payment completion notifications:

```javascript
// Store payment ID during onPaymentStart
app.post("/save-payment-id", function (req, res) {
  var paymentId = req.body.paymentId;
  // Save to database with order ID
  database.savePaymentId(paymentId, orderId);
  res.send({ success: true });
});

// Handle webhook notification
app.post("/webhooks", function (req, res) {
  var notification = gateway.webhookNotification.parse(
    req.body.bt_signature,
    req.body.bt_payload
  );

  if (notification.kind === "local_payment_completed") {
    var paymentId = notification.localPayment.paymentId;
    // Look up order by payment ID
    var order = database.findOrderByPaymentId(paymentId);
    // Process order
    processOrder(order);
  }

  res.send({ success: true });
});
```

## Payment Type Requirements

Different payment types have different field requirements. See [Braintree's payment type reference](https://developer.paypal.com/braintree/docs/guides/local-payment-methods/client-side-custom/javascript/v3#render-local-payment-method-buttons) for complete details on:

- Supported countries per payment type
- Required vs optional fields
- Currency requirements
- Special configuration options
