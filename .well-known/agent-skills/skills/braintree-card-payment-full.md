---
name: braintree-card-payment-full
description: End-to-end card payment orchestration combining Hosted Fields, 3D Secure, and Data Collector
---

# Complete Card Payment Flow

This skill covers the most common production integration: collect card data, gather device fingerprint, tokenize, authenticate with 3DS, and submit nonce to server.

## Components Needed

1. **Client** -- foundational, required by all others
2. **Hosted Fields** -- PCI-compliant card input
3. **Data Collector** -- device fingerprinting for fraud prevention
4. **3D Secure** -- cardholder authentication (liability shift)

**Authorization:** Client token required (3D Secure requires a client token).

## Complete Implementation

```javascript
var braintree = require("braintree-web");

// Step 1: Create client
braintree.client
  .create({
    authorization: CLIENT_TOKEN, // Server-generated client token
  })
  .then(function (clientInstance) {
    // Step 2: Create components in parallel
    return Promise.all([
      braintree.hostedFields.create({
        client: clientInstance,
        fields: {
          number: {
            selector: "#card-number",
            placeholder: "4111 1111 1111 1111",
          },
          cvv: { selector: "#cvv", placeholder: "123" },
          expirationDate: { selector: "#expiration", placeholder: "MM/YY" },
        },
        styles: {
          input: { "font-size": "16px" },
          ".invalid": { color: "red" },
        },
      }),
      braintree.dataCollector.create({
        client: clientInstance,
      }),
      braintree.threeDSecure.create({
        client: clientInstance,
        version: "2",
      }),
    ]);
  })
  .then(function (instances) {
    var hostedFieldsInstance = instances[0];
    var dataCollectorInstance = instances[1];
    var threeDSecureInstance = instances[2];

    // Step 3: Register 3DS lookup handler
    threeDSecureInstance.on("lookup-complete", function (data, next) {
      // Optionally inspect data.requiresUserAuthentication
      // Call next() to proceed (shows challenge if needed)
      next();
    });

    // Step 4: Enable/disable submit based on validity
    hostedFieldsInstance.on("validityChange", function (event) {
      var allValid = Object.keys(event.fields).every(function (key) {
        return event.fields[key].isValid;
      });
      document.getElementById("submit").disabled = !allValid;
    });

    // Step 5: Handle form submission
    document.getElementById("submit").addEventListener("click", function () {
      // 5a: Tokenize card
      hostedFieldsInstance
        .tokenize()
        .then(function (tokenizePayload) {
          // 5b: Verify with 3DS
          return threeDSecureInstance.verifyCard({
            nonce: tokenizePayload.nonce,
            bin: tokenizePayload.details.bin,
            amount: document.getElementById("amount").value,
            email: document.getElementById("email").value,
            billingAddress: {
              givenName: "John",
              surname: "Doe",
              streetAddress: "123 Main St",
              locality: "Chicago",
              region: "IL",
              postalCode: "60606",
              countryCodeAlpha2: "US",
            },
          });
        })
        .then(function (verifyPayload) {
          // 5c: Send to server with device data
          return fetch("/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nonce: verifyPayload.nonce, // NEW nonce from 3DS
              deviceData: dataCollectorInstance.deviceData, // Fraud data string
              liabilityShifted: verifyPayload.threeDSecureInfo.liabilityShifted,
            }),
          });
        })
        .catch(function (err) {
          handleError(err);
        });
    });
  });

function handleError(err) {
  switch (err.code) {
    // Tokenization errors
    case "HOSTED_FIELDS_FIELDS_EMPTY":
      alert("Please enter your card information.");
      break;
    case "HOSTED_FIELDS_FIELDS_INVALID":
      alert("Some card fields are invalid. Please check and try again.");
      break;

    // 3DS errors
    case "THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR":
      alert("Card not found. Please re-enter your card.");
      break;
    case "THREEDS_CARDINAL_SDK_CANCELED":
      alert("Authentication cancelled. Please try again.");
      break;

    // Network errors (all components)
    case "HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR":
    case "CLIENT_GATEWAY_NETWORK":
    case "CLIENT_REQUEST_TIMEOUT":
      alert("Network error. Please check your connection and try again.");
      break;

    default:
      console.error("Payment error:", err);
      alert("An error occurred. Please try again.");
  }
}
```

## Error Handling Strategy

| Stage                  | Possible Errors                                                                  | Recovery                     |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| Client creation        | `CLIENT_INVALID_AUTHORIZATION`, `CLIENT_GATEWAY_NETWORK`                         | Refresh client token, retry  |
| Hosted Fields creation | `HOSTED_FIELDS_TIMEOUT`, `HOSTED_FIELDS_INVALID_FIELD_SELECTOR`                  | Check DOM, CSP, network      |
| 3DS creation           | `THREEDS_NOT_ENABLED`, `THREEDS_CAN_NOT_USE_TOKENIZATION_KEY`                    | Enable 3DS, use client token |
| Tokenization           | `HOSTED_FIELDS_FIELDS_EMPTY`, `HOSTED_FIELDS_FIELDS_INVALID`                     | Prompt user to fix input     |
| 3DS verification       | `THREEDS_CARDINAL_SDK_CANCELED`, `THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR` | Allow retry, use fresh nonce |

## Key Points

- **Nonce lifecycle:** Original nonce from `tokenize()` is consumed by 3DS lookup. Always use the nonce from `verifyCard()` result.
- **Device data:** `dataCollectorInstance.deviceData` is a JSON string. Send it as-is to your server.
- **Liability shift:** Check `verifyPayload.threeDSecureInfo.liabilityShifted`. Decide server-side whether to proceed if false.
- **Billing address:** Providing complete billing info improves frictionless authentication rates.

## Teardown

```javascript
Promise.all([
  hostedFieldsInstance.teardown(),
  dataCollectorInstance.teardown(),
  threeDSecureInstance.teardown(),
]).then(function () {
  // All cleaned up
});
```
