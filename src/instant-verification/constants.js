"use strict";

var EXPERIENCE_URL = {
  sandbox:
    "https://www.sandbox.paypal.com/openfinance/v1/bank/payment-method/create",
  production:
    "https://www.paypal.com/openfinance/v1/bank/payment-method/create",
};

// removeIf(production)
if (process.env.BRAINTREE_JS_ENV === "development") {
  EXPERIENCE_URL.development =
    // open-banking to be fixed to instant-verification here once we update the web-sdk-playground
    "https://localhost:5173/src/client/workflows/open-banking/fake-experience.html";
}
// endRemoveIf(production)

module.exports = {
  EXPERIENCE_URL: EXPERIENCE_URL,
};
