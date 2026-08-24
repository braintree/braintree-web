"use strict";

// Flattens an AssetLoadError (from @braintree/asset-loader) into a detail
// object for analytics events. Always returns an object so sendEventPlus
// never reads fields off undefined.
function assetLoadDetail(err) {
  err = err || {};

  return {
    src: err.src,
    failure_kind: err.failureKind, // eslint-disable-line camelcase
    timing: err.timing,
    on_line: err.onLine, // eslint-disable-line camelcase
    description: err.message,
  };
}

module.exports = assetLoadDetail;
