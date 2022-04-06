"use strict";

// removeIf(production)
/* eslint-disable */
if (process.env.BRAINTREE_JS_ENV === "development") {
  var createAuthorizationData = require("./create-authorization-data");
}
// endRemoveIf(production)
var ASSETS_URLS = require("./constants").ASSETS_URLS;

function createAssetsUrl(authorization) {
  // removeIf(production)
  if (process.env.BRAINTREE_JS_ENV === "development") {
    if (!authorization) {
      return ASSETS_URLS.production;
    }

    var authData = createAuthorizationData(authorization);

    return ASSETS_URLS[authData.environment || "production"];
  }
  // endRemoveIf(production)

  return ASSETS_URLS.production;
}
/* eslint-enable */

module.exports = {
  create: createAssetsUrl,
};
