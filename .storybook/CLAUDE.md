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

## Architecture

### Directory Structure

```
.storybook/
├── main.ts                  # Storybook configuration
├── preview.ts               # Global decorators, loaders, and version toolbar
├── constants.ts             # Shared constants (success messages, test values)
├── versions.json            # List of available SDK versions for toolbar
├── wdio.conf.ts             # WebDriverIO test configuration
│
├── css/
│   └── main.css             # Shared styles (imported globally in preview.ts)
│
├── stories/                 # Story files organized by component
│   ├── HostedFields/
│   ├── PayPalCheckout/
│   ├── ApplePay/
│   ├── ThreeDSecure/
│   ├── VaultManager/
│   ├── Venmo/
│   └── LocalPaymentMethods/
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
│   ├── helper.ts            # Test helper commands
│   └── *.test.ts            # Test files
│
├── types/                   # TypeScript type definitions
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
4. **Shared styles** - Already imported globally via `preview.ts`, no need to import in stories

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

## Integration Testing

### Test Configuration

- **Framework:** Mocha with WebDriverIO
- **Browsers:** Chrome (Windows 10), Safari (macOS Monterey)
- **Base URL:** `https://127.0.0.1:8080`

### Custom Browser Commands

Defined in `tests/helper.ts`:

- `browser.waitForHostedFieldsReady()` - Wait for SDK and all hosted field iframes
- `browser.waitForHostedField(key)` - Wait for specific hosted field
- `browser.hostedFieldSendInput(key, value)` - Type into hosted field iframe
- `browser.waitForFormReady()` - Wait for submit button to be enabled
- `browser.submitPay()` - Submit form and wait for result
- `browser.getResult()` - Extract success/failure from result div
- `getWorkflowUrl(path)` - Build story URL with version param

### Writing Tests

```typescript
import { browser, $ } from "@wdio/globals";
import { expect } from "chai";
import { getWorkflowUrl, loadHelpers } from "./helper";

describe("Component Integration", () => {
  before(() => loadHelpers());

  it("should complete flow", async () => {
    const url = getWorkflowUrl(
      "/iframe.html?id=braintree-component--story-name"
    );
    await browser.url(url);

    await browser.waitForHostedFieldsReady();
    await browser.hostedFieldSendInput("number", "4111111111111111");
    // ...

    const result = await browser.getResult();
    expect(result.success).to.be.true;
  });
});
```

## Environment Variables

Required in `.env`:

```bash
STORYBOOK_BRAINTREE_TOKENIZATION_KEY=sandbox_xxxxx_yyyyyy

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
