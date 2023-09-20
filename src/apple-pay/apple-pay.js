"use strict";

var BraintreeError = require("../lib/braintree-error");
var analytics = require("../lib/analytics");
var errors = require("./errors");
var methods = require("../lib/methods");
var convertMethodsToError = require("../lib/convert-methods-to-error");
var wrapPromise = require("@braintree/wrap-promise");

/**
 * @typedef {object} ApplePay~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {object} details Additional details.
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard.
 * @property {string} details.cardHolderName The name of the card holder.
 * @property {string} details.dpanLastTwo Last two digits of card number.
 * @property {string} description A human-readable description.
 * @property {string} type The payment method type, always `ApplePayCard`.
 * @property {object} binData Information about the card based on the bin.
 * @property {string} binData.commercial Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.countryOfIssuance The country of issuance.
 * @property {string} binData.debit Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.durbinRegulated Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.healthcare Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.issuingBank The issuing bank.
 * @property {string} binData.payroll Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.prepaid Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.productId The product id.
 */

/**
 * An Apple Pay Payment Authorization Event object.
 * @typedef {object} ApplePayPaymentAuthorizedEvent
 * @external ApplePayPaymentAuthorizedEvent
 * @see {@link https://developer.apple.com/reference/applepayjs/applepaypaymentauthorizedevent ApplePayPaymentAuthorizedEvent}
 */

/**
 * An Apple Pay Payment Request object.
 * @typedef {object} ApplePayPaymentRequest
 * @external ApplePayPaymentRequest
 * @see {@link https://developer.apple.com/reference/applepayjs/1916082-applepay_js_data_types/paymentrequest PaymentRequest}
 */

/**
 * @class
 * @param {object} options Options
 * @description <strong>You cannot use this constructor directly. Use {@link module:braintree-web/apple-pay.create|braintree.applePay.create} instead.</strong>
 * @classdesc This class represents an Apple Pay component. Instances of this class have methods for validating the merchant server and tokenizing payments.
 */
function ApplePay(options) {
  this._instantiatedWithClient = Boolean(!options.useDeferredClient);
  this._client = options.client;
  this._createPromise = options.createPromise;

  if (this._client) {
    this._setMerchantIdentifier();
  }
}

ApplePay.prototype._waitForClient = function () {
  if (this._client) {
    return Promise.resolve();
  }

  return this._createPromise.then(
    function (client) {
      this._client = client;

      this._setMerchantIdentifier();
    }.bind(this)
  );
};

ApplePay.prototype._setMerchantIdentifier = function () {
  var applePayConfig =
    this._client.getConfiguration().gatewayConfiguration.applePayWeb;

  if (!applePayConfig) {
    return;
  }
  /**
   * @name ApplePay#merchantIdentifier
   * @description A special merchant ID which represents the merchant association with Braintree. Required when using `ApplePaySession.canMakePaymentsWithActiveCard`.
   * @example
   * var promise = ApplePaySession.canMakePaymentsWithActiveCard(applePayInstance.merchantIdentifier);
   * promise.then(function (canMakePaymentsWithActiveCard) {
   *   if (canMakePaymentsWithActiveCard) {
   *     // Set up Apple Pay buttons
   *   }
   * });
   */
  Object.defineProperty(this, "merchantIdentifier", {
    value: applePayConfig.merchantIdentifier,
    configurable: false,
    writable: false,
  });
};

/**
 * Merges a payment request with Braintree defaults to return an {external:ApplePayPaymentRequest}.
 *
 * The following properties are assigned to `paymentRequest` if not already defined. Their default values come from the Braintree gateway.
 * - `countryCode`
 * - `currencyCode`
 * - `merchantCapabilities`
 * - `supportedNetworks`
 * @public
 * @param {external:ApplePayPaymentRequest} paymentRequest The payment request details to apply on top of those from Braintree.
 * @returns {external:ApplePayPaymentRequest|Promise} The decorated `paymentRequest` object. If `useDeferredClient` is used along with an `authorization`, this method will return a promise that resolves with the `paymentRequest` object.
 * @example
 * var applePay = require('braintree-web/apple-pay');
 *
 * applePay.create({client: clientInstance}, function (applePayErr, applePayInstance) {
 *   if (applePayErr) {
 *     // Handle error here
 *     return;
 *   }
 *
 *   var paymentRequest = applePayInstance.createPaymentRequest({
 *     total: {
 *       label: 'My Company',
 *       amount: '19.99'
 *     }
 *   });
 *
 *   var session = new ApplePaySession(3, paymentRequest);
 *
 *   // ...
 * @example <caption>With deferred client</caption>
 * var applePay = require('braintree-web/apple-pay');
 *
 * applePay.create({
 *   authorization: 'client-token-or-tokenization-key',
 *   useDeferredClient: true
 * }, function (applePayErr, applePayInstance) {
 *   if (applePayErr) {
 *     // Handle error here
 *     return;
 *   }
 *
 *   applePayInstance.createPaymentRequest({
 *     total: {
 *       label: 'My Company',
 *       amount: '19.99'
 *     }
 *   }).then(function (paymentRequest) {
 *     var session = new ApplePaySession(3, paymentRequest);
 *
 *     // ...
 *   });
 */
ApplePay.prototype.createPaymentRequest = function (paymentRequest) {
  if (this._instantiatedWithClient) {
    return this._createPaymentRequestSynchronously(paymentRequest);
  }

  return this._waitForClient().then(
    function () {
      return this._createPaymentRequestSynchronously(paymentRequest);
    }.bind(this)
  );
};

ApplePay.prototype._createPaymentRequestSynchronously = function (
  paymentRequest
) {
  var applePay =
    this._client.getConfiguration().gatewayConfiguration.applePayWeb;
  var defaults = {
    countryCode: applePay.countryCode,
    currencyCode: applePay.currencyCode,
    merchantCapabilities: applePay.merchantCapabilities || ["supports3DS"],
    supportedNetworks: applePay.supportedNetworks.map(function (network) {
      return network === "mastercard" ? "masterCard" : network;
    }),
  };

  return Object.assign({}, defaults, paymentRequest);
};

/**
 * Validates your merchant website, as required by `ApplePaySession` before payment can be authorized.
 * @public
 * @param {object} options Options
 * @param {string} options.validationURL The validationURL from an `ApplePayValidateMerchantEvent`.
 * @param {string} options.displayName The canonical name for your store. Use a non-localized name. This parameter should be a UTF-8 string that is a maximum of 64 characters. The system may display this name to the user.
 * @param {callback} [callback] The second argument, <code>data</code>, is the Apple Pay merchant session object. If no callback is provided, `performValidation` returns a promise.
 * Pass the merchant session to your Apple Pay session's `completeMerchantValidation` method.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * var applePay = require('braintree-web/apple-pay');
 *
 * applePay.create({client: clientInstance}, function (applePayErr, applePayInstance) {
 *   if (applePayErr) {
 *     // Handle error here
 *     return;
 *   }
 *
 *   var paymentRequest = applePayInstance.createPaymentRequest({
 *     total: {
 *       label: 'My Company',
 *       amount: '19.99'
 *     }
 *   });
 *   var session = new ApplePaySession(3, paymentRequest);
 *
 *   session.onvalidatemerchant = function (event) {
 *     applePayInstance.performValidation({
 *       validationURL: event.validationURL,
 *       displayName: 'My Great Store'
 *     }, function (validationErr, validationData) {
 *       if (validationErr) {
 *         console.error(validationErr);
 *         session.abort();
 *         return;
 *       }
 *
 *       session.completeMerchantValidation(validationData);
 *     });
 *   };
 * });
 */
ApplePay.prototype.performValidation = function (options) {
  var self = this;

  if (!options || !options.validationURL) {
    return Promise.reject(
      new BraintreeError(errors.APPLE_PAY_VALIDATION_URL_REQUIRED)
    );
  }

  return this._waitForClient()
    .then(function () {
      var applePayWebSession = {
        validationUrl: options.validationURL,
        domainName: options.domainName || window.location.hostname,
        merchantIdentifier:
          options.merchantIdentifier || self.merchantIdentifier,
      };

      if (options.displayName != null) {
        applePayWebSession.displayName = options.displayName;
      }

      return self._client.request({
        method: "post",
        endpoint: "apple_pay_web/sessions",
        data: {
          _meta: { source: "apple-pay" },
          applePayWebSession: applePayWebSession,
        },
      });
    })
    .then(function (response) {
      analytics.sendEvent(self._client, "applepay.performValidation.succeeded");

      return Promise.resolve(response);
    })
    .catch(function (err) {
      analytics.sendEvent(self._client, "applepay.performValidation.failed");

      if (err.code === "CLIENT_REQUEST_ERROR") {
        return Promise.reject(
          new BraintreeError({
            type: errors.APPLE_PAY_MERCHANT_VALIDATION_FAILED.type,
            code: errors.APPLE_PAY_MERCHANT_VALIDATION_FAILED.code,
            message: errors.APPLE_PAY_MERCHANT_VALIDATION_FAILED.message,
            details: {
              originalError: err.details.originalError,
            },
          })
        );
      }

      return Promise.reject(
        new BraintreeError({
          type: errors.APPLE_PAY_MERCHANT_VALIDATION_NETWORK.type,
          code: errors.APPLE_PAY_MERCHANT_VALIDATION_NETWORK.code,
          message: errors.APPLE_PAY_MERCHANT_VALIDATION_NETWORK.message,
          details: {
            originalError: err,
          },
        })
      );
    });
};

/**
 * Tokenizes an Apple Pay payment. This will likely be called in your `ApplePaySession`'s `onpaymentauthorized` callback.
 * @public
 * @param {object} options Options
 * @param {object} options.token The `payment.token` property of an {@link external:ApplePayPaymentAuthorizedEvent}.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link ApplePay~tokenizePayload|tokenizePayload}. If no callback is provided, `tokenize` returns a promise that resolves with a {@link ApplePay~tokenizePayload|tokenizePayload}.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * var applePay = require('braintree-web/apple-pay');
 *
 * applePay.create({client: clientInstance}, function (applePayErr, applePayInstance) {
 *   if (applePayErr) {
 *     // Handle error here
 *     return;
 *   }
 *
 *   var paymentRequest = applePayInstance.createPaymentRequest({
 *     total: {
 *       label: 'My Company',
 *       amount: '19.99'
 *     }
 *   });
 *   var session = new ApplePaySession(3, paymentRequest);
 *
 *   session.onpaymentauthorized = function (event) {
 *     applePayInstance.tokenize({
 *       token: event.payment.token
 *     }, function (tokenizeErr, tokenizedPayload) {
 *       if (tokenizeErr) {
 *         session.completePayment(ApplePaySession.STATUS_FAILURE);
 *         return;
 *       }
 *       // Send the tokenizedPayload to your server here!
 *
 *       // Once the transaction is complete, call completePayment
 *       // to close the Apple Pay sheet
 *       session.completePayment(ApplePaySession.STATUS_SUCCESS);
 *     });
 *   };
 *
 *   // ...
 * });
 */
ApplePay.prototype.tokenize = function (options) {
  var self = this;

  if (!options.token) {
    return Promise.reject(
      new BraintreeError(errors.APPLE_PAY_PAYMENT_TOKEN_REQUIRED)
    );
  }

  return this._waitForClient()
    .then(function () {
      return self._client.request({
        method: "post",
        endpoint: "payment_methods/apple_payment_tokens",
        data: {
          _meta: {
            source: "apple-pay",
          },
          applePaymentToken: Object.assign({}, options.token, {
            // The gateway requires this key to be base64-encoded.
            paymentData: btoa(JSON.stringify(options.token.paymentData)),
          }),
        },
      });
    })
    .then(function (response) {
      analytics.sendEvent(self._client, "applepay.tokenize.succeeded");

      return Promise.resolve(response.applePayCards[0]);
    })
    .catch(function (err) {
      analytics.sendEvent(self._client, "applepay.tokenize.failed");

      return Promise.reject(
        new BraintreeError({
          type: errors.APPLE_PAY_TOKENIZATION.type,
          code: errors.APPLE_PAY_TOKENIZATION.code,
          message: errors.APPLE_PAY_TOKENIZATION.message,
          details: {
            originalError: err,
          },
        })
      );
    });
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/apple-pay.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * applePayInstance.teardown();
 * @example <caption>With callback</caption>
 * applePayInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
ApplePay.prototype.teardown = function () {
  convertMethodsToError(this, methods(ApplePay.prototype));

  return Promise.resolve();
};

module.exports = wrapPromise.wrapPrototype(ApplePay);
