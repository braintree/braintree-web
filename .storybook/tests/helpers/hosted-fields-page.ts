/* eslint-disable no-console */
import { Locator, Page } from "playwright/test";
import {
  SUCCESS_MESSAGES,
  DEFAULT_HOSTED_FIELDS_VALUES,
} from "../../constants";

type HostedFieldKey =
  | "number"
  | "expirationDate"
  | "cvv"
  | "postalCode"
  | "cardholderName";

type AllowedElementState =
  | "visible"
  | "attached"
  | "detached"
  | "hidden"
  | undefined;

export class HostedFieldsPage {
  private readonly page: Page;
  private iframeIds: string[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  private getIframeId(frameId: string): string {
    return `braintree-hosted-field-${frameId}`;
  }

  /**
   * Reloads the page for a retried test.
   * @param currentRetry number indicating how many retries have occurred.
   */
  async reloadSessionOnRetry(currentRetry: number): Promise<void> {
    if (currentRetry > 0) {
      await this.page.reload();
    }
  }

  /**
   * Finds an element by identifier on the page, with a slight delay to decrease flakiness.
   * @param identifier The string HTML identifier of an element.
   * @param state An {@link AllowedElementState}
   * @returns A {@link Locator} for the element.
   */
  async findAndWaitFor(
    identifier: string,
    state: AllowedElementState = "visible"
  ): Promise<Locator> {
    const element = this.page.locator(`#${identifier}`);
    await element.waitFor({ state: state, timeout: 10000 });

    return element;
  }

  /**
   * Returns a success value for the operation, based on the text of the result element.
   * @returns { success: boolean }
   */
  async getResult(): Promise<{ success: boolean }> {
    const result = {
      success: false,
    };

    const resultLocator = await this.findAndWaitFor("result");

    const resultText = await resultLocator.textContent();
    if (!resultText) {
      return result;
    }

    result.success =
      resultText.includes(SUCCESS_MESSAGES.TOKENIZATION) ||
      resultText.includes(SUCCESS_MESSAGES.VERIFICATION);

    return result;
  }

  /**
   * Waits for all hosted fields to be ready on the window.
   * @throws if the braintree client is not initialized on the window.
   * @throws if any of the child iframes are not ready.
   */
  async waitForHostedFieldsReady(): Promise<void> {
    try {
      await this.page.waitForFunction(
        () => typeof window.braintree !== "undefined",
        { timeout: 20000 }
      );

      await this.page.waitForFunction(
        () =>
          typeof window.braintree !== "undefined" &&
          Boolean(window.braintree.hostedFields),
        { timeout: 20000 }
      );

      await this.page.waitForFunction(
        () => {
          const iframes = document.querySelectorAll(
            'iframe[id^="braintree-hosted-field"]'
          );
          return iframes.length > 0;
        },
        { timeout: 80000, polling: 1000 }
      );
    } catch (error) {
      const debugInfo = await this.page.evaluate(() => {
        return {
          totalIframes: document.querySelectorAll("iframe").length,
          allIframeIds: Array.from(document.querySelectorAll("iframe")).map(
            (iframe) => iframe.id || "(no id)"
          ),
          hostedFieldIframes: document.querySelectorAll(
            'iframe[id^="braintree-hosted-field"]'
          ).length,
          hasError: document.querySelector("#result")?.textContent,
        };
      });
      console.log(
        "Error waiting for Braintree client initialization:",
        debugInfo
      );
      throw error;
    }

    this.iframeIds = await this.page.evaluate(() => {
      const iframes = document.querySelectorAll(
        'iframe[id^="braintree-hosted-field"]'
      );
      return Array.from(iframes).map((iframe) => iframe.id);
    });

    for (const iframeId of this.iframeIds) {
      const frameLocator = this.page.frameLocator(`#${iframeId}`);

      try {
        await frameLocator.locator("input").first().waitFor({
          state: "attached",
          timeout: 15000,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Hosted field ${iframeId} input not ready after 10s. Error: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Sends an input value to a particular hosted field.
   * @param key The {@link HostedFieldKey} hosted field to send to.
   * @param value The text value to input.
   */
  async hostedFieldSendInput(
    key: HostedFieldKey,
    value?: string
  ): Promise<void> {
    await this.waitForHostedField(key);

    const updatedValue = value ?? DEFAULT_HOSTED_FIELDS_VALUES[key];

    const iframeId = this.getIframeId(key);
    const frame = this.page.frameLocator(`#${iframeId}`);
    // Target the visible input field with data-braintree-name attribute
    await frame
      ?.locator(`input[data-braintree-name="${key}"]`)
      .pressSequentially(updatedValue, { delay: 50 });

    await this.page.waitForTimeout(100);
  }

  /**
   * Clicks the input element for the hosted fields iframe.
   * @param key The {@link HostedFieldKey} hosted field to click.
   */
  async clickHostedFieldInput(key: HostedFieldKey): Promise<void> {
    const elementLocator = await this.findInputInFrame(key);
    await elementLocator.click();
  }

  /**
   * Finds the input element for a particular iframe, with a slight delay to decrease flakiness.
   * @param key A {@link HostedFieldKey} for what frame to search in.
   * @returns A {@link Locator} for the element.
   */
  async findInputInFrame(key: HostedFieldKey): Promise<Locator> {
    await this.waitForHostedField(key);
    const iframeId = this.getIframeId(key);
    const frameLocator = this.page.frameLocator(`#${iframeId}`);

    const elementLocator = frameLocator.locator(
      `input[data-braintree-name="${key}"]`
    );
    await elementLocator.waitFor();

    return elementLocator;
  }
  /**
   * Clears a hosted fields input with discrete keypress count.
   * @param key The {@link HostedFieldKey} hosted field to clear.
   * @param deleteCount A number indicating how many backspaces to press.
   */
  async hostedFieldClearWithKeypress(
    key: HostedFieldKey,
    deleteCount: number
  ): Promise<void> {
    const elementLocator = await this.findInputInFrame(key);
    await elementLocator.waitFor();
    await elementLocator.click();

    // Safari seems to need this sequential approach
    if (deleteCount > 0) {
      for (let i = 0; i < deleteCount; i++) {
        await this.page.keyboard.press("Backspace");
        await this.page.waitForTimeout(50);
      }
    }

    await this.page.waitForTimeout(100);
  }

  /**
   * Waits for a certain element in the **page** to have an attribute with a specific value.
   * @param identifier The element identifier to validate.
   * @param attribute The attribute name to check, e.g. "class".
   * @param value The string value expected for that attribute.
   */
  public async waitForElementToHaveAttribute(
    identifier: string,
    attribute: string,
    value: string
  ): Promise<void> {
    await this.page.waitForFunction(
      ([identifier, attribute, value]) => {
        const element = window.document.querySelector(`#${identifier}`);
        if (!element) {
          return false;
        }

        // Handle className as a special case since it's a JS property, not an HTML attribute
        if (attribute === "className") {
          return element.className.includes(value);
        }

        return (
          element.hasAttribute(attribute) &&
          element.getAttribute(attribute)?.includes(value)
        );
      },
      [identifier, attribute, value],
      { timeout: 10000 }
    );
  }

  /**
   * Waits for a singular hosted field to be ready.
   * @param key A {@link HostedFieldKey} to check.
   */
  public async waitForHostedField(key: HostedFieldKey): Promise<void> {
    const iframeId = this.getIframeId(key);

    try {
      // Wait for the iframe element to exist in the DOM first
      await this.page.locator(`iframe#${iframeId}`).first().waitFor({
        state: "attached",
        timeout: 10000,
      });

      // Wait for input to be visible in the iframe using frameLocator
      const frameLocator = this.page.frameLocator(`#${iframeId}`);
      await frameLocator.locator("input").first().waitFor({
        state: "visible",
        timeout: 10000,
      });
    } catch (error) {
      // Debug: check if iframe exists
      const iframeExists = await this.page
        .locator(`iframe#${iframeId}`)
        .count();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `waitForHostedField failed for ${key}. Iframe count: ${iframeExists}. Original error: ${errorMessage}`
      );
    }
  }

  /**
   * Attempts to submit the page.
   */
  async submitPay(): Promise<void> {
    const submitButton = await this.findAndWaitFor("submit-button");
    await submitButton.click();

    await this.page.waitForFunction(
      () => {
        const resultDiv = document.querySelector("#result");
        return resultDiv?.classList.contains("shared-result--visible");
      },
      {
        timeout: 10000,
      }
    );
  }
}
