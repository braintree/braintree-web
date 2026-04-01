import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Tokenize Card", function () {
  test.beforeEach(async ({ hostedFieldsPage, getTestUrl, page }) => {
    await page.goto(getTestUrl({}), {
      waitUntil: "domcontentloaded",
    });
    await hostedFieldsPage.waitForHostedFieldsReady();
  });

  test.afterEach(async ({ page }) => {
    // Reset browser session after each test to prevent popup dialogs and state leakage
    try {
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should tokenize card successfully with postal code field", async function ({
    hostedFieldsPage,
  }) {
    await hostedFieldsPage.hostedFieldSendInput("number");
    await hostedFieldsPage.hostedFieldSendInput("cvv");
    await hostedFieldsPage.hostedFieldSendInput("expirationDate");
    await hostedFieldsPage.hostedFieldSendInput("postalCode");

    await hostedFieldsPage.submitPay();

    const result = await hostedFieldsPage.getResult();
    expect(result.success).toBe(true);
  });

  test("should tokenize card successfully without postal code field", async function ({
    hostedFieldsPage,
    page,
    getTestUrl,
  }) {
    await page.goto(getTestUrl({ noPostalCode: true }), {
      waitUntil: "domcontentloaded",
    });
    await hostedFieldsPage.waitForHostedFieldsReady();
    await hostedFieldsPage.waitForHostedFieldsReady();
    await hostedFieldsPage.hostedFieldSendInput("number");
    await hostedFieldsPage.hostedFieldSendInput("cvv");
    await hostedFieldsPage.hostedFieldSendInput("expirationDate");

    await hostedFieldsPage.submitPay();

    const result = await hostedFieldsPage.getResult();
    expect(result.success).toBe(true);
  });
});
