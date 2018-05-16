'use strict';

var BraintreeError = require('../lib/braintree-error');
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');
var request = require('./request');
var uuid = require('../lib/vendor/uuid');
var constants = require('../lib/constants');
var createAuthorizationData = require('../lib/create-authorization-data');
var errors = require('./errors');
var GraphQL = require('./request/graphql');
var isDateStringBeforeOrOn = require('../lib/is-date-string-before-or-on');

var BRAINTREE_VERSION = require('./constants').BRAINTREE_VERSION;

function getConfiguration(options) {
  return new Promise(function (resolve, reject) {
    var configuration, authData, attrs, configUrl, reqOptions;
    var sessionId = uuid();
    var analyticsMetadata = {
      merchantAppId: global.location.host,
      platform: constants.PLATFORM,
      sdkVersion: constants.VERSION,
      source: constants.SOURCE,
      integration: constants.INTEGRATION,
      integrationType: constants.INTEGRATION,
      sessionId: sessionId
    };

    try {
      authData = createAuthorizationData(options.authorization);
    } catch (err) {
      reject(new BraintreeError(errors.CLIENT_INVALID_AUTHORIZATION));

      return;
    }
    attrs = authData.attrs;
    configUrl = authData.configUrl;

    attrs._meta = analyticsMetadata;
    attrs.braintreeLibraryVersion = constants.BRAINTREE_LIBRARY_VERSION;
    attrs.configVersion = '3';

    reqOptions = {
      url: configUrl,
      method: 'GET',
      data: attrs
    };

    if (attrs.authorizationFingerprint && authData.graphQL) {
      if (isDateStringBeforeOrOn(authData.graphQL.date, BRAINTREE_VERSION)) {
        reqOptions.graphQL = new GraphQL({
          graphQL: {
            url: authData.graphQL.url,
            features: ['configuration']
          }
        });
      }

      reqOptions.metadata = analyticsMetadata;
    }

    request(reqOptions, function (err, response, status) {
      var errorTemplate;

      if (err) {
        if (status === 403) {
          errorTemplate = errors.CLIENT_AUTHORIZATION_INSUFFICIENT;
        } else {
          errorTemplate = errors.CLIENT_GATEWAY_NETWORK;
        }

        reject(new BraintreeError({
          type: errorTemplate.type,
          code: errorTemplate.code,
          message: errorTemplate.message,
          details: {
            originalError: err
          }
        }));

        return;
      }

      configuration = {
        authorization: options.authorization,
        authorizationType: attrs.tokenizationKey ? 'TOKENIZATION_KEY' : 'CLIENT_TOKEN',
        analyticsMetadata: analyticsMetadata,
        gatewayConfiguration: response
      };

      resolve(configuration);
    });
  });
}

module.exports = {
  getConfiguration: wrapPromise(getConfiguration)
};
