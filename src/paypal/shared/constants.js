"use strict";

module.exports = {
  LANDING_FRAME_NAME: "braintreepaypallanding",
  FLOW_ENDPOINTS: {
    checkout: "create_payment_resource",
    vault: "setup_billing_agreement",
  },
  REQUIRED_OPTIONS: ["paymentId", "currency"],
  ENVIRONMENT: {
    stage: "https://www.msmaster.qa.paypal.com/sdk/js?",
    sandbox: "https://www.sandbox.paypal.com/sdk/js?",
    teBraintree: "https://www.te-braintree.qa.paypal.com/sdk/js?",
  },
};
