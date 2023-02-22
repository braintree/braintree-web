"use strict";
/** @module braintree-web/preferred-payment-methods */

var wrapPromise = require("@braintree/wrap-promise");
var basicComponentVerification = require("../lib/basic-component-verification");
var PreferredPaymentMethods = require("./preferred-payment-methods");
var VERSION = process.env.npm_package_version;

// NEXT_MAJOR_VERSION
// Remove this integration entirely. It doesn't work, isn't documented, and otherwise isn't going to be pursued further beyond the non-operational beta it is in.
/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {callback} [callback] The second argument, `data`, is the {@link PreferredPaymentMethods} instance.
 * @example
 * braintree.preferredPaymentMethods.create({
 *   client: clientInstance
 * }).then(function (preferredPaymentMethodsInstance) {
 *   // preferredPaymentMethodsInstance is ready to be used.
 * }).catch(function (error) {
 *   // handle creation error
 * });
 * @returns {Promise|void} Returns a Promise with resolves with the PreferredPaymentMethods instance.
 */
function create(options) {
  var name = "PreferredPaymentMethods";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      var instance = new PreferredPaymentMethods();

      return instance.initialize(options);
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
