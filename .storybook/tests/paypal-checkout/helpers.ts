import { Page } from "@playwright/test";
import { SDK_SCRIPT_SRC_FRAGMENT } from "./constants";

/**
 * Get result container visibility and text state.
 * Mirrors .storybook/tests/paypal-checkout-v6/helpers.ts for parity with the
 * V6 test suite.
 */
export const getResultContainerState = async (
  page: Page
): Promise<{
  isVisible: boolean;
  resultText: string;
}> => {
  const resultContainer = page.locator("#result");
  const resultClasses = await resultContainer.getAttribute("class");
  const isVisible = resultClasses?.includes("shared-result--visible") ?? false;
  const resultText = isVisible
    ? ((await resultContainer.textContent()) ?? "")
    : "";

  return { isVisible, resultText };
};

/**
 * Abort any request to the PayPal SDK script so we can exercise the SDK-load
 * failure path without actually reaching paypal.com. Must be called before the
 * page navigates to the story.
 */
export const blockPayPalSDKScript = async (page: Page): Promise<void> => {
  await page.route(`**/${SDK_SCRIPT_SRC_FRAGMENT}**`, (route) => route.abort());
};
