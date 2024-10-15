"use strict";

var createAuthorizationData = require("./create-authorization-data");
var jsonClone = require("./json-clone");
var constants = require("./constants");

function addMetadata(configuration, data) {
  var key;
  var attrs = data ? jsonClone(data) : {};
  var authAttrs = createAuthorizationData(configuration.authorization).attrs;
  var _meta = jsonClone(configuration.analyticsMetadata);

  attrs.braintreeLibraryVersion = constants.BRAINTREE_LIBRARY_VERSION;

  for (key in attrs._meta) {
    if (attrs._meta.hasOwnProperty(key)) {
      _meta[key] = attrs._meta[key];
    }
  }

  attrs._meta = _meta;

  if (authAttrs.tokenizationKey) {
    attrs.tokenizationKey = authAttrs.tokenizationKey;
  } else {
    attrs.authorizationFingerprint = authAttrs.authorizationFingerprint;
  }

  return attrs;
}

function addEventMetadata(clientInstanceOrPromise) {
  var configuration = clientInstanceOrPromise.getConfiguration();
  var authAttrs = createAuthorizationData(configuration.authorization).attrs;
  var isProd = configuration.gatewayConfiguration.environment === "production";

  /* eslint-disable camelcase */
  var metadata = {
    api_integration_type: configuration.analyticsMetadata.integrationType,
    app_id: window.location.host,
    c_sdk_ver: constants.VERSION,
    component: "braintreeclientsdk",
    merchant_sdk_env: isProd ? "production" : "sandbox",
    merchant_id: configuration.gatewayConfiguration.merchantId,
    event_source: "web",
    platform: constants.PLATFORM,
    platform_version: window.navigator.userAgent,
    session_id: configuration.analyticsMetadata.sessionId,
    client_session_id: configuration.analyticsMetadata.sessionId,
    tenant_name: "braintree",
  };

  if (authAttrs.tokenizationKey) {
    metadata.tokenization_key = authAttrs.tokenizationKey;
  } else {
    metadata.auth_fingerprint = authAttrs.authorizationFingerprint;
  }
  /* eslint-enable camelcase */

  return metadata;
}

module.exports = {
  addMetadata: addMetadata,
  addEventMetadata: addEventMetadata,
};
