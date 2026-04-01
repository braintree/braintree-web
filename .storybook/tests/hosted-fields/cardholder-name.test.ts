import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Hosted Fields Lifecycle Management", function () {
  test.beforeEach(async ({ hostedFieldsPage, getTestUrl, page }) => {
    await page.goto(getTestUrl({ cardholderName: true }), {
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

  test("should tokenize card with cardholder name successfully", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("cardholderName", "John Doe");
    await hostedFieldsPage.hostedFieldSendInput("number");
    await hostedFieldsPage.hostedFieldSendInput("cvv");
    await hostedFieldsPage.hostedFieldSendInput("expirationDate");
    await hostedFieldsPage.hostedFieldSendInput("postalCode");

    await hostedFieldsPage.submitPay();

    const result = await hostedFieldsPage.getResult();
    await expect(result.success).toBe(true);

    const resultContainer = await hostedFieldsPage.findAndWaitFor("result");
    await expect(resultContainer).toContainText("Cardholder Name: John Doe");
  });

  test("should show cardholder name validation states", async ({
    hostedFieldsPage,
  }) => {
    const cardholderNameInput =
      await hostedFieldsPage.findInputInFrame("cardholderName");
    await expect(cardholderNameInput).toBeEmpty();

    await hostedFieldsPage.hostedFieldSendInput("cardholderName", "John Doe");
    await hostedFieldsPage.hostedFieldSendInput("number");
    await hostedFieldsPage.hostedFieldSendInput("cvv");
    await hostedFieldsPage.hostedFieldSendInput("expirationDate");
    await hostedFieldsPage.hostedFieldSendInput("postalCode");

    const submitButton = await hostedFieldsPage.findAndWaitFor("submit-button");
    await expect(submitButton).toBeEnabled();

    const buttonClasses = await submitButton.getAttribute("class");
    expect(buttonClasses).toContain("submit-button--success");
  });

  test("should verify button remains disabled when cardholder name is empty", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("number");
    await hostedFieldsPage.hostedFieldSendInput("cvv");
    await hostedFieldsPage.hostedFieldSendInput("expirationDate");
    await hostedFieldsPage.hostedFieldSendInput("postalCode");

    const submitButton = await hostedFieldsPage.findAndWaitFor("submit-button");
    expect(submitButton).toBeDisabled();

    const buttonClasses = await submitButton.getAttribute("class");
    expect(buttonClasses).not.toContain("submit-button--success");
  });
});
