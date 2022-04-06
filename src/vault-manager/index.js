"use strict";
/**
 * @module braintree-web/vault-manager
 * @description Manages customer's payment methods.
 */

var basicComponentVerification = require("../lib/basic-component-verification");
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var VaultManager = require("./vault-manager");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {callback} callback The second argument, `data`, is the {@link VaultManager} instance.
 * @returns {void}
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

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
