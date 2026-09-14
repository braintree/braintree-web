// @ts-nocheck
/** @module braintree-web/three-d-secure */

import ThreeDSecure from "./external/three-d-secure";
import { isHTTPS } from "../lib/is-https";
import basicComponentVerification from "../lib/basic-component-verification";
import createDeferredClient from "../lib/create-deferred-client";
import createAssetsUrl from "../lib/create-assets-url";
import BraintreeError from "../lib/braintree-error";
import analytics from "../lib/analytics";
import errors from "./shared/errors";
const VERSION = __SDK_VERSION__;

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {object} [options.cardinalSDKConfig] A config for the underlying Cardinal SDK.
 * @param {object} [options.cardinalSDKConfig.logging] The logging configuration for the Cardinal SDK. See [Cardinal's documentation for the logging object](https://cardinaldocs.atlassian.net/wiki/spaces/CC/pages/1409568/Configurations#Configurations-Logging) for more information.
 * @param {number} [options.cardinalSDKConfig.timeout] The time in milliseconds to wait before a request to Cardinal's API times out. See [Cardinal's documentation for root level configuration](https://cardinaldocs.atlassian.net/wiki/spaces/CC/pages/1409568/Configurations#Configurations-RootLevelConfiguration) for more information.
 * @param {number} [options.cardinalSDKConfig.maxRequestRetries] How many times a request should be re-attempted to Cardinal's API before giving up as a failure. See [Cardinal's documentation for root level configuration](https://cardinaldocs.atlassian.net/wiki/spaces/CC/pages/1409568/Configurations#Configurations-RootLevelConfiguration) for more information.
 * @param {object} [options.cardinalSDKConfig.payment] An object to describe how you want the user interactions to behave. Only a subset of the [Cardinal SDK payment configuration object](https://cardinaldocs.atlassian.net/wiki/spaces/CC/pages/1409568/Configurations#Configurations-Payment) are supported: `displayLoading` and `displayExitButton`.
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {string} [options.challengeDisplay] How the 3D Secure challenge UI should be presented. Defaults to `'modal'`. Possible options:
 * * `'modal'` - A Cardinal-managed modal hosts the 3D Secure iframe.
 * * `'inline-iframe'` - The authentication iframe is provided directly to the merchant for custom placement.
 * @returns {Promise} Returns a promise that resolves the {@link ThreeDSecure} instance.
 * @example
 * <caption>Creating a 3D Secure component using the Cardinal modal (default)</caption>
 * try {
 *   const threeDSecure = await braintree.threeDSecure.create({
 *     client: clientInstance,
 *     challengeDisplay: 'modal'
 *   });
 *
 *   // set up lookup-complete listener
 *   threeDSecure.on('lookup-complete', function (payload) {
 *     // check lookup data
 *     console.log(payload.data);
 *
 *     payload.next();
 *   });
 *
 *   // using Hosted Fields, use `tokenize` to get back a credit card nonce
 *   const payload = await threeDSecure.verifyCard({
 *     nonce: nonceFromTokenizationPayload,
 *     bin: binFromTokenizationPayload,
 *     amount: '100.00'
 *   });
 *   // inspect payload
 *   // send payload.nonce to your server
 *
 * } catch (createError) {
 *   // handle error
 * }
 * @example
 * <caption>Creating a 3D Secure component using the inline iframe</caption>
 * try {
 *   const threeDSecure = await braintree.threeDSecure.create({
 *     client: clientInstance,
 *     challengeDisplay: 'inline-iframe'
 *   });
 *   // set up lookup-complete listener
 *   threeDSecure.on('lookup-complete', function (payload) {
 *     // check lookup data
 *     console.log(payload.data);
 *
 *     payload.next();
 *   });
 *   // set up iframe listener
 *   threeDSecure.on('authentication-iframe-available', function (payload) {
 *     var element = payload.element; // an html element that contains the iframe
 *
 *     document.body.appendChild(element); // put it on your page
 *
 *     payload.next(); // let the sdk know the element has been added to the page
 *   });
 *
 *   // using Hosted Fields, use `tokenize` to get back a credit card nonce
 *   const payload = await threeDSecure.verifyCard({
 *     nonce: nonceFromTokenizationPayload,
 *     bin: binFromTokenizationPayload,
 *     amount: '100.00'
 *   });
 *   // inspect payload
 *   // send payload.nonce to your server
 * } catch (error) {
 *   // handle error
 * }
 */
function create(options) {
  var name = "3D Secure";
  var framework = getFramework(options);

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      var assetsUrl = createAssetsUrl.create(options.authorization);
      var createPromise = createDeferredClient
        .create({
          authorization: options.authorization,
          client: options.client,
          debug: options.debug,
          assetsUrl: assetsUrl,
          name: name,
        })
        .then(function (client) {
          var error, isProduction;
          var config = client.getConfiguration();
          var gwConfig = config.gatewayConfiguration;

          options.client = client;

          if (
            !gwConfig.creditCard ||
            !gwConfig.creditCard.threeDSecureEnabled
          ) {
            error = errors.THREEDS_NOT_ENABLED;
          }

          if (config.authorizationType === "TOKENIZATION_KEY") {
            error = errors.THREEDS_CAN_NOT_USE_TOKENIZATION_KEY;
          }

          isProduction = gwConfig.environment === "production";

          if (isProduction && !isHTTPS()) {
            error = errors.THREEDS_HTTPS_REQUIRED;
          }

          if (
            !(
              gwConfig.creditCard &&
              gwConfig.creditCard.threeDSecure &&
              gwConfig.creditCard.threeDSecure.cardinalAuthenticationJWT
            )
          ) {
            analytics.sendEvent(
              options.client,
              "three-d-secure.initialization.failed.missing-cardinalAuthenticationJWT"
            );
            error = errors.THREEDS_NOT_ENABLED_FOR_V2;
          }

          if (error) {
            throw new BraintreeError(error);
          }

          analytics.sendEvent(options.client, "three-d-secure.initialized");

          return client;
        });
      var instance = new ThreeDSecure({
        client: options.client,
        assetsUrl: assetsUrl,
        createPromise: createPromise,
        loggingEnabled: options.loggingEnabled,
        cardinalSDKConfig: options.cardinalSDKConfig,
        framework: framework,
      });

      if (options.client) {
        return createPromise.then(function () {
          return instance;
        });
      }

      return instance;
    });
}

function getFramework(options) {
  var challengeDisplay = options.challengeDisplay || "modal";

  switch (challengeDisplay) {
    case "modal":
      return "cardinal-modal";
    case "inline-iframe":
      return "inline-iframe";
    default:
      throw new BraintreeError({
        code: errors.THREEDS_CHALLENGE_DISPLAY_INVALID.code,
        type: errors.THREEDS_CHALLENGE_DISPLAY_INVALID.type,
        message:
          "Challenge display `" +
          options.challengeDisplay +
          "` is not recognized. Valid values are 'modal' and 'inline-iframe'.",
      });
  }
}

export default {
  create,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION,
};
