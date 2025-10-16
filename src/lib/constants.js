"use strict";

var VERSION = process.env.npm_package_version;
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

module.exports = {
  ANALYTICS_PREFIX: PLATFORM + ".",
  ANALYTICS_REQUEST_TIMEOUT_MS: 2000,
  ANALYTICS_URL: "https://www.paypal.com/xoplatform/logger/api/logger",
  ASSETS_URLS: ASSETS_URLS,
  CLIENT_API_URLS: CLIENT_API_URLS,
  FRAUDNET_SOURCE: "BRAINTREE_SIGNIN",
  FRAUDNET_FNCLS: "fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99",
  FRAUDNET_URL: "https://c.paypal.com/da/r/fb.js",
  BUS_CONFIGURATION_REQUEST_EVENT: "BUS_CONFIGURATION_REQUEST",
  GRAPHQL_URLS: GRAPHQL_URLS,
  INTEGRATION_TIMEOUT_MS: 60000,
  VERSION: VERSION,
  INTEGRATION: "custom",
  SOURCE: "client",
  PLATFORM: PLATFORM,
  BRAINTREE_LIBRARY_VERSION: "braintree/" + PLATFORM + "/" + VERSION,
  ALLOWED_EXTRA_EVENT_FIELDS: [
    "context_id",
    "context_type",
    "payment_ready_button_order",
    "payment_ready_experiment_type",
    "payment_ready_page_type",
    "payment_ready_session_id",
    "button_type",
    "connectionStartTime",
    "domain",
    "endpoint",
    "endTime",
    "requestStartTime",
    "startTime",
  ],
};
