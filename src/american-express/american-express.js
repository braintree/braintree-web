'use strict';

var BraintreeError = require('../lib/error');
var deferred = require('../lib/deferred');
var errors = require('./errors');
var sharedErrors = require('../errors');

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
 * @param {callback} callback The second argument, <code>data</code>, is the returned server data.
 * @returns {void}
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
AmericanExpress.prototype.getRewardsBalance = function (options, callback) {
  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: sharedErrors.CALLBACK_REQUIRED.type,
      code: sharedErrors.CALLBACK_REQUIRED.code,
      message: 'getRewardsBalance must include a callback function.'
    });
  }

  callback = deferred(callback);

  if (!options.nonce) {
    callback(new BraintreeError({
      type: errors.AMEX_NONCE_REQUIRED.type,
      code: errors.AMEX_NONCE_REQUIRED.code,
      message: 'getRewardsBalance must be called with a nonce.'
    }));
    return;
  }

  this._client.request({
    method: 'get',
    endpoint: 'payment_methods/amex_rewards_balance',
    data: {
      _meta: {source: 'american-express'},
      paymentMethodNonce: options.nonce
    }
  }, function (err, response) {
    if (err) {
      callback(new BraintreeError({
        type: errors.AMEX_NETWORK_ERROR.type,
        code: errors.AMEX_NETWORK_ERROR.code,
        message: 'A network error occurred when getting the American Express rewards balance.',
        details: {
          originalError: err
        }
      }));
    } else {
      callback(null, response);
    }
  });
};

/**
 * Gets the Express Checkout nonce profile given a nonce from American Express.
 * @public
 * @param {object} options Request options
 * @param {string} options.nonce An existing nonce from American Express (note that this is <em>not</em> a nonce from Braintree).
 * @param {callback} callback The second argument, <code>data</code>, is the returned server data.
 * @returns {void}
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
AmericanExpress.prototype.getExpressCheckoutProfile = function (options, callback) {
  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: sharedErrors.CALLBACK_REQUIRED.type,
      code: sharedErrors.CALLBACK_REQUIRED.code,
      message: 'getExpressCheckoutProfile must include a callback function.'
    });
  }

  callback = deferred(callback);

  if (!options.nonce) {
    callback(new BraintreeError({
      type: errors.AMEX_NONCE_REQUIRED.type,
      code: errors.AMEX_NONCE_REQUIRED.code,
      message: 'getExpressCheckoutProfile must be called with a nonce.'
    }));
    return;
  }

  this._client.request({
    method: 'get',
    endpoint: 'payment_methods/amex_express_checkout_cards/' + options.nonce,
    data: {
      _meta: {source: 'american-express'},
      paymentMethodNonce: options.nonce
    }
  }, function (err, response) {
    if (err) {
      callback(new BraintreeError({
        type: errors.AMEX_NETWORK_ERROR.type,
        code: errors.AMEX_NETWORK_ERROR.code,
        message: 'A network error occurred when getting the American Express Checkout nonce profile.',
        details: {
          originalError: err
        }
      }));
    } else {
      callback(null, response);
    }
  });
};

module.exports = AmericanExpress;
