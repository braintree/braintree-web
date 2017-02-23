'use strict';
/** @module braintree-web/data-collector */

var kount = require('./kount');
var fraudnet = require('./fraudnet');
var BraintreeError = require('../lib/braintree-error');
var methods = require('../lib/methods');
var convertMethodsToError = require('../lib/convert-methods-to-error');
var VERSION = process.env.npm_package_version;
var Promise = require('../lib/promise');
var wrapPromise = require('../lib/wrap-promise');
var sharedErrors = require('../lib/errors');
var errors = require('./errors');

/**
 * @class
 * @global
 * @name DataCollector
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/data-collector.create|braintree-web.data-collector.create} instead.</strong>
 * @classdesc This class is used for advanced fraud integration with PayPal and Kount. Instances of this class have {@link DataCollector#deviceData|deviceData} which is used to correlate user sessions with server transactions. Before using DataCollector, make sure you have enabled advanced fraud protection in the Braintree gateway. To use your own Kount ID, contact our support team ([support@braintreepayments.com](mailto:support@braintreepayments.com) or [877.434.2894](tel:877.434.2894)).
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
 * @name teardown
 * @function
 * @description Cleanly remove all event handlers and DOM nodes that were added.
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @instance
 * @example
 * dataCollectorInstance.teardown();
 * @returns {Promise|void} Returns a promise that resolves when the teardown is complete if no callback is provided.
 */

/**
 * @static
 * @function create
 * @description Creates a DataCollector instance. Requires advanced fraud protection to be enabled in the Braintree gateway. Contact our [support team](mailto:support@braintreepayments.com) to configure your Kount ID.
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {boolean} [options.kount] If true, Kount fraud data collection is enabled.
 * @param {boolean} [options.paypal] If true, PayPal fraud data collection is enabled.
 * @param {callback} [callback] The second argument, `data`, is the {@link DataCollector} instance.
 * @example
 * var createClient = require('braintree-web/client').create;
 * var createDataCollector = require('braintree-web/data-collector').create;
 *
 * createClient({
 *   authorization: CLIENT_AUTHORIZATION
 * }, function (clientErr, clientInstance) {
 *   if (err) {
 *     // handle client error
 *     return;
 *   }
 *   createDataCollector({
 *     client: clientInstance,
 *     kount: true
 *   }, function (dataCollectorErr, dataCollectorInstance) {
 *     if (dataCollectorErr) {
 *       // handle data collector error
 *       return;
 *     }
 *     // data collector is set up
 *   });
 * });
 *
 * @returns {Promise|void} Returns a promise that resolves the {@link DataCollector} instance if no callback is provided.
 */
function create(options) {
  return new Promise(function (resolve) {
    var data, kountInstance, fraudnetInstance, config, clientVersion;
    var result = {};
    var instances = [];
    var teardown = createTeardownMethod(result, instances);

    if (options.client == null) {
      throw new BraintreeError({
        type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
        code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
        message: 'options.client is required when instantiating Data Collector.'
      });
    }

    config = options.client.getConfiguration();
    clientVersion = config.analyticsMetadata.sdkVersion;

    if (clientVersion !== VERSION) {
      throw new BraintreeError({
        type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
        code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
        message: 'Client (version ' + clientVersion + ') and Data Collector (version ' + VERSION + ') components must be from the same SDK version.'
      });
    }

    if (options.kount === true) {
      if (!config.gatewayConfiguration.kount) {
        throw new BraintreeError(errors.DATA_COLLECTOR_KOUNT_NOT_ENABLED);
      }

      try {
        kountInstance = kount.setup({
          environment: config.gatewayConfiguration.environment,
          merchantId: config.gatewayConfiguration.kount.kountMerchantId
        });
      } catch (err) {
        throw new BraintreeError({
          type: errors.DATA_COLLECTOR_KOUNT_ERROR.type,
          code: errors.DATA_COLLECTOR_KOUNT_ERROR.code,
          message: err.message
        });
      }

      data = kountInstance.deviceData;
      instances.push(kountInstance);
    } else {
      data = {};
    }

    if (options.paypal === true) {
      fraudnetInstance = fraudnet.setup();
      data.correlation_id = fraudnetInstance.sessionId; // eslint-disable-line camelcase
      instances.push(fraudnetInstance);
    }

    if (instances.length === 0) {
      throw new BraintreeError(errors.DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS);
    }

    result.deviceData = JSON.stringify(data);
    result.teardown = teardown;

    resolve(result);
  });
}

function createTeardownMethod(result, instances) {
  return wrapPromise(function teardown() {
    return new Promise(function (resolve) {
      var i;

      for (i = 0; i < instances.length; i++) {
        instances[i].teardown();
      }

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
