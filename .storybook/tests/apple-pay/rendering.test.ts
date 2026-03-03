import { expect, Locator, Page } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Apple Pay Storybook Rendering", function () {
  test.use({
    testServerOptions: {
      useHttps: true,
    },
    ignoreHTTPSErrors: true,
  });

  const findAndWaitFor = async (
    page: Page,
    identifier: string
  ): Promise<Locator> => {
    const element = page.locator(`#${identifier}`);
    await element.waitFor({ state: "visible", timeout: 10000 });

    return element;
  };

  test.beforeEach(async ({ getTestUrl, page }) => {
    // unfortunately, apple pay requires real safari on a real mac with apple pay installed and a card loaded into the apple wallet
    // so the best we can do is mock the ApplePaySession to check that we render things correctly
    await page.addInitScript(() => {
      window.ApplePaySession = {
        canMakePayments: () => true,
        STATUS_SUCCESS: 0,
        STATUS_FAILURE: 1,
      } as any;

      // Mock the Braintree client configuration to include Apple Pay
      // This must run as an init script to intercept before SDK loads
      const mockApplePayConfig = () => {
        const checkAndMock = setInterval(() => {
          if (window.braintree?.client?.create) {
            clearInterval(checkAndMock);
            const originalCreate = window.braintree.client.create;

            window.braintree.client.create = async function (options: any) {
              const client = await originalCreate.call(this, options);
              const originalGetConfiguration = client.getConfiguration;

              client.getConfiguration = function () {
                const config = originalGetConfiguration.call(this);
                if (!config.gatewayConfiguration.applePayWeb) {
                  config.gatewayConfiguration.applePayWeb = {
                    countryCode: "US",
                    currencyCode: "USD",
                    merchantIdentifier: "merchant.com.braintree.sandbox.test",
                    supportedNetworks: [
                      "visa",
                      "mastercard",
                      "amex",
                      "discover",
                    ],
                  };
                }
                return config;
              };

              return client;
            };
          }
        }, 10);
      };

      mockApplePayConfig();
    });

    await page.goto(getTestUrl({ applePay: true, useHttps: true }), {
      waitUntil: "domcontentloaded",
    });
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

  test("should load Apple Pay story successfully", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelector(".shared-container") !== null,
      {
        timeout: 15000,
      }
    );

    const container = page.locator(".shared-container");
    expect(container).toBeVisible();
  });

  test("should display Apple Pay button when SDK loads", async ({ page }) => {
    await page.waitForFunction(
      () => {
        return (
          typeof window.braintree !== "undefined" &&
          typeof window.braintree.client !== "undefined"
        );
      },
      {
        timeout: 20000,
      }
    );

    const sdkLoaded = await page.evaluate(() => {
      return (
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.client !== "undefined"
      );
    });

    expect(sdkLoaded).toBe(true);
  });

  test("should display form elements correctly", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelector("#amount") !== null,
      {
        timeout: 10000,
      }
    );

    const amountInput = await findAndWaitFor(page, "amount");
    const currencySelect = await findAndWaitFor(page, "currency");
    const recurringCheckbox = await findAndWaitFor(page, "enable-recur-check");

    expect(currencySelect).toBeTruthy();
    expect(recurringCheckbox).toBeTruthy();
    expect(await amountInput.getAttribute("value")).toBe("19.99");
  });

  test("should have correct currency options", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelector("#currency") !== null,
      {
        timeout: 10000,
      }
    );
    const options = await page.evaluate(() => {
      const select = document.querySelector("#currency") as HTMLSelectElement;
      if (!select) return [];
      return Array.from(select.options).map((opt) => opt.value);
    });

    expect(options).toEqual(["USD", "EUR", "GBP"]);
  });

  test("should toggle recurring payment options when checkbox is enabled", async ({
    page,
  }) => {
    await page.waitForFunction(
      () => document.querySelector("#enable-recur-check") !== null,
      {
        timeout: 10000,
      }
    );
    const recurCheckbox = await findAndWaitFor(page, "enable-recur-check");
    const recurringOptions = page.locator("#recurring-options");

    expect(recurringOptions).not.toHaveAttribute("display");

    await recurCheckbox.click();
    await page.waitForFunction(
      () => {
        const elem = document.querySelector("#recurring-options");
        return elem ? window.getComputedStyle(elem).display === "block" : false;
      },
      {
        timeout: 5000,
        timeoutMsg: "Recurring options did not become visible",
      }
    );

    expect(recurringOptions).toBeVisible();
  });

  test("should show recurring payment radio buttons when checkbox is checked", async ({
    page,
  }) => {
    await page.waitForFunction(
      () => document.querySelector("#enable-recur-check") !== null,
      {
        timeout: 10000,
      }
    );
    const recurCheckbox = await findAndWaitFor(page, "enable-recur-check");
    const recurringRadio = page.locator("#recurring-radio");
    const deferredRadio = page.locator("#deferred-radio");
    const autoReloadRadio = page.locator("#auto-reload-radio");

    expect(recurringRadio).not.toBeVisible();
    expect(deferredRadio).not.toBeVisible();
    expect(autoReloadRadio).not.toBeVisible();

    await recurCheckbox.click();

    await page.waitForFunction(
      () => {
        const radio = document.querySelector(
          "#recurring-radio"
        ) as HTMLInputElement;
        return radio ? radio.disabled === false : false;
      },
      {
        timeout: 5000,
      }
    );

    expect(recurringRadio).toBeEnabled();
    expect(deferredRadio).toBeEnabled();
    expect(autoReloadRadio).toBeEnabled();
  });

  test("should display Apple Pay requirements list", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelector(".apple-pay-requirements") !== null,
      {
        timeout: 10000,
      }
    );

    const requirements = page.locator(".apple-pay-requirements");

    const requirementText = await requirements.innerText();
    expect(requirementText).toContain("Safari browser or iOS device");
    expect(requirementText).toContain("Apple Pay enabled");
    expect(requirementText).toContain("Valid payment method");
  });

  test("should display loading state initially", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelector("#loading") !== null,
      {
        timeout: 5000,
      }
    );

    const loadingDiv = await findAndWaitFor(page, "loading");
    const loadingText = await loadingDiv.innerText();

    expect(loadingText).toContain("Checking Apple Pay availability");
  });

  test("should hide loading state after initialization", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelector("#loading") !== null,
      {
        timeout: 5000,
      }
    );

    await page.waitForFunction(
      () =>
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.applePay !== "undefined",

      {
        timeout: 35000,
      }
    );

    await page.waitForFunction(
      () => {
        const elem = document.querySelector("#loading");
        return elem ? window.getComputedStyle(elem).display === "none" : false;
      },
      {
        timeout: 35000,
      }
    );

    const loadingDiv = page.locator("#loading");
    expect(loadingDiv).not.toBeVisible();
  });

  test("should update amount input value", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelector("#amount") !== null,
      {
        timeout: 10000,
      }
    );

    const amountInput = await findAndWaitFor(page, "amount");
    expect(amountInput).toHaveValue("19.99");

    await amountInput.fill("99.99");
    expect(amountInput).toHaveValue("99.99");
  });

  test("should update currency selection", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelector("#currency") !== null,
      {
        timeout: 10000,
      }
    );

    const currencySelect = await findAndWaitFor(page, "currency");
    await currencySelect.selectOption("EUR");
    expect(currencySelect).toHaveValue("EUR");
  });

  test("should clear recurring payment selections when checkbox is unchecked", async ({
    page,
  }) => {
    await page.waitForFunction(
      () => document.querySelector("#enable-recur-check") !== null,
      {
        timeout: 10000,
      }
    );

    const recurCheckbox = await findAndWaitFor(page, "enable-recur-check");
    const recurringRadio = page.locator("#recurring-radio");
    expect(recurringRadio).not.toBeVisible();

    await recurCheckbox.click();
    await page.waitForFunction(
      () => {
        const radio = document.querySelector(
          "#recurring-radio"
        ) as HTMLInputElement;
        return radio ? radio.disabled === false : false;
      },
      {
        timeout: 5000,
      }
    );

    expect(recurringRadio).toBeVisible();
    await recurringRadio.click();
    expect(recurringRadio).toBeChecked();

    await recurCheckbox.click();
    await page.waitForFunction(
      () => {
        const radio = document.querySelector(
          "#recurring-radio"
        ) as HTMLInputElement;
        return radio ? radio.checked === false : false;
      },
      {
        timeout: 5000,
      }
    );
    expect(recurringRadio).not.toBeChecked();
  });

  test("should have Apple Pay button container", async ({ page }) => {
    await page.waitForFunction(
      () => {
        const container = document.querySelector("#apple-pay-button");
        const button = container?.querySelector(".apple-pay-button");
        return container !== null && button !== null;
      },
      {
        timeout: 30000,
      }
    );

    const applePayButtonContainer = page.locator("#apple-pay-button");
    const applePayButton = page.locator(".apple-pay-button");

    expect(applePayButtonContainer).toBeVisible();
    expect(applePayButton).toBeVisible();
    expect(applePayButton).toContainText("Apple Pay");
  });

  test("should have result container", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelector("#result") !== null,
      {
        timeout: 10000,
      }
    );

    const resultDiv = page.locator("#result");
    expect(resultDiv).toBeAttached();
  });

  test("should display all recurring payment type options", async ({
    page,
  }) => {
    await page.waitForFunction(
      () => document.querySelector("#enable-recur-check") !== null,
      {
        timeout: 10000,
      }
    );
    const recurCheckbox = await findAndWaitFor(page, "enable-recur-check");
    const recurringRadio = page.locator("#recurring-radio");
    const deferredRadio = page.locator("#deferred-radio");
    const autoReloadRadio = page.locator("#auto-reload-radio");

    expect(recurringRadio).not.toBeVisible();
    expect(deferredRadio).not.toBeVisible();
    expect(autoReloadRadio).not.toBeVisible();

    await recurCheckbox.click();
    await page.waitForFunction(
      () => {
        const elem = document.querySelector("#recurring-options");
        return elem ? window.getComputedStyle(elem).display === "block" : false;
      },
      {
        timeout: 5000,
      }
    );
    expect(recurringRadio).toBeVisible();
    expect(deferredRadio).toBeVisible();
    expect(autoReloadRadio).toBeVisible();

    const recurringLabel = page
      .locator(".shared-label")
      .filter({ has: recurringRadio });
    const deferredLabel = page
      .locator(".shared-label")
      .filter({ has: deferredRadio });
    const autoReloadLabel = page
      .locator(".shared-label")
      .filter({ has: autoReloadRadio });

    expect(recurringLabel).toContainText("Recurring Payment");
    expect(deferredLabel).toContainText("Deferred Payment");
    expect(autoReloadLabel).toContainText("Auto-reload Payment");
  });
});
