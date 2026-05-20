import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";

/**
 * Mocking strategy:
 *
 * - Gateway config: Injected via addInitScript (payWithVenmo in gateway config)
 * - GraphQL: Route interception for createVenmoPaymentContext, updateVenmoPaymentContext, polling
 * - Frame Service: NOT mocked (real popup for desktop web login)
 * - Venmo auth: NOT automated (needs sandbox buyer credentials)
 */

test.describe("Venmo Desktop Web - Rendering", function () {
  test.beforeEach(async ({ venmoPage, getTestUrl, page }) => {
    await venmoPage.setupMocks();

    await page.goto(getTestUrl({ venmoDesktopWeb: true }), {
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

  test("should load Venmo story successfully", async ({ venmoPage, page }) => {
    await venmoPage.waitForStoryReady();

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();
  });

  test("should load Braintree SDK with venmo module", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForSdkReady();

    const sdkLoaded = await page.evaluate(
      () =>
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.venmo !== "undefined"
    );

    expect(sdkLoaded).toBe(true);
  });

  test("should display Venmo button when initialized", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const button = page.locator("#venmo-button");

    await expect(button).toBeVisible();
  });

  test("should render Venmo button with logo image", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const button = page.locator("#venmo-button");
    const tagName = await button.evaluate((el) => el.tagName.toLowerCase());

    expect(tagName).toBe("button");

    const img = button.locator("img");

    await expect(img).toBeAttached();

    const src = await img.getAttribute("src");

    expect(src).toBeTruthy();
    expect(src!.startsWith("data:image/svg") || src!.includes("venmo")).toBe(
      true
    );
  });

  test("should apply venmo-button CSS class to button", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const button = page.locator("#venmo-button");
    const classes = await button.getAttribute("class");

    expect(classes).toContain("venmo-button");
  });

  test("should hide loading state after initialization", async ({
    venmoPage,
  }) => {
    await venmoPage.waitForVenmoButton();

    const isLoading = await venmoPage.isLoadingVisible();

    expect(isLoading).toBe(false);
  });

  test("should display component description for Desktop Web", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForStoryReady();

    const description = page.locator(".venmo-description-wrapper");

    await expect(description).toBeVisible();
    await expect(description).toContainText("Desktop web integration");
  });

  test("should render story heading", async ({ venmoPage, page }) => {
    await venmoPage.waitForStoryReady();

    const heading = page.locator(".shared-container h2");

    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Venmo Desktop Web");
  });

  test("should have result container that is not visible initially", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForStoryReady();

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toBeAttached();

    const isVisible = await venmoPage.isResultVisible();

    expect(isVisible).toBe(false);
  });

  test("should have expected DOM structure", async ({ venmoPage, page }) => {
    await venmoPage.waitForStoryReady();

    const container = page.locator(".shared-container");

    await expect(container.locator("h2")).toBeAttached();
    await expect(
      container.locator(".venmo-description-wrapper")
    ).toBeAttached();
    await expect(container.locator("#venmo-button")).toBeAttached();
    await expect(container.locator("#result")).toBeAttached();
    await expect(container.locator("#loading")).toBeAttached();
  });
});

test.describe("Venmo Desktop QR - Rendering", function () {
  test.beforeEach(async ({ venmoPage, getTestUrl, page }) => {
    await venmoPage.setupMocks();

    await page.goto(getTestUrl({ venmoDesktopQR: true }), {
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

  test("should load Desktop QR story successfully", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForStoryReady();

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();
  });

  test("should display Venmo button when initialized", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForVenmoButton();

    const button = page.locator("#venmo-button");

    await expect(button).toBeVisible();
  });

  test("should display QR code description", async ({ venmoPage, page }) => {
    await venmoPage.waitForStoryReady();

    const description = page.locator(".venmo-description-wrapper");

    await expect(description).toBeVisible();
    await expect(description).toContainText("Desktop QR");
  });

  test("should render story heading for QR flow", async ({
    venmoPage,
    page,
  }) => {
    await venmoPage.waitForStoryReady();

    const heading = page.locator(".shared-container h2");

    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Venmo Desktop QR");
  });

  test("should hide loading state after QR initialization", async ({
    venmoPage,
  }) => {
    await venmoPage.waitForVenmoButton();

    const isLoading = await venmoPage.isLoadingVisible();

    expect(isLoading).toBe(false);
  });
});
