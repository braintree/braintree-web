/**
 * WebdriverIO Custom Command Type Definitions
 *
 * This file extends the WebdriverIO Browser interface with custom commands
 * defined in .storybook/tests/helper.ts
 *
 * @see .storybook/tests/helper.ts for implementation details
 */

/* eslint-disable no-unused-vars */

/**
 * Result object returned by the getResult custom command
 */
interface TestResult {
  success: boolean;
}

/**
 * Mocha test object passed to reloadSessionOnRetry
 * This represents the Mocha test context with retry information
 *
 * Note: We use unknown here to be compatible with Mocha's Test type
 * where _currentRetry is a private property. The implementation
 * handles extracting the retry count safely.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MochaTestContext = any;

declare namespace WebdriverIO {
  interface Browser {
    /**
     * Reload browser session on test retry
     * Helps ensure clean state between test retries
     *
     * @param test - The Mocha test object containing retry information
     * @example
     * beforeEach(async function() {
     *   await browser.reloadSessionOnRetry(this.currentTest);
     * });
     */
    reloadSessionOnRetry: (test: MochaTestContext) => Promise<void>;

    /**
     * Get the test result from the result container
     * Checks for success/verification messages in the #result element
     *
     * @returns Object with success boolean
     * @example
     * const result = await browser.getResult();
     * expect(result.success).toBe(true);
     */
    getResult: () => Promise<TestResult>;

    /**
     * Wait for all hosted fields to be ready for interaction
     * This waits for:
     * 1. Braintree SDK to load
     * 2. Hosted field iframes to exist in DOM
     * 3. Each iframe's internal input element to be ready
     *
     * @example
     * await browser.waitForHostedFieldsReady();
     * await browser.hostedFieldSendInput("number");
     */
    waitForHostedFieldsReady: () => Promise<void>;

    /**
     * Wait for a specific hosted field to be ready for interaction
     * Waits for the iframe and its internal input element
     *
     * @param key - The field key (e.g., "number", "cvv", "expirationDate", "postalCode")
     * @example
     * await browser.waitForHostedField("number");
     * await browser.switchFrame($("#braintree-hosted-field-number"));
     */
    waitForHostedField: (key: string) => Promise<void>;

    /**
     * Send input to a hosted field
     * Switches to the iframe, sets the value, and switches back
     *
     * @param key - The field key (e.g., "number", "cvv", "expirationDate", "postalCode")
     * @param value - Optional value to input. If not provided, uses default test values
     * @example
     * // Use default test value
     * await browser.hostedFieldSendInput("number");
     *
     * // Use custom value
     * await browser.hostedFieldSendInput("number", "4111111111111111");
     */
    hostedFieldSendInput: (key: string, value?: string) => Promise<void>;

    /**
     * Clear a hosted field using keypress events
     * Useful for testing field clearing behavior, especially in Safari
     *
     * @param key - The field key (e.g., "number", "cvv", "expirationDate", "postalCode")
     * @param deleteCount - Number of backspace keypresses to send
     * @example
     * await browser.hostedFieldSendInput("number", "4111");
     * await browser.hostedFieldClearWithKeypress("number", 4);
     */
    hostedFieldClearWithKeypress: (
      key: string,
      deleteCount: number
    ) => Promise<void>;

    /**
     * Wait for the form to be ready for submission
     * Waits until the submit button is enabled (form validation passed)
     *
     * @example
     * await browser.hostedFieldSendInput("number");
     * await browser.waitForFormReady();
     * await browser.submitPay();
     */
    waitForFormReady: () => Promise<void>;

    /**
     * Submit the payment form and wait for result
     * Clicks the submit button and waits for the result container to become visible
     *
     * @example
     * await browser.hostedFieldSendInput("number");
     * await browser.hostedFieldSendInput("cvv");
     * await browser.hostedFieldSendInput("expirationDate");
     * await browser.submitPay();
     * const result = await browser.getResult();
     */
    submitPay: () => Promise<void>;
  }
}
