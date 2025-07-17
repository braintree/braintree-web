"use strict";
/** @module braintree-web/sepa */

var analytics = require("../lib/analytics");
var SEPA = require("./external/sepa");
var createAssetsUrl = require("../lib/create-assets-url");
var createDeferredClient = require("../lib/create-deferred-client");
var basicComponentVerification = require("../lib/basic-component-verification");
var wrapPromise = require("@braintree/wrap-promise");
var VERSION = process.env.npm_package_version;
var parse = require("../lib/querystring").parse;
var assign = require("../lib/assign").assign;
var mandate = require("./external/mandate");

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.debug] A debug flag.
 * @param {string} [options.redirectUrl] When provided, triggers full page redirect flow instead of popup flow.
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
  var params = parse(window.location.href);

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

      analytics.sendEvent(client, "sepa.client.initialized");

      return new SEPA(options);
    })
    .then(function (sepaInstance) {
      // This cart_id is actually a V2 orderId
      var redirectComplete =
        params.success && params.success === "true" && params.cart_id;

      if (redirectComplete) {
        options = assign(options, params);

        // Pick up redirect flow where it left off
        return mandate
          .handleApprovalForFullPageRedirect(options.client, options)
          .then(function (payload) {
            sepaInstance.tokenizePayload = payload;

            return sepaInstance;
          })
          .catch(function (err) {
            console.error("Problem while finishing tokenizing: ", err); // eslint-disable-line no-console
          });
      }
      if (params.cancel) {
        analytics.sendEvent(
          options.client,
          "sepa.redirect.customer-canceled.failed"
        );
      }

      return sepaInstance;
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
