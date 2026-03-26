---
name: braintree-card-payments
description: Hosted Fields PCI-compliant card collection via iframes - field configuration, styling, events, and tokenization
---

# Hosted Fields - Card Payment Integration

## Architecture

Each card input field runs in its own sandboxed iframe. Card data never touches your DOM or JavaScript, ensuring PCI compliance.

## Setup

```javascript
braintree.hostedFields.create(
  {
    client: clientInstance, // or authorization: 'token'
    fields: {
      number: { selector: "#card-number", placeholder: "4111 1111 1111 1111" },
      cvv: { selector: "#cvv", placeholder: "123" },
      expirationDate: { selector: "#expiration", placeholder: "MM/YY" },
    },
    styles: {
      input: { "font-size": "16px", color: "#333" },
      ":focus": { color: "#000" },
      ".valid": { color: "green" },
      ".invalid": { color: "red" },
    },
  },
  function (err, hostedFieldsInstance) {
    if (err) {
      console.error(err);
      return;
    }
    // Ready
  }
);
```

## Available Fields

| Field Key         | Purpose         | Notes                                       |
| ----------------- | --------------- | ------------------------------------------- |
| `number`          | Card number     | Auto-detects card type, formats with spaces |
| `cvv`             | Security code   | 3-4 digits depending on card type           |
| `expirationDate`  | Combined MM/YY  | Auto-inserts slash                          |
| `expirationMonth` | Month only      | Use with `expirationYear`                   |
| `expirationYear`  | Year only       | Use with `expirationMonth`                  |
| `postalCode`      | ZIP/postal code | Configurable `maxlength` (default 10)       |
| `cardholderName`  | Name on card    | Optional text field                         |

**Field options:** `selector` (required), `placeholder`, `type` (such as `'password'` for CVV), `prefill`, `maxlength`, `minlength`, `formatInput` (boolean), `maskInput` (object), `select` (for dropdowns on month/year).

## Events

```javascript
hostedFieldsInstance.on("focus", function (event) {
  // event.emittedBy: 'number', 'cvv', etc.
  // event.fields: state of all fields
});

hostedFieldsInstance.on("blur", function (event) {
  /* ... */
});

hostedFieldsInstance.on("validityChange", function (event) {
  // event.fields.number.isValid, .isPotentiallyValid, .isEmpty
  var allValid = Object.keys(event.fields).every(function (key) {
    return event.fields[key].isValid;
  });
  submitButton.disabled = !allValid;
});

hostedFieldsInstance.on("cardTypeChange", function (event) {
  // event.cards: array of possible card types
  // event.cards[0].type: 'visa', 'master-card', 'american-express', etc.
});

hostedFieldsInstance.on("binAvailable", function (event) {
  // event.bin: first 6-8 digits for BIN lookup
});

hostedFieldsInstance.on("inputSubmitRequest", function () {
  // User pressed Enter in a field -- trigger form submission
  hostedFieldsInstance.tokenize(/* ... */);
});
```

## Tokenization

```javascript
hostedFieldsInstance.tokenize(
  {
    vault: false, // true to store in vault (requires client token)
    cardholderName: "John Doe", // if not using cardholderName field
    billingAddress: {
      postalCode: "12345", // if not using postalCode field
      streetAddress: "123 Main St",
    },
  },
  function (err, payload) {
    if (err) {
      // Handle specific errors
      if (err.code === "HOSTED_FIELDS_FIELDS_EMPTY") {
        /* all empty */
      }
      if (err.code === "HOSTED_FIELDS_FIELDS_INVALID") {
        /* validation failed */
      }
      return;
    }
    // payload.nonce -- send to server
    // payload.details.bin -- card BIN
    // payload.details.cardType -- 'Visa', 'Mastercard', and so on
    // payload.details.lastFour -- '1111'
    // payload.details.lastTwo -- '11'
  }
);
```

## Field State

```javascript
var state = hostedFieldsInstance.getState();
// state.cards: detected card types
// state.fields.number: { isEmpty, isValid, isPotentiallyValid, isFocused }
// state.fields.cvv: { ... }
```

## Additional Methods

```javascript
hostedFieldsInstance.clear("number"); // Clear a field
hostedFieldsInstance.focus("number"); // Focus a field
hostedFieldsInstance.setPlaceholder("number", "Card number"); // Change placeholder
hostedFieldsInstance.setAttribute({
  field: "number",
  attribute: "aria-label",
  value: "Credit card number",
});
hostedFieldsInstance.removeAttribute({
  field: "number",
  attribute: "aria-label",
});
hostedFieldsInstance.addClass("number", "my-class");
hostedFieldsInstance.removeClass("number", "my-class");
```

## Common Errors

| Code                                                 | Type     | Cause                           | Fix                                           |
| ---------------------------------------------------- | -------- | ------------------------------- | --------------------------------------------- |
| `HOSTED_FIELDS_TIMEOUT`                              | UNKNOWN  | Setup took >60s                 | Check network, CSP policy, iframe URLs        |
| `HOSTED_FIELDS_INVALID_FIELD_KEY`                    | MERCHANT | Unknown field name              | Use valid field keys listed above             |
| `HOSTED_FIELDS_INVALID_FIELD_SELECTOR`               | MERCHANT | Selector not found in DOM       | Ensure container element exists before create |
| `HOSTED_FIELDS_FIELD_DUPLICATE_IFRAME`               | MERCHANT | Container already has HF iframe | Don't call create twice on same containers    |
| `HOSTED_FIELDS_FIELDS_EMPTY`                         | CUSTOMER | All fields empty on tokenize    | Prompt user to enter card info                |
| `HOSTED_FIELDS_FIELDS_INVALID`                       | CUSTOMER | Validation failed on tokenize   | Show validation errors per field              |
| `HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR`           | NETWORK  | Gateway unreachable             | Retry with backoff                            |
| `HOSTED_FIELDS_TOKENIZATION_FAIL_ON_DUPLICATE`       | CUSTOMER | Card already in vault           | Inform user, use existing payment method      |
| `HOSTED_FIELDS_TOKENIZATION_CVV_VERIFICATION_FAILED` | CUSTOMER | CVV check failed                | Ask user to re-enter CVV                      |

## Teardown

In single-page applications (SPAs), always tear down Hosted Fields before re-creating or when the payment form is removed from the DOM. Failing to teardown causes orphaned iframes, duplicate event handlers, and `HOSTED_FIELDS_TIMEOUT` errors on subsequent `create()` calls.

```javascript
hostedFieldsInstance.teardown().then(function () {
  // Safe to create new instance or remove form from DOM
});
```

**SPA pattern:** Track the `create()` promise. If the user navigates away before it resolves, call `teardown()` on the instance once it becomes available.

## CSP Requirements

Allow in Content-Security-Policy:

- `frame-src`: `https://assets.braintreegateway.com`
- `script-src`: `https://js.braintreegateway.com`
- `style-src`: `'unsafe-inline'` (required -- Hosted Fields renders iframe content using inline styles)
- `connect-src`: `https://*.braintreegateway.com`, `https://*.braintree-api.com`
