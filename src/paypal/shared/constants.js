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
    teBraintree: "https://www.braintree.stage.paypal.com/sdk/js?",
  },
  BT_INTEGRATION_SOURCE: "BRAINTREE_WEB_SDK",
  CREATE_BILLING_AGREEMENT_JWT_MUTATION:
    "mutation CreateBillingAgreementJwt($input: CreateBillingAgreementJwtInput!) { createBillingAgreementJwt(input: $input) { jwt } }",
};
