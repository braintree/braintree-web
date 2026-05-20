import { expect, Page } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

test.describe("Client Initialization", function () {
  const waitForStoryReady = async (page: Page): Promise<void> => {
    await page.waitForFunction(
      () => document.querySelector(".shared-container") !== null,
      { timeout: 30000 }
    );
  };

  const clickCreateClient = async (page: Page): Promise<void> => {
    const createButton = page.locator("#create-client-button");
    await createButton.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null && result.classList.contains("shared-result--visible")
        );
      },
      { timeout: 30000 }
    );
  };

  const waitForClientSuccess = async (page: Page): Promise<void> => {
    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null &&
          result.classList.contains("shared-result--visible") &&
          result.classList.contains("shared-result--success")
        );
      },
      { timeout: 30000 }
    );
  };

  test.beforeEach(async ({ getTestUrl, page }) => {
    await page.goto(getTestUrl({ client: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error reloading session:", (err as Error).message);
    }
  });

  test("should create client successfully with tokenization key", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    const resultDiv = page.locator("#result");
    const resultText = await resultDiv.innerText();

    expect(resultText).toContain("Client created successfully");
  });

  test("should display correct SDK version after creation", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    const sdkVersion = await page.locator("#sdk-version").innerText();

    expect(sdkVersion).not.toBe("--");
    expect(sdkVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('should display authorization type as "TOKENIZATION_KEY"', async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    const authType = await page.locator("#auth-type").innerText();

    expect(authType).toBe("TOKENIZATION_KEY");
  });

  test("should include analytics metadata", async ({ page }) => {
    await waitForStoryReady(page);
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    const configText = await page.locator("#config-display pre").innerText();
    const config = JSON.parse(configText);

    expect(config.analyticsMetadata).toBeDefined();
    expect(config.analyticsMetadata.sessionId).toBeDefined();
    expect(config.analyticsMetadata.sdkVersion).toBeDefined();
    expect(config.analyticsMetadata.merchantAppId).toBeDefined();
  });

  test("should return gateway configuration with expected structure", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    const configText = await page.locator("#config-display pre").innerText();
    const config = JSON.parse(configText);

    expect(config.authorizationType).toBe("TOKENIZATION_KEY");
    expect(config.environment).toBeDefined();
    expect(config.gatewayUrl).toBeDefined();
    expect(config.assetsUrl).toBeDefined();
  });

  test("should detect correct environment from authorization", async ({
    page,
  }) => {
    await waitForStoryReady(page);
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    const configText = await page.locator("#config-display pre").innerText();
    const config = JSON.parse(configText);

    expect(config.environment).toBe("sandbox");
  });

  test("should contain required URL properties", async ({ page }) => {
    await waitForStoryReady(page);
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    const configText = await page.locator("#config-display pre").innerText();
    const config = JSON.parse(configText);

    expect(config.gatewayUrl).toContain("braintreegateway.com");
    expect(config.assetsUrl).toContain("braintreegateway.com");
  });

  test("should teardown client properly", async ({ page }) => {
    await waitForStoryReady(page);
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    const teardownButton = page.locator("#teardown-button");
    await teardownButton.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#teardown-status");
        return (
          status !== null &&
          status.classList.contains("shared-result--visible") &&
          status.classList.contains("shared-result--success")
        );
      },
      { timeout: 15000 }
    );

    const teardownText = await page.locator("#teardown-status").innerText();

    expect(teardownText).toContain("Teardown complete");

    const authType = await page.locator("#auth-type").innerText();

    expect(authType).toBe("--");
  });

  test("should create a new client after teardown", async ({ page }) => {
    await waitForStoryReady(page);

    // Create first client
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    // Teardown
    const teardownButton = page.locator("#teardown-button");
    await teardownButton.click();

    await page.waitForFunction(
      () => {
        const status = document.querySelector("#teardown-status");
        return (
          status !== null && status.classList.contains("shared-result--visible")
        );
      },
      { timeout: 15000 }
    );

    // Create second client
    await clickCreateClient(page);
    await waitForClientSuccess(page);

    const resultDiv = page.locator("#result");
    const resultText = await resultDiv.innerText();

    expect(resultText).toContain("Client created successfully");

    const authType = await page.locator("#auth-type").innerText();

    expect(authType).toBe("TOKENIZATION_KEY");
  });

  test("should show error for invalid authorization string", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    // Override the authorization token to an invalid value
    await page.evaluate(() => {
      const originalCreate = window.braintree!.client.create;
      window.braintree!.client.create = function () {
        return originalCreate.call(this, {
          authorization: "invalid_token_string",
        });
      };
    });

    await clickCreateClient(page);

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return (
          result !== null &&
          result.classList.contains("shared-result--visible") &&
          result.classList.contains("shared-result--error")
        );
      },
      { timeout: 30000 }
    );

    const resultDiv = page.locator("#result");
    const resultText = await resultDiv.innerText();

    expect(resultText).toContain("Error");
  });
});
