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

// Test shipping address for Storybook demos
export const TEST_SHIPPING_ADDRESS = {
  line1: "123 Main St",
  city: "San Francisco",
  state: "CA",
  postalCode: "94107",
  countryCode: "US",
};

export const BASE_URL = "https://localhost:8080";

// PayPal V6 success messages
export const PAYPAL_SUCCESS_MESSAGES = {
  AUTHORIZED: "PayPal payment authorized!",
  CANCELLED: "Payment Cancelled",
};

// PayPal popup timeouts (in milliseconds)
export const PAYPAL_POPUP_TIMEOUTS = {
  POPUP_OPEN: 20000,
  LOGIN_PAGE: 15000,
  LOGIN_COMPLETE: 20000,
  APPROVAL_PAGE: 15000,
  FLOW_COMPLETE: 30000,
};
