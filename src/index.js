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

import americanExpress from "./american-express";
import applePay from "./apple-pay";
import client from "./client";
import fastlane from "./fastlane";
import dataCollector from "./data-collector";
import hostedFields from "./hosted-fields";
import localPayment from "./local-payment";
import instantVerification from "./instant-verification";
import paymentReady from "./payment-ready";
import paypalCheckout from "./paypal-checkout";
import paypalCheckoutV6 from "./paypal-checkout-v6";
import googlePayment from "./google-payment";
import sepa from "./sepa";
import threeDSecure from "./three-d-secure";
import usBankAccount from "./us-bank-account";
import vaultManager from "./vault-manager";
import venmo from "./venmo";
const VERSION = __SDK_VERSION__;

export default {
  /** @type {module:braintree-web/fastlane} */
  fastlane,
  /** @type {module:braintree-web/american-express} */
  americanExpress,
  /** @type {module:braintree-web/apple-pay} */
  applePay,
  /** @type {module:braintree-web/client} */
  client,
  /** @type {module:braintree-web/data-collector} */
  dataCollector,
  /** @type {module:braintree-web/hosted-fields} */
  hostedFields,
  /** @type {module:braintree-web/instant-verification} */
  instantVerification,
  /** @type {module:braintree-web/local-payment} */
  localPayment,
  /** @type {module:braintree-web/google-payment} */
  googlePayment,
  /** @type {module:braintree-web/payment-ready} */
  paymentReady,
  /** @type {module:braintree-web/paypal-checkout} */
  paypalCheckout,
  /** @type {module:braintree-web/paypal-checkout-v6} */
  paypalCheckoutV6,
  /** @type {module:braintree-web/three-d-secure} */
  threeDSecure,
  /** @type {module:braintree-web/us-bank-account} */
  usBankAccount,
  /** @type {module:braintree-web/vault-manager} */
  vaultManager,
  /** @type {module:braintree-web/venmo} */
  venmo,
  /** @type {module:braintree-web/sepa} */
  sepa,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION,
};
