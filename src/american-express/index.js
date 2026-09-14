// @ts-nocheck
/**
 * @module braintree-web/american-express
 * @description This module is for use with Amex Express Checkout. To accept American Express cards, use Hosted Fields.
 */

import AmericanExpress from "./american-express";
import * as basicComponentVerification from "../lib/basic-component-verification";
import * as createDeferredClient from "../lib/create-deferred-client";
import * as createAssetsUrl from "../lib/create-assets-url";

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @returns {Promise} Returns a promise that resolves with the {@link AmericanExpress} instance.
 */
async function create(options) {
  var name = "American Express";

  await basicComponentVerification.verify({
    name: name,
    client: options.client,
    authorization: options.authorization,
  });

  var client = await createDeferredClient.create({
    authorization: options.authorization,
    client: options.client,
    debug: options.debug,
    assetsUrl: createAssetsUrl.create(options.authorization),
    name: name,
  });

  options.client = client;

  return new AmericanExpress(options);
}

/**
 * @description The current version of the SDK, i.e. `{@pkg version}`.
 * @type {string}
 */
const VERSION = __SDK_VERSION__;

export default { create, VERSION };
