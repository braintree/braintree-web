# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Component-Specific Documentation

Each component has its own CLAUDE.md with detailed guidance. These are automatically loaded when working in that directory.

**Core:** `client`, `hosted-fields`, `three-d-secure`, `data-collector`, `lib/frame-service`

**Digital Wallets:** `apple-pay`, `google-payment`

**Alternative Payment Methods:** `paypal-checkout`, `paypal-checkout-v6`, `venmo`, `us-bank-account`, `sepa`, `local-payment`

**Card Networks:** `american-express`, `unionpay`

**Services:** `instant-verification`, `payment-ready`, `payment-request`, `vault-manager`, `fastlane`

**Deprecated (Do Not Use):** `paypal` (use paypal-checkout), `masterpass`, `visa-checkout`, `preferred-payment-methods`

## Development Tools

**Storybook:** See `/.storybook/CLAUDE.md` for interactive component development, visual testing, integration testing, SDK version management, and writing stories.

## Commands

### Development

- `npm run build` - Build all components
- `npm run build <component>` - Build a single component (e.g., `npm run build client`)
- `npm run watch:integration` - Watch for changes and rebuild automatically

### Local Build Testing

- `npm run storybook:dev-local` - Start Storybook with your local builds (copies build files automatically)
- `npm run storybook:copy-local-build` - Copy local builds to Storybook static directory

### Testing

- `npm test` - Run all tests
- `npm test <component>` - Run tests for a single component (e.g., `npm test client`)
- `npm test lib` - Run tests for the lib directory
- `jest <path-to-file>` - Run a single test file (requires jest installed globally)

### Linting and Formatting

- `npm run lint` - Lint all code
- `npm run lint <component>` - Lint a single component
- `npm run prettier` - Format all code with Prettier

### Documentation and Development Tools

- `npm run jsdoc` - Generate JSDoc documentation
- `npm run storybook:dev` - Start Storybook development server on port 6006
- `npm run storybook:build` - Build Storybook static files
- `npm run test:integration` - Run BrowserStack integration tests with CDN versions
- `npm run test:integration:local` - Run tests with your local build (`LOCAL_BUILD=true`)
- `npm run test:integration -- --spec .storybook/tests/your-test.test.ts` - Run single test file

## Architecture

### Project Structure

- `src/` - Source code organized by payment method components
- `src/lib/` - Shared utilities and core functionality
- `src/index.js` - Main entry point that exports all payment method modules
- `tasks/` - Gulp build tasks, one per component
- `test/` - Test files mirroring the src/ structure
- `components.json` - List of all payment method components

### Build System

- Uses Gulp with component-specific tasks in `tasks/` directory
- Each component defined in `components.json` gets its own build task
- Browserify for bundling with environment variable transforms
- Outputs to `dist/` with separate npm and hosted (CDN) builds

### Testing

- Jest for unit testing with component-specific configurations
- Tests mirror src/ structure in test/ directory
- Integration tests using WebDriver with Browserstack
- Storybook for component development and testing

## Component Implementation Patterns

### Standard Component Creation

All components follow this lifecycle pattern:

1. **Basic Verification** - Using `basicComponentVerification.verify()`
2. **Client Creation** - Either use provided client or create deferred client
3. **Configuration Check** - Verify component is enabled in gateway config
4. **Component Initialization** - Create and return component instance

### Component Structure

```javascript
// src/<component>/index.js
function create(options) {
  return basicComponentVerification
    .verify({
      name: "ComponentName",
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      return createDeferredClient.create({
        authorization: options.authorization,
        client: options.client,
        assetsUrl: createAssetsUrl.create(options.authorization),
        name: "ComponentName",
      });
    })
    .then(function (client) {
      // Check gateway configuration
      // Initialize component
      // Return component instance
    });
}
```

### Error Handling

Use `BraintreeError` for all error conditions:

```javascript
var BraintreeError = require("../lib/braintree-error");

// Create error with proper type classification
new BraintreeError({
  type: BraintreeError.types.MERCHANT, // CUSTOMER, MERCHANT, NETWORK, INTERNAL, UNKNOWN
  code: "COMPONENT_SPECIFIC_ERROR_CODE",
  message: "User-friendly error message",
  details: { originalError: err }, // Optional additional info
});
```

### Inheritance Patterns

When extending classes or using prototypal inheritance:

**CRITICAL:** Always use `.prototype` when setting up prototype chains with `Object.create()`:

```javascript
// CORRECT
ChildClass.prototype = Object.create(ParentClass.prototype, {
  constructor: ChildClass,
});

// WRONG - This breaks the prototype chain
ChildClass.prototype = Object.create(ParentClass, {
  constructor: ChildClass,
});
```

Example from the codebase:

- `BaseFramework` extends `EventEmitter` at `src/three-d-secure/external/frameworks/base.js:43`
- `SongbirdFramework` extends `BaseFramework` at `src/three-d-secure/external/frameworks/songbird.js:50`

Always verify inheritance chains are correctly established so child instances can access parent methods.

## Build Process Details

### Browserify Pipeline

1. **Environment Transform** - `envify` replaces `process.env` variables
2. **Code Removal** - `removeIf(production)` blocks stripped in production
3. **Derequire** - Prevents global require conflicts
4. **Minification** - UglifyJS for production builds

### Build Outputs

- `dist/npm/` - CommonJS modules for npm package
- `dist/hosted/` - CDN-ready files with versioned paths

### Component Build Tasks

Each component in `components.json` gets:

- `build:<component>` - Build single component
- `lint:<component>` - Lint single component
- Individual gulp task in `tasks/<component>.js`

## Testing Patterns

### Test Structure

- Tests mirror `src/` structure in `test/` directory
- Each component has its own Jest configuration
- Global test timeout: 4 seconds

### Test Helpers

- `test/helpers/promise-helper.js` - Promise testing utilities
- `test/helpers/components.js` - Component-specific helpers
- `rejectIfResolves()` - Helper for testing promise rejections
- `wait(time)` - Helper for async testing delays

### Running Tests

```bash
# All tests for a component
npm test client

# Single test file
jest test/client/unit/client.js

# With coverage
BRAINTREE_JS_ENV=development jest --coverage
```

## Debugging and Troubleshooting

### Environment Setup

Create `.env` file with development settings:

```bash
BRAINTREE_JS_API_HOST=development.gateway.hostname
BRAINTREE_JS_API_PORT=443
BRAINTREE_JS_API_PROTOCOL=https
STORYBOOK_BRAINTREE_TOKENIZATION_KEY=your_sandbox_key
```

### Analytics and Logging

Components send analytics events for debugging:

```javascript
var analytics = require("../lib/analytics");

// Send event for debugging
analytics.sendEvent(client, "component.action.started");
```

### Common Error Codes

- `CLIENT_AUTHORIZATION_INVALID` - Invalid/expired authorization
- `INCOMPATIBLE_VERSIONS` - Version mismatch between components
- `COMPONENT_NOT_ENABLED` - Component disabled in gateway config
- `CLIENT_SCRIPT_FAILED_TO_LOAD` - Network/CDN loading issues

### Frame Communication Issues

For components using Frame Service (PayPal, Venmo, SEPA, Local Payment), see `/src/lib/frame-service/CLAUDE.md` for detailed debugging guidance.

For Hosted Fields iframe issues, see `/src/hosted-fields/CLAUDE.md`.

**General debugging:**

1. Check browser console for framebus errors
2. Verify iframe URLs are loading correctly
3. Ensure proper domain configuration for cross-origin
4. Test with `BRAINTREE_JS_ENV=development` for detailed logging

## Integration Testing with BrowserStack

### Test Structure

Integration tests use WebDriverIO with BrowserStack across multiple browsers:

- Chrome (Windows 10)
- Safari (macOS Monterey)
- Firefox (macOS Monterey)
- Edge (Windows 10)

### Custom Browser Commands

Commands are registered via `loadHelpers()` in `.storybook/tests/helpers/browser-commands/index.ts`:

**Common Commands:**

- `browser.getResult()` - Extract success/failure from result div

**Hosted Fields Commands:**

- `browser.waitForHostedFieldsReady()` - Wait for SDK and all hosted field iframes
- `browser.hostedFieldSendInput(key, value)` - Type into hosted field iframe
- `browser.submitPay()` - Submit form and wait for result

**PayPal Commands:**

- `completePayPalCheckoutFlow()` - Full PayPal login and approval flow
- `switchToPayPalPopup()` - Switch to PayPal popup window

**Network Interception:**

- Uses `wdio-intercept-service` for network request verification
- `browser.setupInterceptor()` - Setup network interception
- `browser.getRequests()` - Get intercepted HTTP requests

### Writing Integration Tests

```typescript
import { browser } from "@wdio/globals";
import { expect } from "chai";
import { getWorkflowUrl } from "./helpers/url-utils";
import { loadHelpers } from "./helpers/browser-commands";

describe("Component Integration", () => {
  before(() => loadHelpers());

  it("should complete flow", async () => {
    const url = getWorkflowUrl("/iframe.html?id=story-id");
    await browser.url(url);
    await browser.setupInterceptor();

    // Test implementation
    const requests = await browser.getRequests();
    expect(requests).to.have.length.greaterThan(0);
  });
});
```

### Running Integration Tests

```bash
# All tests
npm run test:integration

# With local build
npm run test:integration:local

# Single test file
npm run test:integration -- --spec .storybook/tests/your-test.test.ts
```

## Important Notes

### Environment Variables

Required in `.env` file:

```bash
# Local development (not committed to git)
BRAINTREE_JS_API_HOST=development.gateway.hostname
BRAINTREE_JS_API_PORT=443
BRAINTREE_JS_API_PROTOCOL=https
STORYBOOK_BRAINTREE_TOKENIZATION_KEY=sandbox_xxxxx_yyyyyy

# For integration tests only
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key
PAYPAL_SANDBOX_BUYER_EMAIL=buyer@example.com
PAYPAL_SANDBOX_OTP_CODE=111111
```

### Code Style

- 2-space indentation
- ES5 syntax (for browser compatibility) - use `function` not arrow functions, `var` not `const/let`
- ES5 Promises for functional code; async/await allowed only in tests
- JSDoc comments for public APIs
- Prettier for consistent formatting
- ESLint with Braintree configuration
- Never use emojis in code or comments

### Dependencies

- Core dependencies are minimal browser-compatible libraries
- Custom Braintree packages prefixed with `@braintree/`
- Uses framebus for iframe communication (see Frame Service and Hosted Fields docs)
- Cardinal Commerce Songbird.js for 3D Secure (loaded dynamically)
- SJCL crypto library (custom build) for data-collector component

### Development Workflow

1. Run `npm test` after making changes (includes linting)
2. Use `npm run build <component>` to build specific components during development
3. Test integration scenarios in Storybook
4. Follow existing patterns when adding new components or features
5. Use `scripts/npm-to-gulp` wrapper for component-specific commands
6. Check version compatibility with `basicComponentVerification`
7. Verify environment variables are set correctly for local development
8. For components requiring secure UI (popups/modals), use Frame Service (see `/src/lib/frame-service/CLAUDE.md`)
9. For components requiring card input, use Hosted Fields (see `/src/hosted-fields/CLAUDE.md`)
10. For transactions requiring 3DS authentication, integrate with 3D Secure component (see `/src/three-d-secure/CLAUDE.md`)

## Planning and Response Format

### Planning Phase

Before implementing code changes, always start with a planning phase that includes:

- A high-level overview of the problem to be solved
- All functions, sections, and files that need modification or creation
- The order in which changes will be applied
- A breakdown of the solution into smaller, manageable components
- Consideration of edge cases and error handling
- Definition of expected input and output for each function

### Response Structure

- Use headings and subheadings to separate different sections
- Use bullet points or numbered lists for clarity
- Include code snippets where necessary, properly formatted
- Provide explanations for complex logic or decisions
- Do not include emojis in responses

## Coding Guidelines

### Clean and Readable Code

- Follow consistent naming conventions (camelCase for variables/functions in JavaScript)
- Maintain proper indentation (2 spaces)
- Adhere to Single Responsibility Principle (SRP)

### Semantic Naming

- Variables, functions, classes, and methods should have meaningful names that clearly describe their purpose

### Testing

- Write meaningful unit tests using Jest
- Ensure tests verify actual functionality, edge cases, and error handling
- Use ES5 Promises for functional code, async for tests

### Security

- Follow OWASP best practices for secure coding
- Protect sensitive data using environment variables
- Regularly update dependencies to patch vulnerabilities

### Documentation

- Write clear, concise JSDocs for new functionality
- Include comments only when necessary to explain non-obvious or complicated logic
