# Payment Ready Component - CLAUDE.md

This file provides component-specific guidance for working with the Payment Ready component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Payment Ready component provides integration with Braintree's Payment Ready API, which allows merchants to create customer sessions with hashed customer data for personalized payment experiences.

**Status:** Active

**Key Features:**

- Create customer sessions with hashed email/phone
- Device fingerprinting integration
- PayPal and Venmo app detection
- Session-based customer identification
- GraphQL API integration

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `payment-ready.js` - Main PaymentReady class (1 public method)
- `errors.js` - Payment Ready error codes
- `constants.js` - Constants and GraphQL queries

## How It Works

### Payment Ready Flow

```
1. Create Payment Ready Instance
   ↓
2. Collect Customer Data
   (hash email/phone)
   ↓
3. Create Customer Session
   (createCustomerSession)
   ↓
4. Receive Session ID
   ↓
5. Use Session for Personalization
```

## Basic Usage

### Complete Implementation

```javascript
var paymentReady = require("braintree-web/payment-ready");

// 1. Create client
braintree.client.create(
  {
    authorization: CLIENT_AUTHORIZATION,
  },
  function (clientErr, clientInstance) {
    if (clientErr) {
      console.error(clientErr);
      return;
    }

    // 2. Create Payment Ready instance
    paymentReady.create(
      {
        client: clientInstance,
      },
      function (createErr, paymentReadyInstance) {
        if (createErr) {
          console.error(createErr);
          return;
        }

        // 3. Hash customer data (server-side recommended)
        var hashedEmail = hashEmail("customer@example.com"); // SHA-256 hex
        var hashedPhone = hashPhone("+12345551234"); // SHA-256 hex

        // 4. Create customer session
        paymentReadyInstance
          .createCustomerSession({
            customer: {
              hashedEmail: hashedEmail,
              hashedPhoneNumber: hashedPhone,
              paypalAppInstalled: false,
              venmoAppInstalled: true,
              userAgent: navigator.userAgent,
            },
          })
          .then(function (sessionData) {
            console.log("Session ID:", sessionData.sessionId);
            // Use session for personalization
          })
          .catch(function (err) {
            console.error("Error creating session:", err);
          });
      }
    );
  }
);
```

## Configuration Options

### Creation Options

```javascript
paymentReady.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
  redirectUrl: "https://...", // Optional: redirect URL for full-page flows
});
```

## Methods

### createCustomerSession()

Creates a customer session using hashed customer data.

**Signature:**

```javascript
paymentReadyInstance.createCustomerSession(options, callback);
// OR
paymentReadyInstance
  .createCustomerSession(options)
  .then(function (sessionData) {
    // Use sessionData
  });
```

**Parameters:**

- `options.customer` (object, required): Customer data object
- `options.customer.hashedEmail` (string, optional): SHA-256 hex of sanitized email
- `options.customer.hashedPhoneNumber` (string, optional): SHA-256 hex of E.164 phone
- `options.customer.deviceFingerprintId` (string, optional): Device identifier
- `options.customer.paypalAppInstalled` (boolean, optional): PayPal app detection
- `options.customer.venmoAppInstalled` (boolean, optional): Venmo app detection
- `options.customer.userAgent` (string, optional): Browser user agent
- `options.sessionId` (string, optional): Custom session ID (36-100 chars, `[A-Za-z0-9-_.]+`)

**Note:** At minimum, provide either `hashedEmail` or `hashedPhoneNumber`.

**Returns:**

- `Promise<sessionData>`

**Session Data Structure:**

```javascript
{
  sessionId: 'session_abc123xyz',
  // Additional session data
}
```

**Email Hashing (server-side):**

```javascript
// Pseudocode - implement server-side
function hashEmail(email) {
  // 1. Convert to lowercase
  var sanitized = email.toLowerCase();
  // 2. Trim whitespace
  sanitized = sanitized.trim();
  // 3. SHA-256 hash
  var hash = sha256(sanitized);
  // 4. Return hex-encoded
  return hash.toString("hex");
}

// Example:
// Input: 'Customer@Example.COM  '
// Sanitized: 'customer@example.com'
// Hash: 'abc123...' (hex)
```

**Phone Hashing (server-side):**

```javascript
// Pseudocode - implement server-side
function hashPhone(phone) {
  // Phone must be in E.164 format
  // E.164: +[country][area][subscriber]
  // Example: '+12345551234'

  // 1. Ensure E.164 format
  var e164 = toE164(phone);
  // 2. SHA-256 hash
  var hash = sha256(e164);
  // 3. Return hex-encoded
  return hash.toString("hex");
}

// Examples:
// US: '+12345551234'
// AU: '+6129876543'
```

**Example:**

```javascript
paymentReadyInstance
  .createCustomerSession({
    customer: {
      hashedEmail:
        "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
      hashedPhoneNumber:
        "b3a8e0e1f9ab1bfe3a36f231f676f78bb30a519d2b21e6c530c0eee8ebb4a5d0",
      paypalAppInstalled: isPayPalAppInstalled(),
      venmoAppInstalled: isVenmoAppInstalled(),
      userAgent: navigator.userAgent,
    },
    sessionId: "my-custom-session-id-12345", // Optional
  })
  .then(function (sessionData) {
    console.log("Session created:", sessionData.sessionId);
    // Store or use session ID
  })
  .catch(function (err) {
    console.error("Failed to create session:", err);
  });
```

## Error Handling

### Error Codes

**`PAYMENT_READY_MISSING_REQUIRED_OPTION`** (MERCHANT)

- Missing required customer data
- Fix: Provide at least `hashedEmail` or `hashedPhoneNumber`

**Session ID Errors:**

- Invalid session ID format
- Previously used session ID
- Fix: Use unique session IDs matching regex `[A-Za-z0-9-_.]+`

## Testing

## Debugging

### Common Issues

**1. "Missing required option"**

- Provide `hashedEmail` or `hashedPhoneNumber` in customer object

**2. "Invalid hash format"**

- Ensure SHA-256 hash is hex-encoded lowercase string
- Sanitize data before hashing (lowercase, trim)

**3. "Invalid E.164 phone format"**

- Phone must include country code with + prefix
- Example: `+12345551234` not `(234) 555-1234`

## Important Notes

### Data Privacy

**Critical Security Considerations:**

- **NEVER hash customer data client-side**
- Implement hashing on your server
- Use SHA-256 algorithm
- Return only hashed values to client

### Email Sanitization

Before hashing emails:

1. Convert to lowercase
2. Remove leading/trailing whitespace
3. Use resulting string for hashing

### Phone Number Format

- Must be E.164 format
- Include country code
- No spaces, dashes, or parentheses
- Example: `+12345551234`

### Browser Support

- All modern browsers
- Requires JavaScript enabled
- GraphQL API access required
