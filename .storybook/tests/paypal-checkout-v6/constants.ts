export const TEST_TIMEOUTS = {
  pageLoad: 30000,
  popupOpen: 10000,
  callbackDelay: 3000,
  billingAgreementComplete: 45000,
} as const;

export const STORY_URLS = {
  oneTimePayment:
    "/iframe.html?id=braintree-paypal-checkout-v6--one-time-payment&viewMode=story",
  vaultFlow:
    "/iframe.html?id=braintree-paypal-checkout-v6-billing-agreements--vault-flow&viewMode=story",
  recurringPlanType:
    "/iframe.html?id=braintree-paypal-checkout-v6-billing-agreements--recurring-plan-type&viewMode=story",
  subscriptionPlanType:
    "/iframe.html?id=braintree-paypal-checkout-v6-billing-agreements--subscription-plan-type&viewMode=story",
  unscheduledPlanType:
    "/iframe.html?id=braintree-paypal-checkout-v6-billing-agreements--unscheduled-plan-type&viewMode=story",
  lineItemsAndShipping:
    "/iframe.html?id=braintree-paypal-checkout-v6--line-items-and-shipping&viewMode=story",
} as const;

export const BILLING_AGREEMENT_MESSAGES = {
  VAULT_SUCCESS: "vaulted",
  BILLING_AGREEMENT_CREATED: "Billing agreement created",
  CANCELLED: "Cancelled",
} as const;
