'use strict';
/**
 * @module braintree-web
 * @description This is the top-level module exported by the Braintree JavaScript SDK. In a browser environment, this will be the global <code>braintree</code> object. In a CommonJS environment (like Browserify or Webpack), it will be the default export of the <code>braintree-web</code> package. In AMD environments (like RequireJS), it can be `require`d like other modules.
 * @example
 * <caption>CommonJS</caption>
 * var braintree = require('braintree-web');
 *
 * braintree.client.create(...);
 * @example
 * <caption>In the browser</caption>
 * <script src="https://js.braintreegateway.com/web/{@pkg version}/js/client.min.js"></script>
 * <script>
 *   window.braintree.client.create(...);
 * </script>
 * @example
 * <caption>AMD</caption>
 * // main.js
 * require.config({
 *   paths: {
 *     braintreeClient: 'https://js.braintreegateway.com/web/{@pkg version}/js/client.min'
 *   }
 * });
 *
 * require(['braintreeClient'], function (braintreeClient) {
 *   braintreeClient.create(...);
 * });
 */

/**
 * @global
 * @callback callback
 * @param {?BraintreeError} [err] `null` or `undefined` if there was no error.
 * @param {?any} [data] The successful result of the asynchronous function call (if data exists).
 * @description The Node.js-style callback pattern used throughout the SDK.
 * @returns {void}
 */

var client = require('./client@EXT');
var paypal = require('./paypal@EXT');
var hostedFields = require('./hosted-fields@EXT');
var dataCollector = require('./data-collector@EXT');
var americanExpress = require('./american-express@EXT');
var unionpay = require('./unionpay@EXT');
var applePay = require('./apple-pay@EXT');
var threeDSecure = require('./three-d-secure@EXT');

module.exports = {
  /** @type {module:braintree-web/client} */
  client: client,
  /** @type {module:braintree-web/paypal} */
  paypal: paypal,
  /** @type {module:braintree-web/hosted-fields} */
  hostedFields: hostedFields,
  /** @type {module:braintree-web/three-d-secure} */
  threeDSecure: threeDSecure,
  /** @type {module:braintree-web/data-collector} */
  dataCollector: dataCollector,
  /** @type {module:braintree-web/american-express} */
  americanExpress: americanExpress,
  /** @type {module:braintree-web/unionpay} */
  unionpay: unionpay,
  /** @type {module:braintree-web/apple-pay} */
  applePay: applePay,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: '@VERSION'
};
