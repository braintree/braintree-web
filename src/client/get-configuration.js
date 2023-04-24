"use strict";

var BraintreeError = require("../lib/braintree-error");
var wrapPromise = require("@braintree/wrap-promise");
var request = require("./request");
var uuid = require("@braintree/uuid");
var constants = require("../lib/constants");
var errors = require("./errors");
var GraphQL = require("./request/graphql");
var GRAPHQL_URLS = require("../lib/constants").GRAPHQL_URLS;
var isDateStringBeforeOrOn = require("../lib/is-date-string-before-or-on");

var BRAINTREE_VERSION = require("./constants").BRAINTREE_VERSION;

function getConfiguration(authData) {
  return new Promise(function (resolve, reject) {
    var configuration, attrs, configUrl, reqOptions;
    var sessionId = uuid();
    var analyticsMetadata = {
      merchantAppId: window.location.host,
      platform: constants.PLATFORM,
      sdkVersion: constants.VERSION,
      source: constants.SOURCE,
      // NEXT_MAJOR_VERSION remove one of these to not duplicate data. Target parity with mobile platforms approach.
      integration: constants.INTEGRATION,
      integrationType: constants.INTEGRATION,
      sessionId: sessionId,
    };

    attrs = authData.attrs;
    configUrl = authData.configUrl;

    attrs._meta = analyticsMetadata;
    attrs.braintreeLibraryVersion = constants.BRAINTREE_LIBRARY_VERSION;
    attrs.configVersion = "3";

    reqOptions = {
      url: configUrl,
      method: "GET",
      data: attrs,
    };

    if (attrs.authorizationFingerprint && authData.graphQL) {
      if (isDateStringBeforeOrOn(authData.graphQL.date, BRAINTREE_VERSION)) {
        reqOptions.graphQL = new GraphQL({
          graphQL: {
            url: authData.graphQL.url,
            features: ["configuration"],
          },
        });
      }

      reqOptions.metadata = analyticsMetadata;
    } else if (attrs.tokenizationKey) {
      reqOptions.graphQL = new GraphQL({
        graphQL: {
          url: GRAPHQL_URLS[authData.environment],
          features: ["configuration"],
        },
      });

      reqOptions.metadata = analyticsMetadata;
    }

    // NEXT_MAJOR_VERSION
    // there are various issues with the config endpoint where the values returned
    // do not match the values from the merchant account id passed into a client token
    // we need to update the configuration request endpoint to be able to pass the
    // correct values. The following ones are incorrect
    // * applePayWeb - definitely supportedNetworks, which compiles all the card
    //    networks from all the merchant accounts instead of providing just the
    //    ones from the specified one. The same is probably true for ios apple pay
    //    Also the merchantidentifier
    // NEXT_MAJOR_VERSION Allow passing in merchant account id when creating the component
    // to fetch the config for that merchant account id (particularly helpful when using
    // a tokenization key for authorization)
    request(reqOptions, function (err, response, status) {
      var errorTemplate;

      if (err) {
        if (status === 403) {
          errorTemplate = errors.CLIENT_AUTHORIZATION_INSUFFICIENT;
        } else if (status === 401) {
          errorTemplate = errors.CLIENT_AUTHORIZATION_INVALID;
        } else {
          errorTemplate = errors.CLIENT_GATEWAY_NETWORK;
        }

        reject(
          new BraintreeError({
            type: errorTemplate.type,
            code: errorTemplate.code,
            message: errorTemplate.message,
            details: {
              originalError: err,
            },
          })
        );

        return;
      }

      configuration = {
        authorizationType: attrs.tokenizationKey
          ? "TOKENIZATION_KEY"
          : "CLIENT_TOKEN",
        authorizationFingerprint: attrs.authorizationFingerprint,
        analyticsMetadata: analyticsMetadata,
        gatewayConfiguration: response,
      };

      resolve(configuration);
    });
  });
}

module.exports = {
  getConfiguration: wrapPromise(getConfiguration),
};
