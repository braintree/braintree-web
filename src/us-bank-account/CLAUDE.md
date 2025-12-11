# US Bank Account Component - CLAUDE.md

This file provides component-specific guidance for working with the US Bank Account component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The US Bank Account component enables ACH (Automated Clearing House) payments by collecting and tokenizing US bank account information. It supports two collection methods: **raw bank details** (routing/account numbers) and **bank login** (via Plaid integration).

**Key Features:**

- Raw bank account details tokenization (routing/account number)
- Bank login flow with Plaid integration
- ACH mandate text collection for authorization
- Personal and business account support
- Billing address collection
- GraphQL-based API

**Docs:** [Braintree ACH Direct Debit Guide](https://developer.paypal.com/braintree/docs/guides/ach)

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `us-bank-account.js` - Main USBankAccount class implementation
- `errors.js` - US Bank Account error codes (8 errors)
- `constants.js` - Component constants

**Note:** This is a simple component (4 files) with two distinct tokenization flows.

## How It Works

### Tokenization Flows

**Flow 1: Bank Details (Manual Entry)**

```
1. Customer Enters Bank Information
   (Routing number, account number, account type)
   ↓
2. Customer Provides Billing Address
   ↓
3. Customer Accepts Mandate Text
   ↓
4. tokenize({ bankDetails, mandateText })
   ↓
5. GraphQL Mutation (tokenizeUsBankAccount)
   ↓
6. Nonce Returned
```

**Flow 2: Bank Login (Plaid)**

```
1. Plaid Script Loaded
   ↓
2. tokenize({ bankLogin, mandateText })
   ↓
3. Plaid Modal Opens
   ↓
4. Customer Logs Into Bank
   ↓
5. Customer Selects Account
   ↓
6. Plaid Returns Public Token
   ↓
7. GraphQL Mutation (tokenizeUsBankLogin)
   ↓
8. Nonce Returned
```

## Prerequisites

**1. Braintree Setup:**

- US Bank Account enabled in Braintree control panel
- For bank login: Plaid integration configured

**2. ACH Mandate:**

- Required authorization text must be displayed to customer
- Customer must explicitly accept (e.g., checkbox)

**3. Billing Address:**

- Required for both flows
- Full address with street, city, region, postal code

## Basic Usage

### Tokenizing Bank Details (Manual Entry)

```javascript
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.usBankAccount.create({
      client: clientInstance,
    });
  })
  .then(function (usBankAccountInstance) {
    // Customer fills out form with bank details
    submitButton.addEventListener("click", function () {
      var bankDetails = {
        routingNumber: "307075259",
        accountNumber: "999999999",
        accountType: "checking", // or 'savings'
        ownershipType: "personal", // or 'business'
        firstName: "John", // Required for personal
        lastName: "Doe", // Required for personal
        billingAddress: {
          streetAddress: "123 Main St",
          locality: "Chicago",
          region: "IL",
          postalCode: "60606",
        },
      };

      usBankAccountInstance
        .tokenize({
          bankDetails: bankDetails,
          mandateText:
            "I authorize Braintree to debit my bank account on behalf of My Online Store.",
        })
        .then(function (payload) {
          // Send payload.nonce to server
          submitNonceToServer(payload.nonce);
        })
        .catch(function (err) {
          console.error("Tokenization failed:", err);
        });
    });
  });
```

### Tokenizing with Bank Login (Plaid)

```javascript
braintree.usBankAccount
  .create({
    client: clientInstance,
  })
  .then(function (usBankAccountInstance) {
    bankLoginButton.addEventListener("click", function () {
      var bankLogin = {
        displayName: "My Online Store",
        ownershipType: "personal",
        firstName: "John",
        lastName: "Doe",
        billingAddress: {
          streetAddress: "123 Main St",
          locality: "Chicago",
          region: "IL",
          postalCode: "60606",
        },
      };

      usBankAccountInstance
        .tokenize({
          bankLogin: bankLogin,
          mandateText:
            "I authorize Braintree to debit my bank account on behalf of My Online Store.",
        })
        .then(function (payload) {
          // Send payload.nonce to server
          submitNonceToServer(payload.nonce);
        })
        .catch(function (err) {
          if (err.code === "US_BANK_ACCOUNT_LOGIN_CLOSED") {
            console.log("Customer closed Plaid window");
          } else {
            console.error("Tokenization failed:", err);
          }
        });
    });
  });
```

## Configuration Options

### Creation Options

```javascript
braintree.usBankAccount.create({
  client: clientInstance, // Required (or authorization)
  authorization: "token", // Alternative to client
});
```

### Tokenization Options

**Required for All Flows:**

```javascript
{
  mandateText: "I authorize Braintree to debit my bank account..."; // Required authorization text
}
```

**Bank Details Flow:**

```javascript
{
  mandateText: 'authorization text',
  bankDetails: {
    routingNumber: '307075259',        // Required: 9-digit routing number
    accountNumber: '999999999',        // Required: Account number
    accountType: 'checking',           // Required: 'checking' or 'savings'
    ownershipType: 'personal',         // Required: 'personal' or 'business'

    // For personal accounts:
    firstName: 'John',                 // Required when ownershipType = 'personal'
    lastName: 'Doe',                   // Required when ownershipType = 'personal'

    // For business accounts:
    businessName: 'Acme Inc',          // Required when ownershipType = 'business'

    // Billing address (required):
    billingAddress: {
      streetAddress: '123 Main St',    // Required
      extendedAddress: 'Apt 4B',       // Optional
      locality: 'Chicago',             // Required (city)
      region: 'IL',                    // Required (state)
      postalCode: '60606'              // Required (ZIP code)
    }
  }
}
```

**Bank Login Flow:**

```javascript
{
  mandateText: 'authorization text',
  bankLogin: {
    displayName: 'My Store',           // Required: Shown in Plaid UI
    ownershipType: 'personal',         // Required: 'personal' or 'business'

    // For personal accounts:
    firstName: 'John',                 // Required when ownershipType = 'personal'
    lastName: 'Doe',                   // Required when ownershipType = 'personal'

    // For business accounts:
    businessName: 'Acme Inc',          // Required when ownershipType = 'business'

    // Billing address (required):
    billingAddress: {
      streetAddress: '123 Main St',    // Required
      extendedAddress: 'Apt 4B',       // Optional
      locality: 'Chicago',             // Required
      region: 'IL',                    // Required
      postalCode: '60606'              // Required
    }
  }
}
```

## Methods

### tokenize()

Tokenizes US bank account information via bank details or bank login.

**Signature:**

```javascript
usBankAccountInstance.tokenize(options, callback);
// OR
usBankAccountInstance.tokenize(options).then(function (payload) {
  // Use payload
});
```

**Parameters:**

- `options.mandateText` (string, required): ACH authorization text
- `options.bankDetails` (object, optional): Manual bank account entry
- `options.bankLogin` (object, optional): Plaid bank login flow
- **Note:** Must provide either `bankDetails` OR `bankLogin`, not both

**Returns:**

- `Promise<tokenizePayload>` - Tokenization result with nonce

**Payload Structure:**

```javascript
{
  nonce: 'tokenusbankacct_abc123',
  type: 'us_bank_account',
  details: {}  // Currently empty
}
```

**Examples:**

**Bank Details:**

```javascript
usBankAccountInstance
  .tokenize({
    mandateText:
      "I authorize Braintree to debit my bank account on behalf of My Store.",
    bankDetails: {
      routingNumber: "307075259",
      accountNumber: "999999999",
      accountType: "checking",
      ownershipType: "personal",
      firstName: "Jane",
      lastName: "Smith",
      billingAddress: {
        streetAddress: "456 Oak Ave",
        locality: "Austin",
        region: "TX",
        postalCode: "78701",
      },
    },
  })
  .then(function (payload) {
    console.log("Nonce:", payload.nonce);
    // Send to server
  });
```

**Bank Login:**

```javascript
usBankAccountInstance
  .tokenize({
    mandateText:
      "I authorize Braintree to debit my bank account on behalf of My Store.",
    bankLogin: {
      displayName: "My Store",
      ownershipType: "business",
      businessName: "My Store LLC",
      billingAddress: {
        streetAddress: "789 Business Pkwy",
        locality: "San Francisco",
        region: "CA",
        postalCode: "94103",
      },
    },
  })
  .then(function (payload) {
    console.log("Nonce:", payload.nonce);
    // Send to server
  })
  .catch(function (err) {
    if (err.code === "US_BANK_ACCOUNT_LOGIN_CLOSED") {
      console.log("User closed bank login window");
    }
  });
```

## ACH Mandate Text

### Requirements

The ACH mandate text **must**:

- Explicitly state authorization to debit the account
- Include merchant name
- Be displayed to the customer before tokenization
- Receive explicit customer acceptance (e.g., checkbox)

### Example Mandate Text

```
I authorize [Merchant Name] to electronically debit my account and, if necessary,
electronically credit my account to correct erroneous debits.
```

**Better Example:**

```javascript
var mandateText =
  "I authorize " +
  merchantName +
  " to debit my bank account on behalf of this purchase and future purchases." +
  " I understand that this authorization will remain in effect until I cancel it by " +
  "writing to " +
  merchantName +
  ".";
```

### UI Implementation

```html
<input type="checkbox" id="mandate-acceptance" required />
<label for="mandate-acceptance">
  I authorize My Store to debit my bank account on behalf of My Store.
</label>

<button id="submit" disabled>Submit Payment</button>

<script>
  document
    .getElementById("mandate-acceptance")
    .addEventListener("change", function (e) {
      document.getElementById("submit").disabled = !e.target.checked;
    });
</script>
```

## Plaid Integration

### Overview

The bank login flow uses [Plaid Link](https://plaid.com/docs/link/) to securely connect to customer bank accounts.

### How It Works

1. **Plaid Script Loading:**
   - SDK automatically loads `https://cdn.plaid.com/link/v2/stable/link-initialize.js`
   - Uses Plaid public key from Braintree gateway configuration

2. **Plaid Link Creation:**
   - `displayName` shown in Plaid UI
   - Environment: `production` or `sandbox` based on Braintree environment
   - Product: `auth` (bank account authentication)
   - `selectAccount: true` - Customer selects specific account

3. **Token Exchange:**
   - Plaid returns `publicToken` and `metadata`
   - SDK sends to Braintree for tokenization
   - Braintree exchanges for bank account nonce

### Plaid Configuration

**Braintree Setup:**

```
Braintree Control Panel → Settings → Processing → US Bank Account
Enable "Bank Login (Plaid)"
```

**Environment:**

- **Sandbox:** Uses Plaid sandbox environment with test credentials
- **Production:** Uses Plaid production with real bank connections

### Plaid Test Credentials (Sandbox)

When using Plaid in sandbox mode:

**Test Bank:** Select any bank from Plaid's test banks
**Username:** `user_good`
**Password:** `pass_good`
**MFA:** `1234` (if prompted)

## Error Handling

### Error Codes

From `errors.js`:

**Creation Errors:**

1. **`US_BANK_ACCOUNT_NOT_ENABLED`** (MERCHANT)
   - US Bank Account not enabled in Braintree control panel
   - Fix: Enable in Braintree settings

**Tokenization Errors:**

2. **`US_BANK_ACCOUNT_OPTION_REQUIRED`** (MERCHANT)
   - Missing required option
   - Common: Missing `mandateText`, `displayName`, or required field
   - Fix: Provide all required options

3. **`US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS`** (MERCHANT)
   - Provided both `bankDetails` and `bankLogin`
   - Fix: Use only one tokenization method per call

4. **`US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED`** (MERCHANT)
   - Bank login (Plaid) not enabled in Braintree control panel
   - Fix: Enable Plaid integration in Braintree settings

5. **`US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE`** (MERCHANT)
   - Called `tokenize()` with `bankLogin` while another request is active
   - Fix: Wait for previous tokenization to complete
   - Fix: Track tokenization state to prevent duplicate calls

**Bank Login Specific:**

6. **`US_BANK_ACCOUNT_LOGIN_LOAD_FAILED`** (NETWORK)
   - Plaid script failed to load
   - Fix: Check network connectivity
   - Fix: Verify Plaid CDN is accessible

7. **`US_BANK_ACCOUNT_LOGIN_CLOSED`** (CUSTOMER)
   - Customer closed Plaid window before completing
   - Handling: Allow customer to retry

**Network Errors:**

8. **`US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR`** (NETWORK)
   - Network error during tokenization
   - Fix: Check connectivity, retry

9. **`US_BANK_ACCOUNT_FAILED_TOKENIZATION`** (CUSTOMER)
   - Tokenization failed (invalid data)
   - Fix: Verify all data is correct
   - Fix: Check routing/account numbers are valid

## Testing

### Sandbox Testing

**Test Routing Numbers:**

- `011000015` - Federal Reserve Bank
- `011401533` - First Hawaiian Bank
- `307075259` - Braintree test routing number

**Test Account Numbers:**

- Any numeric string (e.g., `999999999`)

**Plaid Test Credentials:**

- Username: `user_good`
- Password: `pass_good`
- MFA Code: `1234`

### Unit Tests

Location: `test/us-bank-account/unit/`

**Test Categories:**

- Component creation
- Bank details tokenization
- Bank login tokenization
- Plaid integration
- Error scenarios
- Validation

## Debugging

### Common Issues

**1. "US bank account is not enabled"**

**Symptoms:**

- `US_BANK_ACCOUNT_NOT_ENABLED` on creation

**Fix:**

```
Braintree Control Panel → Settings → Processing
Enable "US Bank Account"
```

**2. "Bank login is not enabled"**

**Symptoms:**

- `US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED` when using bank login

**Fix:**

```
Braintree Control Panel → Settings → Processing → US Bank Account
Enable "Bank Login (Plaid)"
```

**3. "Plaid window doesn't open"**

**Symptoms:**

- No Plaid modal appears
- `US_BANK_ACCOUNT_LOGIN_LOAD_FAILED`

**Debug:**

1. Check browser console for script loading errors
2. Verify Plaid CDN is accessible
3. Check for popup blockers
4. Ensure HTTPS (Plaid requires secure context)

**4. "Invalid routing number"**

**Symptoms:**

- Tokenization fails with validation error

**Debug:**

1. Verify routing number is exactly 9 digits
2. Use valid routing number (checksums validated)
3. Test with known routing numbers

**5. "Customer closed window"**

**Symptoms:**

- `US_BANK_ACCOUNT_LOGIN_CLOSED` error

**Handling:**

```javascript
usBankAccountInstance
  .tokenize({ bankLogin, mandateText })
  .catch(function (err) {
    if (err.code === "US_BANK_ACCOUNT_LOGIN_CLOSED") {
      // Customer canceled - allow retry
      showRetryButton();
    } else {
      // Other error - show error message
      showErrorMessage(err.message);
    }
  });
```

**6. "Multiple requests active"**

**Symptoms:**

- `US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE`

**Fix:**

```javascript
var isTokenizing = false;

button.addEventListener("click", function () {
  if (isTokenizing) {
    return; // Prevent duplicate requests
  }

  isTokenizing = true;

  usBankAccountInstance
    .tokenize({ bankLogin, mandateText })
    .then(function (payload) {
      isTokenizing = false;
      // Handle success
    })
    .catch(function (err) {
      isTokenizing = false;
      // Handle error
    });
});
```

## Implementation Examples

### Complete Bank Details Form

```javascript
var form = document.getElementById("bank-account-form");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  var ownershipType = document.querySelector(
    'input[name="ownership"]:checked'
  ).value;
  var bankDetails = {
    routingNumber: document.getElementById("routing-number").value,
    accountNumber: document.getElementById("account-number").value,
    accountType: document.querySelector('input[name="account-type"]:checked')
      .value,
    ownershipType: ownershipType,
    billingAddress: {
      streetAddress: document.getElementById("street").value,
      extendedAddress: document.getElementById("unit").value,
      locality: document.getElementById("city").value,
      region: document.getElementById("state").value,
      postalCode: document.getElementById("zip").value,
    },
  };

  if (ownershipType === "personal") {
    bankDetails.firstName = document.getElementById("first-name").value;
    bankDetails.lastName = document.getElementById("last-name").value;
  } else {
    bankDetails.businessName = document.getElementById("business-name").value;
  }

  usBankAccountInstance
    .tokenize({
      bankDetails: bankDetails,
      mandateText:
        "I authorize Braintree to debit my bank account on behalf of My Store.",
    })
    .then(function (payload) {
      // Send to server
      return fetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce: payload.nonce,
          deviceData: dataCollectorInstance.deviceData,
        }),
      });
    })
    .then(function (response) {
      if (response.ok) {
        window.location.href = "/success";
      }
    })
    .catch(function (err) {
      document.getElementById("error").textContent = err.message;
    });
});
```

### Bank Login with Error Handling

```javascript
bankLoginButton.addEventListener("click", function () {
  var ownershipType = document.querySelector(
    'input[name="ownership"]:checked'
  ).value;
  var bankLogin = {
    displayName: "My Online Store",
    ownershipType: ownershipType,
    billingAddress: {
      streetAddress: document.getElementById("street").value,
      locality: document.getElementById("city").value,
      region: document.getElementById("state").value,
      postalCode: document.getElementById("zip").value,
    },
  };

  if (ownershipType === "personal") {
    bankLogin.firstName = document.getElementById("first-name").value;
    bankLogin.lastName = document.getElementById("last-name").value;
  } else {
    bankLogin.businessName = document.getElementById("business-name").value;
  }

  usBankAccountInstance
    .tokenize({
      bankLogin: bankLogin,
      mandateText:
        "I authorize Braintree to debit my bank account on behalf of My Store.",
    })
    .then(function (payload) {
      return submitToServer(payload.nonce);
    })
    .catch(function (err) {
      switch (err.code) {
        case "US_BANK_ACCOUNT_LOGIN_CLOSED":
          // Customer closed Plaid window - show retry option
          showRetryMessage("Bank login was canceled. Please try again.");
          break;
        case "US_BANK_ACCOUNT_LOGIN_LOAD_FAILED":
          // Plaid failed to load - technical issue
          showErrorMessage(
            "Unable to load bank login. Please try again or enter your bank details manually."
          );
          break;
        case "US_BANK_ACCOUNT_OPTION_REQUIRED":
          // Missing required field
          showErrorMessage("Please fill in all required fields.");
          break;
        default:
          showErrorMessage("An error occurred. Please try again.");
      }
    });
});
```

### Switching Between Bank Details and Bank Login

```javascript
var showBankDetailsForm = document.getElementById("show-bank-details");
var showBankLoginButton = document.getElementById("show-bank-login");
var bankDetailsForm = document.getElementById("bank-details-form");
var bankLoginForm = document.getElementById("bank-login-form");

showBankDetailsForm.addEventListener("click", function () {
  bankDetailsForm.style.display = "block";
  bankLoginForm.style.display = "none";
});

showBankLoginButton.addEventListener("click", function () {
  bankDetailsForm.style.display = "none";
  bankLoginForm.style.display = "block";
});

// Bank details submission
document
  .getElementById("submit-bank-details")
  .addEventListener("click", function () {
    // ... tokenize with bankDetails
  });

// Bank login submission
document
  .getElementById("submit-bank-login")
  .addEventListener("click", function () {
    // ... tokenize with bankLogin
  });
```

## Server-Side Usage

**Client-side:**

```javascript
usBankAccountInstance
  .tokenize({ bankDetails, mandateText })
  .then(function (payload) {
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
      options: {
        submitForSettlement: true,
      },
    },
    function (err, result) {
      if (result.success) {
        res.send({ success: true });
      } else {
        res.status(500).send({ error: result.message });
      }
    }
  );
});
```

## Compliance Notes

**NACHA Rules:**

- ACH mandate text must be clear and explicit
- Customer authorization must be obtained before debiting
- Mandate must be stored and available for audit

**PCI Compliance:**

- Bank account numbers are sensitive data
- Use tokenization to avoid storing raw account numbers
- Follow PCI-DSS requirements if storing any account data
