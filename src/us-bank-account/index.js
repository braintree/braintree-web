"use strict";
/**
 * @module braintree-web/us-bank-account
 * @description This module is for accepting payments of US bank accounts.
 */

var basicComponentVerification = require("../lib/basic-component-verification");
var BraintreeError = require("../lib/braintree-error");
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var errors = require("./errors");
var USBankAccount = require("./us-bank-account");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {callback} [callback] The second argument, `data`, is the {@link USBankAccount} instance. If no callback is provided, `create` returns a promise that resolves with the {@link USBankAccount} instance.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
function create(options) {
  var name = "US Bank Account";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      return createDeferredClient.create({
        authorization: options.authorization,
        client: options.client,
        debug: options.debug,
        assetsUrl: createAssetsUrl.create(options.authorization),
        name: name,
      });
    })
    .then(function (client) {
      var usBankAccount;

      options.client = client;

      usBankAccount =
        options.client.getConfiguration().gatewayConfiguration.usBankAccount;
      if (!usBankAccount) {
        return Promise.reject(
          new BraintreeError(errors.US_BANK_ACCOUNT_NOT_ENABLED)
        );
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
  VERSION: VERSION,
};
