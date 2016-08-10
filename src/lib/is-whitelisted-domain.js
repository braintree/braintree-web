'use strict';

var parser;
var legalHosts = {
  'paypal.com': 1,
  'braintreepayments.com': 1,
  'braintreegateway.com': 1,
  localhost: 1
};

/* eslint-disable no-undef,block-scoped-var */
if (process.env.BRAINTREE_JS_ENV === 'development') {
  if (process.env.BRAINTREE_JS_API_HOST) {
    legalHosts[stripSubdomains(process.env.BRAINTREE_JS_API_HOST)] = 1;
  }
  if (process.env.BT_DEV_HOST) {
    legalHosts[stripSubdomains(process.env.BT_DEV_HOST)] = 1;
  }
}
/* eslint-enable no-undef,block-scoped-var */

function stripSubdomains(domain) {
  return domain.split('.').slice(-2).join('.');
}

function isWhitelistedDomain(url) {
  var mainDomain;

  url = url.toLowerCase();

  if (!/^https:/.test(url)) {
    return false;
  }

  parser = parser || document.createElement('a');
  parser.href = url;
  mainDomain = stripSubdomains(parser.hostname);

  return legalHosts.hasOwnProperty(mainDomain);
}

module.exports = isWhitelistedDomain;
