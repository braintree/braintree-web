'use strict';
/** @module braintree-web/unionpay */

var VERSION = require('package.version');
var UnionPay = require('./shared/unionpay');
var BraintreeError = require('../lib/error');
var analytics = require('../lib/analytics');
var deferred = require('../lib/deferred');

function create(options, callback) {
  var config, clientVersion;

  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'UnionPay creation requires a callback.'
    });
  }

  callback = deferred(callback);

  if (options.client == null) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'options.client is required when instantiating UnionPay.'
    }));
    return;
  }

  config = options.client.getConfiguration();
  clientVersion = config.analyticsMetadata.sdkVersion;

  if (clientVersion !== VERSION) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'Client (version ' + clientVersion + ') and UnionPay (version ' + VERSION + ') components must be from the same SDK version.'
    }));
    return;
  }

  if (!config.gatewayConfiguration.unionPay || config.gatewayConfiguration.unionPay.enabled !== true) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'UnionPay is not enabled for this merchant.'
    }));
    return;
  }

  analytics.sendEvent(options.client, 'web.unionpay.initialized');

  callback(null, new UnionPay(options));
}

module.exports = {
  /**
   * @static
   * @function
   * @param {object} options Object containing configuration options for this module.
   * @param {Client} options.client A {@link Client} instance.
   * @example
   * braintree.unionpay.create({ client: clientInstance }, function (createErr, unionpayInstance) {
   *   if (createErr) {
   *     console.error(createErr);
   *     return;
   *   }
   *   // ...
   * });
   * @returns {@link UnionPay}
   */
  create: create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
