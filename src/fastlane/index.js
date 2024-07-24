"use strict";

/** @module braintree-web/fastlane */

var basicComponentVerification = require("../lib/basic-component-verification");
var fastlane = require("./fastlane");
var createAssetsUrl = require("../lib/create-assets-url");
var createDeferredClient = require("../lib/create-deferred-client");
var wrapPromise = require("@braintree/wrap-promise");
var VERSION = process.env.npm_package_version;
var assign = require("../lib/assign").assign;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {string} [options.deviceData] A {@link DataCollector} instance.
 * @example
 * braintree.fastlane.create({
 *   client: clientInstance,
 *   deviceData: dataCollectorInstance
 * }).then(function (fastlaneInstance) {
 *   // fastlaneInstance is ready to create an identity instance.
 *     identity = fastlaneInstance.identity
 * }).catch(function (createErr) {
 *   console.error('Error creating fastlane instance', createErr);
 * });
 * @example <caption>Creating a fastlane component</caption>
 * braintree.fastlane.create({
 *   client: clientInstance,
 *   deviceData: dataCollectorInstance
 * }).then(function (fastlaneInstance) {
 *   // fastlaneInstance is ready to create an identity instance.
 *     identity = fastlaneInstance.identity
 * }).catch(function (createErr) {
 *   console.error('Error creating fastlane instance', createErr);
 * });
 * @returns {(Promise|void)} Returns the fastlane instance.
 */

function create(options) {
  var name = "fastlane";

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
        assetsUrl: createAssetsUrl.create(options.authorization),
        name: name,
      });
    })
    .then(function (client) {
      return fastlane(
        assign(
          {
            client: client,
            deviceData: options.deviceData,
          },
          options
        )
      );
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
