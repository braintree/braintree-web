import libConstants from "../lib/constants";

const _default = {
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
  // https://developer.paypal.com/sdk/js/v5/configuration#data-page-type
  VALID_PAGE_TYPES: [
    "product-listing",
    "search-results",
    "product-details",
    "mini-cart",
    "cart",
    "checkout",
  ],
  CREATE_BILLING_AGREEMENT_JWT_MUTATION:
    libConstants.CREATE_BILLING_AGREEMENT_JWT_MUTATION,
};

export const {
  FLOW_ENDPOINTS,
  REQUIRED_OPTIONS,
  ENVIRONMENT,
  BT_INTEGRATION_SOURCE,
  VALID_PAGE_TYPES,
  CREATE_BILLING_AGREEMENT_JWT_MUTATION,
} = _default;

export default _default;
