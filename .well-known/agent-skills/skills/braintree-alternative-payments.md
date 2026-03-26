---
name: braintree-alternative-payments
description: Local payment methods (iDEAL, Sofort, Bancontact, BLIK), SEPA Direct Debit, and US Bank Account (ACH) integration
---

# Alternative Payment Methods

## Local Payment Methods

Supports 25+ methods including iDEAL, Sofort, Bancontact, BLIK, Giropay, EPS, Multibanco, MyBank, P24, and more.

### Setup

```javascript
braintree.localPayment
  .create({
    client: clientInstance,
    merchantAccountId: "EUR_merchant_account", // Required for multi-currency
  })
  .then(function (localPaymentInstance) {
    // Ready
  });
```

### Payment Flow (Popup)

```javascript
// MUST be called from click handler (popup blocker prevention)
payButton.addEventListener("click", function () {
  localPaymentInstance.startPayment(
    {
      paymentType: "ideal", // Required: payment method type
      amount: "10.00", // Required
      currencyCode: "EUR", // Required
      paymentTypeCountryCode: "NL", // Required for some methods
      email: "customer@example.com",
      givenName: "John",
      surname: "Doe",
      address: {
        streetAddress: "123 Main St",
        locality: "Amsterdam",
        postalCode: "1012",
        countryCode: "NL",
      },
      fallback: {
        url: "https://example.com/callback", // Redirect fallback URL
        buttonText: "Return to Merchant",
      },
      shippingAddressRequired: false,
    },
    function (err, payload) {
      if (err) {
        if (err.code === "LOCAL_PAYMENT_CANCELED") return;
        console.error(err);
        return;
      }
      // payload.nonce -- send to server
      submitNonceToServer(payload.nonce);
    }
  );
});
```

### Redirect Flow

For environments where popups are blocked:

```javascript
localPaymentInstance
  .startPayment({
    paymentType: "sofort",
    amount: "25.00",
    currencyCode: "EUR",
    paymentTypeCountryCode: "DE",
    fallback: {
      url: "https://example.com/local-payment-callback",
      buttonText: "Complete Payment",
    },
  })
  .then(function (payload) {
    // Redirected to bank, then back to fallback URL
    // On return page, tokenize using query params
  });

// On return page:
localPaymentInstance.tokenize({
  /* query params */
});
```

### Deferred Payment Types

Some methods (Multibanco, OXXO) return a reference for offline payment:

```javascript
// payload.details contains payment reference information
```

## SEPA Direct Debit

### Setup

```javascript
braintree.sepa
  .create({
    client: clientInstance,
  })
  .then(function (sepaInstance) {
    // Ready
  });
```

### Payment Flow

```javascript
payButton.addEventListener("click", function () {
  sepaInstance
    .tokenize({
      mandateType: "ONE_OFF", // or 'RECURRENT'
      customerBillingAddress: {
        streetAddress: "123 Hauptstrasse",
        locality: "Berlin",
        region: "BE",
        postalCode: "10115",
        countryCode: "DE",
      },
      customerInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        customerId: "customer-123",
      },
      iban: "DE89370400440532013000",
      merchantAccountId: "EUR_merchant_account",
    })
    .then(function (payload) {
      // payload.nonce -- send to server
      // payload.details.ibanLastFour
      // payload.details.mandateType
      submitNonceToServer(payload.nonce);
    });
});
```

## US Bank Account (ACH)

### Setup

```javascript
braintree.usBankAccount
  .create({
    client: clientInstance,
  })
  .then(function (usBankAccountInstance) {
    // Ready
  });
```

### Bank Login (Plaid)

```javascript
usBankAccountInstance
  .tokenize({
    bankLogin: {
      displayName: "My Store",
    },
    mandateText: "I authorize Braintree to debit my bank account.",
  })
  .then(function (payload) {
    // payload.nonce
    // payload.details.bankName, payload.details.accountType
  });
```

### Manual Entry

```javascript
usBankAccountInstance
  .tokenize({
    bankDetails: {
      accountNumber: "1000000000",
      routingNumber: "011000015",
      accountType: "checking", // or 'savings'
      ownershipType: "personal", // or 'business'
      firstName: "John",
      lastName: "Doe",
    },
    mandateText: "I authorize Braintree to debit my bank account.",
  })
  .then(function (payload) {
    // payload.nonce
  });
```

## Common Patterns

All alternative payment methods share these patterns:

1. **Frame Service architecture** -- popups/modals managed by Braintree's frame service
2. **Click handler requirement** -- `startPayment`/`tokenize` must be called from user interaction
3. **Nonce-based** -- all return a nonce to send to your server
4. **Merchant account** -- multi-currency setups require `merchantAccountId`

## Key Errors

| Code                                 | Type     | Fix                                     |
| ------------------------------------ | -------- | --------------------------------------- |
| `LOCAL_PAYMENT_NOT_ENABLED`          | MERCHANT | Enable Local Payment in control panel   |
| `LOCAL_PAYMENT_CANCELED`             | CUSTOMER | User cancelled, allow retry             |
| `LOCAL_PAYMENT_POPUP_OPEN_FAILED`    | MERCHANT | Call from click handler                 |
| `LOCAL_PAYMENT_START_PAYMENT_FAILED` | NETWORK  | Check network, retry                    |
| `SEPA_NOT_ENABLED`                   | MERCHANT | Enable SEPA in control panel            |
| `US_BANK_ACCOUNT_NOT_ENABLED`        | MERCHANT | Enable US Bank Account in control panel |
