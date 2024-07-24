"use strict";

var BRAINTREE_VERSION = require("../../constants").BRAINTREE_VERSION;

var assign = require("../../../lib/assign").assign;
var snakeCaseToCamelCase = require("../../../lib/snake-case-to-camel-case");
var isFastlaneCheckout = require("../../../lib/is-fastlane-checkout");

var creditCardTokenizationBodyGenerator = require("./generators/credit-card-tokenization");
var creditCardTokenizationResponseAdapter = require("./adapters/credit-card-tokenization");
var creditCardTokenizationFastlaneResponseAdapter = require("./adapters/credit-card-tokenization-fastlane");
var creditCardForFastlaneTokenizationBodyGenerator = require("./generators/credit-card-for-fastlane-tokenization");

var configurationBodyGenerator = require("./generators/configuration");
var configurationResponseAdapter = require("./adapters/configuration");

var generators = {
  "payment_methods/credit_cards": function (data, isFastlane) {
    if (isFastlane) {
      // Only want to use this generator when using the Fastlane flow
      return creditCardForFastlaneTokenizationBodyGenerator(data);
    }

    return creditCardTokenizationBodyGenerator(data);
  },
  configuration: configurationBodyGenerator,
};

var adapters = {
  "payment_methods/credit_cards": function (parsedBody, context, isFastlane) {
    if (isFastlane) {
      // Only want to use this adapter when using the Fastlane flow
      return creditCardTokenizationFastlaneResponseAdapter(parsedBody, context);
    }

    return creditCardTokenizationResponseAdapter(parsedBody, context);
  },
  configuration: configurationResponseAdapter,
};

function GraphQLRequest(options) {
  var clientApiPath = options.graphQL.getClientApiPath(options.url);

  this._graphQL = options.graphQL;
  this._data = options.data;
  this._method = options.method;
  this._headers = options.headers;
  this._clientSdkMetadata = {
    source: options.metadata.source,
    integration: options.metadata.integration,
    sessionId: options.metadata.sessionId,
  };
  this._sendAnalyticsEvent = options.sendAnalyticsEvent || Function.prototype;

  this._generator = generators[clientApiPath];
  this._adapter = adapters[clientApiPath];

  this._sendAnalyticsEvent("graphql.init");
}

GraphQLRequest.prototype.getUrl = function () {
  return this._graphQL.getGraphQLEndpoint();
};

GraphQLRequest.prototype.getBody = function () {
  var formattedBody = formatBodyKeys(this._data);
  var generatedBody = this._generator(
    formattedBody,
    // Since this is used for all GQL requests, we only want this if it's a Fastlane Tokenization request
    isFastlaneCheckout(this._data.creditCard)
  );
  var body = assign(
    { clientSdkMetadata: this._clientSdkMetadata },
    generatedBody
  );

  return JSON.stringify(body);
};

GraphQLRequest.prototype.getMethod = function () {
  return "POST";
};

GraphQLRequest.prototype.getHeaders = function () {
  var authorization, headers;

  if (this._data.authorizationFingerprint) {
    this._sendAnalyticsEvent("graphql.authorization-fingerprint");
    authorization = this._data.authorizationFingerprint;
  } else {
    this._sendAnalyticsEvent("graphql.tokenization-key");
    authorization = this._data.tokenizationKey;
  }

  headers = {
    Authorization: "Bearer " + authorization,
    "Braintree-Version": BRAINTREE_VERSION,
  };

  return assign({}, this._headers, headers);
};

GraphQLRequest.prototype.adaptResponseBody = function (parsedBody) {
  return this._adapter(
    parsedBody,
    this,
    // Since this is used for all GQL requests, we only want this if it's a Fastlane Checkout Tokenization request
    "creditCard" in this._data && isFastlaneCheckout(this._data.creditCard)
  );
};

GraphQLRequest.prototype.determineStatus = function (
  httpStatus,
  parsedResponse
) {
  var status, errorClass;

  if (httpStatus === 200) {
    errorClass =
      parsedResponse.errors &&
      parsedResponse.errors[0] &&
      parsedResponse.errors[0].extensions &&
      parsedResponse.errors[0].extensions.errorClass;

    if (parsedResponse.data && !parsedResponse.errors) {
      status = 200;
    } else if (errorClass === "VALIDATION") {
      status = 422;
    } else if (errorClass === "AUTHORIZATION") {
      status = 403;
    } else if (errorClass === "AUTHENTICATION") {
      status = 401;
    } else if (isGraphQLError(errorClass, parsedResponse)) {
      status = 403;
    } else {
      status = 500;
    }
  } else if (!httpStatus) {
    status = 500;
  } else {
    status = httpStatus;
  }

  this._sendAnalyticsEvent("graphql.status." + httpStatus);
  this._sendAnalyticsEvent("graphql.determinedStatus." + status);

  return status;
};

function isGraphQLError(errorClass, parsedResponse) {
  return !errorClass && parsedResponse.errors[0].message;
}

/**
 * @ignore
 * This function formats the body consistently so _everything_ is camelCase.
 * @param {object} originalBody the body to format
 * @returns {object} The formatted object
 */
function formatBodyKeys(originalBody) {
  var body = {};

  Object.keys(originalBody).forEach(function (key) {
    var camelCaseKey = snakeCaseToCamelCase(key);

    if (typeof originalBody[key] === "object") {
      body[camelCaseKey] = formatBodyKeys(originalBody[key]);
    } else if (typeof originalBody[key] === "number") {
      body[camelCaseKey] = String(originalBody[key]);
    } else {
      body[camelCaseKey] = originalBody[key];
    }
  });

  return body;
}

module.exports = GraphQLRequest;
