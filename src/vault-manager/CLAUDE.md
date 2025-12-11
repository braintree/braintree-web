# Vault Manager Component - CLAUDE.md

This file provides component-specific guidance for working with the Vault Manager component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

The Vault Manager component provides **client-side management** of a customer's vaulted payment methods. It allows you to fetch and delete payment methods stored in the Braintree Vault without making server-side API calls.

**Key Features:**

- Fetch all payment methods for a customer
- Delete payment methods from the vault
- Sort by default payment method
- Client-side vault management
- GraphQL-based deletion API

**Docs:** [Braintree Vault Guide](https://developer.paypal.com/braintree/docs/guides/vault)

**Use Cases:**

- Account management pages
- Saved payment methods UI
- Subscription payment method updates
- Customer self-service payment management

## Component Structure

### Files

- `index.js` - Component entry point with create() function
- `vault-manager.js` - Main VaultManager class (2 public methods)
- `errors.js` - Vault Manager error codes (3 errors)

**Note:** This is a simple, focused component (3 files) designed for vault management operations.

## How It Works

### Vault Management Flow

```
1. Generate Client Token on Server
   (with customer ID)
   ↓
2. Create Client Instance
   ↓
3. Create Vault Manager Instance
   ↓
4. Fetch Payment Methods
   (GET request to payment_methods endpoint)
   ↓
5. Display Payment Methods in UI
   ↓
6. Customer Deletes Payment Method
   ↓
7. Delete Payment Method
   (GraphQL mutation)
   ↓
8. Refresh Payment Methods List
```

### Prerequisites

**Critical Requirement:**

- Must use **Client Token** (not Tokenization Key)
- Client Token must include **customer ID**

**Why Client Token Required:**

- Fetching payment methods requires customer association
- Deleting payment methods requires customer authentication
- Tokenization keys don't have customer context

**Server-side (Node.js):**

```javascript
// Generate client token with customer ID
gateway.clientToken.generate(
  {
    customerId: "customer_123",
  },
  function (err, response) {
    var clientToken = response.clientToken;
    // Send to client
  }
);
```

## Basic Usage

### Fetch and Display Payment Methods

```javascript
// Server sends client token to page
var clientToken = "eyJ2ZXJzaW9uIjoyLC..."; // From server

braintree.client
  .create({
    authorization: clientToken, // Must be client token
  })
  .then(function (clientInstance) {
    return braintree.vaultManager.create({
      client: clientInstance,
    });
  })
  .then(function (vaultManagerInstance) {
    // Fetch customer's payment methods
    return vaultManagerInstance.fetchPaymentMethods();
  })
  .then(function (paymentMethods) {
    // Display payment methods in UI
    paymentMethods.forEach(function (paymentMethod) {
      console.log("Type:", paymentMethod.type);
      console.log("Nonce:", paymentMethod.nonce);
      console.log("Default:", paymentMethod.default);
      console.log("Details:", paymentMethod.details);

      addPaymentMethodToUI(paymentMethod);
    });
  })
  .catch(function (err) {
    console.error("Error:", err);
  });
```

### Delete Payment Method

```javascript
// User clicks "Delete" on a payment method
deleteButton.addEventListener("click", function () {
  var nonceToDelete = "nonce-from-payment-method";

  vaultManagerInstance
    .deletePaymentMethod(nonceToDelete)
    .then(function () {
      console.log("Payment method deleted successfully");

      // Refresh the payment methods list
      return vaultManagerInstance.fetchPaymentMethods();
    })
    .then(function (paymentMethods) {
      // Update UI with refreshed list
      updatePaymentMethodsList(paymentMethods);
    })
    .catch(function (err) {
      if (err.code === "VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND") {
        console.error("Payment method not found");
      } else {
        console.error("Delete failed:", err);
      }
    });
});
```

## Configuration Options

### Creation Options

```javascript
braintree.vaultManager.create({
  client: clientInstance, // Required (or authorization)
  authorization: clientToken, // Alternative to client (must be client token)
});
```

**Important:**

- `authorization` must be a **client token** with customer ID
- Tokenization keys will work for creation but fail on method calls

### Fetch Payment Methods Options

```javascript
vaultManagerInstance.fetchPaymentMethods({
  defaultFirst: true, // Optional: Sort default payment method first (default: false)
});
```

## Methods

### fetchPaymentMethods()

Fetches all payment methods owned by the customer.

**Signature:**

```javascript
vaultManagerInstance.fetchPaymentMethods(options, callback);
// OR
vaultManagerInstance
  .fetchPaymentMethods(options)
  .then(function (paymentMethods) {
    // Use paymentMethods
  });
```

**Parameters:**

- `options` (object, optional): Fetch options
  - `defaultFirst` (boolean, optional): If `true`, default payment method returned first

**Returns:**

- `Promise<Array<PaymentMethod>>` - Array of payment method objects

**Payment Method Object Structure:**

```javascript
{
  nonce: 'tokencc_abc123',           // Transactable nonce
  default: true,                     // Whether this is the default payment method
  type: 'CreditCard',                // Payment method type (CreditCard, PayPalAccount, etc.)
  hasSubscription: false,            // Whether this payment method has active subscriptions

  details: {                         // Type-specific details
    // For CreditCard:
    cardType: 'Visa',
    lastFour: '1111',
    lastTwo: '11',
    expirationMonth: '12',
    expirationYear: '2025',
    bin: '411111',

    // For PayPalAccount:
    email: 'customer@example.com',

    // For VenmoAccount:
    username: '@username',

    // For other types - varies
  },

  description: 'ending in 11',       // Optional: Human-readable description

  binData: {                         // Optional: BIN data (credit cards only)
    commercial: 'Unknown',
    countryOfIssuance: 'USA',
    debit: 'No',
    durbinRegulated: 'Yes',
    healthcare: 'No',
    issuingBank: 'Wells Fargo',
    payroll: 'No',
    prepaid: 'No',
    productId: '123'
  }
}
```

**Examples:**

**Basic Fetch:**

```javascript
vaultManagerInstance.fetchPaymentMethods().then(function (paymentMethods) {
  console.log("Found", paymentMethods.length, "payment methods");

  paymentMethods.forEach(function (pm) {
    console.log(pm.type + ":", pm.description);
  });
});
```

**Fetch with Default First:**

```javascript
vaultManagerInstance
  .fetchPaymentMethods({ defaultFirst: true })
  .then(function (paymentMethods) {
    var defaultPaymentMethod = paymentMethods[0];

    if (defaultPaymentMethod && defaultPaymentMethod.default) {
      console.log("Default payment method:", defaultPaymentMethod.description);
      selectPaymentMethod(defaultPaymentMethod.nonce);
    }
  });
```

**Render Payment Methods in UI:**

```javascript
function renderPaymentMethods() {
  vaultManagerInstance
    .fetchPaymentMethods({ defaultFirst: true })
    .then(function (paymentMethods) {
      var container = document.getElementById("payment-methods");
      container.innerHTML = "";

      if (paymentMethods.length === 0) {
        container.innerHTML = "<p>No saved payment methods</p>";
        return;
      }

      paymentMethods.forEach(function (pm) {
        var card = document.createElement("div");
        card.className = "payment-method-card";

        var type = document.createElement("strong");
        type.textContent = pm.type;

        var description = document.createElement("span");
        description.textContent = pm.description || "Payment method";

        var badge = document.createElement("span");
        if (pm.default) {
          badge.className = "badge default";
          badge.textContent = "Default";
        }

        var deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = function () {
          deletePaymentMethod(pm.nonce);
        };

        card.appendChild(type);
        card.appendChild(description);
        if (pm.default) card.appendChild(badge);
        card.appendChild(deleteBtn);

        container.appendChild(card);
      });
    })
    .catch(function (err) {
      console.error("Error fetching payment methods:", err);
    });
}
```

### deletePaymentMethod()

Deletes a vaulted payment method owned by the customer.

**Signature:**

```javascript
vaultManagerInstance.deletePaymentMethod(paymentMethodNonce, callback);
// OR
vaultManagerInstance.deletePaymentMethod(paymentMethodNonce).then(function () {
  // Deletion successful
});
```

**Parameters:**

- `paymentMethodNonce` (string, required): Nonce referencing vaulted payment method

**Returns:**

- `Promise<void>` - Resolves with no data on success

**Important:**

- Uses GraphQL API under the hood
- Requires client token (not tokenization key)
- Payment method must belong to customer
- Cannot delete payment methods with active subscriptions (handled server-side)

**Examples:**

**Basic Delete:**

```javascript
vaultManagerInstance
  .deletePaymentMethod("tokencc_abc123")
  .then(function () {
    console.log("Payment method deleted");
  })
  .catch(function (err) {
    console.error("Delete failed:", err);
  });
```

**Delete with Confirmation:**

```javascript
function deletePaymentMethod(nonce, description) {
  var confirmed = confirm("Delete " + description + "?");

  if (!confirmed) {
    return;
  }

  vaultManagerInstance
    .deletePaymentMethod(nonce)
    .then(function () {
      showSuccessMessage("Payment method deleted");

      // Refresh list
      return vaultManagerInstance.fetchPaymentMethods();
    })
    .then(function (paymentMethods) {
      renderPaymentMethods(paymentMethods);
    })
    .catch(function (err) {
      if (err.code === "VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND") {
        showErrorMessage(
          "Payment method not found. It may have already been deleted."
        );
      } else {
        showErrorMessage("Failed to delete payment method: " + err.message);
      }
    });
}
```

**Delete with UI Update:**

```javascript
deleteButton.addEventListener("click", function () {
  var nonce = this.dataset.nonce;
  var card = this.closest(".payment-method-card");

  // Show loading state
  this.disabled = true;
  this.textContent = "Deleting...";

  vaultManagerInstance
    .deletePaymentMethod(nonce)
    .then(function () {
      // Remove from UI with animation
      card.style.opacity = "0";
      setTimeout(function () {
        card.remove();
      }, 300);
    })
    .catch(function (err) {
      // Reset button
      deleteButton.disabled = false;
      deleteButton.textContent = "Delete";

      alert("Delete failed: " + err.message);
    });
});
```

### teardown()

Cleanly tear down the Vault Manager instance.

**Signature:**

```javascript
vaultManagerInstance.teardown(callback);
// OR
vaultManagerInstance.teardown().then(function () {
  // Teardown complete
});
```

**Example:**

```javascript
vaultManagerInstance.teardown().then(function () {
  console.log("Vault Manager torn down");
});
```

## Error Handling

### Error Codes

From `errors.js`:

**1. `VAULT_MANAGER_DELETE_PAYMENT_METHOD_NONCE_REQUIRES_CLIENT_TOKEN`** (MERCHANT)

**When:** Attempting to delete with tokenization key instead of client token

**Cause:**

- Vault Manager created with tokenization key
- Must use client token with customer ID

**Fix:**

```javascript
// BAD: Using tokenization key
var tokenizationKey = "sandbox_abc123_xyz789";

braintree.client
  .create({
    authorization: tokenizationKey, // Wrong for vault manager
  })
  .then(function (client) {
    return braintree.vaultManager.create({ client: client });
  })
  .then(function (vaultManager) {
    return vaultManager.deletePaymentMethod("nonce"); // Will fail
  });

// GOOD: Using client token
var clientToken = gateway.clientToken.generate({
  customerId: "customer_123", // Required
});

braintree.client
  .create({
    authorization: clientToken, // Correct
  })
  .then(function (client) {
    return braintree.vaultManager.create({ client: client });
  })
  .then(function (vaultManager) {
    return vaultManager.deletePaymentMethod("nonce"); // Works
  });
```

**2. `VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND`** (MERCHANT)

**When:** Payment method nonce doesn't exist or doesn't belong to customer

**Causes:**

- Nonce already deleted
- Nonce belongs to different customer
- Invalid nonce format
- Nonce expired

**Handling:**

```javascript
vaultManagerInstance.deletePaymentMethod(nonce).catch(function (err) {
  if (err.code === "VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND") {
    // Payment method not found
    console.log("Payment method may have already been deleted");

    // Refresh list to ensure UI is in sync
    vaultManagerInstance.fetchPaymentMethods().then(function (paymentMethods) {
      updateUI(paymentMethods);
    });
  }
});
```

**3. `VAULT_MANAGER_DELETE_PAYMENT_METHOD_UNKNOWN_ERROR`** (UNKNOWN)

**When:** Unknown error during deletion

**Causes:**

- Network error
- Server error
- GraphQL API issue

**Handling:**

```javascript
vaultManagerInstance.deletePaymentMethod(nonce).catch(function (err) {
  if (err.code === "VAULT_MANAGER_DELETE_PAYMENT_METHOD_UNKNOWN_ERROR") {
    console.error("Unknown error:", err.details.originalError);

    // Retry or show error message
    showErrorMessage("An error occurred. Please try again.");
  }
});
```

## Testing

### Sandbox Testing

**1. Create Customer on Server:**

```javascript
gateway.customer.create(
  {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
  },
  function (err, result) {
    var customerId = result.customer.id;
    // Use customerId to generate client token
  }
);
```

**2. Create Payment Methods:**

```javascript
// Via Hosted Fields or other tokenization
hostedFieldsInstance.tokenize().then(function (payload) {
  // Create payment method in vault on server
  gateway.paymentMethod.create({
    customerId: customerId,
    paymentMethodNonce: payload.nonce,
  });
});
```

**3. Test Vault Manager:**

```javascript
// Client-side
braintree.client
  .create({
    authorization: clientToken, // Generated with customerId
  })
  .then(function (clientInstance) {
    return braintree.vaultManager.create({
      client: clientInstance,
    });
  })
  .then(function (vaultManagerInstance) {
    // Test fetching
    return vaultManagerInstance.fetchPaymentMethods();
  })
  .then(function (paymentMethods) {
    console.log("Fetched", paymentMethods.length, "payment methods");

    if (paymentMethods.length > 0) {
      // Test deleting
      return vaultManagerInstance.deletePaymentMethod(paymentMethods[0].nonce);
    }
  });
```

### Unit Tests

Location: `test/vault-manager/unit/`

**Test Categories:**

- Component creation
- Fetch payment methods
- Delete payment methods
- Error scenarios
- Teardown

## Debugging

### Common Issues

**1. "Client token required"**

**Symptoms:**

- `VAULT_MANAGER_DELETE_PAYMENT_METHOD_NONCE_REQUIRES_CLIENT_TOKEN`

**Fix:**
Ensure using client token with customer ID, not tokenization key:

```javascript
// Server-side: Generate client token
gateway.clientToken.generate(
  {
    customerId: "customer_123", // Critical
  },
  function (err, response) {
    res.send({ clientToken: response.clientToken });
  }
);

// Client-side: Use client token
fetch("/client-token")
  .then((res) => res.json())
  .then((data) => {
    return braintree.client.create({
      authorization: data.clientToken,
    });
  });
```

**2. "No payment methods returned"**

**Symptoms:**

- `fetchPaymentMethods()` returns empty array
- Customer should have payment methods

**Debug:**

1. Verify customer ID in client token matches customer with payment methods
2. Check payment methods exist in Braintree control panel
3. Verify payment methods are vaulted (not single-use nonces)

**Server-side check:**

```javascript
gateway.customer.find("customer_123", function (err, customer) {
  console.log("Payment methods:", customer.paymentMethods);
});
```

**3. "Payment method not found"**

**Symptoms:**

- `VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND` when deleting

**Causes:**

- Using wrong nonce
- Payment method already deleted
- Nonce from different customer
- Using single-use nonce instead of vaulted nonce

**Debug:**

```javascript
// Verify nonce is from fetchPaymentMethods()
vaultManagerInstance.fetchPaymentMethods().then(function (paymentMethods) {
  // Use nonce from this array
  var validNonce = paymentMethods[0].nonce;

  return vaultManagerInstance.deletePaymentMethod(validNonce);
});
```

**4. "Cannot delete payment method with subscription"**

**Symptoms:**

- Delete fails for payment methods with active subscriptions

**Handling:**

```javascript
function canDeletePaymentMethod(paymentMethod) {
  if (paymentMethod.hasSubscription) {
    alert("Cannot delete payment method with active subscription");
    return false;
  }
  return true;
}

if (canDeletePaymentMethod(paymentMethod)) {
  vaultManagerInstance.deletePaymentMethod(paymentMethod.nonce);
}
```

## Implementation Examples

### Complete Account Management Page

```javascript
var vaultManagerInstance;

// Initialize on page load
braintree.client
  .create({
    authorization: CLIENT_TOKEN,
  })
  .then(function (clientInstance) {
    return braintree.vaultManager.create({
      client: clientInstance,
    });
  })
  .then(function (instance) {
    vaultManagerInstance = instance;

    // Load payment methods
    loadPaymentMethods();

    // Setup add payment method flow
    setupAddPaymentMethod(clientInstance);
  });

function loadPaymentMethods() {
  vaultManagerInstance
    .fetchPaymentMethods({ defaultFirst: true })
    .then(function (paymentMethods) {
      renderPaymentMethods(paymentMethods);
    })
    .catch(function (err) {
      showError("Failed to load payment methods: " + err.message);
    });
}

function renderPaymentMethods(paymentMethods) {
  var container = document.getElementById("payment-methods-list");
  container.innerHTML = "";

  if (paymentMethods.length === 0) {
    container.innerHTML = '<p class="empty">No saved payment methods</p>';
    return;
  }

  paymentMethods.forEach(function (pm) {
    var card = createPaymentMethodCard(pm);
    container.appendChild(card);
  });
}

function createPaymentMethodCard(paymentMethod) {
  var card = document.createElement("div");
  card.className = "payment-method-card";
  card.innerHTML = `
    <div class="pm-header">
      <span class="pm-type">${paymentMethod.type}</span>
      ${paymentMethod.default ? '<span class="badge">Default</span>' : ""}
    </div>
    <div class="pm-details">
      <p>${paymentMethod.description || "Payment method"}</p>
      ${renderPaymentMethodDetails(paymentMethod)}
    </div>
    <div class="pm-actions">
      ${!paymentMethod.default ? '<button class="btn-default" data-nonce="' + paymentMethod.nonce + '">Make Default</button>' : ""}
      ${!paymentMethod.hasSubscription ? '<button class="btn-delete" data-nonce="' + paymentMethod.nonce + '">Delete</button>' : ""}
    </div>
  `;

  // Attach event listeners
  var deleteBtn = card.querySelector(".btn-delete");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", function () {
      handleDelete(paymentMethod);
    });
  }

  var defaultBtn = card.querySelector(".btn-default");
  if (defaultBtn) {
    defaultBtn.addEventListener("click", function () {
      handleMakeDefault(paymentMethod.nonce);
    });
  }

  return card;
}

function renderPaymentMethodDetails(pm) {
  if (pm.type === "CreditCard" && pm.details) {
    return `
      <p class="pm-card-info">
        ${pm.details.cardType} ending in ${pm.details.lastFour}
        <br>Expires ${pm.details.expirationMonth}/${pm.details.expirationYear}
      </p>
    `;
  } else if (pm.type === "PayPalAccount" && pm.details) {
    return `<p class="pm-paypal-info">${pm.details.email}</p>`;
  }
  return "";
}

function handleDelete(paymentMethod) {
  if (paymentMethod.hasSubscription) {
    alert("Cannot delete payment method with active subscription");
    return;
  }

  var confirmed = confirm("Delete " + paymentMethod.description + "?");

  if (!confirmed) return;

  // Show loading state
  showLoading();

  vaultManagerInstance
    .deletePaymentMethod(paymentMethod.nonce)
    .then(function () {
      showSuccess("Payment method deleted");

      // Reload list
      return loadPaymentMethods();
    })
    .catch(function (err) {
      hideLoading();

      if (err.code === "VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND") {
        showError("Payment method not found");
        loadPaymentMethods(); // Refresh to sync state
      } else {
        showError("Failed to delete: " + err.message);
      }
    });
}

function handleMakeDefault(nonce) {
  // This requires server-side API call
  fetch("/set-default-payment-method", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nonce: nonce }),
  }).then(function (response) {
    if (response.ok) {
      showSuccess("Default payment method updated");
      loadPaymentMethods(); // Refresh
    } else {
      showError("Failed to update default payment method");
    }
  });
}

function setupAddPaymentMethod(clientInstance) {
  var addButton = document.getElementById("add-payment-method-btn");

  addButton.addEventListener("click", function () {
    // Show add payment method form (Hosted Fields)
    showAddPaymentMethodModal();

    // When form submitted and nonce obtained:
    // Send to server to vault, then refresh list
  });
}

function showLoading() {
  document.getElementById("loading-overlay").style.display = "block";
}

function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
}

function showSuccess(message) {
  hideLoading();
  // Show success toast/message
  console.log(message);
}

function showError(message) {
  hideLoading();
  // Show error toast/message
  console.error(message);
}
```

### With Subscription Management

```javascript
function renderPaymentMethodsWithSubscriptions() {
  vaultManagerInstance.fetchPaymentMethods().then(function (paymentMethods) {
    paymentMethods.forEach(function (pm) {
      var card = createPaymentMethodCard(pm);

      if (pm.hasSubscription) {
        // Add subscription indicator
        var subBadge = document.createElement("span");
        subBadge.className = "badge subscription";
        subBadge.textContent = "Has Subscription";
        card.querySelector(".pm-header").appendChild(subBadge);

        // Disable delete button
        var deleteBtn = card.querySelector(".btn-delete");
        if (deleteBtn) {
          deleteBtn.disabled = true;
          deleteBtn.title =
            "Cannot delete payment method with active subscription";
        }
      }

      document.getElementById("payment-methods-list").appendChild(card);
    });
  });
}
```

## Server-Side Integration

**Generate Client Token:**

```javascript
// Node.js example
app.get("/client-token", function (req, res) {
  var customerId = req.session.customerId; // From authenticated session

  gateway.clientToken.generate(
    {
      customerId: customerId,
    },
    function (err, response) {
      if (err) {
        res.status(500).send({ error: err.message });
        return;
      }

      res.send({ clientToken: response.clientToken });
    }
  );
});
```

**Set Default Payment Method:**

```javascript
// Server-side only (no client-side API)
app.post("/set-default-payment-method", function (req, res) {
  var nonce = req.body.nonce;
  var customerId = req.session.customerId;

  // First, find the payment method token from nonce
  gateway.paymentMethod.find(nonce, function (err, paymentMethod) {
    if (err) {
      res.status(404).send({ error: "Payment method not found" });
      return;
    }

    // Update to make default
    gateway.paymentMethod.update(
      paymentMethod.token,
      {
        options: {
          makeDefault: true,
        },
      },
      function (updateErr, result) {
        if (result.success) {
          res.send({ success: true });
        } else {
          res.status(500).send({ error: result.message });
        }
      }
    );
  });
});
```

## Best Practices

1. **Always use client token** - Never use tokenization key for Vault Manager
2. **Include customer ID** - Client token must be generated with customer ID
3. **Refresh after changes** - Re-fetch payment methods after adding/deleting
4. **Handle subscriptions** - Check `hasSubscription` before allowing deletion
5. **Error handling** - Gracefully handle "not found" errors (payment method may be deleted elsewhere)
6. **Loading states** - Show loading indicators during async operations
7. **Confirmation dialogs** - Always confirm before deleting payment methods
8. **Security** - Validate customer authentication server-side before generating client token
