export const SUCCESS_MESSAGES = {
  TOKENIZATION: "Payment tokenized successfully!",
  VERIFICATION: "Card verified successfully!",
};

export const yearInFuture = (new Date().getFullYear() % 100) + 3; // current year + 3

export const DEFAULT_HOSTED_FIELDS_VALUES = {
  number: "4111111111111111",
  expirationDate: `12/${yearInFuture}`,
  cvv: "123",
  postalCode: "12345",
};

export const BASE_URL = "https://127.0.0.1:8080";

// PayPal V6 success messages
export const PAYPAL_SUCCESS_MESSAGES = {
  AUTHORIZED: "PayPal payment authorized!",
  CANCELLED: "Payment Cancelled",
};

// PayPal popup timeouts (in milliseconds)
export const PAYPAL_POPUP_TIMEOUTS = {
  POPUP_OPEN: 10000,
  LOGIN_PAGE: 15000,
  LOGIN_COMPLETE: 20000,
  APPROVAL_PAGE: 15000,
  FLOW_COMPLETE: 30000,
};

// PayPal sandbox UI selectors (centralized for maintainability)
// NOTE: PayPal sandbox uses passwordless login: Email → Next → 2FA → Approval
// IMPORTANT: Use text-based and role-based selectors for stability - PayPal frequently updates their UI
export const PAYPAL_SELECTORS = {
  // Login page - Email step (try multiple selectors for robustness)
  EMAIL_INPUT: "#email",
  ALT_EMAIL_INPUT: 'input[name="login_email"]',

  // Next button - use text-based selectors instead of fragile nth-child
  // WebDriverIO text selector syntax: "button=Text" for exact match, "button*=Text" for partial
  EMAIL_NEXT_BUTTON: "button=Next",
  ALT_EMAIL_NEXT_BUTTON: "#btnNext",

  PASSWORD_INPUT: 'input[id="password"]',

  // 2FA / OTP page (flow: click get code → enter code → auto-submits)
  // Note: PayPal uses "Get a Code" with capital C
  GET_CODE_BUTTON: "button*=Get a Code",
  ALT_GET_CODE_BUTTON: "button*=Send code",
  OTP_INPUT: "#otpCode",
  ALT_OTP_INPUT: "#ci",

  // Approval page - multiple fallbacks for different PayPal UI versions
  CONTINUE_BUTTON: "#payment-submit-btn",
  ALT_CONTINUE_BUTTON: "button*=Continue",
  ALT2_CONTINUE_BUTTON: "button*=Pay Now",
  ALT3_CONTINUE_BUTTON: 'button[data-testid="submit-button-initial"]',

  // Cancel link
  CANCEL_LINK: "#cancelLink",
  ALT_CANCEL_LINK: "a*=Cancel",
};
