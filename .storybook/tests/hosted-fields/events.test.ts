import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Hosted Fields Events", function () {
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

  test("should detect card type change event", async ({ hostedFieldsPage }) => {
    await hostedFieldsPage.hostedFieldSendInput("number", "4");

    const cardTypeContainer =
      await hostedFieldsPage.findAndWaitFor("card-type");
    await expect(cardTypeContainer).toContainText("Visa");

    await hostedFieldsPage.hostedFieldClearWithKeypress("number", 1);
    await hostedFieldsPage.hostedFieldSendInput("number", "34");

    await expect(cardTypeContainer).toContainText("American Express");
  });

  test("should track empty and notEmpty events", async ({
    hostedFieldsPage,
    page,
  }) => {
    const emptyEventContainer = page.locator("#emptyEvent");
    const notEmptyEventContainer = page.locator("#notEmptyEvent");

    await hostedFieldsPage.hostedFieldSendInput("number", "4111");
    await expect(notEmptyEventContainer).toHaveClass(/number/);

    await hostedFieldsPage.hostedFieldClearWithKeypress("number", 4);
    await expect(emptyEventContainer).toHaveClass(/number/);
  });

  test("should track focus events", async ({ hostedFieldsPage, page }) => {
    const focusEventContainer = page.locator("#focus");

    await hostedFieldsPage.clickHostedFieldInput("number");

    await page.waitForFunction(
      () => document.querySelector("#focus")?.classList.contains("number"),
      { timeout: 3000 }
    );
    await expect(focusEventContainer).toHaveClass(/number/);

    await hostedFieldsPage.clickHostedFieldInput("cvv");
    await page.waitForFunction(
      () => document.querySelector("#focus")?.classList.contains("cvv"),
      { timeout: 3000 }
    );
    await expect(focusEventContainer).toHaveClass(/cvv/);
  });

  test("should emit binAvailable event when BIN can be determined", async ({
    hostedFieldsPage,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("number", "411111");
    const binAvailableContainer =
      await hostedFieldsPage.findAndWaitFor("binAvailable");
    await expect(binAvailableContainer).toHaveAttribute("binAvailable", "true");
  });

  test("should handle inputSubmitRequest event", async ({
    hostedFieldsPage,
    page,
  }) => {
    await hostedFieldsPage.hostedFieldSendInput("number");
    await hostedFieldsPage.hostedFieldSendInput("cvv");
    await hostedFieldsPage.hostedFieldSendInput("expirationDate");
    await hostedFieldsPage.hostedFieldSendInput("postalCode");

    await hostedFieldsPage.clickHostedFieldInput("postalCode");
    await page.keyboard.press("Enter");

    const inputSubmitRequestContainer = await hostedFieldsPage.findAndWaitFor(
      "inputSubmitRequest",
      "hidden"
    );
    await expect(inputSubmitRequestContainer).toHaveClass(/postalCode/);
  });
});
