// @ts-nocheck
/** @module braintree-web/fastlane */

import basicComponentVerification from "../lib/basic-component-verification";
import fastlane from "./fastlane";
import createAssetsUrl from "../lib/create-assets-url";
import createDeferredClient from "../lib/create-deferred-client";
/**
 * @description The current version of the SDK, i.e. `{@pkg version}`.
 * @type {string}
 */
import { assign } from "../lib/assign";
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {string} [options.deviceData] The device data string from a {@link DataCollector} instance.
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
 * @returns {Promise} Returns the fastlane instance.
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

export default {
  create,
  VERSION,
};
