"use strict";

var BRAINTREE_VERSION = require("./constants").BRAINTREE_VERSION;

var GraphQL = require("./request/graphql");
var request = require("./request");
var isVerifiedDomain = require("../lib/is-verified-domain");
var BraintreeError = require("../lib/braintree-error");
var convertToBraintreeError = require("../lib/convert-to-braintree-error");
var getGatewayConfiguration = require("./get-configuration").getConfiguration;
var createAuthorizationData = require("../lib/create-authorization-data");
var addMetadata = require("../lib/add-metadata");
var Promise = require("../lib/promise");
var wrapPromise = require("@braintree/wrap-promise");
var once = require("../lib/once");
var deferred = require("../lib/deferred");
var assign = require("../lib/assign").assign;
var analytics = require("../lib/analytics");
var errors = require("./errors");
var VERSION = require("../lib/constants").VERSION;
var GRAPHQL_URLS = require("../lib/constants").GRAPHQL_URLS;
var methods = require("../lib/methods");
var convertMethodsToError = require("../lib/convert-methods-to-error");
var assets = require("../lib/assets");
var FRAUDNET_FNCLS = require("../lib/constants").FRAUDNET_FNCLS;
var FRAUDNET_SOURCE = require("../lib/constants").FRAUDNET_SOURCE;
var FRAUDNET_URL = require("../lib/constants").FRAUDNET_URL;

var cachedClients = {};

/**
 * This object is returned by {@link Client#getConfiguration|getConfiguration}. This information is used extensively by other Braintree modules to properly configure themselves.
 * @typedef {object} Client~configuration
 * @property {object} client The braintree-web/client parameters.
 * @property {string} client.authorization A tokenizationKey or clientToken.
 * @property {object} gatewayConfiguration Gateway-supplied configuration.
 * @property {object} analyticsMetadata Analytics-specific data.
 * @property {string} analyticsMetadata.sessionId Uniquely identifies a browsing session.
 * @property {string} analyticsMetadata.sdkVersion The braintree.js version.
 * @property {string} analyticsMetadata.merchantAppId Identifies the merchant's web app.
 */

/**
 * @class
 * @param {Client~configuration} configuration Options
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/client.create|braintree.client.create} instead.</strong>
 * @classdesc This class is required by many other Braintree components. It serves as the base API layer that communicates with our servers. It is also capable of being used to formulate direct calls to our servers, such as direct credit card tokenization. See {@link Client#request}.
 */
function Client(configuration) {
  var configurationJSON, gatewayConfiguration;

  configuration = configuration || {};

  configurationJSON = JSON.stringify(configuration);
  gatewayConfiguration = configuration.gatewayConfiguration;

  if (!gatewayConfiguration) {
    throw new BraintreeError(errors.CLIENT_MISSING_GATEWAY_CONFIGURATION);
  }

  ["assetsUrl", "clientApiUrl", "configUrl"].forEach(function (property) {
    if (
      property in gatewayConfiguration &&
      !isVerifiedDomain(gatewayConfiguration[property])
    ) {
      throw new BraintreeError({
        type: errors.CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN.type,
        code: errors.CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN.code,
        message: property + " property is on an invalid domain.",
      });
    }
  });

  /**
   * Returns a copy of the configuration values.
   * @public
   * @returns {Client~configuration} configuration
   */
  this.getConfiguration = function () {
    return JSON.parse(configurationJSON);
  };

  this._request = request;
  this._configuration = this.getConfiguration();

  this._clientApiBaseUrl = gatewayConfiguration.clientApiUrl + "/v1/";

  if (gatewayConfiguration.graphQL) {
    if (!isVerifiedDomain(gatewayConfiguration.graphQL.url)) {
      throw new BraintreeError({
        type: errors.CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN.type,
        code: errors.CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN.code,
        message: "graphQL.url property is on an invalid domain.",
      });
    }

    this._graphQL = new GraphQL({
      graphQL: gatewayConfiguration.graphQL,
    });
  }
}

Client.initialize = function (options) {
  var clientInstance, authData;
  var promise = cachedClients[options.authorization];

  if (promise) {
    analytics.sendEvent(promise, "custom.client.load.cached");

    return promise;
  }

  try {
    authData = createAuthorizationData(options.authorization);
  } catch (err) {
    return Promise.reject(
      new BraintreeError(errors.CLIENT_INVALID_AUTHORIZATION)
    );
  }

  promise = getGatewayConfiguration(authData).then(function (configuration) {
    if (options.debug) {
      configuration.isDebug = true;
    }

    configuration.authorization = options.authorization;

    clientInstance = new Client(configuration);

    return clientInstance;
  });

  cachedClients[options.authorization] = promise;

  analytics.sendEvent(promise, "custom.client.load.initialized");

  return promise
    .then(function (client) {
      analytics.sendEvent(clientInstance, "custom.client.load.succeeded");

      return client;
    })
    .catch(function (err) {
      delete cachedClients[options.authorization];

      return Promise.reject(err);
    });
};

// Primarily used for testing the client initalization call
Client.clearCache = function () {
  cachedClients = {};
};

Client.prototype._findOrCreateFraudnetJSON = function (clientMetadataId) {
  var el = document.querySelector('script[fncls="' + FRAUDNET_FNCLS + '"]');
  var config, additionalData, authorizationFingerprint, parameters;

  if (!el) {
    el = document.body.appendChild(document.createElement("script"));
    el.type = "application/json";
    el.setAttribute("fncls", FRAUDNET_FNCLS);
  }

  config = this.getConfiguration();
  additionalData = {
    rda_tenant: "bt_card", // eslint-disable-line camelcase
    mid: config.gatewayConfiguration.merchantId,
  };
  authorizationFingerprint = config.authorizationFingerprint;

  if (authorizationFingerprint) {
    authorizationFingerprint.split("&").forEach(function (pieces) {
      var component = pieces.split("=");

      if (component[0] === "customer_id" && component.length > 1) {
        additionalData.cid = component[1];
      }
    });
  }

  parameters = {
    f: clientMetadataId.substr(0, 32),
    fp: additionalData,
    bu: false,
    s: FRAUDNET_SOURCE,
  };
  el.text = JSON.stringify(parameters);
};

/**
 * Used by other modules to formulate all network requests to the Braintree gateway. It is also capable of being used directly from your own form to tokenize credit card information. However, be sure to satisfy PCI compliance if you use direct card tokenization.
 * @public
 * @param {object} options Request options:
 * @param {string} options.method HTTP method, e.g. "get" or "post".
 * @param {string} options.endpoint Endpoint path, e.g. "payment_methods".
 * @param {object} options.data Data to send with the request.
 * @param {number} [options.timeout=60000] Set a timeout (in milliseconds) for the request.
 * @param {callback} [callback] The second argument, <code>data</code>, is the returned server data.
 * @example
 * <caption>Direct Credit Card Tokenization</caption>
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * }, function (createErr, clientInstance) {
 *   var form = document.getElementById('my-form-id');
 *   var data = {
 *     creditCard: {
 *       number: form['cc-number'].value,
 *       cvv: form['cc-cvv'].value,
 *       expirationDate: form['cc-expiration-date'].value,
 *       billingAddress: {
 *         postalCode: form['cc-postal-code'].value
 *       },
 *       options: {
 *         validate: false
 *       }
 *     }
 *   };
 *
 *   // Warning: For a merchant to be eligible for the easiest level of PCI compliance (SAQ A),
 *   // payment fields cannot be hosted on your checkout page.
 *   // For an alternative to the following, use Hosted Fields.
 *   clientInstance.request({
 *     endpoint: 'payment_methods/credit_cards',
 *     method: 'post',
 *     data: data
 *   }, function (requestErr, response) {
 *     // More detailed example of handling API errors: https://codepen.io/braintree/pen/MbwjdM
 *     if (requestErr) { throw new Error(requestErr); }
 *
 *     console.log('Got nonce:', response.creditCards[0].nonce);
 *   });
 * });
 * @example
 * <caption>Tokenizing Fields for AVS Checks</caption>
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * }, function (createErr, clientInstance) {
 *   var form = document.getElementById('my-form-id');
 *   var data = {
 *     creditCard: {
 *       number: form['cc-number'].value,
 *       cvv: form['cc-cvv'].value,
 *       expirationDate: form['cc-date'].value,
 *       // The billing address can be checked with AVS rules.
 *       // See: https://articles.braintreepayments.com/support/guides/fraud-tools/basic/avs-cvv-rules
 *       billingAddress: {
 *         postalCode: form['cc-postal-code'].value,
 *         streetAddress: form['cc-street-address'].value,
 *         countryName: form['cc-country-name'].value,
 *         countryCodeAlpha2: form['cc-country-alpha2'].value,
 *         countryCodeAlpha3: form['cc-country-alpha3'].value,
 *         countryCodeNumeric: form['cc-country-numeric'].value
 *       },
 *       options: {
 *         validate: false
 *       }
 *     }
 *   };
 *
 *   // Warning: For a merchant to be eligible for the easiest level of PCI compliance (SAQ A),
 *   // payment fields cannot be hosted on your checkout page.
 *   // For an alternative to the following, use Hosted Fields.
 *   clientInstance.request({
 *     endpoint: 'payment_methods/credit_cards',
 *     method: 'post',
 *     data: data
 *   }, function (requestErr, response) {
 *     // More detailed example of handling API errors: https://codepen.io/braintree/pen/MbwjdM
 *     if (requestErr) { throw new Error(requestErr); }
 *
 *     console.log('Got nonce:', response.creditCards[0].nonce);
 *   });
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
Client.prototype.request = function (options, callback) {
  var self = this; // eslint-disable-line no-invalid-this
  var requestPromise = new Promise(function (resolve, reject) {
    var optionName, api, baseUrl, requestOptions;
    var shouldCollectData = Boolean(
      options.endpoint === "payment_methods/credit_cards" &&
        self.getConfiguration().gatewayConfiguration.creditCards
          .collectDeviceData
    );

    if (options.api !== "graphQLApi") {
      if (!options.method) {
        optionName = "options.method";
      } else if (!options.endpoint) {
        optionName = "options.endpoint";
      }
    }

    if (optionName) {
      throw new BraintreeError({
        type: errors.CLIENT_OPTION_REQUIRED.type,
        code: errors.CLIENT_OPTION_REQUIRED.code,
        message: optionName + " is required when making a request.",
      });
    }

    if ("api" in options) {
      api = options.api;
    } else {
      api = "clientApi";
    }

    requestOptions = {
      method: options.method,
      graphQL: self._graphQL,
      timeout: options.timeout,
      metadata: self._configuration.analyticsMetadata,
    };

    if (api === "clientApi") {
      baseUrl = self._clientApiBaseUrl;

      requestOptions.data = addMetadata(self._configuration, options.data);
    } else if (api === "graphQLApi") {
      baseUrl =
        GRAPHQL_URLS[self._configuration.gatewayConfiguration.environment];
      options.endpoint = "";
      requestOptions.method = "post";
      requestOptions.data = assign(
        {
          clientSdkMetadata: {
            platform: self._configuration.analyticsMetadata.platform,
            source: self._configuration.analyticsMetadata.source,
            integration: self._configuration.analyticsMetadata.integration,
            sessionId: self._configuration.analyticsMetadata.sessionId,
            version: VERSION,
          },
        },
        options.data
      );

      requestOptions.headers = getAuthorizationHeadersForGraphQL(
        self._configuration
      );
    } else {
      throw new BraintreeError({
        type: errors.CLIENT_OPTION_INVALID.type,
        code: errors.CLIENT_OPTION_INVALID.code,
        message: "options.api is invalid.",
      });
    }

    requestOptions.url = baseUrl + options.endpoint;
    requestOptions.sendAnalyticsEvent = function (kind) {
      analytics.sendEvent(self, kind);
    };

    self._request(requestOptions, function (err, data, status) {
      var resolvedData, requestError;

      requestError = formatRequestError(status, err);

      if (requestError) {
        reject(requestError);

        return;
      }

      if (api === "graphQLApi" && data.errors) {
        reject(
          convertToBraintreeError(data.errors, {
            type: errors.CLIENT_GRAPHQL_REQUEST_ERROR.type,
            code: errors.CLIENT_GRAPHQL_REQUEST_ERROR.code,
            message: errors.CLIENT_GRAPHQL_REQUEST_ERROR.message,
          })
        );

        return;
      }

      resolvedData = assign({ _httpStatus: status }, data);

      if (
        shouldCollectData &&
        resolvedData.creditCards &&
        resolvedData.creditCards.length > 0
      ) {
        self._findOrCreateFraudnetJSON(resolvedData.creditCards[0].nonce);

        assets.loadScript({
          src: FRAUDNET_URL,
          forceScriptReload: true,
        });
      }
      resolve(resolvedData);
    });
  });

  if (typeof callback === "function") {
    callback = once(deferred(callback));

    requestPromise
      .then(function (response) {
        callback(null, response, response._httpStatus);
      })
      .catch(function (err) {
        var status = err && err.details && err.details.httpStatus;

        callback(err, null, status);
      });

    return;
  }

  return requestPromise; // eslint-disable-line consistent-return
};

// eslint-disable-next-line consistent-return
function formatRequestError(status, err) {
  var requestError;

  if (status === -1) {
    requestError = new BraintreeError(errors.CLIENT_REQUEST_TIMEOUT);
  } else if (status === 401) {
    requestError = new BraintreeError(errors.CLIENT_AUTHORIZATION_INVALID);
  } else if (status === 403) {
    requestError = new BraintreeError(errors.CLIENT_AUTHORIZATION_INSUFFICIENT);
  } else if (status === 429) {
    requestError = new BraintreeError(errors.CLIENT_RATE_LIMITED);
  } else if (status >= 500) {
    requestError = new BraintreeError(errors.CLIENT_GATEWAY_NETWORK);
  } else if (status < 200 || status >= 400) {
    requestError = convertToBraintreeError(err, {
      type: errors.CLIENT_REQUEST_ERROR.type,
      code: errors.CLIENT_REQUEST_ERROR.code,
      message: errors.CLIENT_REQUEST_ERROR.message,
    });
  }

  if (requestError) {
    requestError.details = requestError.details || {};
    requestError.details.httpStatus = status;

    return requestError;
  }
}

Client.prototype.toJSON = function () {
  return this.getConfiguration();
};

/**
 * Returns the Client version.
 * @public
 * @returns {String} The created client's version.
 * @example
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * }, function (createErr, clientInstance) {
 *   console.log(clientInstance.getVersion()); // Ex: 1.0.0
 * });
 * @returns {void}
 */
Client.prototype.getVersion = function () {
  return VERSION;
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/client.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * clientInstance.teardown();
 * @example <caption>With callback</caption>
 * clientInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
Client.prototype.teardown = wrapPromise(function () {
  var self = this; // eslint-disable-line no-invalid-this

  delete cachedClients[self.getConfiguration().authorization];
  convertMethodsToError(self, methods(Client.prototype));

  return Promise.resolve();
});

function getAuthorizationHeadersForGraphQL(configuration) {
  var token =
    configuration.authorizationFingerprint || configuration.authorization;

  return {
    Authorization: "Bearer " + token,
    "Braintree-Version": BRAINTREE_VERSION,
  };
}

module.exports = Client;
