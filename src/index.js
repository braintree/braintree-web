"use strict";
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

var americanExpress = require("./american-express");
var applePay = require("./apple-pay");
var client = require("./client");
var fastlane = require("./fastlane");
var dataCollector = require("./data-collector");
var hostedFields = require("./hosted-fields");
var localPayment = require("./local-payment");
var masterpass = require("./masterpass");
var instantVerification = require("./instant-verification");
var paymentRequest = require("./payment-request");
var paymentReady = require("./payment-ready");
var paypal = require("./paypal");
var paypalCheckout = require("./paypal-checkout");
var googlePayment = require("./google-payment");
var sepa = require("./sepa");
var threeDSecure = require("./three-d-secure");
var unionpay = require("./unionpay");
var usBankAccount = require("./us-bank-account");
var vaultManager = require("./vault-manager");
var venmo = require("./venmo");
var visaCheckout = require("./visa-checkout");
var preferredPaymentMethods = require("./preferred-payment-methods");
var VERSION = process.env.npm_package_version;

module.exports = {
  /** @type {module:braintree-web/fastlane} */
  fastlane: fastlane,
  /** @type {module:braintree-web/american-express} */
  americanExpress: americanExpress,
  /** @type {module:braintree-web/apple-pay} */
  applePay: applePay,
  /** @type {module:braintree-web/client} */
  client: client,
  /** @type {module:braintree-web/data-collector} */
  dataCollector: dataCollector,
  /** @type {module:braintree-web/hosted-fields} */
  hostedFields: hostedFields,
  /** @type {module:braintree-web/instant-verification} */
  instantVerification: instantVerification,
  /** @type {module:braintree-web/local-payment} */
  localPayment: localPayment,
  /** @type {module:braintree-web/masterpass} */
  masterpass: masterpass,
  /** @type {module:braintree-web/google-payment} */
  googlePayment: googlePayment,
  /** @type {module:braintree-web/payment-request} */
  paymentRequest: paymentRequest,
  /** @type {module:braintree-web/payment-ready} */
  paymentReady: paymentReady,
  /** @type {module:braintree-web/paypal} */
  paypal: paypal,
  /** @type {module:braintree-web/paypal-checkout} */
  paypalCheckout: paypalCheckout,
  /** @type {module:braintree-web/three-d-secure} */
  threeDSecure: threeDSecure,
  /** @type {module:braintree-web/unionpay} */
  unionpay: unionpay,
  /** @type {module:braintree-web/us-bank-account} */
  usBankAccount: usBankAccount,
  /** @type {module:braintree-web/vault-manager} */
  vaultManager: vaultManager,
  /** @type {module:braintree-web/venmo} */
  venmo: venmo,
  /** @type {module:braintree-web/visa-checkout} */
  visaCheckout: visaCheckout,
  /** @type {module:braintree-web/sepa} */
  sepa: sepa,
  /** @type {module:braintree-web/preferred-payment-methods} */
  preferredPaymentMethods: preferredPaymentMethods,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
