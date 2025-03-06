"use strict";
/** @module braintree-web/three-d-secure */

var ThreeDSecure = require("./external/three-d-secure");
var isHTTPS = require("../lib/is-https").isHTTPS;
var basicComponentVerification = require("../lib/basic-component-verification");
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var BraintreeError = require("../lib/braintree-error");
var analytics = require("../lib/analytics");
var errors = require("./shared/errors");
var VERSION = process.env.npm_package_version;
var wrapPromise = require("@braintree/wrap-promise");

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
 * @param {(number|string)} [options.version=1] The version of 3D Secure to use. Possible options:
 * * 2 - A 3D Secure v2.0 integration that uses a modal to host the 3D Secure iframe.
 * * 2-bootstrap3-modal - A 3D Secure v2.0 integration that uses a modal styled with Bootstrap 3 styles to host the 3D Secure iframe. Requires having the Bootstrap 3 script files and stylesheets on your page.
 * * 2-inline-iframe - A 3D Secure v2.0 integration that provides the authentication iframe directly to the merchant.
 * @param {callback} [callback] The second argument, `data`, is the {@link ThreeDSecure} instance. If no callback is provided, it returns a promise that resolves the {@link ThreeDSecure} instance.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
@example
 * <caption>Creating a v2 3D Secure component using 2 version (Cardinal modal)</caption>
 * braintree.threeDSecure.create({
 *   client: clientInstance,
 *   version: '2'
 * }, function (createError, threeDSecure) {
 *   // set up lookup-complete listener
 *   threeDSecure.on('lookup-complete', function (data, next) {
 *     // check lookup data
 *
 *     next();
 *   });
 *
 *   // using Hosted Fields, use `tokenize` to get back a credit card nonce
 *
 *   threeDSecure.verifyCard({
 *     nonce: nonceFromTokenizationPayload,,
 *     bin: binFromTokenizationPayload,
 *     amount: '100.00'
 *   }, function (verifyError, payload) {
 *     // inspect payload
 *     // send payload.nonce to your server
 *   });
 * });
 * @example
 * <caption>Creating a v2 3D Secure component using 2-bootstrap3-modal version</caption>
 * // must have the boostrap js, css and jquery files on your page
 * braintree.threeDSecure.create({
 *   client: clientInstance,
 *   version: '2-bootstrap3-modal'
 * }, function (createError, threeDSecure) {
 *   // set up lookup-complete listener
 *   threeDSecure.on('lookup-complete', function (data, next) {
 *     // check lookup data
 *
 *     next();
 *   });
 *
 *   // using Hosted Fields, use `tokenize` to get back a credit card nonce
 *
 *   // challenge will be presented in a bootstrap 3 modal
 *   threeDSecure.verifyCard({
 *     nonce: nonceFromTokenizationPayload,
 *     bin: binFromTokenizationPayload,
 *     amount: '100.00'
 *   }, function (verifyError, payload) {
 *     // inspect payload
 *     // send payload.nonce to your server
 *   });
 * });
 * @example
 * <caption>Creating a v2 3D Secure component using 2-inline-iframe version</caption>
 * braintree.threeDSecure.create({
 *   client: clientInstance,
 *   version: '2-inline-iframe'
 * }, function (createError, threeDSecure) {
 *   // set up lookup-complete listener
 *   threeDSecure.on('lookup-complete', function (data, next) {
 *     // check lookup data
 *
 *     next();
 *   });
 *   // set up iframe listener
 *   threeDSecure.on('authentication-iframe-available', function (event, next) {
 *     var element = event.element; // an html element that contains the iframe
 *
 *     document.body.appendChild(element); // put it on your page
 *
 *     next(); // let the sdk know the element has been added to the page
 *   });
 *
 *   // using Hosted Fields, use `tokenize` to get back a credit card nonce
 *
 *   threeDSecure.verifyCard({
 *     nonce: nonceFromTokenizationPayload,,
 *     bin: binFromTokenizationPayload,
 *     amount: '100.00'
 *   }, function (verifyError, payload) {
 *     // inspect payload
 *     // send payload.nonce to your server
 *   });
 * });
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

          if (!gwConfig.threeDSecureEnabled) {
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
              gwConfig.threeDSecure &&
              gwConfig.threeDSecure.cardinalAuthenticationJWT
            )
          ) {
            analytics.sendEvent(
              options.client,
              "three-d-secure.initialization.failed.missing-cardinalAuthenticationJWT"
            );
            error = errors.THREEDS_NOT_ENABLED_FOR_V2;
          }

          if (error) {
            return Promise.reject(new BraintreeError(error));
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
  var version = String(options.version || "");

  if (!version || version === "1") {
    throw new BraintreeError({
      code: errors.THREEDS_UNSUPPORTED_VERSION.code,
      type: errors.THREEDS_UNSUPPORTED_VERSION.type,
      message: errors.THREEDS_UNSUPPORTED_VERSION.message,
    });
  }

  switch (version) {
    case "2":
    case "2-cardinal-modal":
      return "cardinal-modal";
    case "2-bootstrap3-modal":
      return "bootstrap3-modal";
    case "2-inline-iframe":
      return "inline-iframe";
    default:
      throw new BraintreeError({
        code: errors.THREEDS_UNRECOGNIZED_VERSION.code,
        type: errors.THREEDS_UNRECOGNIZED_VERSION.type,
        message:
          "Version `" +
          options.version +
          "` is not a recognized version. You may need to update the version of your Braintree SDK to support this version.",
      });
  }
}

module.exports = {
  create: wrapPromise(create),
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
