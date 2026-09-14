// @ts-nocheck
/**
 * @module braintree-web/vault-manager
 * @description Manages customer's payment methods.
 */

import basicComponentVerification from "../lib/basic-component-verification";
import createDeferredClient from "../lib/create-deferred-client";
import createAssetsUrl from "../lib/create-assets-url";
import VaultManager from "./vault-manager";
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @returns {Promise} Returns a promise that resolves with the {@link VaultManager} instance.
 */
function create(options) {
  var name = "Vault Manager";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      return new VaultManager({
        createPromise: createDeferredClient.create({
          authorization: options.authorization,
          client: options.client,
          debug: options.debug,
          assetsUrl: createAssetsUrl.create(options.authorization),
          name: name,
        }),
      });
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
