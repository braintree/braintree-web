'use strict';
/**
 * @module braintree-web/us-bank-account
 * @description This module is for accepting payments of US bank accounts.
 *
 * **Note:** This component is currently in beta and the API may include breaking changes when upgrading. Please review the [Changelog](https://github.com/braintree/braintree-web/blob/master/CHANGELOG.md) for upgrade steps whenever you upgrade the version of braintree-web.
 */

var basicComponentVerification = require('../lib/basic-component-verification');
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
  return basicComponentVerification.verify({
    name: 'US Bank Account',
    client: options.client
  }).then(function () {
    var usBankAccount;
    var braintreeApi = options.client.getConfiguration().gatewayConfiguration.braintreeApi;

    if (!braintreeApi) {
      return Promise.reject(new BraintreeError(sharedErrors.BRAINTREE_API_ACCESS_RESTRICTED));
    }

    usBankAccount = options.client.getConfiguration().gatewayConfiguration.usBankAccount;
    if (!usBankAccount) {
      return Promise.reject(new BraintreeError(errors.US_BANK_ACCOUNT_NOT_ENABLED));
    }

    return new USBankAccount(options);
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
