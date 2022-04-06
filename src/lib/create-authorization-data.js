"use strict";

var atob = require("../lib/vendor/polyfill").atob;
var CLIENT_API_URLS = require("../lib/constants").CLIENT_API_URLS;

function _isTokenizationKey(str) {
  return /^[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9_]+$/.test(str);
}

function _parseTokenizationKey(tokenizationKey) {
  var tokens = tokenizationKey.split("_");
  var environment = tokens[0];
  var merchantId = tokens.slice(2).join("_");

  return {
    merchantId: merchantId,
    environment: environment,
  };
}

function createAuthorizationData(authorization) {
  var parsedClientToken, parsedTokenizationKey;
  var data = {
    attrs: {},
    configUrl: "",
  };

  if (_isTokenizationKey(authorization)) {
    parsedTokenizationKey = _parseTokenizationKey(authorization);
    data.environment = parsedTokenizationKey.environment;
    data.attrs.tokenizationKey = authorization;
    data.configUrl =
      CLIENT_API_URLS[parsedTokenizationKey.environment] +
      "/merchants/" +
      parsedTokenizationKey.merchantId +
      "/client_api/v1/configuration";
  } else {
    parsedClientToken = JSON.parse(atob(authorization));
    data.environment = parsedClientToken.environment;
    data.attrs.authorizationFingerprint =
      parsedClientToken.authorizationFingerprint;
    data.configUrl = parsedClientToken.configUrl;
    data.graphQL = parsedClientToken.graphQL;
  }

  return data;
}

module.exports = createAuthorizationData;
