'use strict';
/**
 * @module braintree-web/vault-manager
 * @description Manages customer's payment methods.
 */

var basicComponentVerification = require('../lib/basic-component-verification');
var VaultManager = require('./vault-manager');
var VERSION = process.env.npm_package_version;
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} options.client A {@link Client} instance.
 * @param {callback} callback The second argument, `data`, is the {@link VaultManager} instance.
 * @returns {void}
 */
function create(options) {
  return basicComponentVerification.verify({
    name: 'Vault Manager',
    client: options.client
  }).then(function () {
    return new VaultManager(options);
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
