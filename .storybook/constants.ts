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
