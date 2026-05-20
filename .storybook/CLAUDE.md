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

- `npm run test:playwright` - Run Playwright tests on BrowserStack
- `npm run test:playwright:local` - Run Playwright tests locally with headed browsers
- Integration coverage (see [Integration Test Coverage](#integration-test-coverage-playwright--v8) section below):
  1. `npm run build:integration:coverage` - Build SDK with source maps, copy to Storybook, build Storybook
  2. `npm run test:integration:coverage` - Chromium-only Playwright run → `coverage/integration/html/index.html`
- `npm run test:integration` - Alias for `test:playwright` (backward compat)
- `npm run test:integration:local` - Alias for `test:playwright:local` (backward compat)
- `npx playwright test --config=.storybook/tests/playwright.browserstack.local.ts .storybook/tests/hosted-fields/tokenization.test.ts` - Run a single Playwright test file locally

## Architecture

### Test Framework

All integration tests use **Playwright** with BrowserStack (Chrome, Safari, Firefox, Edge). Tests use custom fixtures and the page object model pattern. Local execution is also supported.

### Directory Structure

```
.storybook/
├── main.ts                  # Storybook configuration
├── preview.ts               # Global decorators, loaders, and version toolbar
├── constants.ts             # Shared constants (test data, selectors, browser matrix)
├── versions.json            # Available SDK versions for toolbar
│
├── css/
│   └── main.css             # Shared styles (imported globally in preview.ts)
│
├── scripts/
│   ├── copy-local-build.js       # Copies SDK build to static directory
│   ├── generate-test-certs.sh    # Generate SSL certs for HTTPS test server
│   └── browserstack/
│       ├── browserstack-local.ts # BrowserStack Local tunnel management
│       ├── global-setup.ts       # Playwright globalSetup (starts tunnel)
│       └── global-teardown.ts    # Playwright globalTeardown (stops tunnel)
│
├── docs/                    # (staging area — may be removed)
├── stories/                 # Story files organized by component
│   ├── ApplePay/
│   ├── branded_payments/venmo/   # Class-based architecture (VenmoIntegration.ts)
│   ├── HostedFields/             # Multiple stories: standard, styling, cvv-only, cardholder-name
│   ├── LocalPaymentMethods/
│   ├── PayPalCheckout/
│   ├── PayPalCheckoutV6/         # Includes BillingAgreements/ subdirectory
│   ├── ThreeDSecure/
│   ├── VaultManager/
│   └── Venmo/
│
├── utils/                   # Utility functions for stories
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
├── tests/                   # Integration tests
│   ├── playwright.browserstack.config.ts  # Playwright BrowserStack config
│   ├── playwright.browserstack.local.ts   # Playwright local browser config
│   ├── playwright.coverage.config.ts      # Chromium-only + V8 integration coverage
│   ├── global-setup-coverage.ts           # Resets Istanbul map for coverage runs
│   ├── global-teardown-coverage.ts        # Writes coverage/integration reports
│   ├── helpers/
│   │   ├── playwright-helpers.ts      # Playwright custom fixtures (test server, URLs, page object)
│   │   ├── integration-coverage-store.ts  # V8 → Istanbul merge + lcov/html output
│   │   ├── integration-coverage-cdp.ts    # Multi-frame CDP coverage collection
│   │   ├── hosted-fields-page.ts      # HostedFieldsPage page object model
│   │   ├── paypal-checkout-page.ts    # PayPalCheckoutPage page object model
│   │   ├── three-d-secure-page.ts     # ThreeDSecurePage page object model
│   │   └── test-server.ts             # Per-test HTTP/HTTPS server for isolation
│   ├── hosted-fields/               # Playwright tests
│   │   ├── tokenization.test.ts
│   │   ├── validation.test.ts
│   │   ├── styling.test.ts
│   │   ├── csp.test.ts
│   │   ├── cvv-only.test.ts
│   │   ├── cardholder-name.test.ts
│   │   ├── events.test.ts
│   │   ├── lifecycle.test.ts
│   │   └── accessibility.test.ts
│   ├── apple-pay/                   # Playwright tests
│   │   └── rendering.test.ts
│   ├── paypal-checkout-v6/          # Playwright tests
│   │   ├── checkout.test.ts
│   │   ├── billing-agreement.test.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   └── paypal-checkout/             # Playwright tests (legacy paypal-checkout)
│       ├── checkout.test.ts
│       ├── billing-agreement.test.ts
│       ├── configuration.test.ts
│       ├── error-handling.test.ts
│       ├── accessibility.test.ts
│       ├── lifecycle.test.ts
│       ├── vault-initiated-checkout.test.ts  # Deferral placeholder (see file)
│       ├── constants.ts
│       └── helpers.ts
│
├── types/                   # TypeScript type definitions
│   ├── global.d.ts               # Braintree/PayPal SDK interfaces
│   ├── browserstack.d.ts         # BrowserStack capability types
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
- `SUCCESS_MESSAGES.VERIFICATION` - "Card verified successfully!"
- `DEFAULT_HOSTED_FIELDS_VALUES` - Default test card values (number, cvv, expirationDate, postalCode)
- `BASE_URL` - `https://127.0.0.1:8080`
- `PAYPAL_SUCCESS_MESSAGES` - PayPal authorization/cancellation messages
- `PAYPAL_POPUP_TIMEOUTS` - Timeout values for PayPal popup flow steps
- `browsers` - BrowserStack test matrix (Chrome, Edge, Safari, Firefox)

## Integration Testing with Playwright

All integration tests use Playwright.

### Running Playwright Tests

```bash
# Run all Playwright tests on BrowserStack
npm run test:playwright

# Run locally with headed browsers
npm run test:playwright:local

# Run a single test file locally
npx playwright test --config=.storybook/tests/playwright.browserstack.local.ts .storybook/tests/hosted-fields/tokenization.test.ts

# Run the legacy paypal-checkout suite locally
npx playwright test --config=.storybook/tests/playwright.browserstack.local.ts .storybook/tests/paypal-checkout/
```

The `paypal-checkout/` and `paypal-checkout-v6/` suites require PayPal sandbox credentials in `.env`:

```bash
PAYPAL_SANDBOX_BUYER_EMAIL=buyer@example.com
PAYPAL_SANDBOX_BUYER_PASSWORD=your_sandbox_password
PAYPAL_SANDBOX_OTP_CODE=111111  # optional, defaults to 111111
```

### Playwright Configuration

- **BrowserStack config:** `tests/playwright.browserstack.config.ts` - 4 workers, 3 retries, 90s timeout
- **Local config:** `tests/playwright.browserstack.local.ts` - Uses Playwright device presets, 4 retries
- **Global setup/teardown:** `scripts/browserstack/` manages BrowserStack Local tunnel lifecycle
- **Test ignores:** Apple Pay tests only run on Safari

### Custom Fixtures (`tests/helpers/playwright-helpers.ts`)

All Playwright tests import `test` from `playwright-helpers.ts` instead of directly from `@playwright/test`. This provides:

- **`testServer`** - Auto-creates an isolated HTTP/HTTPS server per test, auto-closes after
- **`getTestUrl`** - Builds story URLs with option flags; auto-appends `sdkVersion:dev` when `LOCAL_BUILD=true`
- **`hostedFieldsPage`** - `HostedFieldsPage` page object instance
- **`paypalCheckoutPage`** - `PayPalCheckoutPage` page object instance (auto-closes popup after test)

```typescript
import { test } from "../helpers/playwright-helpers";
```

### `getTestUrl` Options

The `getTestUrl` fixture accepts an options object to select which story URL to use:

| Option                                 | Story                            |
| -------------------------------------- | -------------------------------- |
| `{}` (default)                         | Standard Hosted Fields           |
| `{ noPostalCode: true }`               | Standard without postal code     |
| `{ lightTheme: true }`                 | Light theme custom styling       |
| `{ darkTheme: true }`                  | Dark theme custom styling        |
| `{ cvvOnly: true }`                    | CVV-only verification            |
| `{ amexUrl: true }`                    | CVV-only with Amex card type     |
| `{ cardholderName: true }`             | Cardholder name field            |
| `{ csp: true, useMinified?: boolean }` | CSP test story                   |
| `{ applePay: true, useHttps: true }`   | Apple Pay story (requires HTTPS) |

### HostedFieldsPage Page Object (`tests/helpers/hosted-fields-page.ts`)

Encapsulates all hosted fields iframe interactions:

- `waitForHostedFieldsReady()` - Wait for SDK initialization and all hosted field iframes
- `hostedFieldSendInput(key, value?)` - Type into hosted field iframe (uses `DEFAULT_HOSTED_FIELDS_VALUES` if no value)
- `clickHostedFieldInput(key)` - Click a hosted field input
- `findInputInFrame(key)` - Get a `Locator` for a hosted field input
- `hostedFieldClearWithKeypress(key, deleteCount)` - Clear field using sequential backspace keypresses
- `waitForHostedField(key)` - Wait for a specific hosted field iframe to be ready
- `waitForElementToHaveAttribute(id, attribute, value)` - Wait for element attribute match
- `submitPay()` - Click submit button and wait for result to appear
- `getResult()` - Extract success/failure from result div
- `reloadSessionOnRetry(currentRetry)` - Reload page when retrying a failed test

Valid `HostedFieldKey` values: `"number"`, `"expirationDate"`, `"cvv"`, `"postalCode"`, `"cardholderName"`

### PayPalCheckoutPage Page Object (`tests/helpers/paypal-checkout-page.ts`)

Encapsulates all PayPal popup interactions:

- `waitForPayPalButtonReady()` - Wait for `.paypal-button` to be visible and sized
- `clickPayPalButton()` - Click the PayPal button
- `waitForPopup()` - Click button and capture popup window
- `closePopup()` - Close popup if still open
- `waitForPopupToClose()` - Wait for popup to close automatically after approval
- `completePayPalLogin()` - Full login flow (email, detect login style, password/OTP)
- `completeBillingAgreementLogin()` - Login flow for billing agreement URLs
- `approvePayPalPayment()` - Click Pay/Continue button
- `approveBillingAgreement()` - Click Agree/Continue/Set Up button
- `cancelPayPalPayment()` - Close popup to cancel
- `getPayPalResult()` - Get result with success/cancelled/error status
- `getBillingAgreementResult()` - Extended result with hasNonce/hasEmail/hasPlanType
- `getResultContainerState()` - Check result container visibility and text
- `setupNetworkCapture()` - Intercept POST requests for payload verification
- `completePayPalCheckoutFlow()` - Full flow: login + approve + wait for close

### Writing Playwright Tests

```typescript
import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";

test.describe("Component Integration", function () {
  test.beforeEach(async ({ hostedFieldsPage, getTestUrl, page }) => {
    await page.goto(getTestUrl({}), { waitUntil: "domcontentloaded" });
    await hostedFieldsPage.waitForHostedFieldsReady();
  });

  test.afterEach(async ({ page }) => {
    try {
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should tokenize card", async ({ hostedFieldsPage }) => {
    await hostedFieldsPage.hostedFieldSendInput("number");
    await hostedFieldsPage.hostedFieldSendInput("cvv");
    await hostedFieldsPage.hostedFieldSendInput("expirationDate");
    await hostedFieldsPage.hostedFieldSendInput("postalCode");

    await hostedFieldsPage.submitPay();
    const result = await hostedFieldsPage.getResult();
    expect(result.success).toBe(true);
  });
});
```

### Test Server Configuration

The `testServer` fixture wraps `createTestServer()` from `tests/helpers/test-server.ts`. Override options using `test.use()`:

```typescript
test.use({
  testServerOptions: {
    useHttps: true, // HTTPS server (requires SSL certs from generate-test-certs.sh)
    enableCsp: true, // Enable CSP headers on hosted-fields-frame responses
    cspReports: [], // Array to collect CSP violation reports
    cspScriptSrc: "'self'", // Custom script-src directive
    modifyMetaTag: true, // Modify CSP meta tag in served HTML
    forceServeMinified: true, // Serve .min.html variant
    customHeaders: {}, // Additional response headers
  },
  ignoreHTTPSErrors: true, // Playwright option for self-signed certs
});
```

### Apple Pay Testing Pattern

Apple Pay requires real Safari with Apple Wallet, so tests mock the `ApplePaySession` API using `page.addInitScript()`:

```typescript
test.use({
  testServerOptions: { useHttps: true },
  ignoreHTTPSErrors: true,
});

test.beforeEach(async ({ getTestUrl, page }) => {
  await page.addInitScript(() => {
    window.ApplePaySession = {
      canMakePayments: () => true,
      STATUS_SUCCESS: 0,
      STATUS_FAILURE: 1,
    } as any;
    // Also mock braintree.client.create to inject applePayWeb gateway config
  });

  await page.goto(getTestUrl({ applePay: true, useHttps: true }), {
    waitUntil: "domcontentloaded",
  });
});
```

### CSP Testing Pattern

CSP tests validate that hosted-fields-frame.html works with correct Content-Security-Policy headers and fails with invalid ones:

```typescript
test.use({
  testServerOptions: {
    enableCsp: true,
    cspReports: cspReports,
    cspScriptSrc: scriptSrc, // Extracted from actual HTML via extractScriptSrcFromHTML()
    forceServeMinified: true, // Test both regular and minified builds
  },
});
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

## CI/CD Pipeline (GitHub Actions)

The integration tests run via `.github/workflows/integration-tests.yml` on every PR and `workflow_dispatch`.

### Job Structure

1. **`build`** - Builds SDK, copies local build, builds Storybook, generates SSL certs, and uploads artifacts (`storybook-static/`, `.storybook/certs/`, `dist/hosted/`)
2. **`playwright-tests`** - Downloads artifacts, starts BrowserStack Local tunnel, starts HTTPS server, runs sharded tests
3. **`merge-reports`** - Downloads all blob reports, merges into JSON, publishes PR comment with results

### Test Sharding

Tests are split across **8 parallel shards** using Playwright's `--shard` flag:

```yaml
strategy:
  matrix:
    shardIndex: [1, 2, 3, 4, 5, 6, 7, 8]
    shardTotal: [8]
```

Each shard runs: `npx playwright test --config=.storybook/tests/playwright.browserstack.config.ts --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}`

### BrowserStack Local in CI

In CI, BrowserStack Local tunnel is managed by the `browserstack/github-actions/setup-local@master` action (not the `global-setup.ts` script). Each shard gets a unique tunnel identifier:

```yaml
BROWSERSTACK_LOCAL_IDENTIFIER: ${{ github.sha }}-${{ matrix.shardIndex }}
```

This avoids tunnel conflicts between concurrent shards.

### Report Merging

Each shard uploads a `blob-report-{shardIndex}` artifact. The `merge-reports` job:

1. Downloads all blob reports
2. Merges them: `npx playwright merge-reports --reporter=json ./all-blob-reports`
3. Publishes a PR comment via `daun/playwright-report-summary`

### CI Environment Variables

In addition to the local `.env` variables, CI uses these secrets:

```bash
BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY
STORYBOOK_BRAINTREE_TOKENIZATION_KEY
STORYBOOK_BRAINTREE_MERCHANT_ID
STORYBOOK_BRAINTREE_PUBLIC_KEY
STORYBOOK_BRAINTREE_PRIVATE_KEY
STORYBOOK_BRAINTREE_CUSTOMER_ID
PAYPAL_SANDBOX_BUYER_EMAIL / PAYPAL_SANDBOX_BUYER_PASSWORD
```

## Integration Test Coverage (Playwright + V8)

Integration test coverage measures how much of `src/` is exercised by the Playwright tests under `.storybook/tests/**/*.test.ts`. It uses Chromium V8 JavaScript coverage via CDP, converts V8 byte ranges to Istanbul format with `v8-to-istanbul`, and writes HTML/LCOV reports.

Coverage is **Chromium-only** — Firefox, WebKit, and BrowserStack runs do not contribute.

### Running Coverage Locally

```bash
# 1. Build SDK + copy to Storybook + build Storybook (one command)
npm run build:integration:coverage

# 2. Run Chromium-only Playwright suite with V8 coverage
npm run test:integration:coverage
```

Step 1 only needs re-running when SDK source changes. Step 2 can be re-run alone.

`build:integration:coverage` chains: `build` (with `BRAINTREE_JS_COVERAGE_BUILD=true`, retains `*-internal.js` files and generates source maps) → `storybook:copy-local-build` (copies `dist/` into `.storybook/static/local-build/`) → `storybook:build` (materializes `storybook-static/` with coverage-instrumented bundles) → `generate-test-certs`.

To run sub-steps individually (e.g. rebuild Storybook without rebuilding SDK):

```bash
npm run build:coverage              # build SDK with coverage maps
npm run storybook:copy-local-build  # copy dist/ into .storybook/static/local-build/
npm run storybook:build             # build storybook-static/ from .storybook/static/
```

### Running a Subset

```bash
# Single test file
BRAINTREE_JS_ENV=development PLAYWRIGHT_INTEGRATION_COVERAGE=true LOCAL_BUILD=true \
  npx playwright test --config=.storybook/tests/playwright.coverage.config.ts \
  .storybook/tests/hosted-fields/tokenization.test.ts

# Grep pattern
BRAINTREE_JS_ENV=development PLAYWRIGHT_INTEGRATION_COVERAGE=true LOCAL_BUILD=true \
  npx playwright test --config=.storybook/tests/playwright.coverage.config.ts \
  --grep "tokenize"
```

### Output

| File                                        | Format        | Use                                                                                          |
| ------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| `coverage/integration/html/index.html`      | Istanbul HTML | Per-file line/branch/function coverage; landing page shows `src/` with aggregate percentages |
| `coverage/integration/lcov.info`            | LCOV          | Machine-readable for CI tools and IDE plugins                                                |
| `coverage/integration/coverage-summary.txt` | Plain text    | Console-friendly summary table                                                               |

### Environment Variables

| Variable                          | Default | Purpose                                                                                           |
| --------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `PLAYWRIGHT_INTEGRATION_COVERAGE` | —       | Set to `true` to enable V8 coverage collection (set automatically by `test:integration:coverage`) |
| `INTEGRATION_COVERAGE_ZERO_FILL`  | `true`  | Set to `false` to skip zero-fill; report only shows files V8 actually executed                    |

### How It Works

- **Per-test collection:** An `auto: true` fixture in `playwright-helpers.ts` starts/stops CDP coverage for every test. Coverage is flushed before `page.reload()` so iframe scripts aren't lost.
- **Frame HTML merging:** Components like Hosted Fields inline Browserify bundles into HTML frames. The merge step matches CDP script text against on-disk `*-internal.js` files (kept by the coverage build). Anonymous iframe scripts (empty CDP URL) are fingerprinted against known internal bundles.
- **Shard persistence:** Workers write Istanbul JSON shards to `coverage/integration/.playwright-v8-shards/`; global teardown merges all shards.
- **Key remap:** Istanbul keys from `dist/.../js/src/...` are rewritten to `cwd/src/...` so V8 hits and zero-fill share one file tree. `node_modules` and stray report artifacts are dropped.
- **Zero-fill:** After remap, any `src/**/*.js` file missing from the map is instrumented at 0% via `istanbul-lib-instrument` so untouched modules appear at 0% rather than being omitted.

### Common Pitfalls

- **Skipping `storybook:build` after editing a story (`.stories.ts`)** — `storybook-static/` is what the integration server serves; e.g. new `onCancel` / mock hooks in a story will not run until the static bundle is rebuilt. (`build:integration:coverage` does this; ad-hoc runs need `npm run storybook:build` after story changes.)
- **Skipping `storybook:build` after copy** — `storybook-static/` has stale bundles; CDP text won't match on-disk files and frame internals silently get 0%.
- **Non-coverage build** — Without `BRAINTREE_JS_COVERAGE_BUILD=true`, `*-internal.js` files are deleted and source maps may be incomplete. `build:coverage` and `build:integration:coverage` set this automatically.
- **Running on Firefox/WebKit** — V8 coverage is Chromium-only. The coverage config restricts to Desktop Chrome.

### Config Entry Points

- Playwright config: `tests/playwright.coverage.config.ts`
- V8 → Istanbul merge + reports: `tests/helpers/integration-coverage-store.ts`
- Multi-frame CDP collection: `tests/helpers/integration-coverage-cdp.ts`
- Global setup (shard reset): `tests/global-setup-coverage.ts`
- Global teardown (report writing): `tests/global-teardown-coverage.ts`

### CI

A dedicated `playwright-coverage` job in `.github/workflows/integration-tests.yml` runs unsharded Chromium Playwright with coverage enabled and uploads `coverage/integration/` as an artifact. The BrowserStack matrix is unchanged and does not contribute to coverage.

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

### HTTPS Test Server Issues

1. Generate SSL certs: `.storybook/scripts/generate-test-certs.sh`
2. Certs are stored in `.storybook/certs/` (localhost.key, localhost.crt)
3. Use `ignoreHTTPSErrors: true` in Playwright test config for self-signed certs

### PayPal V6 Test Issues

1. **Missing OTP/Email config** - Check `PAYPAL_SANDBOX_BUYER_EMAIL` and `PAYPAL_SANDBOX_OTP_CODE` in `.env`
2. **"Client token required" error** - V6 requires `STORYBOOK_BRAINTREE_CLIENT_TOKEN`, not tokenization key

### Test Debugging

- Tests use 4 workers and 3-4 retries by default
- Traces captured on first retry (`trace: "on-first-retry"`)
- View traces: `npx playwright show-report`
- Use `BROWSERSTACK_DISABLE_RETRIES=true` to disable retries for debugging

<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

_No recent activity_
</claude-mem-context>
