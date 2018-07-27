'use strict';

var VERSION = process.env.npm_package_version;
var PLATFORM = 'web';

var CLIENT_API_URLS = {
  production: 'https://api.braintreegateway.com:443',
  sandbox: 'https://api.sandbox.braintreegateway.com:443'
};

var GRAPHQL_URLS = {
  production: 'https://payments.braintree-api.com/graphql',
  sandbox: 'https://payments.sandbox.braintree-api.com/graphql'
};

// removeIf(production)
if (process.env.BRAINTREE_JS_ENV === 'development') {
  CLIENT_API_URLS.development = process.env.BRAINTREE_JS_API_PROTOCOL + '://' + process.env.BRAINTREE_JS_API_HOST + ':' + process.env.BRAINTREE_JS_API_PORT;
  GRAPHQL_URLS.development = process.env.BRAINTREE_JS_GRAPH_QL_ENDPOINT;
}
// endRemoveIf(production)

module.exports = {
  ANALYTICS_PREFIX: PLATFORM + '.',
  ANALYTICS_REQUEST_TIMEOUT_MS: 2000,
  CLIENT_API_URLS: CLIENT_API_URLS,
  GRAPHQL_URLS: GRAPHQL_URLS,
  INTEGRATION_TIMEOUT_MS: 60000,
  VERSION: VERSION,
  INTEGRATION: 'custom',
  SOURCE: 'client',
  PLATFORM: PLATFORM,
  BRAINTREE_LIBRARY_VERSION: 'braintree/' + PLATFORM + '/' + VERSION
};
