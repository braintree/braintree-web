"use strict";

var BraintreeError = require("../lib/braintree-error");
var errors = require("./errors");
var assign = require("../lib/assign").assign;
var Promise = require("../lib/promise");
var methods = require("../lib/methods");
var convertMethodsToError = require("../lib/convert-methods-to-error");
var wrapPromise = require("@braintree/wrap-promise");

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
 * @param {callback} [callback] The second argument, <code>data</code>, is the returned server data. If no callback is provided, `getRewardsBalance` returns a promise that resolves with the server data.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * var americanExpress = require('braintree-web/american-express');
 *
 * americanExpress.create({client: clientInstance}, function (createErr, americanExpressInstance) {
 *   var options = {nonce: existingBraintreeNonce};
 *   americanExpressInstance.getRewardsBalance(options, function (getErr, payload) {
 *     if (getErr || payload.error) {
 *       // Handle error
 *       return;
 *     }
 *
 *     console.log('Rewards amount: ' + payload.rewardsAmount);
 *   });
 * });
 */
AmericanExpress.prototype.getRewardsBalance = function (options) {
  var nonce = options.nonce;
  var data;

  if (!nonce) {
    return Promise.reject(
      new BraintreeError({
        type: errors.AMEX_NONCE_REQUIRED.type,
        code: errors.AMEX_NONCE_REQUIRED.code,
        message: "getRewardsBalance must be called with a nonce.",
      })
    );
  }

  data = assign(
    {
      _meta: { source: "american-express" },
      paymentMethodNonce: nonce,
    },
    options
  );

  delete data.nonce;

  return this._client
    .request({
      method: "get",
      endpoint: "payment_methods/amex_rewards_balance",
      data: data,
    })
    .catch(function (err) {
      return Promise.reject(
        new BraintreeError({
          type: errors.AMEX_NETWORK_ERROR.type,
          code: errors.AMEX_NETWORK_ERROR.code,
          message:
            "A network error occurred when getting the American Express rewards balance.",
          details: {
            originalError: err,
          },
        })
      );
    });
};

/**
 * Gets the Express Checkout nonce profile given a nonce from American Express.
 * @public
 * @param {object} options Request options
 * @param {string} options.nonce An existing nonce from American Express (note that this is <em>not</em> a nonce from Braintree).
 * @param {callback} [callback] The second argument, <code>data</code>, is the returned server data. If no callback is provided, `getExpressCheckoutProfile` returns a promise that resolves with the server data.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * var americanExpress = require('braintree-web/american-express');
 *
 * americanExpress.create({client: clientInstance}, function (createErr, americanExpressInstance) {
 *   var options = {nonce: existingAmericanExpressNonce};
 *   americanExpressInstance.getExpressCheckoutProfile(options, function (getErr, payload) {
 *     if (getErr) {
 *       // Handle error
 *       return;
 *     }
 *
 *     console.log('Number of cards: ' + payload.amexExpressCheckoutCards.length);
 *   });
 * });
 */
AmericanExpress.prototype.getExpressCheckoutProfile = function (options) {
  if (!options.nonce) {
    return Promise.reject(
      new BraintreeError({
        type: errors.AMEX_NONCE_REQUIRED.type,
        code: errors.AMEX_NONCE_REQUIRED.code,
        message: "getExpressCheckoutProfile must be called with a nonce.",
      })
    );
  }

  return this._client
    .request({
      method: "get",
      endpoint: "payment_methods/amex_express_checkout_cards/" + options.nonce,
      data: {
        _meta: { source: "american-express" },
        paymentMethodNonce: options.nonce,
      },
    })
    .catch(function (err) {
      return Promise.reject(
        new BraintreeError({
          type: errors.AMEX_NETWORK_ERROR.type,
          code: errors.AMEX_NETWORK_ERROR.code,
          message:
            "A network error occurred when getting the American Express Checkout nonce profile.",
          details: {
            originalError: err,
          },
        })
      );
    });
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/american-express.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * americanExpressInstance.teardown();
 * @example <caption>With callback</caption>
 * americanExpressInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
AmericanExpress.prototype.teardown = function () {
  convertMethodsToError(this, methods(AmericanExpress.prototype));

  return Promise.resolve();
};

module.exports = wrapPromise.wrapPrototype(AmericanExpress);
