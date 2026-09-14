const VERSION = __SDK_VERSION__;
var PLATFORM = "web";

var CLIENT_API_URLS = {
  production: "https://api.braintreegateway.com:443",
  sandbox: "https://api.sandbox.braintreegateway.com:443",
};

var ASSETS_URLS = {
  production: "https://assets.braintreegateway.com",
  sandbox: "https://assets.braintreegateway.com",
};

var GRAPHQL_URLS = {
  production: "https://payments.braintree-api.com/graphql",
  sandbox: "https://payments.sandbox.braintree-api.com/graphql",
};

// removeIf(production)
if (process.env.BRAINTREE_JS_ENV === "development") {
  CLIENT_API_URLS.development =
    process.env.BRAINTREE_JS_API_PROTOCOL +
    "://" +
    process.env.BRAINTREE_JS_API_HOST +
    ":" +
    process.env.BRAINTREE_JS_API_PORT;
  GRAPHQL_URLS.development = process.env.BRAINTREE_JS_GRAPH_QL_ENDPOINT;
  ASSETS_URLS.development = process.env.BRAINTREE_JS_ASSET_URL;
}
// endRemoveIf(production)

export const CREATE_BILLING_AGREEMENT_JWT_MUTATION =
  "mutation CreateBillingAgreementJwt($input: CreateBillingAgreementJwtInput!) { createBillingAgreementJwt(input: $input) { jwt } }";
export const ANALYTICS_PREFIX = PLATFORM + ".";
export const ANALYTICS_REQUEST_TIMEOUT_MS = 2000;
export const ANALYTICS_URL =
  "https://www.paypal.com/xoplatform/logger/api/logger?disableSetCookie=true";
export const BUS_CONFIGURATION_REQUEST_EVENT = "BUS_CONFIGURATION_REQUEST";
export const INTEGRATION_TIMEOUT_MS = 60000;
export const INTEGRATION = "custom";
export const SOURCE = "client";
export const BRAINTREE_LIBRARY_VERSION =
  "braintree/" + PLATFORM + "/" + VERSION;

export const ALLOWED_EXTRA_EVENT_FIELDS = [
  "context_id",
  "context_type",
  "payment_ready_button_order",
  "payment_ready_experiment_type",
  "payment_ready_page_type",
  "payment_ready_session_id",
  "button_type",
  "connect_start_time",
  "domain",
  "endpoint",
  "end_time",
  "request_start_time",
  "start_time",
];

export { ASSETS_URLS, CLIENT_API_URLS, GRAPHQL_URLS, VERSION, PLATFORM };

export default {
  CREATE_BILLING_AGREEMENT_JWT_MUTATION,
  ANALYTICS_PREFIX,
  ANALYTICS_REQUEST_TIMEOUT_MS,
  ANALYTICS_URL,
  ASSETS_URLS,
  CLIENT_API_URLS,
  BUS_CONFIGURATION_REQUEST_EVENT,
  GRAPHQL_URLS,
  INTEGRATION_TIMEOUT_MS,
  VERSION,
  INTEGRATION,
  SOURCE,
  PLATFORM,
  BRAINTREE_LIBRARY_VERSION,
  ALLOWED_EXTRA_EVENT_FIELDS,
};
