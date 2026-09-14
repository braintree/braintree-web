// @ts-nocheck
/**
 * @module braintree-web/us-bank-account
 * @description This module is for accepting payments of US bank accounts.
 */

import basicComponentVerification from "../lib/basic-component-verification";
import BraintreeError from "../lib/braintree-error";
import createDeferredClient from "../lib/create-deferred-client";
import createAssetsUrl from "../lib/create-assets-url";
import errors from "./errors";
import USBankAccount from "./us-bank-account";
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @returns {Promise} Returns a promise that resolves with the {@link USBankAccount} instance.
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
        throw new BraintreeError(errors.US_BANK_ACCOUNT_NOT_ENABLED);
      }

      return new USBankAccount(options);
    });
}

export default {
  create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION,
};
