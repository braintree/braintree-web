'use strict';

var BraintreeError = require('../lib/error');
var analytics = require('../lib/analytics');
var deferred = require('../lib/deferred');
var sharedErrors = require('../errors');
var errors = require('./errors');

/**
 * An Apple Pay Payment Authorization Event object.
 * @external ApplePayPaymentAuthorizedEvent
 * @see {@link https://developer.apple.com/reference/applepayjs/applepaypaymentauthorizedevent ApplePayPaymentAuthorizedEvent}
 */

/**
 * An Apple Pay Payment Request object.
 * @external ApplePayPaymentRequest
 * @see {@link https://developer.apple.com/reference/applepayjs/1916082-applepay_js_data_types/paymentrequest PaymentRequest}
 */

/**
 * @class
 * @param {object} options Options
 * @description <strong>You cannot use this constructor directly. Use {@link module:braintree-web/apple-pay.create|braintree.apple-pay.create} instead.</strong>
 * @classdesc This class represents an Apple Pay component. Instances of this class have methods for validating the merchant server and tokenizing payments.
 */
function ApplePay(options) {
  this._client = options.client;
}

/**
 * Merges a payment request with Braintree defaults
 * The following properties are assigned to `paymentRequest` if not already defined
 * - countryCode
 * - currencyCode
 * - merchantCapabilities
 * - supportedNetworks
 * @public
 * @param {external:ApplePayPaymentRequest} paymentRequest The payment request details to apply on top of those from Braintree.
 * @returns {external:ApplePayPaymentRequest} The decorated `paymentRequest`.
 * @example
 * var applePay = require('braintree-web/apple-pay');
 *
 * applePay.create({client: clientInstance}, function (createErr, applePayInstance) {
 *   // ...
 *   var paymentRequest = applePay.decoratePaymentRequest({
 *    total: {
 *      label: 'My Company',
 *      amount: '19.99'
 *   });
 *
 *   console.log(paymentRequest);
 *   // { total: { }, countryCode: 'US', currencyCode: 'USD', merchantCapabilities: [ ], supportedNetworks: [ ] }
 *
 */
ApplePay.prototype.decoratePaymentRequest = function (paymentRequest) {
  var applePay = this._client.getConfiguration().gatewayConfiguration.applePay;

  if (!paymentRequest.countryCode) {
    paymentRequest.countryCode = applePay.countryCode;
  }

  if (!paymentRequest.currencyCode) {
    paymentRequest.currencyCode = applePay.currencyCode;
  }

  if (!paymentRequest.merchantCapabilities) {
    paymentRequest.merchantCapabilities = applePay.merchantCapabilities;
  }

  if (!paymentRequest.supportedNetworks) {
    paymentRequest.supportedNetworks = applePay.supportedNetworks.map(function (network) {
      return network === 'mastercard' ? 'masterCard' : network;
    });
  }

  return paymentRequest;
};

/**
 * Validates the merchant website, as required by ApplePaySession before payment can be authorized.
 * @public
 * @param {object} options Options
 * @param {string} options.validationURL The validationURL fram an ApplePayValidateMerchantEvent.
 * @param {string} [options.displayName]
 * - The canonical name for your store.
 * - The system may display this name to the user.
 * - Use a 128-character or less, UTF-8 string.
 * - Do not localize the name.
 * @param {string} [options.merchantIdentifier]
 * Your Apple merchant identifier. This is the Apple Merchant ID created on the Apple Developer Portal.
 * Defaults to the merchant identifier specified in the Braintree Control Panel.
 * You can use this field to override the merchant identifier for this transaction.
 * @param {callback} callback The second argument, <code>data</code>, is the Apple Pay merchant session object.
 * Pass the merchant session to your Apple Pay session's completeMerchantValidation method.
 * @returns {void}
 * @example
 * var applePay = require('braintree-web/apple-pay');
 *
 * applePay.create({client: clientInstance}, function (createErr, applePayInstance) {
 *   var session = new ApplePaySession(1, {
 *     // This should be the payment request object that
 *     // contains the information needed to display the payment sheet.
 *   });
 *
 *   session.onvalidatemerchant = function (event) {
 *     applePay.performValidation({
 *       validationURL: event.validationURL
 *     }, function(err, validationData) {
 *       if (err) {
 *         console.error(err);
 *         return;
 *       }
 *       session.completeMerchantValidation(validationData);
 *     });
 *   };
 * });
 */
ApplePay.prototype.performValidation = function (options, callback) {
  var applePayWebSession;

  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: sharedErrors.CALLBACK_REQUIRED.type,
      code: sharedErrors.CALLBACK_REQUIRED.code,
      message: 'performValidation requires a callback.'
    });
  }

  callback = deferred(callback);

  if (!options || !options.validationURL) {
    callback(new BraintreeError(errors.APPLE_PAY_VALIDATION_URL_REQUIRED));
    return;
  }

  applePayWebSession = {
    validationUrl: options.validationURL,
    domainName: options.domainName || global.location.hostname,
    merchantIdentifier: options.merchantIdentifier || this._client.getConfiguration().gatewayConfiguration.applePay.merchantIdentifier
  };

  if (options.displayName != null) {
    applePayWebSession.displayName = options.displayName;
  }

  this._client.request({
    method: 'post',
    endpoint: 'apple_pay_web/sessions',
    data: {
      _meta: {source: 'apple-pay'},
      applePayWebSession: applePayWebSession
    }
  }, function (err, response) {
    if (err) {
      callback(new BraintreeError({
        type: errors.APPLE_PAY_MERCHANT_VALIDATION.type,
        code: errors.APPLE_PAY_MERCHANT_VALIDATION.code,
        message: errors.APPLE_PAY_MERCHANT_VALIDATION.message,
        details: {
          originalError: err
        }
      }));
      analytics.sendEvent(this._client, 'applepay.performValidation.failed');
    } else {
      callback(null, response);
      analytics.sendEvent(this._client, 'applepay.performValidation.succeeded');
    }
  }.bind(this));
};

/**
 * Tokenizes an Apple Pay payment.
 * @public
 * @param {object} options Options
 * @param {object} options.token The `payment.token` property of an {@link external:ApplePayPaymentAuthorizedEvent}
 * @param {callback} callback The second argument, <code>data</code>, is the tokenized payload.
 * @returns {void}
 * @example
 * var applePay = require('braintree-web/apple-pay');
 *
 * applePay.create({client: clientInstance}, function (createErr, applePayInstance) {
 *   var session = new ApplePaySession(1, { });
 *
 *   session.onpaymentauthorized = function (event) {
 *     applePay.tokenize({
 *       token: event.payment.token
 *     }, function (err, tokenizedPayload) {
 *       if (err) {
 *         session.completePayment(ApplePaySession.STATUS_FAILURE);
 *         return;
 *       }
 *       session.completePayment(ApplePaySession.STATUS_SUCCESS);
 *
 *       // Send the tokenizedPayload to your server.
 *     });
 *  };
 * });
 */
ApplePay.prototype.tokenize = function (options, callback) {
  if (typeof callback !== 'function') {
    throw new BraintreeError({
      type: sharedErrors.CALLBACK_REQUIRED.type,
      code: sharedErrors.CALLBACK_REQUIRED.code,
      message: 'tokenize requires a callback.'
    });
  }

  callback = deferred(callback);

  if (!options.token) {
    callback(new BraintreeError(errors.APPLE_PAY_PAYMENT_TOKEN_REQUIRED));
    return;
  }

  this._client.request({
    method: 'post',
    endpoint: 'payment_methods/apple_payment_tokens',
    data: {
      _meta: {
        source: 'apple-pay'
      },
      applePaymentToken: options.token
    }
  }, function (err, response) {
    if (err) {
      callback(new BraintreeError({
        type: errors.APPLE_PAY_TOKENIZATION.type,
        code: errors.APPLE_PAY_TOKENIZATION.code,
        message: errors.APPLE_PAY_TOKENIZATION.message,
        details: {
          originalError: err
        }
      }));
      analytics.sendEvent(this._client, 'applepay.tokenize.failed');
    } else {
      callback(null, response.applePayCards[0]);
      analytics.sendEvent(this._client, 'applepay.tokenize.succeeded');
    }
  }.bind(this));
};

module.exports = ApplePay;
