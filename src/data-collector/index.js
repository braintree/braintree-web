'use strict';
/** @module braintree-web/data-collector */

var kount = require('./kount');
var fraudnet = require('./fraudnet');
var BraintreeError = require('../lib/braintree-error');
var methods = require('../lib/methods');
var throwIfNoCallback = require('../lib/throw-if-no-callback');
var convertMethodsToError = require('../lib/convert-methods-to-error');
var deferred = require('../lib/deferred');
var VERSION = process.env.npm_package_version;
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
 * @returns {void}
 */

/**
 * @static
 * @function create
 * @description Creates a DataCollector instance. Requires advanced fraud protection to be enabled in the Braintree gateway. Contact our [support team](mailto:support@braintreepayments.com) to configure your Kount ID.
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {boolean} [options.kount] If true, Kount fraud data collection is enabled.
 * @param {boolean} [options.paypal] If true, PayPal fraud data collection is enabled.
 * @param {callback} callback The second argument, `data`, is the {@link DataCollector} instance.
 * @returns {void}
 */
function create(options, callback) {
  var data, kountInstance, fraudnetInstance, result, config, clientVersion;
  var instances = [];

  throwIfNoCallback(callback, 'create');

  callback = deferred(callback);

  function teardown(cb) {
    var i;

    for (i = 0; i < instances.length; i++) {
      instances[i].teardown();
    }

    convertMethodsToError(result, methods(result));

    if (cb) {
      cb = deferred(cb);
      cb();
    }
  }

  if (options.client == null) {
    callback(new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: 'options.client is required when instantiating Data Collector.'
    }));
    return;
  }

  config = options.client.getConfiguration();
  clientVersion = config.analyticsMetadata.sdkVersion;

  if (clientVersion !== VERSION) {
    callback(new BraintreeError({
      type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
      code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
      message: 'Client (version ' + clientVersion + ') and Data Collector (version ' + VERSION + ') components must be from the same SDK version.'
    }));
    return;
  }

  if (options.kount === true) {
    if (!config.gatewayConfiguration.kount) {
      callback(new BraintreeError(errors.DATA_COLLECTOR_KOUNT_NOT_ENABLED));
      return;
    }

    try {
      kountInstance = kount.setup({
        environment: config.gatewayConfiguration.environment,
        merchantId: config.gatewayConfiguration.kount.kountMerchantId
      });
    } catch (err) {
      callback(new BraintreeError({
        type: errors.DATA_COLLECTOR_KOUNT_ERROR.type,
        code: errors.DATA_COLLECTOR_KOUNT_ERROR.code,
        message: err.message
      }));
      return;
    }

    data = kountInstance.deviceData;
    instances.push(kountInstance);
  } else {
    data = {};
  }

  if (options.paypal === true) {
    if (config.gatewayConfiguration.paypalEnabled !== true) {
      callback(new BraintreeError(errors.DATA_COLLECTOR_PAYPAL_NOT_ENABLED));
      return;
    }

    fraudnetInstance = fraudnet.setup();
    data.correlation_id = fraudnetInstance.sessionId; // eslint-disable-line camelcase
    instances.push(fraudnetInstance);
  }

  if (instances.length === 0) {
    callback(new BraintreeError(errors.DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS));
    return;
  }

  result = {
    deviceData: JSON.stringify(data),
    teardown: teardown
  };

  callback(null, result);
}

module.exports = {
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
