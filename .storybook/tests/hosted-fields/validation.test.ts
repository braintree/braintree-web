import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Hosted Fields Validation States", function () {
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

  test("should show invalid state for incorrect card number", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("number", "7893489743789789");
    await hostedFieldsPage.clickHostedFieldInput("number");

    const cardNumberContainer =
      await hostedFieldsPage.findAndWaitFor("card-number");

    await expect(cardNumberContainer).toHaveClass(
      /braintree-hosted-fields-invalid/
    );
    await expect(cardNumberContainer).not.toHaveClass(
      /braintree-hosted-fields-valid/
    );

    const submitButton = await hostedFieldsPage.findAndWaitFor("submit-button");
    await expect(submitButton).toBeDisabled();
  });

  test("should show valid state for correct inputs", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("number");

    const cardNumberContainer =
      await hostedFieldsPage.findAndWaitFor("card-number");

    await expect(cardNumberContainer).toHaveClass(
      /braintree-hosted-fields-valid/
    );
    await expect(cardNumberContainer).not.toHaveClass(
      /braintree-hosted-fields-invalid/
    );
  });

  test("should validate expired date", async ({ hostedFieldsPage }) => {
    const pastDate = "12/21";
    await hostedFieldsPage.hostedFieldSendInput("expirationDate", pastDate);

    const expirationContainer =
      await hostedFieldsPage.findAndWaitFor("expiration-date");

    await expect(expirationContainer).toHaveClass(
      /braintree-hosted-fields-invalid/
    );

    const submitButton = await hostedFieldsPage.findAndWaitFor("submit-button");
    await expect(submitButton).toBeDisabled();
  });

  test("should validate CVV length based on card type", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("number", "4111111111111111");
    await hostedFieldsPage.hostedFieldSendInput("cvv", "123");

    const cvvContainer = await hostedFieldsPage.findAndWaitFor("cvv");

    await expect(cvvContainer).toHaveClass(/braintree-hosted-fields-valid/);

    await hostedFieldsPage.hostedFieldClearWithKeypress("number", 16);
    await hostedFieldsPage.hostedFieldSendInput("number", "378282246310005");

    await expect(cvvContainer).not.toHaveClass(/braintree-hosted-fields-valid/);

    await hostedFieldsPage.hostedFieldSendInput("cvv", "1234");

    await expect(cvvContainer).toHaveClass(/braintree-hosted-fields-valid/);
  });

  test("should enforce postal code format validation", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("postalCode", "1");

    const postalCodeContainer =
      await hostedFieldsPage.findAndWaitFor("postal-code");

    await expect(postalCodeContainer).not.toHaveClass(
      /braintree-hosted-fields-valid/
    );

    await hostedFieldsPage.hostedFieldSendInput("postalCode", "12345");

    await expect(postalCodeContainer).toHaveClass(
      /braintree-hosted-fields-valid/
    );
  });

  test("should show focus state on active field", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.clickHostedFieldInput("number");

    const numberContainer =
      await hostedFieldsPage.findAndWaitFor("card-number");

    await expect(numberContainer).toHaveClass(
      /braintree-hosted-fields-focused/
    );
  });
});
