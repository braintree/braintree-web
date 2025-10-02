"use strict";
/** @module braintree-web/data-collector */

var fraudnet = require("./fraudnet");
var BraintreeError = require("../lib/braintree-error");
var basicComponentVerification = require("../lib/basic-component-verification");
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var methods = require("../lib/methods");
var convertMethodsToError = require("../lib/convert-methods-to-error");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");
var errors = require("./errors");

/**
 * @class
 * @global
 * @name DataCollector
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/data-collector.create|braintree-web.data-collector.create} instead.</strong>
 * @classdesc This class is used for fraud integration with PayPal. Instances of this class have {@link DataCollector#deviceData|deviceData} which is used to correlate user sessions with server transactions.
 */

/**
 * @memberof DataCollector
 * @name deviceData
 * @type string
 * @description JSON string to pass with server transactions.
 * @instance
 */

/**
 * @memberof DataCollector
 * @name rawDeviceData
 * @type object
 * @description The device data as an object instead of a string.
 * @instance
 */

/**
 * @memberof DataCollector
 * @name teardown
 * @function
 * @description Cleanly remove anything set up by {@link module:braintree-web/data-collector.create|create}.
 * @param {callback} [callback] Called on completion. If no callback is provided, `teardown` returns a promise.
 * @instance
 * @example
 * dataCollectorInstance.teardown();
 * @example <caption>With callback</caption>
 * dataCollectorInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */

/**
 * @memberof DataCollector
 * @name getDeviceData
 * @function
 * @description Resolves with device data once it is ready.
 * @param {object} [options] Options for how device data is resolved.
 * @param {boolean} [options.raw=false] When set to true, the device data will resolve as an object instead of a JSON string.
 * @param {callback} [callback] Called on completion. If no callback is provided, `getDeviceData` returns a promise.
 * @instance
 * @example
 * dataCollectorInstance.getDeviceData();
 * @example <caption>Without options</caption>
 * dataCollectorInstance.getDeviceData().then(function (deviceData) {
 *   // typeof deviceData === 'string'
 *   // pass onto your server with the payment method nonce
 * });
 * @example <caption>With options</caption>
 * dataCollectorInstance.getDeviceData({
 *   raw: true
 * }).then(function (deviceData) {
 *   // typeof deviceData === 'object'
 *   // for if you'd like to parse the data before sending it to your server
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */

/**
 * @static
 * @function create
 * @description Creates a DataCollector instance and collects device data based on your merchant configuration. We recommend that you call this method as early as possible, e.g. as soon as your website loads. If that's too early, call it at the beginning of customer checkout.
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.useDeferredClient] Used in conjunction with `authorization`, allows the Data Collector instance to be available right away by fetching the client configuration in the background. When this option is used, {@link GooglePayment#getDeviceData} must be used to collect the device data.
 * @param {boolean} [options.paypal] *Deprecated:* PayPal fraud data collection will occur when the DataCollector instance is created.
 * @param {string} [options.riskCorrelationId] Pass a custom risk correlation id when creating the data collector.
 * @param {string} [options.clientMetadataId] Deprecated. Use `options.riskCorrelationId` instead.
 * @param {string} [options.correlationId] Deprecated. Use `options.riskCorrelationId` instead.
 * @param {string} [options.cb1] Callback name for fraudnet that will be invoked on the window object when fraudnet is finished initializing.
 * @param {callback} [callback] The second argument, `data`, is the {@link DataCollector} instance.
 * @returns {(Promise|void)} Returns a promise that resolves the {@link DataCollector} instance if no callback is provided.
 */
function create(options) {
  var name = "Data Collector";
  var result = {
    _instances: [],
  };
  var data = {};

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      result._instantiatedWithAClient = !options.useDeferredClient;
      result._createPromise = createDeferredClient
        .create({
          authorization: options.authorization,
          client: options.client,
          debug: options.debug,
          assetsUrl: createAssetsUrl.create(options.authorization),
          name: name,
        })
        .then(function (client) {
          var clientConfiguration = client.getConfiguration();
          var fraudnetConfig = {
            sessionId:
              options.riskCorrelationId ||
              options.clientMetadataId ||
              options.correlationId,
            clientSessionId: clientConfiguration.analyticsMetadata.sessionId,
            environment: clientConfiguration.gatewayConfiguration.environment,
            cb1: options.cb1,
          };
          if (options.hasOwnProperty("beacon")) {
            fraudnetConfig.beacon = options.beacon;
          }
          return fraudnet
            .setup(fraudnetConfig)
            .then(function (fraudnetInstance) {
              if (fraudnetInstance) {
                data.correlation_id = fraudnetInstance.sessionId; // eslint-disable-line camelcase
                result._instances.push(fraudnetInstance);
              }
            });
        })
        .then(function () {
          if (result._instances.length === 0) {
            // NEXT_MAJOR_VERSION either this should error with a specific error that
            // no data collector instances could be set up, or we should just swallow
            // the error and document that no device data will be returned if
            // data collector cannot be instantiated. We can't change the error code here
            // without possibly breaking merchant integrations relying on this inccorrect
            // behavior.
            return Promise.reject(
              new BraintreeError(errors.DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS)
            );
          }

          result.deviceData = JSON.stringify(data);
          result.rawDeviceData = data;

          return result;
        });

      result.teardown = createTeardownMethod(result);
      result.getDeviceData = createGetDeviceDataMethod(result);

      if (result._instantiatedWithAClient) {
        return result._createPromise;
      }

      return result;
    });
}

function createTeardownMethod(result) {
  return wrapPromise(function teardown() {
    return result._createPromise.then(function () {
      result._instances.forEach(function (instance) {
        if (instance) {
          instance.teardown();
        }
      });

      convertMethodsToError(result, methods(result));
    });
  });
}

function createGetDeviceDataMethod(result) {
  return wrapPromise(function getDeviceData(options) {
    options = options || {};

    return result._createPromise.then(function () {
      if (options.raw) {
        return Promise.resolve(result.rawDeviceData);
      }

      return Promise.resolve(result.deviceData);
    });
  });
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
