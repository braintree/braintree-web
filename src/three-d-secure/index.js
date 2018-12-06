'use strict';
/** @module braintree-web/three-d-secure */

var ThreeDSecure = require('./external/three-d-secure');
var isHTTPS = require('../lib/is-https').isHTTPS;
var basicComponentVerification = require('../lib/basic-component-verification');
var createDeferredClient = require('../lib/create-deferred-client');
var createAssetsUrl = require('../lib/create-assets-url');
var BraintreeError = require('../lib/braintree-error');
var analytics = require('../lib/analytics');
var errors = require('./shared/errors');
var VERSION = process.env.npm_package_version;
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {callback} [callback] The second argument, `data`, is the {@link ThreeDSecure} instance. If no callback is provided, it returns a promise that resolves the {@link ThreeDSecure} instance.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
function create(options) {
  var name = '3D Secure';

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
    var error, isProduction;
    var config = client.getConfiguration();

    options.client = client;

    if (!config.gatewayConfiguration.threeDSecureEnabled) {
      error = errors.THREEDS_NOT_ENABLED;
    }

    if (config.authorizationType === 'TOKENIZATION_KEY') {
      error = errors.THREEDS_CAN_NOT_USE_TOKENIZATION_KEY;
    }

    isProduction = config.gatewayConfiguration.environment === 'production';

    if (isProduction && !isHTTPS()) {
      error = errors.THREEDS_HTTPS_REQUIRED;
    }

    if (error) {
      return Promise.reject(new BraintreeError(error));
    }

    analytics.sendEvent(options.client, 'threedsecure.initialized');

    return new ThreeDSecure(options);
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
