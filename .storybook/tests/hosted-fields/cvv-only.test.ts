import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Hosted Fields Lifecycle Management", function () {
  test.beforeEach(async ({ hostedFieldsPage, getTestUrl, page }) => {
    await page.goto(getTestUrl({ cvvOnly: true }), {
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

  test("should tokenize CVV-only field successfully", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("cvv", "123");
    await hostedFieldsPage.submitPay();

    const result = await hostedFieldsPage.getResult();
    expect(result.success).toBe(true);
  });

  test("should show validation states for CVV field", async ({
    hostedFieldsPage,
  }) => {
    const cvvInput = await hostedFieldsPage.findInputInFrame("cvv");
    expect(cvvInput).toBeEmpty();

    await hostedFieldsPage.hostedFieldSendInput("cvv", "1");

    const submitButton = await hostedFieldsPage.findAndWaitFor("submit-button");
    await expect(submitButton).toBeDisabled();

    await hostedFieldsPage.hostedFieldSendInput("cvv", "23");
    const buttonClasses = await submitButton.getAttribute("class");
    expect(buttonClasses).toContain("submit-button--success");
  });

  test("should tokenize with 4-digit CVV for American Express", async ({
    hostedFieldsPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ amexUrl: true }), {
      waitUntil: "domcontentloaded",
    });
    await hostedFieldsPage.waitForHostedFieldsReady();

    await hostedFieldsPage.hostedFieldSendInput("cvv", "1234");

    await hostedFieldsPage.submitPay();

    const result = await hostedFieldsPage.getResult();
    expect(result.success).toBe(true);
  });
});
