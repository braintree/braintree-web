'use strict';
/** @module braintree-web/data-collector */

var kount = require('./kount');
var fraudnet = require('./fraudnet');
var BraintreeError = require('../lib/braintree-error');
var basicComponentVerification = require('../lib/basic-component-verification');
var createDeferredClient = require('../lib/create-deferred-client');
var createAssetsUrl = require('../lib/create-assets-url');
var methods = require('../lib/methods');
var convertMethodsToError = require('../lib/convert-methods-to-error');
var VERSION = process.env.npm_package_version;
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');
var errors = require('./errors');

/**
 * @class
 * @global
 * @name DataCollector
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/data-collector.create|braintree-web.data-collector.create} instead.</strong>
 * @classdesc This class is used for fraud integration with PayPal and Kount. Instances of this class have {@link DataCollector#deviceData|deviceData} which is used to correlate user sessions with server transactions.
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
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */

/**
 * @static
 * @function create
 * @description Creates a DataCollector instance.
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.kount] If true, Kount fraud data collection is enabled. Before using the `kount` option, make sure you have enabled advanced fraud protection in the Braintree gateway. To use your own Kount ID, contact our support team ([support@braintreepayments.com](mailto:support@braintreepayments.com) or [877.434.2894](tel:877.434.2894)).
 *
 * **Note:** the data sent to Kount is asynchronous and may not have completed by the time the data collector create call is complete. In most cases, this will not matter, but if you create the data collector instance and immediately navigate away from the page, the device information may fail to be sent to Kount.
 * @param {boolean} [options.paypal] If true, PayPal fraud data collection is enabled.
 * @param {callback} [callback] The second argument, `data`, is the {@link DataCollector} instance.
 * @returns {Promise|void} Returns a promise that resolves the {@link DataCollector} instance if no callback is provided.
 */
function create(options) {
  var name = 'Data Collector';
  var result = {};
  var instances = [];
  var data;

  return basicComponentVerification.verify({
    name: name,
    client: options.client,
    authorization: options.authorization
  }).then(function () {
    return createDeferredClient.create({
      authorization: options.authorization,
      client: options.client,
      debug: options.debug,
      assetsUrl: createAssetsUrl.create(options.authorization),
      name: name
    });
  }).then(function (client) {
    var kountInstance;
    var config = client.getConfiguration();

    if (options.kount === true) {
      if (!config.gatewayConfiguration.kount) {
        return Promise.reject(new BraintreeError(errors.DATA_COLLECTOR_KOUNT_NOT_ENABLED));
      }

      try {
        kountInstance = kount.setup({
          environment: config.gatewayConfiguration.environment,
          merchantId: config.gatewayConfiguration.kount.kountMerchantId
        });
      } catch (err) {
        return Promise.reject(new BraintreeError({
          type: errors.DATA_COLLECTOR_KOUNT_ERROR.type,
          code: errors.DATA_COLLECTOR_KOUNT_ERROR.code,
          message: err.message
        }));
      }

      data = kountInstance.deviceData;
      instances.push(kountInstance);
    } else {
      data = {};
    }

    return Promise.resolve();
  }).then(function () {
    if (options.paypal !== true) {
      return Promise.resolve();
    }

    return fraudnet.setup().then(function (fraudnetInstance) {
      if (fraudnetInstance) {
        data.correlation_id = fraudnetInstance.sessionId; // eslint-disable-line camelcase
        instances.push(fraudnetInstance);
      }
    });
  }).then(function () {
    if (instances.length === 0) {
      return Promise.reject(new BraintreeError(errors.DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS));
    }

    result.deviceData = JSON.stringify(data);
    result.rawDeviceData = data;
    result.teardown = createTeardownMethod(result, instances);

    return result;
  });
}

function createTeardownMethod(result, instances) {
  return wrapPromise(function teardown() {
    return new Promise(function (resolve) {
      instances.forEach(function (instance) {
        if (instance) {
          instance.teardown();
        }
      });

      convertMethodsToError(result, methods(result));

      resolve();
    });
  });
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
