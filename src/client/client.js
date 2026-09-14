import { BRAINTREE_VERSION } from "./constants";
import request from "./request";
import isVerifiedDomain from "../lib/is-verified-domain";
import BraintreeError from "../lib/braintree-error";
import { classifyRequestError } from "./request/request-error";
import { buildClientSdkMetadata } from "./request/graphql/client-sdk-metadata";
import { getConfiguration as getGatewayConfiguration } from "./get-configuration";
import createAuthorizationData from "../lib/create-authorization-data";
import metadata from "../lib/add-metadata";
import { assign } from "../lib/assign";
import analytics from "../lib/analytics";
import errors from "./errors";
import { VERSION } from "../lib/constants";
import { GRAPHQL_URLS } from "../lib/constants";
import methods from "../lib/methods";
import convertMethodsToError from "../lib/convert-methods-to-error";

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
  }
}

Client.initialize = async function (options) {
  var authData, clientInstance;
  var promise = cachedClients[options.authorization];

  if (promise) {
    analytics.sendEvent(promise, "custom.client.load.cached");

    return promise;
  }

  try {
    authData = createAuthorizationData(options.authorization);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    throw new BraintreeError(errors.CLIENT_INVALID_AUTHORIZATION);
  }

  promise = (async function () {
    var configuration = await getGatewayConfiguration(
      authData,
      options.sessionId
    );

    if (options.debug) {
      configuration.isDebug = true;
    }

    configuration.authorization = options.authorization;

    return new Client(configuration);
  })();

  cachedClients[options.authorization] = promise;

  analytics.sendEvent(promise, "custom.client.load.initialized");

  try {
    clientInstance = await promise;

    analytics.sendEvent(clientInstance, "custom.client.load.succeeded");

    return clientInstance;
  } catch (err) {
    delete cachedClients[options.authorization];

    throw err;
  }
};

// Primarily used for testing the client initialization call
Client.clearCache = function () {
  cachedClients = {};
};

/**
 * Used by other modules to formulate all network requests to the Braintree API.
 * @public
 * @param {object} options Request options:
 * @param {string} options.method HTTP method, e.g. "get" or "post".
 * @param {string} options.endpoint Endpoint path, e.g. "payment_methods".
 * @param {object} options.data Data to send with the request.
 * @param {number} [options.timeout=60000] Set a timeout (in milliseconds) for the request.
 * @example
 * <caption>Direct API Request</caption>
 * var createClient = require('braintree-web/client').create;
 *
 * createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * }).then(function (clientInstance) {
 *   return clientInstance.request({
 *     endpoint: 'payment_methods/paypal_accounts',
 *     method: 'post',
 *     data: {
 *       paypalAccount: {
 *         consentCode: 'consent-code'
 *       }
 *     }
 *   });
 * }).then(function (response) {
 *   console.log('Got nonce:', response.paypalAccounts[0].nonce);
 * }).catch(function (requestErr) {
 *   // More detailed example of handling API errors: https://codepen.io/braintree/pen/MbwjdM
 *   console.log('something went wrong making the request', requestErr);
 * });
 * @returns {Promise} Returns a promise that resolves with the returned server data.
 */
Client.prototype.request = function (options) {
  var self = this;
  var optionName, api, baseUrl, requestOptions;

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
    timeout: options.timeout,
    metadata: self._configuration.analyticsMetadata,
  };

  if (api === "clientApi") {
    baseUrl = self._clientApiBaseUrl;

    requestOptions.data = metadata.addMetadata(
      self._configuration,
      options.data
    );
  } else if (api === "graphQLApi") {
    baseUrl =
      GRAPHQL_URLS[self._configuration.gatewayConfiguration.environment];
    options.endpoint = "";
    requestOptions.method = "post";
    requestOptions.data = assign(
      {
        clientSdkMetadata: buildClientSdkMetadata(
          self._configuration.analyticsMetadata
        ),
      },
      options.data
    );

    requestOptions.headers = getAuthorizationHeadersForGraphQL(
      self._configuration
    );

    analytics.sendEvent(self, "graphql.init");
    analytics.sendEvent(
      self,
      self._configuration.authorizationFingerprint
        ? "graphql.authorization-fingerprint"
        : "graphql.tokenization-key"
    );
  } else {
    throw new BraintreeError({
      type: errors.CLIENT_OPTION_INVALID.type,
      code: errors.CLIENT_OPTION_INVALID.code,
      message: "options.api is invalid.",
    });
  }

  requestOptions.url = baseUrl + options.endpoint;
  requestOptions.sendAnalyticsEvent = function (kind, extraFields) {
    if (extraFields) {
      analytics.sendEventPlus(self, kind, extraFields);
    } else {
      analytics.sendEvent(self, kind);
    }
  };

  return new Promise(function (resolve, reject) {
    self._request(requestOptions, function (err, data, status) {
      var resolvedData, requestError;

      if (api === "graphQLApi") {
        analytics.sendEvent(self, "graphql.status." + status);
      }

      requestError = classifyRequestError(status, err, data);

      if (requestError) {
        reject(requestError);
        return;
      }

      resolvedData = assign({ _httpStatus: status }, data);

      resolve(resolvedData);
    });
  });
};

Client.prototype.toJSON = function () {
  return this.getConfiguration();
};

/**
 * Returns the Client version.
 * @public
 * @returns {string} The created client's version.
 * @example
 * const createClient = require('braintree-web/client').create;
 *
 * const clientInstance = await createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * });
 *
 * console.log(clientInstance.getVersion()); // Ex: 1.0.0
 */
Client.prototype.getVersion = function () {
  return VERSION;
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/client.create|create}.
 * @public
 * @example
 * clientInstance.teardown().then(function () {
 *   // teardown is complete
 * });
 * @returns {Promise} Returns a promise that resolves once teardown is complete.
 */
Client.prototype.teardown = function () {
  delete cachedClients[this.getConfiguration().authorization];
  convertMethodsToError(this, methods(Client.prototype));

  return Promise.resolve();
};

function getAuthorizationHeadersForGraphQL(configuration) {
  var token =
    configuration.authorizationFingerprint || configuration.authorization;

  return {
    Authorization: "Bearer " + token,
    "Braintree-Version": BRAINTREE_VERSION,
  };
}

export default Client;
