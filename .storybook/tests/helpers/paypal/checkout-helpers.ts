/* eslint-disable no-console */
import { $ } from "@wdio/globals";
import { Key } from "webdriverio";
import { PAYPAL_POPUP_TIMEOUTS, PAYPAL_SELECTORS } from "../../../constants";

const LOGIN_TIMEOUTS = {
  pageLoad: PAYPAL_POPUP_TIMEOUTS.LOGIN_PAGE,
  elementReady: 20000,
  elementClickable: 10000,
  navigation: PAYPAL_POPUP_TIMEOUTS.LOGIN_COMPLETE,
  pollInterval: 500,
  clickRetryDelay: 2000,
} as const;

const paypalLog = (message: string): void => {
  console.log(`[PayPal] ${message}`);
};

interface WaitForElementOptions {
  timeout?: number;
  timeoutMsg?: string;
  interval?: number;
}

// For some reason ESLint doesn't think we're using the enum properties
// There could be a fix here: https://stackoverflow.com/questions/57802057/eslint-configuring-no-unused-vars-for-typescript
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

export const waitUntilReady = async (
  elementSelector: string | string[],
  options: WaitForElementOptions = {}
) => {
  const selectors = Array.isArray(elementSelector)
    ? elementSelector
    : [elementSelector];
  const {
    timeout = LOGIN_TIMEOUTS.elementReady,
    timeoutMsg = `Element(s) "${selectors.join(", ")}" did not become ready`,
    interval = LOGIN_TIMEOUTS.pollInterval,
  } = options;

  await browser.waitUntil(
    async () => {
      for (const selector of selectors) {
        const element = await $(selector);

        const doesExist = await element.isExisting();
        const isDisplayed = await element.isDisplayed();

        if (doesExist && isDisplayed) {
          return true;
        }
      }

      return false;
    },
    {
      timeout,
      timeoutMsg,
      interval,
    }
  );
};

/**
 * Repeatedly performs an action until an element exists, is displayed, and is clickable.
 * Useful for PayPal flows where clicking a button may need multiple attempts
 * before the next element becomes available.
 *
 * @param action - Function to execute on each iteration (e.g., click a button)
 * @param elementSelector - CSS selector for the element to wait for
 * @param options - Optional timeout configuration
 */
export const doUntilElementReady = async (
  action: () => Promise<void>,
  elementSelector: string | string[],
  options: WaitForElementOptions = {}
): Promise<void> => {
  const selectors = Array.isArray(elementSelector)
    ? elementSelector
    : [elementSelector];
  const {
    timeout = LOGIN_TIMEOUTS.elementReady,
    timeoutMsg = `Element(s) "${selectors.join(", ")}" did not become ready`,
    interval = LOGIN_TIMEOUTS.pollInterval,
  } = options;

  await browser.waitUntil(
    async () => {
      await action();

      for (const selector of selectors) {
        const element = await $(selector);

        const doesExist = await element.isExisting().catch(() => false);
        const isDisplayed = await element.isDisplayed().catch(() => false);

        if (doesExist && isDisplayed) {
          return true;
        }
      }

      return false;
    },
    {
      timeout,
      timeoutMsg,
      interval,
    }
  );
};

export const getPayPalBuyerCredentials = (): {
  email: string;
  password: string;
} => {
  const email = process.env.PAYPAL_SANDBOX_BUYER_EMAIL;
  const password = process.env.PAYPAL_SANDBOX_BUYER_PASSWORD;

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

  return { email, password };
};

export const switchToPayPalPopup = async (): Promise<string> => {
  const originalWindowHandle = await browser.getWindowHandle();

  await browser.waitUntil(
    async () => {
      const allWindowHandles = await browser.getWindowHandles();

      return allWindowHandles.length > 1;
    },
    {
      timeout: PAYPAL_POPUP_TIMEOUTS.POPUP_OPEN,
      timeoutMsg: "PayPal popup did not open within timeout",
      interval: LOGIN_TIMEOUTS.pollInterval,
    }
  );

  const allWindowHandles = await browser.getWindowHandles();
  const paypalPopupHandle = allWindowHandles.find(
    (windowHandle) => windowHandle !== originalWindowHandle
  );

  if (!paypalPopupHandle) {
    throw new Error("Could not find PayPal popup window handle");
  }

  await browser.switchToWindow(paypalPopupHandle);
  paypalLog("Switched to PayPal popup");

  return originalWindowHandle;
};

export const switchToOriginalWindow = async (
  originalWindowHandle: string
): Promise<void> => {
  await browser.switchToWindow(originalWindowHandle);
  paypalLog("Switched back to original window");
};

export const closePayPalPopup = async (
  originalWindowHandle: string
): Promise<void> => {
  const allWindowHandles = await browser.getWindowHandles();

  for (const windowHandle of allWindowHandles) {
    if (windowHandle !== originalWindowHandle) {
      try {
        await browser.switchToWindow(windowHandle);
        await browser.closeWindow();
        paypalLog("Closed PayPal popup window");
      } catch (error) {
        paypalLog(`Error closing popup: ${(error as Error).message}`);
      }
    }
  }

  // Ensure we're back on the original window
  const remainingWindowHandles = await browser.getWindowHandles();

  if (remainingWindowHandles.includes(originalWindowHandle)) {
    await browser.switchToWindow(originalWindowHandle);
  } else if (remainingWindowHandles.length > 0) {
    await browser.switchToWindow(remainingWindowHandles[0]);
  }
};

export const waitForPayPalPageLoad = async (): Promise<void> => {
  await browser.waitUntil(
    async () => {
      const currentUrl = await browser.getUrl();

      return currentUrl.includes("paypal.com");
    },
    {
      timeout: LOGIN_TIMEOUTS.pageLoad,
      timeoutMsg: "PayPal login page did not load",
    }
  );

  paypalLog("PayPal login page loaded");
};

export const waitForPageToFinishLoading = async (): Promise<void> => {
  // Common PayPal loading spinner selectors
  const spinnerSelectors = [
    ".spinner",
    ".loading",
    "[data-testid='spinner']",
    "#preloaderSpinner",
    ".spinnerWithLockup",
  ];

  // Wait for any visible spinner to disappear
  for (const selector of spinnerSelectors) {
    const spinner = await $(selector);
    const exists = await spinner.isExisting().catch(() => false);

    if (exists) {
      paypalLog(`Waiting for spinner to disappear: ${selector}`);
      await browser.waitUntil(
        async () => {
          const isDisplayed = await spinner.isDisplayed().catch(() => false);

          return !isDisplayed;
        },
        {
          timeout: LOGIN_TIMEOUTS.elementReady,
          timeoutMsg: `Spinner ${selector} did not disappear`,
          interval: LOGIN_TIMEOUTS.pollInterval,
        }
      );
    }
  }

  paypalLog("Page finished loading");
};

export const waitForLoginPageReady = async (): Promise<void> => {
  // First wait for any loading spinners to disappear
  await waitForPageToFinishLoading();

  // Then wait for email input to appear
  await waitUntilReady(PAYPAL_SELECTORS.EMAIL_INPUT, {
    timeoutMsg: "Email input never appeared",
  });
};

export const enterPayPalEmail = async (email: string): Promise<void> => {
  const emailInputField = await $(PAYPAL_SELECTORS.EMAIL_INPUT);

  await emailInputField.setValue(email);

  paypalLog("Entered email address");
};

export const clickPayPalNextButton = async (): Promise<void> => {
  await browser.waitUntil(async () => {
    const element = await $(PAYPAL_SELECTORS.EMAIL_NEXT_BUTTON);

    const doesExist = await element.isExisting();
    const isDisplayed = await element.isDisplayed();
    const isClickable = await element.isClickable();

    if (doesExist && isDisplayed && isClickable) {
      return true;
    }

    return false;
  });

  paypalLog("Next button is displayed and clickable");

  const nextButton = await $(PAYPAL_SELECTORS.EMAIL_NEXT_BUTTON);

  await nextButton.click();

  paypalLog("Clicked Next button");

  const emailInputField = await $(PAYPAL_SELECTORS.EMAIL_INPUT);

  await browser.waitUntil(
    async () => {
      const isEmailInputDisplayed = await emailInputField
        .isDisplayed()
        .catch(function () {
          return false;
        });

      return !isEmailInputDisplayed;
    },
    {
      timeout: LOGIN_TIMEOUTS.navigation,
      timeoutMsg: "Email page did not navigate away after clicking Next",
      interval: LOGIN_TIMEOUTS.pollInterval,
    }
  );

  paypalLog("Navigation away from email page detected after clicking Next");
};

export const clickGetCodeButton = async (): Promise<void> => {
  await waitUntilReady(PAYPAL_SELECTORS.GET_CODE_BUTTON, {
    timeoutMsg: "Get a Code button did not appear",
  });

  const getACodeButton = await $(PAYPAL_SELECTORS.GET_CODE_BUTTON);

  await doUntilElementReady(async () => {
    await getACodeButton.click();
    await browser.keys(Key.Enter);
  }, PAYPAL_SELECTORS.ALT_OTP_INPUT);

  paypalLog("Clicked Get a Code button");
};

export const enterPayPalOtp = async (otpCode: string): Promise<void> => {
  await waitUntilReady(PAYPAL_SELECTORS.ALT_OTP_INPUT, {
    timeoutMsg: "OTP input did not appear",
  });

  paypalLog("OTP input appeared");

  const otpInputField = $(PAYPAL_SELECTORS.ALT_OTP_INPUT);

  await otpInputField.setValue(otpCode);

  paypalLog("OTP entered - waiting for auto-submit navigation");
};

export const waitForCheckoutNavigation = async (): Promise<void> => {
  await browser.waitUntil(
    async () => {
      const currentUrl = await browser.getUrl();

      return currentUrl.includes("/checkout");
    },
    {
      timeout: LOGIN_TIMEOUTS.navigation,
      timeoutMsg: "Did not reach checkout page after OTP",
      interval: LOGIN_TIMEOUTS.pollInterval,
    }
  );

  paypalLog("Reached checkout/approval page");
};

export const approvePayPalPayment = async (): Promise<void> => {
  await waitUntilReady("button*=Pay$", {
    timeout: PAYPAL_POPUP_TIMEOUTS.APPROVAL_PAGE,
    timeoutMsg: "Pay button did not become clickable",
  });

  const payNowButton = $("button*=Pay$");

  paypalLog("Clicking Pay button");

  await payNowButton.click();

  paypalLog("Payment approved");
};

export const cancelPayPalPayment = async (): Promise<void> => {
  paypalLog("Cancelling payment by closing popup window");
  await browser.closeWindow();
  paypalLog("Payment cancelled - popup closed");
};

export const waitForPopupToClose = async (): Promise<void> => {
  await browser.waitUntil(
    async () => {
      const handles = await browser.getWindowHandles();

      return handles.length === 1;
    },
    {
      timeout: 45000,
      timeoutMsg:
        "PayPal popup did not close automatically after 45 seconds. " +
        "This usually means the payment flow did not complete properly.",
      interval: 500,
    }
  );
  paypalLog("PayPal popup closed automatically");
};

export const loginWithEmailAndPassword = async (
  password: string
): Promise<void> => {
  paypalLog("loginWithEmailAndPassword");

  const passwordInput = await $(PAYPAL_SELECTORS.PASSWORD_INPUT);

  await passwordInput.setValue(password);

  paypalLog("Entered password");

  const loginButton = await $("button=Log In");

  await loginButton.click();

  paypalLog("Log In button clicked");
};

export const loginWithEmailThenPassword = async (
  password: string
): Promise<void> => {
  paypalLog("loginWithEmailThenPassword");

  const passwordInput = await $(PAYPAL_SELECTORS.PASSWORD_INPUT);

  await passwordInput.setValue(password);

  paypalLog("Entered password");

  const loginButton = await $("button=Log In");

  await loginButton.click();

  paypalLog("Log In button clicked");
};

export const loginWithEmailAndOTP = async (): Promise<void> => {
  const otpCode = process.env.PAYPAL_SANDBOX_OTP_CODE || "111111";
  paypalLog("loginWithEmailAndOTP");

  await clickGetCodeButton();
  await enterPayPalOtp(otpCode);
};

export const completeLogin = async (password: string): Promise<void> => {
  let loginStyle: string = LoginStyle.UNKNOWN;

  const emailInputFieldExists = await $(PAYPAL_SELECTORS.EMAIL_INPUT);
  const passwordInputFieldExistsWithEmail = await $(
    PAYPAL_SELECTORS.PASSWORD_INPUT
  ).isExisting();
  const passwordInputFieldIsDisplayed = await $(
    PAYPAL_SELECTORS.PASSWORD_INPUT
  ).isDisplayed();

  if (
    emailInputFieldExists &&
    passwordInputFieldExistsWithEmail &&
    passwordInputFieldIsDisplayed
  ) {
    loginStyle = LoginStyle.EMAIL_AND_PASSWORD;
  } else {
    paypalLog("Clicking PayPal Next button");
    await clickPayPalNextButton();
    paypalLog("Clicked PayPal Next button");

    await browser.waitUntil(async () => {
      const passwordInputExists = await $(
        PAYPAL_SELECTORS.PASSWORD_INPUT
      ).isExisting();
      const otpInputFieldExists = await $(
        PAYPAL_SELECTORS.OTP_INPUT
      ).isExisting();
      const otpInputFieldAltExists = await $(
        PAYPAL_SELECTORS.ALT_OTP_INPUT
      ).isExisting();

      return (
        passwordInputExists || otpInputFieldExists || otpInputFieldAltExists
      );
    });

    const passwordInputFieldExistsAfterEmail = await $(
      PAYPAL_SELECTORS.PASSWORD_INPUT
    ).isExisting();
    const passwordInputFieldIsDisplayedAfterEmail = await $(
      PAYPAL_SELECTORS.PASSWORD_INPUT
    ).isDisplayed();

    if (
      passwordInputFieldExistsAfterEmail &&
      passwordInputFieldIsDisplayedAfterEmail
    ) {
      loginStyle = LoginStyle.EMAIL_THEN_PASSWORD;
    } else {
      const otpInputFieldExists =
        (await $(PAYPAL_SELECTORS.ALT_OTP_INPUT).isExisting()) ||
        (await $(PAYPAL_SELECTORS.OTP_INPUT).isExisting());

      if (otpInputFieldExists) {
        loginStyle = LoginStyle.EMAIL_THEN_OTP;
      }
    }
  }

  paypalLog(`Login Style: ${loginStyle}`);

  if (loginStyle === LoginStyle.EMAIL_AND_PASSWORD) {
    await loginWithEmailAndPassword(password);
  } else if (loginStyle === LoginStyle.EMAIL_THEN_PASSWORD) {
    await loginWithEmailThenPassword(password);
  } else if (loginStyle === LoginStyle.EMAIL_THEN_OTP) {
    await loginWithEmailAndOTP();
  } else {
    throw new Error("Unable to determine PayPal login style");
  }
};

export const completePayPalLogin = async (): Promise<void> => {
  const { email, password } = getPayPalBuyerCredentials();

  await waitForPayPalPageLoad();

  await waitForLoginPageReady();

  await enterPayPalEmail(email);

  await completeLogin(password);

  await waitForCheckoutNavigation();

  paypalLog("Login completed successfully");
};

/**
 * Complete PayPal login for billing agreement flows
 * Skips checkout URL check since BA flows navigate to different paths
 * (e.g., /agreements, /connect, /webapps instead of /checkout)
 */
export const completeBillingAgreementLogin = async (): Promise<void> => {
  const { email, password } = getPayPalBuyerCredentials();

  await waitForPayPalPageLoad();
  await waitForLoginPageReady();

  await enterPayPalEmail(email);

  // Use same dynamic login detection as regular checkout
  // This handles EMAIL_AND_PASSWORD, EMAIL_THEN_PASSWORD, and EMAIL_THEN_OTP flows
  await completeLogin(password);

  // Wait for billing agreement page to load
  // BA flows use various URLs (/agreements, /connect, /webapps) not /checkout
  await waitForBillingAgreementNavigation();

  paypalLog("Billing agreement login completed");
};

/**
 * Wait for navigation to billing agreement approval page
 * Checks for various URL patterns used in BA flows
 */
export const waitForBillingAgreementNavigation = async (): Promise<void> => {
  await browser.waitUntil(
    async () => {
      const currentUrl = await browser.getUrl();

      // Check for various billing agreement URL patterns
      // V6 uses /pay/ path, older flows use /checkout, /agreements, etc.
      return (
        currentUrl.includes("/pay") ||
        currentUrl.includes("/checkout") ||
        currentUrl.includes("/agreements") ||
        currentUrl.includes("/connect") ||
        currentUrl.includes("/webapps") ||
        currentUrl.includes("/signin/authorize")
      );
    },
    {
      timeout: LOGIN_TIMEOUTS.navigation,
      timeoutMsg: "Did not reach billing agreement page after OTP",
      interval: LOGIN_TIMEOUTS.pollInterval,
    }
  );

  paypalLog("Reached billing agreement approval page");
};

const BILLING_AGREEMENT_BUTTON_SELECTORS = [
  "button*=Agree",
  "button*=Continue",
  "button*=Set Up",
];

/**
 * Approve billing agreement after login
 * Billing agreements may show different approval UI than regular checkout
 * (e.g., "Agree & Continue", "Set Up", "Continue" instead of "Pay")
 */
export const approveBillingAgreement = async (): Promise<void> => {
  await waitUntilReady(BILLING_AGREEMENT_BUTTON_SELECTORS, {
    timeout: 20000,
    timeoutMsg: "Billing agreement approval button did not appear",
    interval: 500,
  });

  // Click the first available approval button
  for (const selector of BILLING_AGREEMENT_BUTTON_SELECTORS) {
    const button = $(selector);
    const isClickable = await button.isClickable().catch(() => false);

    if (isClickable) {
      await button.click();
      paypalLog("Clicked billing agreement approval button");

      return;
    }
  }
};

export const completePayPalCheckoutFlow = async (): Promise<string> => {
  const originalWindowHandle = await switchToPayPalPopup();

  await completePayPalLogin();
  await approvePayPalPayment();

  try {
    await browser.waitUntil(
      async () => {
        const allWindowHandles = await browser.getWindowHandles();

        return allWindowHandles.length === 1;
      },
      {
        timeout: 15000,
        timeoutMsg: "PayPal popup did not close after approval",
        interval: LOGIN_TIMEOUTS.pollInterval,
      }
    );
    paypalLog("PayPal popup closed automatically");
  } catch (error) {
    paypalLog(
      `Popup did not close automatically, closing manually: ${(error as Error).message}`
    );
    await closePayPalPopup(originalWindowHandle);
  }

  await switchToOriginalWindow(originalWindowHandle);

  return originalWindowHandle;
};
