import { expect } from "@playwright/test";

import { test } from "../helpers/playwright-helpers";
import {
  cleanupAfterTest,
  setupDataCollectorMock,
  waitForStoryReady,
} from "./helpers";

test.describe("Data Collector - Multiple Instances", function () {
  test.beforeEach(async ({ getTestUrl, page }) => {
    await setupDataCollectorMock(page);

    await page.goto(getTestUrl({ dataCollectorMultiple: true }), {
      waitUntil: "domcontentloaded",
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupAfterTest(page);
  });

  test("should load multiple instances story", async ({ page }) => {
    await waitForStoryReady(page);

    const container = page.locator(".shared-container");

    await expect(container).toBeVisible();
    await expect(container).toContainText("Multiple Data Collector Instances");
  });

  test("should display two instance panels", async ({ page }) => {
    await waitForStoryReady(page);

    const panels = page.locator(".data-collector-config-panel");
    const count = await panels.count();

    expect(count).toBe(2);
  });

  test("should have instance 2 correlation ID input", async ({ page }) => {
    await waitForStoryReady(page);

    const input = page.locator("#instance-2-correlation-id");

    await expect(input).toBeVisible();
    await expect(input).toHaveValue("second-instance-id");
  });

  test("should have create, collect, and teardown buttons", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const createBtn = page.locator("#create-both-btn");
    const collectBtn = page.locator("#collect-both-btn");
    const teardownBtn = page.locator("#teardown-both-btn");

    await expect(createBtn).toBeEnabled();
    await expect(collectBtn).toBeDisabled();
    await expect(teardownBtn).toBeDisabled();
  });

  test("should create both instances", async ({ page }) => {
    await waitForStoryReady(page);

    const createBtn = page.locator("#create-both-btn");
    await createBtn.click();

    await page.waitForFunction(
      () => {
        const status1 = document.querySelector("#instance-1-status");
        const status2 = document.querySelector("#instance-2-status");
        return (
          status1?.classList.contains("data-collector-status--ready") &&
          status2?.classList.contains("data-collector-status--ready")
        );
      },
      { timeout: 35000 }
    );

    const status1 = page.locator("#instance-1-status");
    const status2 = page.locator("#instance-2-status");

    await expect(status1).toContainText("Ready");
    await expect(status2).toContainText("Ready");
  });

  test("should show success result after creating both instances", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const createBtn = page.locator("#create-both-btn");
    await createBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.classList.contains("shared-result--success");
      },
      { timeout: 35000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toContainText("Both instances created");
  });

  test("should enable collect and teardown buttons after creation", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const createBtn = page.locator("#create-both-btn");
    await createBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.classList.contains("shared-result--success");
      },
      { timeout: 35000 }
    );

    const collectBtn = page.locator("#collect-both-btn");
    const teardownBtn = page.locator("#teardown-both-btn");

    await expect(collectBtn).toBeEnabled();
    await expect(teardownBtn).toBeEnabled();
  });

  test("should collect device data from both instances", async ({ page }) => {
    await waitForStoryReady(page);

    const createBtn = page.locator("#create-both-btn");
    await createBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.classList.contains("shared-result--success");
      },
      { timeout: 35000 }
    );

    const collectBtn = page.locator("#collect-both-btn");
    await collectBtn.click();

    const data1 = page.locator("#instance-1-data");
    const data2 = page.locator("#instance-2-data");

    await expect(data1).toBeVisible();
    await expect(data2).toBeVisible();

    const data1Text = await data1.innerText();
    const data2Text = await data2.innerText();

    expect(data1Text).toContain("correlation_id");
    expect(data2Text).toContain("correlation_id");
  });

  test("should teardown both instances", async ({ page }) => {
    await waitForStoryReady(page);

    const createBtn = page.locator("#create-both-btn");
    await createBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.classList.contains("shared-result--success");
      },
      { timeout: 35000 }
    );

    const teardownBtn = page.locator("#teardown-both-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.textContent?.includes("torn down");
      },
      { timeout: 10000 }
    );

    const resultDiv = page.locator("#result");

    await expect(resultDiv).toContainText("torn down");
  });

  test("should re-enable create button after teardown", async ({ page }) => {
    await waitForStoryReady(page);

    const createBtn = page.locator("#create-both-btn");
    await createBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.classList.contains("shared-result--success");
      },
      { timeout: 35000 }
    );

    const teardownBtn = page.locator("#teardown-both-btn");
    await teardownBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.textContent?.includes("torn down");
      },
      { timeout: 10000 }
    );

    await expect(createBtn).toBeEnabled();
  });

  test("should use custom correlation ID for second instance", async ({
    page,
  }) => {
    await waitForStoryReady(page);

    const input = page.locator("#instance-2-correlation-id");
    await input.fill("custom-inst2-id");

    const createBtn = page.locator("#create-both-btn");
    await createBtn.click();

    await page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        return result?.classList.contains("shared-result--success");
      },
      { timeout: 35000 }
    );

    const collectBtn = page.locator("#collect-both-btn");
    await collectBtn.click();

    const data2 = page.locator("#instance-2-data");

    await expect(data2).toBeVisible();

    const data2Text = await data2.innerText();

    expect(data2Text).toContain("custom-inst2-id");
  });
});
