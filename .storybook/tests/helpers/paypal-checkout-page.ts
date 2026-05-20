import { expect, Page } from "@playwright/test";
import {
  PAYPAL_POPUP_TIMEOUTS,
  PAYPAL_SUCCESS_MESSAGES,
} from "../../constants";

const PAYPAL_SDK_SCRIPT_SUBSTRING = "paypal.com/sdk/js";
const LEGACY_BUTTON_HOST_SELECTOR = "#paypal-button";
/**
 * PayPal.js (zoid) injects **several** iframes into `#paypal-button` — not only
 * the smart button. Each iframe gets a `name` like `__zoid__paypal_buttons__…`
 * or `__zoid_prerender_frame__…` with a long encoded payload in the `name`
 * (serialized props for cross-frame messaging; it is *not* an error, just noisy
 * in Playwright’s element dump). A broad `#paypal-button iframe` selector
 * therefore matches 3+ nodes and breaks strict mode — use a single frame here.
 * @see https://github.com/krakenjs/zoid
 */
const LEGACY_ZOID_PRERENDER_IFRAME = `${LEGACY_BUTTON_HOST_SELECTOR} iframe[name^="__zoid_prerender_frame__"]`;

const LOGIN_TIMEOUTS = {
  pageLoad: PAYPAL_POPUP_TIMEOUTS.LOGIN_PAGE,
  elementReady: 20000,
  elementClickable: 10000,
  navigation: PAYPAL_POPUP_TIMEOUTS.LOGIN_COMPLETE,
} as const;

enum LoginStyle {
  // eslint-disable-next-line no-unused-vars
  EMAIL_AND_PASSWORD = "emailAndPassword",
  // eslint-disable-next-line no-unused-vars
  EMAIL_THEN_PASSWORD = "emailThenPassword",
  // eslint-disable-next-line no-unused-vars
  EMAIL_THEN_OTP = "emailThenOTP",
  // eslint-disable-next-line no-unused-vars
  UNKNOWN = "Unknown",
}

interface PayPalTestResult {
  success: boolean;
  cancelled: boolean;
  error: boolean;
  text: string;
}

interface BillingAgreementTestResult extends PayPalTestResult {
  hasNonce: boolean;
  hasEmail: boolean;
  hasPlanType: boolean;
}

interface CapturedRequest {
  url: string;
  method: string;
  body: Record<string, unknown>;
}

export class CapturedRequests {
  private requests: CapturedRequest[] = [];

  add(request: CapturedRequest): void {
    this.requests.push(request);
  }

  findByUrl(urlSubstring: string): CapturedRequest | undefined {
    return this.requests.find((r) => r.url.includes(urlSubstring));
  }

  all(): CapturedRequest[] {
    return this.requests;
  }
}

const getPayPalBuyerCredentials = (): {
  email: string;
  password: string;
  otpCode: string;
} => {
  const email = process.env.PAYPAL_SANDBOX_BUYER_EMAIL;
  const password = process.env.PAYPAL_SANDBOX_BUYER_PASSWORD;
  const otpCode = process.env.PAYPAL_SANDBOX_OTP_CODE || "111111";

  if (!email) {
    throw new Error(
      "PayPal sandbox email not configured. " +
        "Set PAYPAL_SANDBOX_BUYER_EMAIL in .env"
    );
  }
  if (!password) {
    throw new Error(
      "PayPal sandbox password not configured. " +
        "Set PAYPAL_SANDBOX_BUYER_PASSWORD in .env"
    );
  }

  return { email, password, otpCode };
};

export class PayPalCheckoutPage {
  private readonly page: Page;
  private popup: Page | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  private getPopup(): Page {
    if (!this.popup) {
      throw new Error("PayPal popup not available. Call waitForPopup() first.");
    }
    return this.popup;
  }

  // ----- Button interaction -----

  async waitForPayPalButtonReady(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const btn = document.querySelector(".paypal-button");
        if (!btn) return false;
        const rect = btn.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      undefined,
      { timeout: 20000 }
    );
  }

  async clickPayPalButton(): Promise<void> {
    await this.waitForPayPalButtonReady();
    await this.page.locator(".paypal-button").click();
  }

  // ----- Popup lifecycle -----

  async waitForPopup(): Promise<Page> {
    const popupPromise = this.page.waitForEvent("popup", {
      timeout: PAYPAL_POPUP_TIMEOUTS.POPUP_OPEN,
    });
    await this.clickPayPalButton();
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

  async waitForPopupToClose(): Promise<void> {
    const popup = this.getPopup();
    if (popup.isClosed()) {
      this.popup = null;
      return;
    }

    await popup.waitForEvent("close", { timeout: 45000 });
    this.popup = null;
  }

  // ----- Login flows -----

  async completePayPalLogin(): Promise<void> {
    const { email, password } = getPayPalBuyerCredentials();
    const popup = this.getPopup();

    await this.waitForPayPalPageLoad(popup);
    await this.waitForLoginPageReady(popup);
    await this.enterPayPalEmail(popup, email);
    await this.completeLogin(popup, password);
    await this.waitForCheckoutNavigation(popup);
  }

  async completeBillingAgreementLogin(): Promise<void> {
    const { email, password } = getPayPalBuyerCredentials();
    const popup = this.getPopup();

    await this.waitForPayPalPageLoad(popup);
    await this.waitForLoginPageReady(popup);
    await this.enterPayPalEmail(popup, email);
    await this.completeLogin(popup, password);
    await this.waitForBillingAgreementNavigation(popup);
  }

  // ----- Approval / cancellation -----

  async approvePayPalPayment(): Promise<void> {
    const popup = this.getPopup();

    await this.waitForPageToFinishLoading(popup);

    // PayPal may require step-up verification before showing the pay button
    await this.handleStepUpVerification(popup);

    // Wait for the Pay button - matches "Pay$10.00", "Pay Now", "Continue"
    // but NOT "Pay with" (which is the payment method selector)
    const payButton = popup
      .locator("button")
      .filter({ hasText: /^Pay\s*\$/ })
      .or(popup.getByRole("button", { name: /Pay Now/i }))
      .or(popup.getByRole("button", { name: /^Continue$/i }))
      .or(popup.getByRole("button", { name: /Complete Purchase/i }))
      .first();

    await payButton.waitFor({
      state: "visible",
      timeout: PAYPAL_POPUP_TIMEOUTS.APPROVAL_PAGE,
    });

    await payButton.click();
  }

  async approveBillingAgreement(): Promise<void> {
    const popup = this.getPopup();

    await this.waitForPageToFinishLoading(popup);

    // Wait for any OTP form processing to complete
    await this.handleStepUpVerification(popup);

    // PayPal billing-agreement UIs vary by region / experiment (e.g. Agree and
    // Continue, Subscribe, Link account).
    const approvalButton = popup
      .getByRole("button", { name: /Agree/i })
      .or(popup.getByRole("button", { name: /Agree and Continue/i }))
      .or(popup.getByRole("button", { name: /Continue/i }))
      .or(popup.getByRole("button", { name: /Set Up/i }))
      .or(popup.getByRole("button", { name: /Subscribe/i }))
      .or(popup.getByRole("button", { name: /Link( account)?/i }))
      .first();

    await approvalButton.waitFor({
      state: "visible",
      timeout: 45000,
    });

    await approvalButton.click();
  }

  async cancelPayPalPayment(): Promise<void> {
    const popup = this.getPopup();
    try {
      await popup.close();
    } catch {
      // may already be closed
    }
    this.popup = null;
    // PayPal (zoid) may deliver onCancel to the parent shortly after the popup
    // is torn down; a raw window close can be slightly racy in CI.
    await this.page.waitForTimeout(2000);
  }

  // ----- Results (on main page) -----

  async getPayPalResult(): Promise<PayPalTestResult> {
    await this.page.waitForFunction(
      () => {
        const resultDiv = document.querySelector("#result");
        const classes = resultDiv?.getAttribute("class");
        return classes && classes.includes("shared-result--visible");
      },
      undefined,
      { timeout: 30000 }
    );

    const resultContainer = this.page.locator("#result");
    const resultClasses = (await resultContainer.getAttribute("class")) ?? "";
    const resultText = (await resultContainer.textContent()) ?? "";

    return {
      success: resultClasses.includes("shared-result--success"),
      cancelled: resultText.includes(PAYPAL_SUCCESS_MESSAGES.CANCELLED),
      error: resultClasses.includes("shared-result--error"),
      text: resultText,
    };
  }

  async getBillingAgreementResult(): Promise<BillingAgreementTestResult> {
    await this.page.waitForFunction(
      () => {
        const resultDiv = document.querySelector("#result");
        const classes = resultDiv?.getAttribute("class");
        return classes && classes.includes("shared-result--visible");
      },
      undefined,
      { timeout: 60000 }
    );

    const resultContainer = this.page.locator("#result");
    const resultClasses = (await resultContainer.getAttribute("class")) ?? "";
    const resultText = (await resultContainer.textContent()) ?? "";

    return {
      success: resultClasses.includes("shared-result--success"),
      cancelled:
        resultText.includes("Cancelled") || resultText.includes("cancelled"),
      error: resultClasses.includes("shared-result--error"),
      text: resultText,
      hasNonce: resultText.includes("Nonce:"),
      hasEmail:
        resultText.includes("Email:") || resultText.includes("Payer Email:"),
      hasPlanType: /RECURRING|SUBSCRIPTION|UNSCHEDULED|INSTALLMENTS/.test(
        resultText
      ),
    };
  }

  async getResultContainerState(): Promise<{
    isVisible: boolean;
    resultText: string;
  }> {
    const resultContainer = this.page.locator("#result");
    const resultClasses = await resultContainer.getAttribute("class");
    const isVisible =
      resultClasses?.includes("shared-result--visible") ?? false;
    const resultText = isVisible
      ? ((await resultContainer.textContent()) ?? "")
      : "";
    return { isVisible, resultText };
  }

  // ----- Legacy PayPal Checkout (iframe in #paypal-button) -----

  /**
   * Waits until the Braintree + PayPal SDK has injected a PayPal.js script.
   * Legacy stories do not add `.paypal-button`; the smart button lives in
   * `#paypal-button` iframe.
   */
  async waitForPayPalSDKLoaded(): Promise<void> {
    const fragment = PAYPAL_SDK_SCRIPT_SUBSTRING;
    await this.page.waitForFunction(
      (sdkFragment) => {
        const list = document.querySelectorAll("script");
        for (let i = 0; i < list.length; i += 1) {
          const el = list[i] as HTMLScriptElement;
          const src = el.getAttribute("src") || "";
          if (src.indexOf(sdkFragment) !== -1) {
            return true;
          }
        }
        return false;
      },
      fragment,
      { timeout: 20000 }
    );
  }

  /**
   * Returns the `src` of the first PayPal JS SDK script, or `null` if none.
   */
  getPayPalSDKScriptSrc(): Promise<string | null> {
    return this.page.evaluate((fragment: string) => {
      const list = document.querySelectorAll("script");
      for (let i = 0; i < list.length; i += 1) {
        const el = list[i] as HTMLScriptElement;
        const src = el.getAttribute("src") || "";
        if (src.indexOf(fragment) !== -1) {
          return src;
        }
      }
      return null;
    }, PAYPAL_SDK_SCRIPT_SUBSTRING);
  }

  getPayPalSDKScriptCount(): Promise<number> {
    return this.page.evaluate((fragment: string) => {
      const list = document.querySelectorAll("script");
      let n = 0;
      for (let i = 0; i < list.length; i += 1) {
        const el = list[i] as HTMLScriptElement;
        if ((el.getAttribute("src") || "").indexOf(fragment) !== -1) {
          n += 1;
        }
      }
      return n;
    }, PAYPAL_SDK_SCRIPT_SUBSTRING);
  }

  async toggleRecurringPurchase(checked: boolean): Promise<void> {
    await this.page.locator("#vaultWithPurchaseToggle").setChecked(checked);
  }

  async waitForLegacyPayPalButtonReady(): Promise<void> {
    await this.page
      .locator(LEGACY_ZOID_PRERENDER_IFRAME)
      .first()
      .waitFor({ state: "visible", timeout: 20000 });
  }

  async clickLegacyPayPalButton(): Promise<void> {
    await this.waitForLegacyPayPalButtonReady();
    const frame = this.page.frameLocator(LEGACY_ZOID_PRERENDER_IFRAME);
    const trigger = frame
      .getByRole("link")
      .or(frame.getByRole("button"))
      .or(frame.locator("div[role='link']"));
    await trigger.first().click({ timeout: 15000 });
  }

  async waitForLegacyPopup(): Promise<Page> {
    const popupPromise = this.page.waitForEvent("popup", {
      timeout: PAYPAL_POPUP_TIMEOUTS.POPUP_OPEN,
    });
    await this.clickLegacyPayPalButton();
    this.popup = await popupPromise;
    return this.popup;
  }

  async expectLegacyPayPalButtonVisible(): Promise<void> {
    const iframe = this.page.locator(LEGACY_ZOID_PRERENDER_IFRAME).first();
    await expect(iframe).toBeVisible({ timeout: 20000 });
  }

  async expectLegacyPayPalButtonEnabled(): Promise<void> {
    await this.waitForPayPalSDKLoaded();
    await this.waitForLegacyPayPalButtonReady();
    await expect(this.page.locator(LEGACY_BUTTON_HOST_SELECTOR)).toBeVisible();
  }

  // ----- Network interception (on main page) -----

  async setupNetworkCapture(): Promise<CapturedRequests> {
    const captured = new CapturedRequests();
    await this.page.route("**/*", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        try {
          captured.add({
            url: request.url(),
            method: request.method(),
            body: JSON.parse(request.postData() || "{}"),
          });
        } catch {
          /* ignore non-JSON */
        }
      }
      await route.continue();
    });
    return captured;
  }

  // ----- Complete checkout flow (login + approve + wait) -----

  async completePayPalCheckoutFlow(): Promise<void> {
    await this.waitForPopupFromExistingClick();

    await this.completePayPalLogin();
    await this.approvePayPalPayment();

    try {
      await this.waitForPopupToClose();
    } catch {
      await this.closePopup();
    }
  }

  // ----- Private: login implementation -----

  private async waitForPopupFromExistingClick(): Promise<Page> {
    // Used when the button was already clicked (e.g. by a prior clickPayPalButton call)
    // and we just need to capture the popup that's opening
    const popup = this.page
      .context()
      .pages()
      .find((p) => p !== this.page && !p.isClosed());

    if (popup) {
      this.popup = popup;
      return popup;
    }

    // If popup hasn't appeared yet, wait for it
    this.popup = await this.page.waitForEvent("popup", {
      timeout: PAYPAL_POPUP_TIMEOUTS.POPUP_OPEN,
    });
    return this.popup;
  }

  private async waitForPayPalPageLoad(popup: Page): Promise<void> {
    await popup.waitForURL(/paypal\.com/, {
      timeout: LOGIN_TIMEOUTS.pageLoad,
      waitUntil: "domcontentloaded",
    });
  }

  private async waitForPageToFinishLoading(popup: Page): Promise<void> {
    const spinnerSelectors = [
      ".spinner",
      ".loading",
      "[data-testid='spinner']",
      "#preloaderSpinner",
      ".spinnerWithLockup",
    ];

    for (const selector of spinnerSelectors) {
      const spinner = popup.locator(selector);
      const count = await spinner.count();
      if (count > 0) {
        await spinner
          .first()
          .waitFor({
            state: "hidden",
            timeout: LOGIN_TIMEOUTS.elementReady,
          })
          .catch(() => {
            // Spinner might already be gone
          });
      }
    }
  }

  private async waitForLoginPageReady(popup: Page): Promise<void> {
    await this.waitForPageToFinishLoading(popup);

    await popup.locator("#email").waitFor({
      state: "visible",
      timeout: LOGIN_TIMEOUTS.elementReady,
    });
  }

  private async enterPayPalEmail(popup: Page, email: string): Promise<void> {
    const emailInput = popup.locator("#email");
    await emailInput.fill(email);
  }

  private async clickPayPalNextButton(popup: Page): Promise<void> {
    const nextButton = popup
      .getByRole("button", { name: "Next", exact: true })
      .or(popup.locator("#btnNext"))
      .first();

    await nextButton.waitFor({
      state: "visible",
      timeout: LOGIN_TIMEOUTS.elementClickable,
    });

    await nextButton.click();

    // Wait for email input to disappear (navigation away from email page)
    await popup
      .locator("#email")
      .waitFor({
        state: "hidden",
        timeout: LOGIN_TIMEOUTS.navigation,
      })
      .catch(() => {
        // Email input might not hide in all flows
      });
  }

  private async clickGetCodeButton(popup: Page): Promise<void> {
    const getCodeButton = popup
      .getByRole("button", { name: /Get a Code/i })
      .or(popup.getByRole("button", { name: /Send code/i }))
      .first();

    await getCodeButton.waitFor({
      state: "visible",
      timeout: LOGIN_TIMEOUTS.elementReady,
    });

    await getCodeButton.click();
  }

  private async enterPayPalOtp(popup: Page, otpCode: string): Promise<void> {
    // Wait for OTP input - try multiple known selectors
    const otpInput = popup
      .locator("#ci")
      .or(popup.locator("#otpCode"))
      .or(popup.getByRole("textbox", { name: /code/i }))
      .or(popup.locator("input[type='tel']"))
      .first();

    await otpInput.waitFor({
      state: "visible",
      timeout: LOGIN_TIMEOUTS.elementReady,
    });

    await otpInput.fill(otpCode);
    await popup.keyboard.press("Enter");

    // Wait for OTP form to fully process and disappear
    await popup
      .locator("form[name='codeInputForm']")
      .waitFor({
        state: "hidden",
        timeout: LOGIN_TIMEOUTS.navigation,
      })
      .catch(() => {
        // Form might already be gone
      });

    await this.waitForPageToFinishLoading(popup);
  }

  private async detectLoginStyle(popup: Page): Promise<LoginStyle> {
    const emailElement = popup.locator("#email");
    const emailVisible = await emailElement.isVisible().catch(() => false);

    const passwordElement = popup.locator("input#password");
    const passwordVisible =
      (await passwordElement.isVisible().catch(() => false)) &&
      (await passwordElement.getAttribute("aria-hidden")) === "false";

    if (emailVisible && passwordVisible) {
      return LoginStyle.EMAIL_AND_PASSWORD;
    }

    // Click Next to proceed past email step
    await this.clickPayPalNextButton(popup);

    // Wait for either password or OTP to appear
    const passwordOrOtp = popup
      .locator("input#password")
      .or(popup.locator("#ci"))
      .or(popup.locator("#otpCode"))
      .first();

    await passwordOrOtp.waitFor({
      state: "visible",
      timeout: LOGIN_TIMEOUTS.elementReady,
    });

    const isPassword = await popup
      .locator("input#password")
      .isVisible()
      .catch(() => false);

    return isPassword
      ? LoginStyle.EMAIL_THEN_PASSWORD
      : LoginStyle.EMAIL_THEN_OTP;
  }

  private async loginWithPassword(
    popup: Page,
    password: string
  ): Promise<void> {
    const passwordInput = popup.locator("input#password");
    await passwordInput.fill(password);

    const loginButton = popup
      .getByRole("button", { name: /Log\s*In/i })
      .or(popup.getByRole("button", { name: /Sign\s*In/i }))
      .or(popup.getByRole("button", { name: "Next", exact: true }))
      .or(popup.locator("#btnLogin"))
      .first();

    await loginButton.waitFor({
      state: "visible",
      timeout: LOGIN_TIMEOUTS.elementClickable,
    });
    await loginButton.click();

    // PayPal may require OTP after password login
    const otpButton = popup
      .getByRole("button", { name: /Get a Code/i })
      .or(popup.getByRole("button", { name: /Send code/i }))
      .first();

    const otpRequired = await otpButton
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (otpRequired) {
      await this.loginWithOTP(popup);
    }
  }

  private async loginWithOTP(popup: Page): Promise<void> {
    const otpCode = process.env.PAYPAL_SANDBOX_OTP_CODE || "111111";

    await this.clickGetCodeButton(popup);
    await this.enterPayPalOtp(popup, otpCode);
  }

  private async completeLogin(popup: Page, password: string): Promise<void> {
    const loginStyle = await this.detectLoginStyle(popup);

    if (
      loginStyle === LoginStyle.EMAIL_AND_PASSWORD ||
      loginStyle === LoginStyle.EMAIL_THEN_PASSWORD
    ) {
      await this.loginWithPassword(popup, password);
    } else if (loginStyle === LoginStyle.EMAIL_THEN_OTP) {
      await this.loginWithOTP(popup);
    } else {
      throw new Error("Unable to determine PayPal login style");
    }
  }

  private async handleStepUpVerification(popup: Page): Promise<void> {
    // Wait for any OTP form processing to complete
    await popup
      .locator("form[name='codeInputForm']")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {
        // Form might not exist
      });

    await this.waitForPageToFinishLoading(popup);
  }

  private async waitForCheckoutNavigation(popup: Page): Promise<void> {
    // Wait for login form to disappear (password field gone = login complete)
    // In the new PayPal SPA flow, the URL may stay the same throughout
    await popup
      .locator("input#password")
      .waitFor({
        state: "hidden",
        timeout: LOGIN_TIMEOUTS.navigation,
      })
      .catch(() => {
        // Password field might already be gone
      });

    // Also wait for OTP elements to disappear if they were shown
    await popup
      .locator("#ci")
      .or(popup.locator("#otpCode"))
      .first()
      .waitFor({
        state: "hidden",
        timeout: LOGIN_TIMEOUTS.navigation,
      })
      .catch(() => {
        // OTP elements might not have been shown
      });

    await this.waitForPageToFinishLoading(popup);
  }

  private async waitForBillingAgreementNavigation(popup: Page): Promise<void> {
    // Wait for login form to disappear (password field gone = login complete)
    // In the new PayPal SPA flow, the URL stays the same throughout
    await popup
      .locator("input#password")
      .waitFor({
        state: "hidden",
        timeout: LOGIN_TIMEOUTS.navigation,
      })
      .catch(() => {
        // Password field might already be gone
      });

    // Also wait for OTP elements to disappear if they were shown
    await popup
      .locator("#ci")
      .or(popup.locator("#otpCode"))
      .first()
      .waitFor({
        state: "hidden",
        timeout: LOGIN_TIMEOUTS.navigation,
      })
      .catch(() => {
        // OTP elements might not have been shown
      });

    await this.waitForPageToFinishLoading(popup);
  }
}
