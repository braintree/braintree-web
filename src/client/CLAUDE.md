# Client Component - CLAUDE.md

This file provides component-specific guidance for working with the Client component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Client component is the foundational API layer for all Braintree Web SDK components. It provides:

- Communication with Braintree Gateway APIs (REST and GraphQL)
- Authorization management (client tokens and tokenization keys)
- Configuration retrieval and caching
- Request/response handling
- Error management

**Every other component depends on Client** - understanding it is essential for SDK development.

## Component Structure

### Directory Organization

- `client.js` - Main Client class with public API
- `index.js` - Component entry point with create() function
- `get-configuration.js` - Configuration fetching and caching
- `constants.js` - Client constants (BRAINTREE_VERSION, etc.)
- `errors.js` - Client-specific error codes

- `request/` - Request handling subsystem
  - `index.js` - Request dispatcher
  - `default-request.js` - Default request implementation
  - `ajax-driver.js` - Low-level XHR driver
  - `xhr.js` - XMLHttpRequest wrapper
  - `prep-body.js` - Request body preparation
  - `parse-body.js` - Response body parsing
  - `get-user-agent.js` - User agent string generation
  - `graphql/` - GraphQL integration
    - `index.js` - GraphQL client
    - `request.js` - GraphQL request handler
    - `generators/` - GraphQL query builders
      - `configuration.js` - Config query generator
      - `credit-card-tokenization.js` - Card tokenization query
      - `credit-card-for-fastlane-tokenization.js` - Fastlane tokenization query
    - `adapters/` - Response adapters
      - `configuration.js` - Config response adapter
      - `credit-card-tokenization.js` - Card response adapter
      - `credit-card-tokenization-fastlane.js` - Fastlane response adapter
      - `error.js` - GraphQL error adapter

## Client Architecture

### Client Lifecycle

```
1. Authorization Provided
   ↓
2. create() Called
   ↓
3. Gateway Configuration Fetched
   ↓
4. Client Instance Created
   ↓
5. Components Use Client for API Calls
```

### Client Instance

**Creation:**

```javascript
braintree.client.create(
  {
    authorization: "tokenization_key_or_client_token",
  },
  function (err, clientInstance) {
    // clientInstance is ready
  }
);
```

**What Happens:**

1. Parse authorization (tokenization key or client token)
2. Fetch gateway configuration from Braintree API
3. Validate configuration domains
4. Initialize GraphQL client (if enabled)
5. Cache client instance
6. Return client instance

### Client Caching

**Purpose:** Avoid redundant configuration fetches

**Implementation:**

```javascript
// From client.js
var cachedClients = {};

// Clients are cached by fingerprint of configuration
// Multiple components can share the same client instance
```

**Key:** Configuration JSON fingerprint
**Benefit:** Faster component initialization

## Authorization

### Types

**1. Tokenization Key**

- Public key safe for client-side use
- Limited permissions (tokenization only)
- Format: `production_xxxxx_yyyyyy` or `sandbox_xxxxx_yyyyyy`
- Created in Braintree Control Panel

**2. Client Token**

- Generated server-side
- Can include customer-specific configuration
- More permissions than tokenization key
- Expires (typically after 24 hours)
- Required for some features (3D Secure, vaulted payments)

### Authorization Parsing

From `../lib/create-authorization-data.js`:

```javascript
// Tokenization key format
if (authorization.indexOf("_") > 0) {
  // Parse as tokenization key
  // Extract environment and merchant ID
}

// Client token format (base64 JSON)
else {
  // Decode base64
  // Parse JSON
  // Extract configuration URL
}
```

### Domain Verification

**Security Feature:** Client validates that all gateway URLs are on verified Braintree domains

```javascript
// From client.js
["assetsUrl", "clientApiUrl", "configUrl"].forEach(function (property) {
  if (!isVerifiedDomain(gatewayConfiguration[property])) {
    throw new BraintreeError({
      type: "MERCHANT",
      code: "CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN",
      message: property + " property is on an invalid domain.",
    });
  }
});
```

**Verified Domains:**

- `*.braintreegateway.com`
- `*.paypal.com`
- Localhost (development only)

## Request System

### Request Architecture

```
Component Request
    ↓
client.request()
    ↓
GraphQL Check (if enabled)
    ├─ Yes → GraphQL Request
    └─ No → REST Request
        ↓
    Ajax Driver (XHR)
        ↓
    Parse Response
        ↓
    Return to Component
```

### REST API Requests

**Method:** `client.request(options, callback)`

**Example:**

```javascript
clientInstance.request(
  {
    endpoint: "payment_methods/credit_cards",
    method: "post",
    data: {
      creditCard: {
        number: "4111111111111111",
        expirationDate: "12/25",
      },
    },
  },
  function (err, response) {
    // Handle response
  }
);
```

**Options:**

- `endpoint` (required): API endpoint path
- `method` (required): HTTP method (GET, POST, etc.)
- `data`: Request body data
- `timeout`: Request timeout in ms (default: 60000)

**Base URL:**

```javascript
// From client.js
this._clientApiBaseUrl = gatewayConfiguration.clientApiUrl + "/v1/";

// Full URL: https://api.braintreegateway.com/merchants/xxx/client_api/v1/{endpoint}
```

### GraphQL Requests

**When Used:**
GraphQL is used automatically when:

1. Gateway configuration includes GraphQL URL
2. Endpoint is in enabled features list
3. Request doesn't contain disallowed inputs

**Enabled Features:**

```javascript
// From request/graphql/index.js
var features = {
  tokenize_credit_cards: "payment_methods/credit_cards",
  configuration: "configuration",
};
```

**Disallowed Inputs:**

```javascript
// GraphQL not used if request contains:
var disallowedInputPaths = [
  "creditCard.options.unionPayEnrollment", // UnionPay requires REST
];
```

**GraphQL Detection:**

```javascript
// From GraphQL.prototype.isGraphQLRequest
1. Check if GraphQL enabled in config
2. Extract endpoint path from URL
3. Check if endpoint in enabled features
4. Check if request body contains disallowed keys
5. Return true if all checks pass
```

### GraphQL Query Generators

**Purpose:** Build GraphQL mutations/queries from REST-style data

**Location:** `request/graphql/generators/`

**Credit Card Tokenization Generator:**

```javascript
// From generators/credit-card-tokenization.js

// Input: REST-style data
{
  creditCard: {
    number: '4111111111111111',
    expirationDate: '12/25',
    cvv: '123'
  }
}

// Output: GraphQL mutation
mutation TokenizeCreditCard($input: TokenizeCreditCardInput!) {
  tokenizeCreditCard(input: $input) {
    paymentMethod {
      id
      details {
        bin
        last4
        cardType
      }
    }
  }
}
```

**Configuration Generator:**

```javascript
// Generates query for gateway configuration
query ClientConfiguration {
  clientConfiguration {
    analyticsUrl
    environment
    merchantId
    // ... all config fields
  }
}
```

### GraphQL Response Adapters

**Purpose:** Transform GraphQL responses to match REST API format

**Location:** `request/graphql/adapters/`

**Credit Card Adapter:**

```javascript
// From adapters/credit-card-tokenization.js

// GraphQL Response:
{
  data: {
    tokenizeCreditCard: {
      paymentMethod: {
        id: 'nonce_abc',
        details: { bin: '411111', last4: '1111' }
      }
    }
  }
}

// Adapted to REST format:
{
  creditCards: [{
    nonce: 'nonce_abc',
    details: {
      bin: '411111',
      lastFour: '1111',  // Note: lastFour vs last4
      lastTwo: '11'
    },
    type: 'CreditCard'
  }]
}
```

**Error Adapter:**

```javascript
// From adapters/error.js

// Transforms GraphQL errors to BraintreeError format
// Handles validation errors, network errors, etc.
```

### Ajax Driver

**Low-Level HTTP:**

```javascript
// From request/ajax-driver.js

// Uses XMLHttpRequest for all HTTP
// Handles:
// - Timeout management
// - Progress events
// - Error handling
// - CORS
```

**Default Options:**

```javascript
// From request/index.js
options.method = (options.method || "GET").toUpperCase();
options.timeout = options.timeout == null ? 60000 : options.timeout; // 1 minute
options.data = options.data || {};
```

## Configuration Management

### Gateway Configuration

**What It Contains:**

- Environment (production/sandbox)
- API URLs (clientApiUrl, assetsUrl, configUrl)
- Enabled features (PayPal, Venmo, 3DS, etc.)
- Component-specific configuration
- Analytics configuration
- GraphQL configuration (if enabled)

**Fetching:**

```javascript
// From get-configuration.js

// For Tokenization Key:
GET https://api.braintreegateway.com/merchants/{merchantId}/client_api/v1/configuration

// For Client Token:
GET {configUrl from decoded token}
```

**Caching:**
Configuration is cached per authorization to avoid repeated fetches.

**Accessing:**

```javascript
var config = clientInstance.getConfiguration();

// Returns full configuration object:
{
  client: {
    authorization: '...'
  },
  gatewayConfiguration: {
    environment: 'production',
    clientApiUrl: '...',
    // ... all gateway config
  },
  analyticsMetadata: {
    sessionId: '...',
    sdkVersion: '3.x.x',
    merchantAppId: '...'
  }
}
```

### Analytics Metadata

**Automatically Included:**

```javascript
{
  sessionId: '<unique-session-id>',  // Per page load
  sdkVersion: '3.x.x',  // braintree-web version
  merchantAppId: '<domain>',  // Merchant's domain
  platform: 'web',
  platformVersion: '<browser-version>'
}
```

**Usage:**
Components use this for analytics events and fraud detection.

## Error Handling

### Error Types

From `errors.js`:

**Creation Errors:**

1. **`CLIENT_INVALID_AUTHORIZATION`** (MERCHANT)
   - Authorization cannot be parsed
   - Invalid tokenization key or client token format
   - Fix: Check authorization string is valid

2. **`CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN`** (MERCHANT)
   - Configuration URL is not on verified Braintree domain
   - Security protection against domain hijacking
   - Fix: Contact Braintree support (should never happen)

3. **`CLIENT_MISSING_GATEWAY_CONFIGURATION`** (INTERNAL)
   - Configuration not provided to Client constructor
   - Should never happen in normal use
   - Fix: Internal SDK bug, report to Braintree

**Request Errors:**

1. **`CLIENT_OPTION_REQUIRED`** (MERCHANT)
   - Required option missing from request call
   - Usually `method` or `endpoint`
   - Fix: Provide required option

2. **`CLIENT_OPTION_INVALID`** (MERCHANT)
   - Invalid option value provided
   - Fix: Check option format/value

3. **`CLIENT_GATEWAY_NETWORK`** (NETWORK)
   - Cannot contact Braintree gateway
   - Network connectivity issue
   - Fix: Check internet connection, retry

4. **`CLIENT_REQUEST_TIMEOUT`** (NETWORK)
   - Request took longer than timeout (default 60s)
   - Fix: Retry, check network speed

5. **`CLIENT_REQUEST_ERROR`** (NETWORK)
   - HTTP status 400+ received
   - Server rejected request
   - Fix: Check request data, view details in error object

6. **`CLIENT_GRAPHQL_REQUEST_ERROR`** (NETWORK)
   - GraphQL request returned errors
   - Fix: Check error.details for GraphQL errors

7. **`CLIENT_RATE_LIMITED`** (MERCHANT)
   - HTTP 429 received
   - Too many requests in short time
   - Fix: Implement exponential backoff, reduce request rate

8. **`CLIENT_AUTHORIZATION_INSUFFICIENT`** (MERCHANT)
   - Authorization lacks required permissions
   - Tokenization key used where client token required
   - Fix: Use client token with sufficient privileges

9. **`CLIENT_AUTHORIZATION_INVALID`** (MERCHANT)
   - Authorization expired or deleted
   - Client token expired (>24 hours old)
   - Tokenization key deactivated in control panel
   - Fix: Generate new authorization

## Testing

### Unit Tests

Location: `test/client/unit/`

**Test Categories:**

- Client creation and initialization
- Configuration fetching and caching
- Authorization parsing
- Request method (REST)
- GraphQL detection and routing
- GraphQL generators and adapters
- Error handling
- Domain verification

### Integration Tests

Tests actual API calls (mocked):

- Tokenization via REST
- Tokenization via GraphQL
- Configuration fetching
- Error scenarios
- Timeout handling

## Debugging

### Common Issues

**1. Invalid Authorization**

**Symptoms:**

- `CLIENT_INVALID_AUTHORIZATION` on create

**Debug:**

1. Verify authorization string format
2. Check for extra whitespace or newlines
3. For client token: Decode base64 and verify JSON structure
4. For tokenization key: Verify format `environment_public_merchantid`

**2. Authorization Expired**

**Symptoms:**

- `CLIENT_AUTHORIZATION_INVALID` on request
- Was working, now fails

**Debug:**

1. Check client token age (expires after ~24 hours)
2. Generate fresh client token from server
3. For tokenization key: Verify not deactivated in control panel

**3. GraphQL vs REST Confusion**

**Symptoms:**

- Expecting GraphQL but REST used (or vice versa)

**Debug:**

1. Check configuration: `clientInstance.getConfiguration().gatewayConfiguration.graphQL`
2. Verify endpoint in enabled features list
3. Check for disallowed inputs in request body
4. Enable debug logging to see request routing

**4. CORS Errors**

**Symptoms:**

- Browser console shows CORS error
- Network request blocked

**Debug:**

1. Verify merchant domain is configured in Braintree control panel
2. Check if using HTTP instead of HTTPS (production requires HTTPS)
3. Verify clientApiUrl is on allowed domain

**5. Rate Limiting**

**Symptoms:**

- `CLIENT_RATE_LIMITED` errors
- HTTP 429 responses

**Fix:**

```javascript
function requestWithRetry(client, options, retries) {
  return new Promise(function (resolve, reject) {
    client.request(options, function (err, response) {
      if (err && err.code === "CLIENT_RATE_LIMITED" && retries > 0) {
        // Exponential backoff
        setTimeout(
          function () {
            requestWithRetry(client, options, retries - 1)
              .then(resolve)
              .catch(reject);
          },
          Math.pow(2, 3 - retries) * 1000
        );
      } else if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
}
```

## Implementation Examples

### Basic Client Creation

```javascript
braintree.client.create(
  {
    authorization: CLIENT_TOKEN,
  },
  function (err, clientInstance) {
    if (err) {
      console.error("Error creating client:", err);
      return;
    }

    // Client ready, use for components
    createComponents(clientInstance);
  }
);
```

### Promise-Based

```javascript
braintree.client
  .create({
    authorization: TOKENIZATION_KEY,
  })
  .then(function (clientInstance) {
    return braintree.hostedFields.create({
      client: clientInstance,
      fields: {
        /* ... */
      },
    });
  })
  .then(function (hostedFieldsInstance) {
    // Ready to tokenize
  })
  .catch(function (err) {
    console.error(err);
  });
```

### Direct API Requests

```javascript
// Tokenize a card directly
clientInstance.request(
  {
    endpoint: "payment_methods/credit_cards",
    method: "post",
    data: {
      creditCard: {
        number: "4111111111111111",
        expirationDate: "12/2025",
        cvv: "123",
        billingAddress: {
          postalCode: "12345",
        },
      },
    },
  },
  function (err, response) {
    if (err) {
      console.error(err);
      return;
    }

    var nonce = response.creditCards[0].nonce;
    sendNonceToServer(nonce);
  }
);
```

### Accessing Configuration

```javascript
var config = clientInstance.getConfiguration();

console.log("Environment:", config.gatewayConfiguration.environment);
console.log("Merchant ID:", config.gatewayConfiguration.merchantId);
console.log("PayPal enabled:", !!config.gatewayConfiguration.paypalEnabled);
console.log("GraphQL enabled:", !!config.gatewayConfiguration.graphQL);

// Analytics metadata
console.log("Session ID:", config.analyticsMetadata.sessionId);
console.log("SDK Version:", config.analyticsMetadata.sdkVersion);
```

### Client Reuse

```javascript
// Create client once
var clientPromise = braintree.client.create({
  authorization: CLIENT_TOKEN,
});

// Reuse for multiple components
Promise.all([
  clientPromise.then(function (client) {
    return braintree.hostedFields.create({
      client: client,
      fields: {
        /* ... */
      },
    });
  }),
  clientPromise.then(function (client) {
    return braintree.dataCollector.create({
      client: client,
    });
  }),
  clientPromise.then(function (client) {
    return braintree.threeDSecure.create({
      client: client,
      version: "2",
    });
  }),
]).then(function (instances) {
  var hostedFields = instances[0];
  var dataCollector = instances[1];
  var threeDSecure = instances[2];

  // All components ready
});
```

### Error Handling Best Practices

```javascript
function createClientWithRetry(authorization, maxRetries) {
  var retries = 0;

  function attempt() {
    return braintree.client
      .create({ authorization: authorization })
      .catch(function (err) {
        if (err.code === "CLIENT_GATEWAY_NETWORK" && retries < maxRetries) {
          retries++;
          console.log("Network error, retrying... (attempt " + retries + ")");
          return new Promise(function (resolve) {
            setTimeout(function () {
              resolve(attempt());
            }, 1000 * retries); // Incremental backoff
          });
        }
        throw err; // Re-throw if not retryable
      });
  }

  return attempt();
}

createClientWithRetry(CLIENT_TOKEN, 3)
  .then(function (client) {
    // Client created successfully
  })
  .catch(function (err) {
    // Handle non-retryable errors
    if (err.code === "CLIENT_AUTHORIZATION_INVALID") {
      // Generate new client token from server
      refreshClientToken();
    } else {
      console.error("Failed to create client:", err);
    }
  });
```

## Advanced Topics

### GraphQL Feature Flags

GraphQL is only used when explicitly enabled in gateway configuration:

```javascript
var config = clientInstance.getConfiguration();

if (config.gatewayConfiguration.graphQL) {
  console.log("GraphQL URL:", config.gatewayConfiguration.graphQL.url);
  console.log(
    "Enabled features:",
    config.gatewayConfiguration.graphQL.features
  );
  // Example: ['tokenize_credit_cards', 'configuration']
}
```

### Custom Request Headers

The Client automatically adds headers:

- `Braintree-Version`: API version
- `Content-Type`: `application/json`
- Authorization headers (derived from authorization)

### Fraudnet Integration

Client loads Fraudnet script for fraud detection:

```javascript
// From client.js
var FRAUDNET_URL = require("../lib/constants").FRAUDNET_URL;
var FRAUDNET_SOURCE = require("../lib/constants").FRAUDNET_SOURCE;
var FRAUDNET_FNCLS = require("../lib/constants").FRAUDNET_FNCLS;

// Fraudnet loaded automatically when client created
// Used by data-collector component
```
