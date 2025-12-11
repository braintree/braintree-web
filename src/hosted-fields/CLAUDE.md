# Hosted Fields Component - CLAUDE.md

This file provides component-specific guidance for working with the Hosted Fields component. For project-wide conventions and commands, see `/CLAUDE.md`.

## Overview

Hosted Fields provides secure, PCI-compliant credit card input fields via iframes. This is one of the most complex components in the SDK due to its extensive iframe architecture and cross-frame communication patterns.

**Docs:** [Braintree Hosted Fields Guide](https://developer.paypal.com/braintree/docs/guides/hosted-fields)

## Component Structure

### Directory Organization

- `external/` - Public API exposed to merchants
  - `hosted-fields.js` - Main HostedFields class with public methods
  - `compose-url.js` - Generates iframe URLs with configuration
  - `inject-frame.js` - Injects iframes into merchant's page
  - `get-styles-from-class.js` - Extracts CSS for iframe styling
  - `focus-change.js` - Manages focus transitions between fields
  - `attribute-validation-error.js` - Validates field configuration

- `internal/` - Iframe implementation (runs inside iframes)
  - `index.js` - Iframe entry point
  - `components/` - Individual field components
    - `credit-card-input.js` - Card number field
    - `cvv-input.js` - CVV/CVC field
    - `expiration-date-input.js` - Combined expiration field
    - `expiration-month-input.js` - Month-only field
    - `expiration-year-input.js` - Year-only field
    - `postal-code-input.js` - Postal/ZIP code field
    - `cardholder-name-input.js` - Cardholder name field
    - `field-component.js` - Base class for all field components
    - `base-input.js` - Low-level input handling
  - `models/`
    - `credit-card-form.js` - Form state management
    - `evented-model.js` - Event-driven model base class
  - `assemble-iframes.js` - Coordinates iframe setup
  - `format-card-request-data.js` - Prepares tokenization request

- `shared/` - Code used by both external and internal
  - `errors.js` - Hosted Fields error codes
  - `constants.js` - Field names, events, limits
  - `browser-detection.js` - Browser capability detection
  - `find-parent-tags.js` - DOM traversal for field context
  - `get-card-types.js` - Card type detection
  - `focus-intercept.js` - Focus management between frames

## Unique Patterns and Architecture

### Iframe Architecture

Each input field runs in its own sandboxed iframe:

```
Merchant Page
├── HostedFields instance (external/hosted-fields.js)
├── Framebus for communication
└── Field iframes (one per field)
    ├── number field (internal/components/credit-card-input.js)
    ├── cvv field (internal/components/cvv-input.js)
    ├── expirationDate field (internal/components/expiration-date-input.js)
    └── ... other configured fields
```

**Why iframes?**

- PCI compliance: Card data never touches merchant's DOM/JavaScript
- Security isolation: Merchant scripts cannot access card data
- Scope isolation: Prevents CSS/JS conflicts with merchant page

### Cross-Frame Communication

Uses **framebus** library for secure postMessage-based communication:

**Key Events:**

- `TOKENIZATION_REQUEST` - Merchant requests to tokenize card
- `CARD_FORM_ENTRY_HAS_BEGUN` - User started entering data
- `BIN_AVAILABLE` - First 6 digits of card detected
- `CARD_TYPE_CHANGE` - Card network detected/changed
- `INPUT_EVENT` - Field value changed
- `VALIDITY_CHANGE` - Field validation state changed

### Field Components

All field components extend `field-component.js` which extends `base-input.js`:

**Base Input Features:**

- Input masking and formatting
- Placeholder support (with shim for IE9)
- Validation states (empty, valid, invalid)
- Focus/blur event handling
- Selection management

**Field-Specific Logic:**

1. **credit-card-input.js** - Most complex field
   - Uses `credit-card-type` library for detection
   - Supports prefilling/autocomplete
   - Emits BIN events
   - Handles card type changes
   - Max length varies by card type (13-19 digits)

2. **cvv-input.js**
   - Length varies by card type (3-4 digits)
   - Updates when card type changes
   - Security code validation

3. **expiration-date-input.js**
   - Combined MM/YY field with automatic slash insertion
   - Format: `MM / YY` or `MM / YYYY`
   - Validates month (01-12) and future dates

4. **expiration-month-input.js** & **expiration-year-input.js**
   - Split expiration fields
   - Can be used instead of combined field
   - Coordinated validation

5. **postal-code-input.js**
   - Configurable max length (default 10)
   - Alphanumeric support for international codes

6. **cardholder-name-input.js**
   - Simple text input
   - Optional field

### Input Formatting

Uses `@braintree/restricted-input` library for real-time formatting:

```javascript
// Check if formatting is supported
var supportsInputFormatting = require("../shared/supports-input-formatting");

if (supportsInputFormatting()) {
  // Apply formatting patterns
}
```

**Formatting Examples:**

- Card number: Groups digits with spaces (e.g., `4111 1111 1111 1111`)
- Expiration: Auto-inserts slash (e.g., `12 / 25`)
- CVV: Numeric only, max 4 digits

### Tokenization Flow

1. Merchant calls `hostedFields.tokenize()`
2. External instance sends `TOKENIZATION_REQUEST` via framebus
3. Each field validates and sends its data
4. `credit-card-form.js` collects all field data
5. Data sent to Braintree API (from iframe, not merchant page)
6. Nonce returned to merchant via callback

**Security:** Card data flows: `iframe → Braintree API → merchant callback` (never touches merchant's JavaScript)

### Styling

Merchants can style iframe contents using the `styles` configuration:

```javascript
styles: {
  'input': { 'font-size': '16px', 'color': '#333' },
  ':focus': { 'color': '#000' },
  '.valid': { 'color': 'green' },
  '.invalid': { 'color': 'red' }
}
```

**Implementation:**

- `compose-url.js` serializes styles into iframe URL
- `get-styles-from-class.js` extracts computed styles from DOM elements
- Styles applied inside iframe to actual input elements

### Browser Compatibility

**Special Handling:**

- **IE9**: Placeholder polyfill (`simple-placeholder-shim.js`)
- **Safari**: Focus timing issues (`SAFARI_FOCUS_TIMEOUT = 5ms`)
- **Mobile Safari**: Virtual keyboard management
- **Input formatting**: Feature detection before applying

**Detection:** `browser-detection.js` identifies:

- IE9, IE10, IE11
- Safari (desktop and mobile)
- Chrome, Firefox, Edge
- Android Browser

## Testing

Hosted Fields has the most extensive test coverage in the SDK.

### Unit Tests

Location: `test/hosted-fields/unit/`

**Test Categories:**

- External API tests (`external/hosted-fields.js`)
- Internal field component tests (`internal/components/*.js`)
- Model tests (`internal/models/*.js`)
- Shared utility tests (`shared/*.js`)
- Cross-frame communication tests

### Integration Tests

Location: `test/hosted-fields/integration/`

Tests actual iframe creation, field interaction, and tokenization:

- Field focus/blur behavior
- Card type detection
- Validation states
- Tokenization with various card types
- Error handling

## Common Issues and Debugging

### Iframe Loading Issues

**Symptom:** Fields don't render or timeout during initialization

**Debug Steps:**

1. Check browser console for CSP (Content Security Policy) errors
2. Verify `BRAINTREE_JS_ENV` is set correctly
3. Ensure iframe URLs are accessible (not blocked by firewall)
4. Check for `FRAME_SERVICE_FRAME_OPEN_FAILED` errors

### Focus/Blur Issues

**Symptom:** Focus doesn't move between fields correctly

**Causes:**

- Safari focus timing (use `SAFARI_FOCUS_TIMEOUT`)
- Mobile keyboard interference
- Merchant page CSS affecting iframe positioning

**Solutions:**

- Ensure iframes have proper z-index and positioning
- Check `focus-intercept.js` is working
- Test with `focus-change.js` debug logging

### Styling Not Applied

**Symptom:** Custom styles don't appear in fields

**Debug:**

1. Inspect iframe URL - styles should be in query params
2. Check `compose-url.js` is encoding styles correctly
3. Verify CSS selectors match (`:focus`, `.valid`, `.invalid`)
4. Test with inline styles first, then classes

### Validation Issues

**Symptom:** Fields show incorrect validation state

**Check:**

- `getState()` method output
- Framebus events in console
- `credit-card-form.js` state model
- Individual field validators

### Tokenization Failures

**Symptom:** `tokenize()` rejects with errors

**Common Causes:**

- `HOSTED_FIELDS_FIELDS_EMPTY` - No fields have data
- `HOSTED_FIELDS_FIELDS_INVALID` - Validation failed
- `HOSTED_FIELDS_TOKENIZATION_FAIL_ON_DUPLICATE` - Duplicate tokenization attempt
- `HOSTED_FIELDS_TOKENIZATION_CVV_VERIFICATION_FAILED` - CVV check failed

**Debug:**

1. Call `getState()` before tokenization
2. Check all required fields are valid
3. Review network tab for API request/response
4. Enable verbose logging with `BRAINTREE_JS_ENV=development`

## Implementation Examples

### Basic Setup

```javascript
var braintree = require("braintree-web");

braintree.hostedFields.create(
  {
    authorization: "tokenization_key_or_client_token",
    fields: {
      number: { selector: "#card-number" },
      cvv: { selector: "#cvv" },
      expirationDate: { selector: "#expiration" },
    },
  },
  function (err, hostedFieldsInstance) {
    // Instance ready
  }
);
```

### Advanced Configuration

```javascript
braintree.hostedFields.create(
  {
    authorization: AUTH,
    fields: {
      number: {
        selector: "#card-number",
        placeholder: "4111 1111 1111 1111",
        prefill: "4111111111111111", // For testing
      },
      cvv: {
        selector: "#cvv",
        placeholder: "123",
        type: "password", // Mask CVV
      },
      expirationMonth: { selector: "#exp-month" },
      expirationYear: { selector: "#exp-year" },
      postalCode: {
        selector: "#postal",
        maxlength: 5, // US ZIP only
      },
    },
    styles: {
      input: { "font-size": "16px" },
      ".valid": { color: "green" },
      ".invalid": { color: "red" },
    },
  },
  callback
);
```

### Event Handling

```javascript
hostedFieldsInstance.on("focus", function (event) {
  // event.emittedBy: 'number', 'cvv', etc.
  // Add focus styling to container
});

hostedFieldsInstance.on("blur", function (event) {
  // Remove focus styling
});

hostedFieldsInstance.on("validityChange", function (event) {
  // event.fields.number.isValid
  // Update UI based on validation
});

hostedFieldsInstance.on("cardTypeChange", function (event) {
  // event.cards[0].type: 'visa', 'master-card', etc.
  // Update card logo
});

hostedFieldsInstance.on("binAvailable", function (event) {
  // event.bin: first 6 digits
  // Can be used for BIN lookup services
});
```
