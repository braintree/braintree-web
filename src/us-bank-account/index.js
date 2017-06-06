'use strict';
/**
 * @module braintree-web/us-bank-account
 * @description This module is for accepting payments of US bank accounts.
 */

var BraintreeError = require('../lib/braintree-error');
var errors = require('./errors');
var USBankAccount = require('./us-bank-account');
var VERSION = process.env.npm_package_version;
var sharedErrors = require('../lib/errors');
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} [callback] The second argument, `data`, is the {@link USBankAccount} instance. If no callback is provided, `create` returns a promise that resolves with the {@link USBankAccount} instance.
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
function create(options) {
  var clientVersion, braintreeApi, usBankAccount;

  if (options.client == null) {
    return Promise.reject(new BraintreeError({
      type: sharedErrors.INSTANTIATION_OPTION_REQUIRED.type,
      code: sharedErrors.INSTANTIATION_OPTION_REQUIRED.code,
      message: 'options.client is required when instantiating US Bank Account.'
    }));
  }

  clientVersion = options.client.getVersion();
  if (clientVersion !== VERSION) {
    return Promise.reject(new BraintreeError({
      type: sharedErrors.INCOMPATIBLE_VERSIONS.type,
      code: sharedErrors.INCOMPATIBLE_VERSIONS.code,
      message: 'Client (version ' + clientVersion + ') and US Bank Account (version ' + VERSION + ') components must be from the same SDK version.'
    }));
  }

  braintreeApi = options.client.getConfiguration().gatewayConfiguration.braintreeApi;
  if (!braintreeApi) {
    return Promise.reject(new BraintreeError(sharedErrors.BRAINTREE_API_ACCESS_RESTRICTED));
  }

  usBankAccount = options.client.getConfiguration().gatewayConfiguration.usBankAccount;
  if (!usBankAccount) {
    return Promise.reject(new BraintreeError(errors.US_BANK_ACCOUNT_NOT_ENABLED));
  }

  return Promise.resolve(new USBankAccount(options));
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION
};
