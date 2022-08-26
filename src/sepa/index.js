"use strict";
/** @module braintree-web/sepa */

var analytics = require("../lib/analytics");
var SEPA = require("./external/sepa");
var createAssetsUrl = require("../lib/create-assets-url");
var createDeferredClient = require("../lib/create-deferred-client");
var basicComponentVerification = require("../lib/basic-component-verification");
var wrapPromise = require("@braintree/wrap-promise");
var VERSION = process.env.npm_package_version;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.debug] A debug flag.
 * @param {callback} [callback] When provided, will be used instead of a promise. First argument is an error object, where the second is an instance of {@link SEPA|SEPA}.
 * @returns {Promise<void|error>} Returns the SEPA instance.
 * @example
 * braintree.sepa.create({
 *   client: clientInstance
 * }).then(function (sepaInstance) {
 *   // sepaInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating SEPA instance', createErr);
 * });
 * @example <caption>Creating a SEPA component</caption>
 * braintree.sepa.create({
 *   client: clientInstance,
 * }).then(function (sepaInstance) {
 *   // sepaInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating SEPA instance', createErr);
 * });
 */

function create(options) {
  var name = "SEPA";

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
      options.client = client;

      analytics.sendEvent(options.client, "sepa.client.initialized");

      return new SEPA(options);
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
