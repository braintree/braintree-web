import { Page } from "playwright/test";
import { HostedFieldsPage } from "./hosted-fields-page";
import { IThreeDSecureInstance } from "../../types/global";

export class ThreeDSecurePage {
  private readonly page: Page;
  private readonly hostedFieldsPage: HostedFieldsPage;

  constructor(page: Page) {
    this.page = page;
    this.hostedFieldsPage = new HostedFieldsPage(page);
  }

  /**
   * Waits for the ThreeDSecure SDK to be loaded and available on window.
   */
  async waitFor3DSReady(): Promise<void> {
    // Wait for the 3DS content section to be visible, which indicates full initialization
    await this.page.waitForFunction(
      () => {
        const content = document.querySelector(
          "#three-ds-content"
        ) as HTMLElement;
        return content && content.style.display === "block";
      },
      { timeout: 40000 }
    );

    // Double-check that the instance is actually available
    await this.page.waitForFunction(
      () => {
        return (
          typeof window.braintree !== "undefined" &&
          typeof window.braintree.threeDSecure !== "undefined" &&
          typeof (window as any).threeDSecureInstance !== "undefined"
        );
      },
      { timeout: 40000 }
    );
  }

  /**
   * Waits for both Hosted Fields and 3DS to be initialized.
   */
  async waitForHostedFieldsAnd3DSReady(): Promise<void> {
    await this.hostedFieldsPage.waitForHostedFieldsReady();
    await this.waitFor3DSReady();
  }

  /**
   * Fills in the merchant credentials and initializes 3D Secure.
   * @param publicKey The `string` public key for Braintree sandbox access.
   * @param privateKey The `string` private key for Braintree sandbox access.
   */
  async initialize3DS(publicKey: string, privateKey: string): Promise<void> {
    await this.page.waitForFunction(() => {
      const btn = document.querySelector(
        "#initialize-3ds"
      ) as HTMLButtonElement;
      return (
        btn &&
        btn.disabled === false &&
        btn.textContent === "Initialize 3D Secure"
      );
    });

    const publicKeyInput = this.page.locator("#public-key");
    const privateKeyInput = this.page.locator("#private-key");
    const initButton = this.page.locator("#initialize-3ds");

    await publicKeyInput.fill(publicKey);
    await privateKeyInput.fill(privateKey);
    await this.page.waitForTimeout(100);

    await initButton.click();
  }

  /**
   * Clicks the autofill button to populate billing fields.
   */
  async autofillBillingInfo(): Promise<void> {
    const autofillButton = this.page.locator("#autofill");
    await autofillButton.click();
  }

  /**
   * Fills in card details using hosted fields with validation checks.
   * @param cardNumber The `string` credit card number to fill.
   * @param cvv The `string` CVV for the card.
   * @param expirationDate The `string` expiration date for the credit card.
   * @param skipNumberValidation A `boolean` defaulting to false that describes whether we should skip card number validation.
   */
  async fillCardDetails(
    cardNumber: string,
    cvv: string,
    expirationDate: string,
    skipNumberValidation = false
  ): Promise<void> {
    // Fill card number and wait for it to be validated
    await this.hostedFieldsPage.hostedFieldSendInput("number", cardNumber);
    await this.page.waitForTimeout(800);

    if (!skipNumberValidation) {
      // we want to test invalid card numbers, so we have to sometimes not check hosted fields state
      await this.page.waitForFunction(
        () => {
          const hostedFieldsInstance = (window as any).hostedFieldsInstance;
          if (!hostedFieldsInstance) return false;
          const state = hostedFieldsInstance.getState();
          return (
            state?.fields?.number?.isValid ||
            state?.fields?.number?.isPotentiallyValid
          );
        },
        { timeout: 10000 }
      );
    }

    // Fill CVV and wait
    await this.hostedFieldsPage.hostedFieldSendInput("cvv", cvv);
    await this.page.waitForTimeout(800);

    // Verify CVV field has been filled
    await this.page.waitForFunction(
      () => {
        const hostedFieldsInstance = (window as any).hostedFieldsInstance;
        if (!hostedFieldsInstance) return false;
        const state = hostedFieldsInstance.getState();
        return (
          state?.fields?.cvv?.isValid || state?.fields?.cvv?.isPotentiallyValid
        );
      },
      { timeout: 10000 }
    );

    // Fill expiration date and wait
    await this.hostedFieldsPage.hostedFieldSendInput(
      "expirationDate",
      expirationDate
    );
    await this.page.waitForTimeout(800);

    // Verify expiration date field has been filled
    await this.page.waitForFunction(
      () => {
        const hostedFieldsInstance = (window as any).hostedFieldsInstance;
        if (!hostedFieldsInstance) return false;
        const state = hostedFieldsInstance.getState();
        return (
          state?.fields?.expirationDate?.isValid ||
          state?.fields?.expirationDate?.isPotentiallyValid
        );
      },
      { timeout: 10000 }
    );
  }

  /**
   * Clicks the pay button to trigger 3DS verification.
   */
  async clickPayButton(): Promise<void> {
    // Verify that the pay button is enabled (indicates valid form state)
    await this.page.waitForFunction(
      () => {
        const payButton = document.querySelector(
          "#pay-button"
        ) as HTMLButtonElement;
        return payButton && !payButton.disabled;
      },
      { timeout: 10000 }
    );
    await this.page.evaluate(() => {
      const button = document.querySelector("#pay-button") as HTMLButtonElement;
      if (button) {
        button.click();
      }
    });

    await this.page.waitForTimeout(1000);
  }

  /**
   * Handles 3DS challenge flow.
   */
  async handleChallenge(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const modal = document.querySelector("#three-ds-modal") as HTMLElement;
        return modal && modal.style.display === "block";
      },
      { timeout: 40000 }
    );
    const threedsIframe = this.page.frameLocator("#Cardinal-CCA-IFrame");

    const otpInputField = threedsIframe.locator(
      'input[name="challengeDataEntry"]'
    );
    const otpInputSubmit = threedsIframe.locator("input", {
      hasText: "SUBMIT",
    });
    await otpInputField.fill("1234");
    await otpInputSubmit?.click();

    // Wait for OTP submission to process
    await this.page.waitForTimeout(1000);
  }

  /**
   * Gets the 3D Secure instance from the window.
   */
  get3DSInstance(): Promise<IThreeDSecureInstance> {
    return this.page.evaluate(() => {
      return (window as any).threeDSecureInstance as IThreeDSecureInstance;
    });
  }

  /**
   * Tears down the 3DS instance.
   */
  async teardown3DS(): Promise<void> {
    await this.page.evaluate(async () => {
      // Teardown both hosted fields and 3DS
      const hostedFieldsInstance = (window as any).hostedFieldsInstance;
      const threeDSecureInstance = (window as any)
        .threeDSecureInstance as IThreeDSecureInstance;

      if (
        hostedFieldsInstance &&
        typeof hostedFieldsInstance.teardown === "function"
      ) {
        await hostedFieldsInstance.teardown();
      }

      if (
        threeDSecureInstance &&
        typeof threeDSecureInstance.teardown === "function"
      ) {
        await threeDSecureInstance.teardown();
      }

      // Clear the references
      (window as any).hostedFieldsInstance = undefined;
      (window as any).threeDSecureInstance = undefined;
    });
  }

  /**
   * Attaches an event listener to the 3DS instance.
   * @param eventName A `string` event name to attach an event listener to.
   * @param trackerId A `string` trackerId which is stored on the window for testing purposes.
   */
  async attachEventListener(
    eventName: string,
    trackerId: string
  ): Promise<void> {
    await this.page.evaluate(
      ([eventName, trackerId]) => {
        if (!(window as any).__testEventTracker) {
          (window as any).__testEventTracker = {};
        }

        (window as any).__testEventTracker[trackerId] = 0;

        const instance = (window as any)
          .threeDSecureInstance as IThreeDSecureInstance;
        const listener = () => {
          (window as any).__testEventTracker[trackerId]++;
        };

        // Store listener reference
        if (!(window as any).__testEventListeners) {
          (window as any).__testEventListeners = {};
        }
        (window as any).__testEventListeners[trackerId] = listener;

        instance.on(eventName, listener);
      },
      [eventName, trackerId]
    );
  }

  /**
   * Gets the event listener call count for a specific tracker.
   * @param trackerId The `string` identifier for the event listener.
   * @returns `number` call count for that event listener.
   */
  async getEventListenerCallCount(trackerId: string): Promise<number> {
    await this.page.waitForFunction((trackerId) => {
      return (window as any).__testEventTracker?.[trackerId] > 0;
    }, trackerId);

    return this.page.evaluate((trackerId) => {
      return (window as any).__testEventTracker?.[trackerId] ?? 0;
    }, trackerId);
  }

  /**
   * Gets the result of the 3DS verification.
   * Waits for the verification to complete and the result to be displayed.
   * @returns object `{ success: boolean; liabilityShifted: boolean }`
   * success: A `boolean` describing if the verification was successful.
   * liabilityShifted?: A `boolean` describing if liability has been shifted for this operation.
   */
  async getVerificationResult(): Promise<{
    success: boolean;
    liabilityShifted?: boolean;
  }> {
    const resultDiv = this.page.locator("#result");

    // Wait for the result text to actually contain verification status
    // This handles cases where the div appears but content loads slowly
    await this.page.waitForFunction(
      () => {
        const result = document.querySelector("#result");
        const text = result?.textContent || "";
        return (
          text.includes("verification successful") ||
          text.includes("verification complete") ||
          text.includes("Error") ||
          text.includes("failed")
        );
      },
      { timeout: 30000 }
    );

    const resultText = await resultDiv.textContent();
    const hasSuccess = resultText?.includes("verification successful") || false;
    const liabilityShifted =
      resultText?.includes("Liability shifted: Yes") ?? false;

    return {
      success: hasSuccess,
      liabilityShifted,
    };
  }

  /**
   * Verifies the prototype chain is correctly set up.
   * @returns object `{ hasEmit: boolean; hasOn: boolean; hasOff: boolean; }`
   * where the values are `boolean`s describing if the window's threeDSecureInstance object has defined functions for emit/on/off
   */
  verifyPrototypeChain(): Promise<{
    hasEmit: boolean;
    hasOn: boolean;
    hasOff: boolean;
  }> {
    return this.page.evaluate(() => {
      const instance = (window as any).threeDSecureInstance;
      return {
        hasEmit: typeof instance._emit === "function",
        hasOn: typeof instance.on === "function",
        hasOff: typeof instance.off === "function",
      };
    });
  }
}
