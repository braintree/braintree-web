# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Storybook is used in this project for:

- **Interactive Component Development** - Develop and test payment components in isolation
- **Visual Testing** - Manually verify component behavior across different SDK versions
- **Integration Testing** - Automated BrowserStack tests for real browser environments
- **Documentation** - Living documentation with interactive examples

## Commands

### Development

- `npm run storybook:dev` - Start Storybook development server on port 6006
- `npm run storybook:dev-local` - Start Storybook with local build (requires `npm run build` first)
- `npm run storybook:docs` - Start Storybook in documentation mode

### Building

- `npm run storybook:build` - Build static Storybook site to `storybook-static/`
- `npm run storybook:run-build` - Serve built Storybook on https://127.0.0.1:8080
- `npm run storybook:copy-local-build` - Copy local build to static directory (requires `npm run build` first)

### Testing

- `npm run test:integration` - Run WebDriverIO integration tests on BrowserStack
- `npm run test:integration:local` - Run tests with local build (`LOCAL_BUILD=true`)
- `npm run test:integration -- --spec ".storybook/tests/paypal-checkout-v6/*.test.ts"` - Run tests matching pattern

## Architecture

### Directory Structure

```
.storybook/
├── main.ts                  # Storybook configuration
├── preview.ts               # Global decorators, loaders, and version toolbar
├── constants.ts             # Shared constants (see below)
├── versions.json            # List of available SDK versions for toolbar
├── wdio.conf.ts             # WebDriverIO test configuration
│
├── css/
│   └── main.css             # Shared styles (imported globally in preview.ts)
│
├── stories/                 # Story files organized by component
│   ├── ApplePay/
│   ├── HostedFields/
│   ├── LocalPaymentMethods/
│   ├── PayPalCheckout/
│   ├── PayPalCheckoutV6/
│   ├── ThreeDSecure/
│   ├── VaultManager/
│   └── Venmo/
│
├── utils/                   # Utility functions
│   ├── BraintreeWebSDKLoader.ts  # SDK loading singleton class
│   ├── story-helper.ts           # createSimpleBraintreeStory helper
│   ├── braintree-globals.ts      # URL construction, window.braintree utilities
│   ├── script-loader.ts          # Script tag loading/removal
│   ├── sdk-config.ts             # Version config, authorization token
│   ├── sdk-metadata.ts           # Version metadata management
│   ├── local-build-manager.ts    # Local build detection
│   ├── version-fetcher.ts        # NPM registry version fetching
│   └── test-data.ts              # Test card data
│
├── tests/                   # WebDriverIO integration tests
│   ├── helpers/
│   │   ├── browser-commands/
│   │   │   ├── index.ts          # loadHelpers() entrypoint
│   │   │   ├── common.ts         # registerCommonCommands (getResult)
│   │   │   ├── hosted-fields.ts  # Hosted Fields commands
│   │   │   └── paypal.ts         # PayPal commands
│   │   ├── url-utils.ts          # getWorkflowUrl
│   │   └── paypal/
│   │       └── checkout-helpers.ts  # PayPal popup/login flow helpers
│   ├── hosted-fields/            # Hosted Fields test files
│   └── paypal-checkout-v6/       # PayPal V6 test files
│       ├── checkout.test.ts
│       ├── billing-agreement.test.ts
│       ├── constants.ts          # Test URLs, timeouts, messages
│       └── helpers.ts            # PayPal V6 test-specific helpers
│
├── types/                   # TypeScript type definitions
│   ├── global.d.ts               # Braintree/PayPal SDK interfaces
│   ├── wdio.d.ts                 # WebdriverIO custom command types
│   ├── braintree-extended.d.ts   # Extended Braintree types
│   ├── test-types.d.ts           # Test-specific types
│   └── story-utils.d.ts          # Story utility types
│
└── static/local-build/      # Local SDK builds (created by script)
```

### SDK Version Management

The Storybook toolbar allows switching between SDK versions:

1. **"dev"** - Local build from `.storybook/static/local-build/`
2. **Production versions** - CDN-hosted builds (e.g., "3.133.0")

Version selection:

- URL parameter: `?globals=sdkVersion:3.133.0`
- Storybook globals toolbar
- Default: `"dev"` (local build)

### SDK Loading Flow

1. **preview.ts loader** - Pre-loads SDK based on selected version and `parameters.braintreeScripts`
2. **story-helper.ts** - `createSimpleBraintreeStory` ensures required scripts are loaded
3. **BraintreeWebSDKLoader.ts** - Singleton that manages script loading, version switching, cleanup

## Writing Stories

### Basic Story Structure

```typescript
import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import "./componentName.css";

const meta: Meta = {
  title: "Braintree/Component Name",
  parameters: {
    layout: "centered",
    braintreeScripts: ["component-name"], // Scripts for preview loader to pre-load
    docs: {
      description: {
        component: `Component description in markdown`,
      },
    },
  },
};

export default meta;

export const BasicExample: StoryObj = {
  render: createSimpleBraintreeStory(
    (container, args) => {
      // Your render code - window.braintree is available
      const authorization = getAuthorizationToken();
      // ...
    },
    ["client.min.js", "component-name.min.js"] // Scripts this story needs
  ),
  argTypes: {
    optionName: {
      control: { type: "boolean" },
      description: "Option description",
    },
  },
  args: {
    optionName: true,
  },
};
```

### Key Points

1. **`parameters.braintreeScripts`** - Array of script names (without `.min.js`) for the preview loader to pre-load
2. **`createSimpleBraintreeStory` second arg** - Array of full script filenames the story requires
3. **`getAuthorizationToken()`** - Returns `import.meta.env.STORYBOOK_BRAINTREE_TOKENIZATION_KEY`
4. **`getClientToken()`** - Returns `import.meta.env.STORYBOOK_BRAINTREE_CLIENT_TOKEN` (required for V6)
5. **Shared styles** - Already imported globally via `preview.ts`, no need to import in stories

### Result Display Pattern

```typescript
// Success
resultDiv.classList.add("shared-result--visible", "shared-result--success");
resultDiv.innerHTML = `<strong>Success!</strong><small>Nonce: ${payload.nonce}</small>`;

// Error
resultDiv.classList.add("shared-result--visible", "shared-result--error");
resultDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
```

### Test Data

```typescript
import { TEST_CARDS } from "../../utils/test-data";

// Cards available: visa, mastercard, amex, discover, etc.
const cardData = TEST_CARDS.visa;
// { number: "4111111111111111", cvv: "123", expirationDate: "MM/YY", postalCode: "12345" }
```

### PayPal V6 Stories

PayPal V6 stories use client tokens (not tokenization keys) and have different patterns:

```typescript
import type { Meta, StoryObj } from "@storybook/html";
import type { IPayPalV6ApproveData, IBraintreeError } from "../../types/global";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getClientToken } from "../../utils/sdk-config";
import "../../css/main.css";

const meta: Meta = {
  title: "Braintree/PayPal Checkout V6",
  parameters: {
    layout: "centered",
  },
};

export default meta;

export const OneTimePayment: StoryObj = {
  render: createSimpleBraintreeStory(
    async (container) => {
      const clientToken = getClientToken();
      const braintree = window.braintree;

      const clientInstance = await braintree.client.create({
        authorization: clientToken,
      });

      const paypalCheckoutV6Instance = await braintree.paypalCheckoutV6.create({
        client: clientInstance,
      });

      await paypalCheckoutV6Instance.loadPayPalSDK();

      const session = paypalCheckoutV6Instance.createOneTimePaymentSession({
        amount: "10.00",
        currency: "USD",
        intent: "capture",
        onApprove: async (data: IPayPalV6ApproveData) => {
          const payload = await paypalCheckoutV6Instance.tokenizePayment({
            payerID: data.payerID || data.payerId,
            orderID: data.orderID || data.orderId,
          });
          // Display success result...
        },
        onCancel: () => {
          /* Handle cancel */
        },
        onError: (err: IBraintreeError) => {
          /* Handle error */
        },
      });

      // Create button and attach session.start() to click
      const button = document.createElement("button");
      button.className = "paypal-button";
      button.onclick = () => session.start();
      container.appendChild(button);
    },
    ["client.min.js", "paypal-checkout-v6.min.js"]
  ),
};
```

**Billing Agreement Sessions** (for vaulting):

```typescript
const session = paypalCheckoutV6Instance.createBillingAgreementSession({
  billingAgreementDescription: "Save for future payments",
  planType: "RECURRING", // or SUBSCRIPTION, UNSCHEDULED, INSTALLMENTS
  planMetadata: {
    /* Optional billing cycle config */
  },
  onApprove: async (data) => {
    const payload = await paypalCheckoutV6Instance.tokenizePayment({
      billingToken: data.billingToken,
    });
  },
});
```

### Shared Constants

Import from `constants.ts`:

```typescript
import {
  SUCCESS_MESSAGES,
  DEFAULT_HOSTED_FIELDS_VALUES,
  BASE_URL,
} from "../../constants";
```

- `SUCCESS_MESSAGES.TOKENIZATION` - "Payment tokenized successfully!"
- `DEFAULT_HOSTED_FIELDS_VALUES` - Default test card values (number, cvv, expirationDate, postalCode)
- `BASE_URL` - `https://127.0.0.1:8080`
- `PAYPAL_SUCCESS_MESSAGES` - PayPal authorization/cancellation messages
- `PAYPAL_SELECTORS` - PayPal UI selectors for integration tests (login, OTP, approval buttons)
- `PAYPAL_POPUP_TIMEOUTS` - Timeout values for PayPal popup flow steps

## Integration Testing

### Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run with local build
npm run test:integration:local

# Run a single test file
npm run test:integration -- --spec .storybook/tests/hosted-fields/tokenization.test.ts

# Run tests matching a pattern
npm run test:integration -- --spec ".storybook/tests/hosted-fields/*.test.ts"
```

### Test Configuration

- **Framework:** Mocha with WebDriverIO
- **Browsers:** Chrome (Windows 10), Safari (macOS Monterey), Firefox (macOS Monterey), Edge (Windows 10) - all use "latest" versions
- **Test Servers:** Each test creates its own HTTP server on a random port (no shared base URL)

### Custom Browser Commands

Commands are registered via `loadHelpers()` in `tests/helpers/browser-commands/index.ts`:

**Common Commands** (`common.ts`):

- `browser.getResult()` - Extract success/failure from result div

**Hosted Fields Commands** (`hosted-fields.ts`):

- `browser.waitForHostedFieldsReady()` - Wait for SDK and all hosted field iframes
- `browser.waitForHostedField(key)` - Wait for specific hosted field
- `browser.hostedFieldSendInput(key, value)` - Type into hosted field iframe (uses defaults if value empty)
- `browser.hostedFieldClearWithKeypress(key, deleteCount)` - Clear field using backspace keypresses
- `browser.waitForFormReady()` - Wait for submit button to be enabled
- `browser.submitPay()` - Submit form and wait for result
- `browser.reloadSessionOnRetry(currentTest)` - Reset browser state on test retry

**PayPal Commands** (`paypal.ts`):

- `browser.waitForPayPalButtonReady()` - Wait for `.paypal-button` to be clickable
- `browser.clickPayPalButton()` - Click the PayPal button to open popup
- `browser.getPayPalResult()` - Get result with success/cancelled/error status
- `browser.getBillingAgreementResult()` - Extended result with hasNonce/hasEmail/hasPlanType

**URL Utilities** (`tests/helpers/url-utils.ts`):

- `getWorkflowUrl(path)` - Build story URL with version param (auto-adds `sdkVersion:dev` when `LOCAL_BUILD=true`)

### Test Server Helper

Tests use per-test HTTP servers for isolation. Import from `tests/helpers/test-server.ts`:

```typescript
import {
  createTestServer,
  type TestServerResult,
} from "../helpers/test-server";
import http from "node:http";

let server: http.Server;
let serverPort: number;

beforeEach(async () => {
  const result: TestServerResult = await createTestServer();
  server = result.server;
  serverPort = result.port;
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
```

**Options:**

- `enableCsp` - Enable CSP header testing
- `cspReports` - Array to collect CSP violation reports
- `cspScriptSrc` - Custom script-src directive
- `modifyMetaTag` - Modify CSP meta tag in HTML
- `customHeaders` - Add custom response headers
- `forceServeMinified` - Serve minified hosted-fields-frame

### Writing Tests

```typescript
import { expect } from "@wdio/globals";
import {
  createTestServer,
  type TestServerResult,
} from "../helpers/test-server";
import http from "node:http";

describe("Component Integration", () => {
  let server: http.Server;
  let serverPort: number;

  const getTestUrl = (path: string) => {
    let url = `http://localhost:${serverPort}${path}`;
    if (process.env.LOCAL_BUILD === "true") {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}globals=sdkVersion:dev`;
    }
    return encodeURI(url);
  };

  beforeEach(async function () {
    await browser.reloadSessionOnRetry(this.currentTest);
    const result: TestServerResult = await createTestServer();
    server = result.server;
    serverPort = result.port;
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await browser.reloadSession();
  });

  it("should complete flow", async () => {
    await browser.url(
      getTestUrl(
        "/iframe.html?id=braintree-hosted-fields--standard-hosted-fields"
      )
    );
    await browser.waitForHostedFieldsReady();

    await browser.hostedFieldSendInput("number");
    await browser.hostedFieldSendInput("expirationDate");
    await browser.hostedFieldSendInput("cvv");

    await browser.submitPay();
    const result = await browser.getResult();
    expect(result.success).toBe(true);
  });
});
```

### PayPal Checkout V6 Testing

PayPal V6 tests require additional environment setup and use specialized helpers.

**Required Environment Variables:**

```bash
PAYPAL_SANDBOX_BUYER_EMAIL=your_sandbox_buyer@example.com
PAYPAL_SANDBOX_OTP_CODE=111111  # Default sandbox OTP
```

**PayPal Checkout Helpers** (`tests/helpers/paypal/checkout-helpers.ts`):

```typescript
import {
  switchToPayPalPopup,
  switchToOriginalWindow,
  closePayPalPopup,
  completePayPalLogin,
  completeBillingAgreementLogin,
  approvePayPalPayment,
  approveBillingAgreement,
  cancelPayPalPayment,
  waitForPopupToClose,
  getPayPalBuyerEmail,
} from "../helpers/paypal/checkout-helpers";
```

**Typical PayPal V6 Test Flow:**

```typescript
it("should complete PayPal payment", async function () {
  await browser.url(getWorkflowUrl(STORY_URLS.oneTimePayment));
  await browser.waitForPayPalButtonReady();
  await browser.clickPayPalButton();

  const originalWindow = await switchToPayPalPopup();

  await completePayPalLogin(); // Email → Next → Get Code → OTP → Navigate
  await approvePayPalPayment(); // Click Pay button
  await waitForPopupToClose(originalWindow);
  await switchToOriginalWindow(originalWindow);

  const result = await browser.getPayPalResult();
  expect(result.success).toBe(true);
});
```

**Billing Agreement Test Flow:**

```typescript
it("should create billing agreement", async function () {
  await browser.url(getWorkflowUrl(STORY_URLS.vaultFlow));
  await browser.clickPayPalButton();

  const originalWindow = await switchToPayPalPopup();

  await completeBillingAgreementLogin(); // Uses different URL checks
  await approveBillingAgreement(); // Clicks Agree/Continue/Set Up
  await waitForPopupToClose(originalWindow);
  await switchToOriginalWindow(originalWindow);

  const result = await browser.getBillingAgreementResult();
  expect(result.success).toBe(true);
  expect(result.hasNonce).toBe(true);
});
```

**Test Constants** (`tests/paypal-checkout-v6/constants.ts`):

```typescript
import {
  TEST_TIMEOUTS,
  STORY_URLS,
  BILLING_AGREEMENT_MESSAGES,
} from "./constants";

// Available story URLs:
STORY_URLS.oneTimePayment;
STORY_URLS.vaultFlow;
STORY_URLS.recurringPlanType;
STORY_URLS.subscriptionPlanType;
STORY_URLS.unscheduledPlanType;
STORY_URLS.installmentsPlanType;
```

**PayPal UI Selectors** (in `constants.ts` at root level):

```typescript
import { PAYPAL_SELECTORS, PAYPAL_POPUP_TIMEOUTS } from "../../constants";

// Selectors use text-based matching for stability across PayPal UI updates
PAYPAL_SELECTORS.EMAIL_INPUT; // "#email"
PAYPAL_SELECTORS.EMAIL_NEXT_BUTTON; // "button=Next"
PAYPAL_SELECTORS.GET_CODE_BUTTON; // "button*=Get a Code"
PAYPAL_SELECTORS.ALT_OTP_INPUT; // "#ci"
```

## Environment Variables

Required in `.env`:

```bash
STORYBOOK_BRAINTREE_TOKENIZATION_KEY=sandbox_xxxxx_yyyyyy
STORYBOOK_BRAINTREE_CLIENT_TOKEN=eyJ...  # For V6 (client token required)

# For PayPal V6 integration tests:
PAYPAL_SANDBOX_BUYER_EMAIL=your_sandbox_buyer@example.com
PAYPAL_SANDBOX_OTP_CODE=111111

# For integration tests only:
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key
```

## Using Local Builds

```bash
npm run build                        # Build SDK
npm run storybook:copy-local-build   # Copy to static directory
npm run storybook:dev-local          # Start with local build
```

Or combined: `npm run storybook:dev-local` (runs copy-local-build first)

## Managing SDK Versions

The `versions.json` file lists all available SDK versions in the Storybook toolbar:

- **"dev"** - Always first, represents local build
- **Production versions** - Listed in descending order (newest first)

To add a new version, prepend it to the array after "dev":

```json
[
  "dev",
  "3.135.0",  // New version added here
  "3.134.0",
  ...
]
```

The versions are fetched from NPM CDN: `https://js.braintreegateway.com/web/{version}/js/`

## Troubleshooting

### Local Build Not Appearing

1. Run `npm run build`
2. Run `npm run storybook:copy-local-build`
3. Check `.storybook/static/local-build/js/` for `.js` files

### SDK Loading Errors

1. Check browser console for script loading errors
2. Verify `STORYBOOK_BRAINTREE_TOKENIZATION_KEY` in `.env`
3. Try switching to a CDN version in toolbar
4. For local builds, ensure build was run first

### Version Switching Issues

1. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
2. Check URL has correct `globals` parameter
3. Check console for version selection logs

### PayPal V6 Test Issues

1. **Missing OTP/Email config** - Check `PAYPAL_SANDBOX_BUYER_EMAIL` and `PAYPAL_SANDBOX_OTP_CODE` in `.env`
2. **PayPal popup not opening** - Ensure test waits for `waitForPayPalButtonReady()` before clicking
3. **OTP input not found** - PayPal may use different selectors; check `PAYPAL_SELECTORS.ALT_OTP_INPUT`
4. **Approval button not clicking** - PayPal UI changes frequently; text-based selectors (`button*=Pay$`) are more stable than ID selectors
5. **Popup not closing after approval** - Increase `waitForPopupToClose` timeout; PayPal sandbox can be slow
6. **"Client token required" error** - V6 requires `STORYBOOK_BRAINTREE_CLIENT_TOKEN`, not tokenization key

### WebDriverIO Test Debugging

- Tests run on BrowserStack with `maxInstances: 10` parallel browsers
- Use `browser.pause(5000)` for debugging (remove before commit)
- Check BrowserStack dashboard for video recordings and logs
- `LOCAL_BUILD=true` increases timeouts automatically
