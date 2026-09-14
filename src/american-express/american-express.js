// @ts-nocheck
import BraintreeError from "../lib/braintree-error";
import * as errors from "./errors";
import { assign } from "../lib/assign";
import methods from "../lib/methods";
import convertMethodsToError from "../lib/convert-methods-to-error";

/**
 * @class
 * @param {object} options Options
 * @description <strong>You cannot use this constructor directly. Use {@link module:braintree-web/american-express.create|braintree.american-express.create} instead.</strong>
 * @classdesc This class allows you use a nonce to interact with American Express Checkout. To accept American Express cards, use Hosted Fields.
 */
function AmericanExpress(options) {
  this._client = options.client;
}

/**
 * Gets the rewards balance associated with a Braintree nonce.
 * @public
 * @param {object} options Request options
 * @param {string} options.nonce An existing Braintree nonce.
 * @returns {Promise} Returns a promise that resolves with the server data.
 * @example
 * var americanExpress = require('braintree-web/american-express');
 *
 * americanExpress.create({client: clientInstance}).then(function (americanExpressInstance) {
 *   var options = {nonce: existingBraintreeNonce};
 *
 *   return americanExpressInstance.getRewardsBalance(options);
 * }).then(function (payload) {
 *   console.log('Rewards amount: ' + payload.rewardsAmount);
 * }).catch(function (err) {
 *   // Handle error
 * });
 */
AmericanExpress.prototype.getRewardsBalance = async function (options) {
  var nonce = options.nonce;
  var data;

  if (!nonce) {
    throw new BraintreeError({
      type: errors.AMEX_NONCE_REQUIRED.type,
      code: errors.AMEX_NONCE_REQUIRED.code,
      message: "getRewardsBalance must be called with a nonce.",
    });
  }

  data = assign(
    {
      _meta: { source: "american-express" },
      paymentMethodNonce: nonce,
    },
    options
  );

  delete data.nonce;

  try {
    const client = await this._client.request({
      method: "get",
      endpoint: "payment_methods/amex_rewards_balance",
      data: data,
    });

    return client;
  } catch (err) {
    throw new BraintreeError({
      type: errors.AMEX_NETWORK_ERROR.type,
      code: errors.AMEX_NETWORK_ERROR.code,
      message:
        "A network error occurred when getting the American Express rewards balance.",
      details: {
        originalError: err,
      },
    });
  }
};

/**
 * Gets the Express Checkout nonce profile given a nonce from American Express.
 * @public
 * @param {object} options Request options
 * @param {string} options.nonce An existing nonce from American Express (note that this is <em>not</em> a nonce from Braintree).
 * @returns {Promise} Returns a promise that resolves with the server data.
 * @example
 * var americanExpress = require('braintree-web/american-express');
 *
 * americanExpress.create({client: clientInstance}).then(function (americanExpressInstance) {
 *   var options = {nonce: existingAmericanExpressNonce};
 *
 *   return americanExpressInstance.getExpressCheckoutProfile(options);
 * }).then(function (payload) {
 *   console.log('Number of cards: ' + payload.amexExpressCheckoutCards.length);
 * }).catch(function (err) {
 *   // Handle error
 * });
 */
AmericanExpress.prototype.getExpressCheckoutProfile = async function (options) {
  if (!options.nonce) {
    throw new BraintreeError({
      type: errors.AMEX_NONCE_REQUIRED.type,
      code: errors.AMEX_NONCE_REQUIRED.code,
      message: "getExpressCheckoutProfile must be called with a nonce.",
    });
  }

  try {
    return await this._client.request({
      method: "get",
      endpoint: "payment_methods/amex_express_checkout_cards/" + options.nonce,
      data: {
        _meta: { source: "american-express" },
        paymentMethodNonce: options.nonce,
      },
    });
  } catch (err) {
    throw new BraintreeError({
      type: errors.AMEX_NETWORK_ERROR.type,
      code: errors.AMEX_NETWORK_ERROR.code,
      message:
        "A network error occurred when getting the American Express Checkout nonce profile.",
      details: {
        originalError: err,
      },
    });
  }
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/american-express.create|create}.
 * @public
 * @example
 * americanExpressInstance.teardown().then(function () {
 *   // teardown is complete
 * });
 * @returns {Promise} Returns a promise that resolves once teardown is complete.
 */
AmericanExpress.prototype.teardown = function () {
  convertMethodsToError(this, methods(AmericanExpress.prototype));

  return Promise.resolve();
};

export default AmericanExpress;
