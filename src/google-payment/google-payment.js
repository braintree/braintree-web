'use strict';

var BraintreeError = require('../lib/braintree-error');
var PaymentRequestComponent = require('../payment-request/external/payment-request');
var Promise = require('../lib/promise');
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @name GooglePayment#on
 * @function
 * @param {string} event The name of the event to which you are subscribing.
 * @param {function} handler A callback to handle the event.
 * @description Subscribes a handler function to a named event. `event` should be {@link PaymentRequestComponent#event:shippingAddressChange|shippingAddressChange} or {@link PaymentRequestComponent#event:shippingOptionChange|shippingOptionChange}. For convenience, you can also listen on `shippingaddresschange` or `shippingoptionchange` to match the event listeners in the [Payment Request API documentation](https://developers.google.com/web/fundamentals/payments/deep-dive-into-payment-request#shipping_in_payment_request_api). Events will emit a {@link PaymentRequestComponent~shippingEventObject|shippingEventObject}.
 * @example
 * <caption>Listening to a Google Payment event, in this case 'shippingAddressChange'</caption>
 * braintree.googlePayment.create({ ... }, function (createErr, googlePaymentInstance) {
 *   googlePaymentInstance.on('shippingAddressChange', function (event) {
 *     console.log(event.target.shippingAddress);
 *   });
 * });
 * @returns {void}
 */

/**
 * @name GooglePayment#teardown
 * @function
 * @param {callback} [callback] Called on completion.
 * @description Cleanly remove anything set up by {@link module:braintree-web/google-payment.create|create}.
 * @example
 * googlePaymentInstance.teardown();
 * @example <caption>With callback</caption>
 * googlePaymentInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */

/**
 * @class GooglePayment
 * @param {object} options Google Payment {@link module:braintree-web/google-payment.create create} options.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/google-payment.create|braintree-web.google-payment.create} instead.</strong>
 * @classdesc This class represents a Google Payment component produced by {@link module:braintree-web/google-payment.create|braintree-web/google-payment.create}. Instances of this class have methods for initializing the Google Pay flow.
 *
 * **Note:** This component is currently in beta and the API may include breaking changes when upgrading. Please review the [Changelog](https://github.com/braintree/braintree-web/blob/master/CHANGELOG.md) for upgrade steps whenever you upgrade the version of braintree-web.
 */
function GooglePayment(options) {
  PaymentRequestComponent.call(this, {
    client: options.client,
    enabledPaymentMethods: {
      basicCard: false,
      googlePay: true
    }
  });

  this._analyticsName = 'google-payment';
}

GooglePayment.prototype = Object.create(PaymentRequestComponent.prototype, {
  constructor: GooglePayment
});

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
  return PaymentRequestComponent.prototype.createSupportedPaymentMethodsConfiguration.call(this, 'googlePay', overrides);
};

/**
 * Initializes a Google Pay flow and provides a nonce payload.
 * @public
 * @param {object} configuration The payment details.
 * @param {object} configuration.details The payment details. For details on this object, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_payment_details).
 * @param {object} [configuration.options] Additional Google Pay options. For details on this object, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_options_optional).
 *
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link PaymentRequestComponent.html#~tokenizePayload|tokenizePayload}. If no callback is provided, `tokenize` returns a function that resolves with a {@link PaymentRequestComponent.html#~tokenizePayload|tokenizePayload}.
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
 *     // Google Pay payment request was canceled by user
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
 * @example <caption>Request Shipping Information</caption>
 * var shippingOptions = [
 *   {
 *     id: 'economy',
 *     label: 'Economy Shipping (5-7 Days)',
 *     amount: {
 *       currency: 'USD',
 *       value: '0',
 *     },
 *   }, {
 *     id: 'express',
 *     label: 'Express Shipping (2-3 Days)',
 *     amount: {
 *       currency: 'USD',
 *       value: '5',
 *     },
 *   }, {
 *     id: 'next-day',
 *     label: 'Next Day Delivery',
 *     amount: {
 *       currency: 'USD',
 *       value: '12',
 *     },
 *   },
 * ];
 * var paymentDetails = {
 * 	 total: {
 *     label: 'Total',
 *     amount: {
 *       currency: 'USD',
 *       value: '10.00',
 *     }
 *   },
 *   shippingOptions: shippingOptions
 * };
 *
 * googlePaymentInstance.on('shippingAddressChange', function (event) {
 *   // validate shipping address on event.target.shippingAddress
 *   // make changes to the paymentDetails or shippingOptions if necessary
 *
 *   event.updateWith(paymentDetails)
 * });
 *
 * googlePaymentInstance.on('shippingOptionChange', function (event) {
 *   shippingOptions.forEach(function (option) {
 *     option.selected = option.id === event.target.shippingOption;
 *   });
 *
 *   event.updateWith(paymentDetails)
 * });
 *
 * googlePaymentInstance.tokenize({
 *   details: paymentDetails,
 *   options: {
 *     requestShipping: true
 *   }
 * }).then(function (payload) {
 *   // send payload.nonce to your server
 *   // collect shipping information from payload
 *   console.log(payload.details.rawPaymentResponse.shippingAddress);
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
        code: 'GOOGLE_PAYMENT_CAN_ONLY_TOKENIZE_WITH_GOOGLE_PAYMENT',
        message: 'Only Google Pay is supported in supportedPaymentMethods.'
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
