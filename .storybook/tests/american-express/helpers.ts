import { Page } from "@playwright/test";

/**
 * Mock American Express API responses.
 *
 * The Amex component calls client.request() which makes HTTP requests to the
 * Braintree gateway. We intercept these at the network level using page.route()
 * to avoid race conditions with SDK initialization.
 */

export const MOCK_REWARDS_BALANCE = {
  rewardsAmount: "45256",
  rewardsUnit: "Points",
  currencyAmount: "316.79",
  currencyIsoCode: "USD",
  conversationId: "mock-conversation-id",
  requestId: "mock-request-id",
  error: null,
};

export const MOCK_EXPRESS_CHECKOUT_PROFILE = {
  amexExpressCheckoutCards: [
    {
      nonce: "tokencc_mock_amex_nonce_123",
      cardType: "American Express",
      lastTwo: "05",
      expirationMonth: "12",
      expirationYear: "2027",
      bin: "378282",
      subscriberId: "mock-subscriber-id",
    },
  ],
};

export const setupAmexMock = async (page: Page): Promise<void> => {
  // Intercept Amex rewards balance API calls at the network level
  await page.route("**/payment_methods/amex_rewards_balance**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_REWARDS_BALANCE),
    });
  });

  // Intercept Amex Express Checkout profile API calls at the network level
  await page.route(
    "**/payment_methods/amex_express_checkout_cards/**",
    (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_EXPRESS_CHECKOUT_PROFILE),
      });
    }
  );
};

export const setupAmexNetworkErrorMock = async (page: Page): Promise<void> => {
  // Intercept Amex rewards balance API calls and return a server error
  await page.route("**/payment_methods/amex_rewards_balance**", (route) => {
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Server error" } }),
    });
  });

  // Intercept Amex Express Checkout profile API calls and return a server error
  await page.route(
    "**/payment_methods/amex_express_checkout_cards/**",
    (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Server error" } }),
      });
    }
  );
};

export const waitForStoryReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => document.querySelector(".shared-container") !== null,
    undefined,
    { timeout: 30000 }
  );
};

export const waitForAmexReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => {
      const status = document.querySelector("#amex-status");
      return status !== null && status.classList.contains("amex-status--ready");
    },
    undefined,
    { timeout: 35000 }
  );
};

export const cleanupAfterTest = async (page: Page): Promise<void> => {
  try {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page?.reload({ waitUntil: "domcontentloaded" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("Error reloading session:", (err as Error).message);
  }
};
