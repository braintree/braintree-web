'use strict';

var parser;
var legalHosts = {
  'paypal.com': 1,
  'braintreepayments.com': 1,
  'braintreegateway.com': 1,
  localhost: 1
};

function isWhitelistedDomain(url) {
  var pieces, topLevelDomain;

  url = url.toLowerCase();

  if (!/^https:/.test(url)) {
    return false;
  }

  parser = parser || document.createElement('a');
  parser.href = url;
  pieces = parser.hostname.split('.');
  topLevelDomain = pieces.slice(-2).join('.');

  return legalHosts.hasOwnProperty(topLevelDomain);
}

module.exports = isWhitelistedDomain;
