# UnionPay Component - CLAUDE.md

This file provides component-specific guidance for working with the UnionPay component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The UnionPay component enables processing of **UnionPay cards** (China UnionPay / 中国银联), the dominant card payment network in China. UnionPay cards may require an SMS enrollment process before tokenization.

**Status:** Beta - subject to change

**Key Features:**

- Check card capabilities (determines if SMS enrollment required)
- SMS-based enrollment flow for specific cards
- Card tokenization
- Works with Hosted Fields or raw card data
- Support for debit and credit UnionPay cards

**Docs:** [Braintree UnionPay Guide](https://developer.paypal.com/braintree/docs/guides/unionpay)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `shared/unionpay.js` - Main UnionPay class (3 public methods)
- `shared/errors.js` - UnionPay error codes (11 errors)
- `shared/constants.js` - Constants and event names

**Note:** This component uses iframes and framebus for Hosted Fields integration.

## How It Works

### UnionPay Flow

```
1. Create UnionPay Instance
   ↓
2. Fetch Card Capabilities
   (fetchCapabilities)
   ↓
3. Check if SMS Required
   ↓
4a. If SMS Required:
    - Enroll Card (enroll)
    - Customer receives SMS
    - Tokenize with SMS code
    ↓
4b. If No SMS:
    - Tokenize immediately
    ↓
5. Receive Nonce
   ↓
6. Send to Server
```

### Prerequisites

**1. Braintree Setup:**

- UnionPay enabled in Braintree control panel
- Merchant account configured for UnionPay processing

**2. Customer Requirements:**

- UnionPay card (issued by China UnionPay)
- Mobile phone (if SMS enrollment required)
- Ability to receive SMS (for some cards)

## Basic Usage

### Complete Implementation

```javascript
var unionpay = require("braintree-web/unionpay");
var hostedFields = require("braintree-web/hosted-fields");

// 1. Create client and components
Promise.all([
  braintree.client.create({ authorization: CLIENT_AUTHORIZATION }),
  hostedFields.create({
    /* config */
  }),
])
  .then(function (instances) {
    var clientInstance = instances[0];
    var hostedFieldsInstance = instances[1];

    // 2. Create UnionPay instance
    return unionpay
      .create({
        client: clientInstance,
      })
      .then(function (unionpayInstance) {
        return {
          unionpay: unionpayInstance,
          hostedFields: hostedFieldsInstance,
        };
      });
  })
  .then(function (instances) {
    var unionpayInstance = instances.unionpay;
    var hostedFieldsInstance = instances.hostedFields;

    // 3. On submit
    document
      .getElementById("submit-btn")
      .addEventListener("click", function () {
        // 4. Fetch capabilities
        unionpayInstance
          .fetchCapabilities({
            hostedFields: hostedFieldsInstance,
          })
          .then(function (payload) {
            if (!payload.isUnionPay) {
              // Not a UnionPay card, use regular tokenization
              return hostedFieldsInstance.tokenize();
            }

            if (!payload.unionPay.isSupported) {
              // Card not supported by Braintree
              throw new Error("This UnionPay card is not supported");
            }

            // 5. Check if enrollment needed
            return unionpayInstance
              .enroll({
                hostedFields: hostedFieldsInstance,
                mobile: {
                  countryCode: "86",
                  number: "13800000000",
                },
              })
              .then(function (enrollPayload) {
                if (enrollPayload.smsCodeRequired) {
                  // 6a. SMS required - show SMS input
                  return promptForSmsCode().then(function (smsCode) {
                    return unionpayInstance.tokenize({
                      hostedFields: hostedFieldsInstance,
                      enrollmentId: enrollPayload.enrollmentId,
                      smsCode: smsCode,
                    });
                  });
                } else {
                  // 6b. No SMS - tokenize immediately
                  return unionpayInstance.tokenize({
                    hostedFields: hostedFieldsInstance,
                    enrollmentId: enrollPayload.enrollmentId,
                  });
                }
              });
          })
          .then(function (tokenizePayload) {
            // 7. Send nonce to server
            console.log("Nonce:", tokenizePayload.nonce);
            submitPayment(tokenizePayload.nonce);
          });
      });
  });
```

## Configuration Options

### Creation Options

```javascript
unionpay.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
});
```

## Methods

### fetchCapabilities()

Determines if a card is a UnionPay card and whether SMS enrollment is required.

**Signature:**

```javascript
unionpayInstance.fetchCapabilities(options, callback);
// OR
unionpayInstance.fetchCapabilities(options).then(function (payload) {
  // Use payload
});
```

**Parameters:**

- `options.card` (object, optional): Card object with `number` property
- `options.card.number` (string): Card number
- `options.hostedFields` (HostedFields, optional): Hosted Fields instance
- **Note:** Provide either `card` or `hostedFields`, not both

**Returns:**

- `Promise<fetchCapabilitiesPayload>`

**Payload Structure:**

```javascript
{
  isUnionPay: true,
  isDebit: false,
  unionPay: {
    isSupported: true,
    supportsTwoStepAuthAndCapture: false
  }
}
```

**Example:**

```javascript
// With card number
unionpayInstance
  .fetchCapabilities({
    card: {
      number: "6212345678901234",
    },
  })
  .then(function (payload) {
    if (payload.isUnionPay && payload.unionPay.isSupported) {
      console.log("Valid UnionPay card");
    }
  });

// With Hosted Fields
unionpayInstance
  .fetchCapabilities({
    hostedFields: hostedFieldsInstance,
  })
  .then(function (payload) {
    console.log("Is UnionPay:", payload.isUnionPay);
  });
```

### enroll()

Enrolls a UnionPay card. Required before tokenization.

**Signature:**

```javascript
unionpayInstance.enroll(options, callback);
// OR
unionpayInstance.enroll(options).then(function (payload) {
  // Use payload
});
```

**Parameters:**

- `options.card` (object, optional): Card details
- `options.card.number` (string): Card number
- `options.card.expirationDate` (string): Expiration (MM/YY or MM/YYYY)
- `options.card.expirationMonth` (string): Expiration month
- `options.card.expirationYear` (string): Expiration year
- `options.hostedFields` (HostedFields, optional): Hosted Fields instance
- `options.mobile` (object, required): Mobile phone information
- `options.mobile.countryCode` (string, required): Country code (e.g., '86' for China)
- `options.mobile.number` (string, required): Mobile number

**Returns:**

- `Promise<enrollPayload>`

**Payload Structure:**

```javascript
{
  enrollmentId: 'enrollment_abc123',
  smsCodeRequired: true  // or false
}
```

**Example:**

```javascript
unionpayInstance
  .enroll({
    hostedFields: hostedFieldsInstance,
    mobile: {
      countryCode: "86",
      number: "13800138000",
    },
  })
  .then(function (payload) {
    console.log("Enrollment ID:", payload.enrollmentId);

    if (payload.smsCodeRequired) {
      // Show SMS code input field
      showSmsCodeField();
    } else {
      // Can tokenize immediately
      tokenizeCard(payload.enrollmentId);
    }
  });
```

### tokenize()

Tokenizes an enrolled UnionPay card.

**Signature:**

```javascript
unionpayInstance.tokenize(options, callback);
// OR
unionpayInstance.tokenize(options).then(function (payload) {
  // Use payload
});
```

**Parameters:**

- `options.card` (object, optional): Card details
- `options.hostedFields` (HostedFields, optional): Hosted Fields instance
- `options.enrollmentId` (string, required): Enrollment ID from enroll()
- `options.smsCode` (string, optional): SMS code if required

**Returns:**

- `Promise<tokenizePayload>`

**Payload Structure:**

```javascript
{
  nonce: 'tokencc_abc_123',
  type: 'CreditCard',
  description: 'ending in 34',
  details: {
    bin: '621234',
    cardType: 'UnionPay',
    lastFour: '1234',
    lastTwo: '34'
  }
}
```

**Example:**

```javascript
// With SMS code
unionpayInstance
  .tokenize({
    hostedFields: hostedFieldsInstance,
    enrollmentId: enrollmentId,
    smsCode: "123456",
  })
  .then(function (payload) {
    console.log("Nonce:", payload.nonce);
    submitToServer(payload.nonce);
  });

// Without SMS code
unionpayInstance
  .tokenize({
    hostedFields: hostedFieldsInstance,
    enrollmentId: enrollmentId,
  })
  .then(function (payload) {
    submitToServer(payload.nonce);
  });
```

### teardown()

Tears down the UnionPay instance.

**Signature:**

```javascript
unionpayInstance.teardown(callback);
// OR
unionpayInstance.teardown().then(function () {
  // Teardown complete
});
```

## Error Handling

### Error Codes

From `shared/errors.js`:

**Creation:**

1. **`UNIONPAY_NOT_ENABLED`** (MERCHANT) - UnionPay not enabled in control panel

**Configuration:** 2. **`UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES`** (MERCHANT) - Provided both card and Hosted Fields 3. **`UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED`** (MERCHANT) - Provided neither 4. **`UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID`** (MERCHANT) - Invalid Hosted Fields instance 5. **`UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED`** (MERCHANT) - Hosted Fields not found

**Enrollment:** 6. **`UNIONPAY_MISSING_MOBILE_PHONE_DATA`** (MERCHANT) - Missing mobile phone data 7. **`UNIONPAY_EXPIRATION_DATE_INCOMPLETE`** (MERCHANT) - Incomplete expiration 8. **`UNIONPAY_ENROLLMENT_CUSTOMER_INPUT_INVALID`** (CUSTOMER) - Invalid customer input 9. **`UNIONPAY_ENROLLMENT_NETWORK_ERROR`** (NETWORK) - Network error during enrollment

**Fetching/Tokenization:** 10. **`UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR`** (NETWORK) - Cannot fetch capabilities 11. **`UNIONPAY_FAILED_TOKENIZATION`** (CUSTOMER) - Tokenization failed 12. **`UNIONPAY_TOKENIZATION_NETWORK_ERROR`** (NETWORK) - Network error

## Testing

## Important Notes

### Target Market

- Primarily for merchants serving Chinese customers
- UnionPay is the dominant card network in China
- May require special merchant account configuration

### SMS Enrollment

- Some cards require SMS verification
- Customer must have access to mobile phone
- SMS delivery may take time
- Handle SMS input validation

### Browser Support

- All modern browsers
- Mobile browsers supported
- Consider mobile-optimized SMS input for mobile users
