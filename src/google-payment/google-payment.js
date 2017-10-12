'use strict';

var BraintreeError = require('../lib/braintree-error');
var PaymentRequestComponent = require('../payment-request/external/payment-request');
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @class GooglePayment
 * @param {object} options Google Payment {@link module:braintree-web/google-payment.create create} options.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/google-payment.create|braintree-web.google-payment.create} instead.</strong>
 * @classdesc This class represents a Google Payment component produced by {@link module:braintree-web/google-payment.create|braintree-web/google-payment.create}. Instances of this class have methods for initializing the Pay with Google flow.
 *
 * **Note:** This component is currently in beta and the API may include breaking changes when upgrading. Please review the [Changelog](https://github.com/braintree/braintree-web/blob/master/CHANGELOG.md) for upgrade steps whenever you upgrade the version of braintree-web.
 */
function GooglePayment(options) {
  PaymentRequestComponent.call(this, {
    client: options.client,
    enabledPaymentMethods: {
      basicCard: false,
      payWithGoogle: true
    }
  });

  this._analyticsName = 'google-payment';
}

GooglePayment.prototype = Object.create(PaymentRequestComponent.prototype);
GooglePayment.prototype.constructor = GooglePayment;

/**
 * Create an object to pass into the `tokenize` method to specify a custom configuration. If no overrides are provided, the default configuration will be used in `tokenize`.
 * @public
 * @param {object} [overrides] The configuration overrides for the [data property on the supported payment methods objects](https://developers.google.com/web/fundamentals/payments/deep-dive-into-payment-request). This object will be merged with the default configuration object based on the settings in the Braintree Gateway. If no object is passed in, the default configuration object will be returned.
 * @example <caption>Getting the default configuration for a specified type</caption>
 * var configuration = googlePaymentInstance.createSupportedPaymentMethodsConfiguration();
 *
 * configuration.supportedMethods; // ['https://google.com/pay']
 *
 * configuration.data.allowedCardNetworks; // ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA'] <- whatever the supported card networks for the merchant account are
 * @example <caption>Specifying overrides</caption>
 * var configuration = googlePaymentInstance.createSupportedPaymentMethodsConfiguration({
 *   merchantName: 'My Custom Merchant Account Name',
 *   allowedCardNetworks: ['VISA']
 * });
 *
 * configuration.data.merchantName; // 'My Custom Merchant Account Name'
 * configuration.data.allowedCardNetworks; // ['VISA']
 * @returns {object} Returns a configuration object for use in the tokenize function.
 */
GooglePayment.prototype.createSupportedPaymentMethodsConfiguration = function (overrides) {
  return PaymentRequestComponent.prototype.createSupportedPaymentMethodsConfiguration.call(this, 'payWithGoogle', overrides);
};

/**
 * Initializes a Pay with Google flow and provides a nonce payload.
 * @public
 * @param {object} configuration The payment details.
 * @param {object} configuration.details The payment details. For details on this object, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_payment_details).
 * @param {object} [configuration.options] Additional Pay with Google options. For details on this object, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_options_optional).
 *
 * **Note:** `requestShipping` is not supported by Braintree at this time.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link PaymentRequest~paymentPayload|paymentPayload}. If no callback is provided, `tokenize` returns a function that resolves with a {@link PaymentRequest~paymentPayload|paymentPayload}.
 * @example
 * googlePaymentInstance.tokenize({
 *   details: {
 *     total: {
 *       label: 'Price',
 *       amount: {
 *         currency: 'USD',
 *         value: '100.00'
 *       }
 *     }
 *   }
 * }).then(function (payload) {
 *   // send payload.nonce to server
 * }).catch(function (err) {
 *   if (err.code === 'PAYMENT_REQUEST_CANCELED') {
 *     // Pay with Google payment request was canceled by user
 *   } else {
 *     // an error occurred while processing
 *   }
 * });
 * @example <caption>Include additional payment request options</caption>
 * googlePaymentInstance.tokenize({
 *   details: {
 *     total: {
 *       label: 'Price',
 *       amount: {
 *         currency: 'USD',
 *         value: '100.00'
 *       }
 *     }
 *   },
 *   options: {
 *     requestPayerName: true,
 *     requestPayerPhone: true,
 *     requestPayerEmail: true
 *   }
 * }).then(function (payload) {
 *   // Send payload.nonce to your server
 *
 *   // Examine additional info in the raw payment response
 *   console.log(payload.details.rawPaymentResponse);
 * });
 * @example <caption>Include custom supported payment method object</caption>
 * googlePaymentInstance.tokenize({
 *   supportedPaymentMethods: googlePaymentInstance.createSupportedPaymentMethodsConfiguration({merchantName: 'Custom Name'}),
 *   details: {
 *     total: {
 *       label: 'Price',
 *       amount: {
 *         currency: 'USD',
 *         value: '100.00'
 *       }
 *     }
 *   },
 *   options: {
 *     requestPayerName: true,
 *     requestPayerPhone: true,
 *     requestPayerEmail: true
 *   }
 * }).then(function (payload) {
 *   // Send payload.nonce to your server
 *
 *   // Examine additional info in the raw payment response
 *   console.log(payload.details.rawPaymentResponse);
 * });
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
GooglePayment.prototype.tokenize = function (configuration) {
  var supportedPaymentMethods;

  if (configuration.supportedPaymentMethods) {
    if (configuration.supportedPaymentMethods.supportedMethods[0] === 'https://google.com/pay') {
      supportedPaymentMethods = [configuration.supportedPaymentMethods];
    } else {
      return Promise.reject(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        code: 'PAY_WITH_GOOGLE_CAN_ONLY_TOKENIZE_WITH_PAY_WITH_GOOGLE',
        message: 'Only Pay with Google is supported in supportedPaymentMethods.'
      }));
    }
  }

  return PaymentRequestComponent.prototype.tokenize.call(this, {
    supportedPaymentMethods: supportedPaymentMethods,
    details: configuration.details,
    options: configuration.options
  });
};

module.exports = wrapPromise.wrapPrototype(GooglePayment);
