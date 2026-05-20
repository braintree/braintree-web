export const TEST_TIMEOUTS = {
  pageLoad: 30000,
  popupOpen: 10000,
  callbackDelay: 3000,
  billingAgreementComplete: 45000,
  scriptLoad: 20000,
} as const;

export const STORY_URLS = {
  oneTimePayment:
    "/iframe.html?id=braintree-paypal-checkout--one-time-payment&viewMode=story",
  oneTimePaymentNoCommit:
    "/iframe.html?id=braintree-paypal-checkout--one-time-payment&viewMode=story&args=commit:!false",
  vaultFlow:
    "/iframe.html?id=braintree-paypal-checkout--vault-flow&viewMode=story",
  recurringBillingAgreement:
    "/iframe.html?id=braintree-paypal-checkout--recurring-billing-agreement&viewMode=story",
} as const;

export const RESULT_MESSAGES = {
  ONE_TIME_SUCCESS: "PayPal payment authorized!",
  VAULT_SUCCESS: "PayPal account vaulted!",
  RECURRING_SUCCESS: "Recurring billing agreement created",
  INIT_ERROR: "Initialization Error:",
  PAYPAL_ERROR: "PayPal Error:",
  /**
   * `client.request` maps many failed API statuses (e.g. 422) to
   * `CLIENT_REQUEST_ERROR` (401/403/429 and 5xx use other codes). `tokenizePayment`
   * leaves an existing `BraintreeError` unchanged, so #result shows this message
   * after a mocked failed `paypal_accounts` POST.
   */
  CLIENT_REQUEST_ERROR: "There was a problem with your request.",
  TOKENIZATION_ERROR: "Could not tokenize user's PayPal account.",
} as const;

export const BILLING_AGREEMENT_MESSAGES = {
  VAULT_SUCCESS: "vaulted",
  RECURRING_CREATED: "Recurring billing agreement created",
  CANCELLED: "Cancelled",
} as const;

export const SDK_SCRIPT_SRC_FRAGMENT = "paypal.com/sdk/js";
