# SEPA Component - CLAUDE.md

This file provides component-specific guidance for working with the SEPA component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The SEPA (Single Euro Payments Area) component enables SEPA Direct Debit payments, allowing merchants to collect payments from bank accounts in the SEPA region (Eurozone countries). It integrates with PayPal's SEPA infrastructure to create mandates and tokenize bank account information.

**Key Features:**

- SEPA Direct Debit mandate creation
- Popup-based authorization flow
- Full-page redirect flow (alternative)
- ONE_OFF and RECURRENT payment types
- IBAN collection and validation
- Customer billing address collection
- Frame Service integration for secure UI

**Docs:** [Braintree SEPA Guide](https://developer.paypal.com/braintree/docs/guides/sepa)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `external/sepa.js` - Main SEPA class implementation
- `external/mandate.js` - Mandate creation and handling logic
- `shared/errors.js` - SEPA error codes (6 errors)
- `shared/constants.js` - Component constants

**Note:** This component (5 files) uses Frame Service for popup/redirect flows.

## How It Works

### SEPA Direct Debit Flow

```
1. Create SEPA Instance
   ↓
2. Customer Provides Bank Details
   (IBAN, account holder name, etc.)
   ↓
3. tokenize() Called
   ↓
4. Create Mandate (API Call)
   ↓
5. Open Popup/Redirect
   (Customer authorizes mandate)
   ↓
6. Customer Approves
   ↓
7. Tokenization Complete
   ↓
8. Nonce Returned
```

## Payment Flows

### 1. Popup Flow (Default)

**When Used:**

- Desktop and mobile browsers
- Default flow when `redirectUrl` not provided

**Flow:**

1. Mandate created via API
2. Popup window opens with approval URL
3. Customer reviews and approves mandate
4. Popup closes automatically
5. Tokenization completes
6. Nonce returned

**Advantages:**

- Better user experience (stays on page)
- Immediate feedback
- No page reload

### 2. Full-Page Redirect Flow

**When Used:**

- `redirectUrl` provided during creation
- Mobile environments where popups may be blocked
- Single-page applications

**Flow:**

1. Mandate created via API
2. Full page redirects to approval URL
3. Customer reviews and approves mandate
4. Redirects back to `redirectUrl`
5. SDK automatically completes tokenization
6. Nonce available via `tokenizePayload` property

**Advantages:**

- Works in all environments
- No popup blocker issues
- Better mobile compatibility

## Basic Usage

### Popup Flow

```javascript
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.sepa.create({
      client: clientInstance,
    });
  })
  .then(function (sepaInstance) {
    // Customer fills out SEPA form
    submitButton.addEventListener("click", function () {
      var tokenizeInputs = {
        accountHolderName: "John Doe",
        customerId: "customer-123",
        iban: "DE89370400440532013000",
        mandateType: "ONE_OFF", // or 'RECURRENT'
        countryCode: "DE",
        merchantAccountId: "EUR_merchant_account",
      };

      sepaInstance
        .tokenize(tokenizeInputs)
        .then(function (payload) {
          // Send payload.nonce to server
          submitNonceToServer(payload.nonce);
        })
        .catch(function (err) {
          if (err.code === "SEPA_CUSTOMER_CANCELED") {
            console.log("Customer canceled SEPA authorization");
          } else {
            console.error("SEPA error:", err);
          }
        });
    });
  });
```

### Full-Page Redirect Flow

```javascript
braintree.sepa
  .create({
    client: clientInstance,
    redirectUrl: "https://example.com/checkout", // Enable redirect flow
  })
  .then(function (sepaInstance) {
    // Check if returning from redirect
    if (sepaInstance.tokenizePayload) {
      // Tokenization completed via redirect
      var nonce = sepaInstance.tokenizePayload.nonce;
      submitNonceToServer(nonce);
    } else {
      // Initial page load - show SEPA form
      setupSepaForm(sepaInstance);
    }
  });

function setupSepaForm(sepaInstance) {
  submitButton.addEventListener("click", function () {
    var tokenizeInputs = {
      accountHolderName: "John Doe",
      customerId: "customer-123",
      iban: "DE89370400440532013000",
      mandateType: "ONE_OFF",
      countryCode: "DE",
    };

    // This will trigger full-page redirect
    sepaInstance.tokenize(tokenizeInputs);
    // Page will redirect - no promise resolution in this flow
  });
}
```

## Configuration Options

### Creation Options

```javascript
braintree.sepa.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
  redirectUrl: "https://...", // Optional: Enable redirect flow instead of popup
});
```

### Tokenization Options

**Required Fields:**

```javascript
{
  accountHolderName: 'John Doe',    // Required: Account holder's name
  customerId: 'customer-123',       // Required: Merchant's customer ID
  iban: 'DE89370400440532013000',   // Required: International Bank Account Number
  mandateType: 'ONE_OFF',           // Required: 'ONE_OFF' or 'RECURRENT'
  countryCode: 'DE'                 // Required: Two-letter country code
}
```

**Optional Fields:**

```javascript
{
  // Required fields above...

  merchantAccountId: 'EUR_merchant_account',  // Optional: Specific merchant account

  // Billing address (recommended):
  billingAddress: {
    addressLine1: '123 Main St',              // Street address line 1
    addressLine2: 'Apt 4B',                   // Street address line 2 (optional)
    adminArea1: 'Berlin',                     // City/locality
    adminArea2: 'BE',                         // State/region/province
    postalCode: '10115'                       // Postal/ZIP code
  },

  locale: 'de_DE'  // Optional: BCP 47 locale (e.g., 'en_US', 'fr_FR', 'de_DE')
}
```

## Mandate Types

### ONE_OFF

**Use Case:** Single payment/transaction

**Description:**

- Mandate valid for one debit only
- Automatically expires after use
- Best for one-time purchases

**Example:**

```javascript
sepaInstance.tokenize({
  accountHolderName: "Jane Smith",
  customerId: "customer-456",
  iban: "FR1420041010050500013M02606",
  mandateType: "ONE_OFF",
  countryCode: "FR",
});
```

### RECURRENT

**Use Case:** Subscriptions, recurring payments

**Description:**

- Mandate remains active for multiple debits
- Must be managed and stored by merchant
- Best for subscriptions or installment payments

**Example:**

```javascript
sepaInstance.tokenize({
  accountHolderName: "Acme Corporation",
  customerId: "customer-789",
  iban: "NL91ABNA0417164300",
  mandateType: "RECURRENT",
  countryCode: "NL",
});
```

## Methods

### tokenize()

Creates a SEPA mandate and tokenizes the bank account information.

**Signature:**

```javascript
sepaInstance.tokenize(options, callback);
// OR
sepaInstance.tokenize(options).then(function (payload) {
  // Use payload (popup flow only)
});
```

**Parameters:**

- `options` (object): Tokenization options (see Configuration Options above)

**Returns:**

- **Popup Flow:** `Promise<tokenizePayload>` - Resolves after customer approves mandate
- **Redirect Flow:** `Promise<void>` - Triggers redirect (no resolution)

**Payload Structure:**

```javascript
{
  nonce: 'tokensepa_abc123',
  ibanLastFour: '3000',
  mandateType: 'ONE_OFF',
  customerId: 'customer-123'
}
```

**Examples:**

**Popup Flow:**

```javascript
sepaInstance
  .tokenize({
    accountHolderName: "Max Mustermann",
    customerId: "customer-001",
    iban: "DE89370400440532013000",
    mandateType: "ONE_OFF",
    countryCode: "DE",
    billingAddress: {
      addressLine1: "Hauptstraße 1",
      adminArea1: "München",
      adminArea2: "BY",
      postalCode: "80331",
    },
  })
  .then(function (payload) {
    console.log("SEPA nonce:", payload.nonce);
    console.log("Last 4 digits:", payload.ibanLastFour);

    // Send to server
    return fetch("/checkout", {
      method: "POST",
      body: JSON.stringify({ nonce: payload.nonce }),
    });
  })
  .catch(function (err) {
    console.error("SEPA tokenization failed:", err);
  });
```

**Redirect Flow:**

```javascript
// On initial page load
sepaInstance.tokenize({
  accountHolderName: "Pierre Dubois",
  customerId: "customer-002",
  iban: "FR1420041010050500013M02606",
  mandateType: "RECURRENT",
  countryCode: "FR",
});
// Page will redirect to PayPal for approval
// No promise resolution - page navigates away
```

## Redirect Flow Details

### How Redirect Works

1. **Initiation:**
   - `tokenize()` called
   - Mandate created
   - Page redirects to `approvalUrl`

2. **Return:**
   - Customer approves/cancels
   - Redirects back to `redirectUrl` with query parameters
   - Parameters include `success`, `cancel`, `cart_id` (orderId)

3. **Completion:**
   - SDK automatically detects redirect return
   - Completes tokenization in background
   - Sets `tokenizePayload` property

### Detecting Redirect Return

```javascript
braintree.sepa
  .create({
    client: clientInstance,
    redirectUrl: window.location.href,
  })
  .then(function (sepaInstance) {
    if (sepaInstance.tokenizePayload) {
      // Returned from redirect with successful tokenization
      console.log("Nonce:", sepaInstance.tokenizePayload.nonce);
      processPayment(sepaInstance.tokenizePayload.nonce);
    } else {
      // Normal page load - show SEPA form
      showSepaForm(sepaInstance);
    }
  });
```

### Redirect URLs

**Success URL:**

```
https://example.com/checkout?success=true&cart_id=ORDER_123&...
```

**Cancel URL:**

```
https://example.com/checkout?cancel=1
```

The SDK automatically adds `?cancel=1` to `redirectUrl` for cancellations.

## Popup Details

### Popup Dimensions

- **Width:** 400px
- **Height:** 570px
- **Position:** Centered on screen

### Popup Content

The popup displays:

1. SEPA Direct Debit mandate details
2. Bank account information (IBAN)
3. Merchant information
4. Mandate type (ONE_OFF or RECURRENT)
5. Approve/Cancel buttons

### Popup Lifecycle

**Events:**

1. `sepa.popup.initialized` - Popup opened successfully
2. User approves → `sepa.mandate.approved`
3. User cancels → `sepa.customer-canceled`

**Automatic Closure:**

- Popup closes automatically on approval
- Popup closes automatically on cancellation
- Customer can close popup manually (treated as cancellation)

## Error Handling

### Error Codes

From `shared/errors.js`:

**Mandate Creation Errors:**

1. **`SEPA_CREATE_MANDATE_FAILED`** (MERCHANT)
   - Failed to create mandate
   - Common causes:
     - SEPA not enabled in Braintree control panel
     - Invalid IBAN
     - Invalid country code
     - Network error
   - Fix: Verify SEPA is enabled
   - Fix: Validate IBAN format
   - Fix: Check all required fields

2. **`SEPA_TOKENIZE_MISSING_REQUIRED_OPTION`** (MERCHANT)
   - Missing required tokenization option
   - Fix: Provide all required fields (see Configuration Options)

3. **`SEPA_INVALID_MANDATE_TYPE`** (MERCHANT)
   - Invalid `mandateType` value
   - Fix: Use `'ONE_OFF'` or `'RECURRENT'` only

**Authorization Errors:**

4. **`SEPA_CUSTOMER_CANCELED`** (CUSTOMER)
   - Customer canceled mandate authorization
   - Handling: Allow customer to retry
   - Common scenarios:
     - Customer closed popup
     - Customer clicked cancel button
     - Customer navigated back on redirect

5. **`SEPA_TOKENIZATION_FAILED`** (UNKNOWN)
   - Popup authorization flow failed
   - Fix: Check network connectivity
   - Fix: Retry tokenization

6. **`SEPA_TRANSACTION_FAILED`** (UNKNOWN)
   - Final tokenization failed during approval
   - Fix: Check logs for details
   - Fix: Verify mandate was created successfully

## Testing

### Sandbox Testing

**Test IBANs:**

Use PayPal-provided test IBANs for different countries:

```javascript
// Germany
iban: "DE89370400440532013000";

// France
iban: "FR1420041010050500013M02606";

// Netherlands
iban: "NL91ABNA0417164300";

// Spain
iban: "ES9121000418450200051332";

// Italy
iban: "IT60X0542811101000000123456";
```

**Testing in Sandbox:**

```javascript
braintree.sepa
  .create({
    client: clientInstance, // Using sandbox authorization
  })
  .then(function (sepaInstance) {
    return sepaInstance.tokenize({
      accountHolderName: "Test User",
      customerId: "test-customer-123",
      iban: "DE89370400440532013000",
      mandateType: "ONE_OFF",
      countryCode: "DE",
    });
  });
```

### Unit Tests

Location: `test/sepa/unit/`

**Test Categories:**

- Component creation
- Mandate creation
- Popup flow
- Redirect flow
- Tokenization
- Error scenarios

## Debugging

### Common Issues

**1. "SEPA create mandate failed"**

**Symptoms:**

- `SEPA_CREATE_MANDATE_FAILED` error
- Tokenization fails immediately

**Debug:**

1. Verify SEPA enabled in Braintree control panel
2. Check IBAN format is valid
3. Verify country code is correct
4. Ensure all required fields provided
5. Check network requests in dev tools

**Fix:**

```
Braintree Control Panel → Settings → Processing
Enable "SEPA Direct Debit"
```

**2. "Invalid IBAN"**

**Symptoms:**

- Mandate creation fails
- Validation error

**Debug:**

1. Verify IBAN format: 2-letter country code + 2 check digits + account number
2. Use IBAN validation library
3. Test with known-good IBANs

**IBAN Validation:**

```javascript
function isValidIBAN(iban) {
  // Basic format check
  var ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
  return ibanRegex.test(iban.replace(/\s/g, ""));
}
```

**3. "Popup blocked"**

**Symptoms:**

- Popup doesn't open
- User sees popup blocker notification

**Fix:**

```javascript
// Ensure tokenize() called in direct response to user action
submitButton.addEventListener("click", function (event) {
  event.preventDefault();

  // Call tokenize immediately - don't await async operations first
  sepaInstance.tokenize(options).then(/* ... */);
});
```

**4. "Customer canceled"**

**Symptoms:**

- `SEPA_CUSTOMER_CANCELED` error
- Common user behavior

**Handling:**

```javascript
sepaInstance.tokenize(options).catch(function (err) {
  if (err.code === "SEPA_CUSTOMER_CANCELED") {
    // Show retry option
    showMessage("Authorization was canceled. Please try again.");
    showRetryButton();
  } else {
    // Other error
    showError(err.message);
  }
});
```

**5. "Redirect flow not completing"**

**Symptoms:**

- `tokenizePayload` is `undefined` after redirect
- Tokenization doesn't complete

**Debug:**

1. Verify `redirectUrl` matches current page URL
2. Check query parameters in URL after redirect
3. Ensure SDK re-initializes on page load
4. Check for errors in browser console

**Example:**

```javascript
// Make sure redirectUrl matches the page that loads after redirect
braintree.sepa.create({
  client: clientInstance,
  redirectUrl: window.location.origin + window.location.pathname,
  // NOT: redirectUrl: 'https://example.com/different-page'
});
```

## Implementation Examples

### Complete Popup Flow

```javascript
var form = document.getElementById("sepa-form");

braintree.sepa
  .create({
    client: clientInstance,
  })
  .then(function (sepaInstance) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var formData = new FormData(form);
      var tokenizeOptions = {
        accountHolderName: formData.get("account-holder-name"),
        customerId: formData.get("customer-id"),
        iban: formData.get("iban").replace(/\s/g, ""), // Remove spaces
        mandateType: formData.get("mandate-type"),
        countryCode: formData.get("country-code"),
        billingAddress: {
          addressLine1: formData.get("address-line-1"),
          addressLine2: formData.get("address-line-2"),
          adminArea1: formData.get("city"),
          adminArea2: formData.get("region"),
          postalCode: formData.get("postal-code"),
        },
      };

      sepaInstance
        .tokenize(tokenizeOptions)
        .then(function (payload) {
          // Success - send to server
          return fetch("/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nonce: payload.nonce,
              customerId: payload.customerId,
            }),
          });
        })
        .then(function (response) {
          if (response.ok) {
            window.location.href = "/success";
          }
        })
        .catch(function (err) {
          if (err.code === "SEPA_CUSTOMER_CANCELED") {
            document.getElementById("message").textContent =
              "Authorization canceled. Please try again.";
          } else {
            document.getElementById("error").textContent =
              "Error: " + err.message;
          }
        });
    });
  });
```

### Complete Redirect Flow

```javascript
// Initialize SEPA with redirect support
braintree.sepa
  .create({
    client: clientInstance,
    redirectUrl: window.location.href,
  })
  .then(function (sepaInstance) {
    // Check if returning from redirect
    if (sepaInstance.tokenizePayload) {
      // Tokenization completed
      handleSuccessfulTokenization(sepaInstance.tokenizePayload);
    } else {
      // Normal page load - setup form
      setupSepaForm(sepaInstance);
    }
  });

function handleSuccessfulTokenization(payload) {
  // Send nonce to server
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

function setupSepaForm(sepaInstance) {
  var form = document.getElementById("sepa-form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    // This will redirect - no promise resolution
    sepaInstance.tokenize({
      accountHolderName: document.getElementById("name").value,
      customerId: document.getElementById("customer-id").value,
      iban: document.getElementById("iban").value,
      mandateType: document.getElementById("mandate-type").value,
      countryCode: document.getElementById("country").value,
    });

    // Page will redirect before this line executes
  });
}
```

### With Billing Address

```javascript
sepaInstance
  .tokenize({
    accountHolderName: "Hans Schmidt",
    customerId: "customer-456",
    iban: "DE89370400440532013000",
    mandateType: "RECURRENT",
    countryCode: "DE",
    billingAddress: {
      addressLine1: "Friedrichstraße 123",
      addressLine2: "Wohnung 42",
      adminArea1: "Berlin",
      adminArea2: "BE",
      postalCode: "10117",
    },
    locale: "de_DE",
  })
  .then(function (payload) {
    console.log("Tokenization successful:", payload);
  });
```

## Server-Side Usage

**Client-side:**

```javascript
sepaInstance.tokenize(options).then(function (payload) {
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
      amount: "100.00",
      paymentMethodNonce: nonce,
      merchantAccountId: "EUR_merchant_account", // Important: Use EUR merchant account
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

## SEPA Region

SEPA Direct Debit is available in:

**36 Countries:**

- All 27 EU member states
- Plus: Iceland, Liechtenstein, Norway, Switzerland, Monaco, San Marino, Andorra, Vatican City, United Kingdom

**Supported Currencies:**

- EUR (Euro) only
