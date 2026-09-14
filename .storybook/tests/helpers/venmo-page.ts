import { Page } from "@playwright/test";

import { waitForStoryReady as sharedWaitForStoryReady } from "./shared-waiters";

interface VenmoResult {
  success: boolean;
  error: boolean;
  text: string;
}

export class VenmoPage {
  private readonly page: Page;
  private popup: Page | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  // ----- Story readiness -----

  async waitForStoryReady(): Promise<void> {
    await sharedWaitForStoryReady(this.page);
  }

  async waitForSdkReady(): Promise<void> {
    await this.page.waitForFunction(
      () =>
        typeof window.braintree !== "undefined" &&
        typeof window.braintree.client !== "undefined" &&
        typeof window.braintree.venmo !== "undefined",
      { timeout: 20000 }
    );
  }

  /**
   * Waits for the Venmo button to become visible and enabled,
   * or throws if an error message appeared first.
   */
  async waitForVenmoButton(): Promise<void> {
    const result = await this.page.waitForFunction(
      () => {
        const button = document.querySelector("#venmo-button") as HTMLElement;

        if (button && button.style.display === "block") {
          return { ok: true };
        }

        const resultDiv = document.querySelector("#result");

        if (
          resultDiv &&
          resultDiv.classList.contains("shared-result--error") &&
          resultDiv.classList.contains("shared-result--visible")
        ) {
          return { ok: false, error: resultDiv.textContent };
        }

        return null;
      },
      { timeout: 35000 }
    );

    const value = await result.jsonValue();

    if (!value?.ok) {
      throw new Error(
        `Venmo initialization failed: ${value?.error || "unknown error"}`
      );
    }
  }

  // ----- Button interaction -----

  async clickVenmoButton(): Promise<void> {
    await this.page.locator("#venmo-button").click();
  }

  // ----- Desktop Web Login popup -----

  async waitForPopup(): Promise<Page> {
    const popupPromise = this.page.waitForEvent("popup", { timeout: 15000 });

    await this.clickVenmoButton();
    this.popup = await popupPromise;

    return this.popup;
  }

  async closePopup(): Promise<void> {
    if (this.popup && !this.popup.isClosed()) {
      try {
        await this.popup.close();
      } catch {
        // Popup may already be closed
      }
    }
    this.popup = null;
  }

  async waitForBackdrop(): Promise<void> {
    const backdrop = this.page.locator("#venmo-desktop-web-backdrop");

    await backdrop.waitFor({ state: "visible", timeout: 10000 });
  }

  async clickCancelOnBackdrop(): Promise<void> {
    const cancelButton = this.page.locator("#venmo-popup-cancel-button");

    await cancelButton.waitFor({ state: "visible", timeout: 10000 });
    await cancelButton.click();
  }

  async clickContinueOnBackdrop(): Promise<void> {
    const continueButton = this.page.locator("#venmo-popup-continue-button");

    await continueButton.waitFor({ state: "visible", timeout: 10000 });
    await continueButton.click();
  }

  // ----- Results -----

  async waitForResult(): Promise<VenmoResult> {
    await this.page.waitForFunction(
      () => {
        const result = document.querySelector("#result");

        return (
          result !== null && result.classList.contains("shared-result--visible")
        );
      },
      { timeout: 15000 }
    );

    const resultContainer = this.page.locator("#result");
    const resultClasses = (await resultContainer.getAttribute("class")) ?? "";
    const resultText = (await resultContainer.textContent()) ?? "";

    return {
      success: resultClasses.includes("shared-result--success"),
      error: resultClasses.includes("shared-result--error"),
      text: resultText,
    };
  }

  async waitForErrorResult(): Promise<string> {
    await this.page.waitForFunction(
      () => {
        const result = document.querySelector("#result");

        return (
          result !== null &&
          result.classList.contains("shared-result--visible") &&
          result.classList.contains("shared-result--error")
        );
      },
      { timeout: 15000 }
    );

    return (await this.page.locator("#result").textContent()) ?? "";
  }

  isLoadingVisible(): Promise<boolean> {
    return this.page.locator("#loading").isVisible();
  }

  async isResultVisible(): Promise<boolean> {
    const classes =
      (await this.page.locator("#result").getAttribute("class")) ?? "";

    return classes.includes("shared-result--visible");
  }
}
