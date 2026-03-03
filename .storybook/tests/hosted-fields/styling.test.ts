import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Hosted Fields Styling", function () {
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

  test("should apply custom styles in light theme", async ({
    hostedFieldsPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ lightTheme: true }));
    await hostedFieldsPage.waitForHostedFieldsReady();

    const inputElement = await hostedFieldsPage.findInputInFrame("number");

    const fontSize = await inputElement.evaluate((element) => {
      return window.getComputedStyle(element).fontSize;
    });
    expect(fontSize).toBe("16px");
  });

  test("should apply dark theme styles", async ({
    hostedFieldsPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ darkTheme: true }));
    await hostedFieldsPage.waitForHostedFieldsReady();

    const container = page.locator("[data-theme='dark']");
    await container.waitFor();
    await expect(container).toBeVisible();

    const backgroundColorStyle = await container.evaluate((element) => {
      return window.getComputedStyle(element).backgroundColor;
    });

    expect(backgroundColorStyle).toBe("rgb(51, 51, 51)");
    const textColorStyle = await container.evaluate((element) => {
      return window.getComputedStyle(element).color;
    });

    expect(textColorStyle).toBe("rgb(255, 255, 255)");
  });

  test("should apply styles to hosted fields in iframes", async ({
    hostedFieldsPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ darkTheme: true }));
    await hostedFieldsPage.waitForHostedFieldsReady();

    const inputElement = await hostedFieldsPage.findInputInFrame("number");

    const fontSize = await inputElement.evaluate((element) => {
      return window.getComputedStyle(element).fontFamily;
    });
    expect(fontSize).toContain("monospace");
  });

  test("should apply valid/invalid styling states", async ({
    hostedFieldsPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ lightTheme: true }));
    await hostedFieldsPage.waitForHostedFieldsReady();

    await hostedFieldsPage.hostedFieldSendInput(
      "number",
      "4111111111111111111"
    );

    const cardNumberContainer =
      await hostedFieldsPage.findAndWaitFor("card-number");

    await expect(cardNumberContainer).toHaveClass(
      /braintree-hosted-fields-invalid/
    );

    const inputField = await hostedFieldsPage.findInputInFrame("number");
    const colorStyle = await inputField.evaluate((element) => {
      return window.getComputedStyle(element).color;
    });
    const INVALID_COLOR = "rgb(220, 53, 69)";

    expect(colorStyle).toBe(INVALID_COLOR);
  });

  test("should apply dynamic styling on field interaction", async ({
    hostedFieldsPage,
    page,
    getTestUrl,
  }) => {
    await page.goto(getTestUrl({ lightTheme: true }));
    await hostedFieldsPage.waitForHostedFieldsReady();

    const cardNumberContainer =
      await hostedFieldsPage.findAndWaitFor("card-number");
    await expect(cardNumberContainer).not.toHaveClass(
      /braintree-hosted-fields-focused/
    );

    await hostedFieldsPage.clickHostedFieldInput("number");

    await expect(cardNumberContainer).toHaveClass(
      /braintree-hosted-fields-focused/
    );
  });
});
