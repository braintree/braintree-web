'use strict';

var analytics = require('../../lib/analytics');
var assign = require('../../lib/assign').assign;
var Bus = require('../../lib/bus');
var convertMethodsToError = require('../../lib/convert-methods-to-error');
var iFramer = require('@braintree/iframer');
var uuid = require('../../lib/uuid');
var useMin = require('../../lib/use-min');
var methods = require('../../lib/methods');
var Promise = require('../../lib/promise');
var BraintreeError = require('../../lib/braintree-error');
var VERSION = process.env.npm_package_version;
var events = require('../shared/constants').events;
var errors = require('../shared/constants').errors;
var wrapPromise = require('@braintree/wrap-promise');

var CARD_TYPE_MAPPINGS = {
  Visa: 'visa',
  Mastercard: 'mastercard',
  'American Express': 'amex',
  'Diners Club': 'diners',
  Discover: 'discover',
  JCB: 'jcb',
  UnionPay: 'unionpay',
  Maestro: 'maestro'
};

var BRAINTREE_PAY_WITH_GOOGLE_MERCHANT_ID = '18278000977346790994';

function composeUrl(assetsUrl, componentId, isDebug) {
  return assetsUrl + '/web/' + VERSION + '/html/payment-request-frame' + useMin(isDebug) + '.html#' + componentId;
}

/**
 * @class PaymentRequestComponent
 * @param {object} options The Payment Request Component {@link module:braintree-web/payment-request.create create} options.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/payment-request.create|braintree-web.payment-request.create} instead.</strong>
 * @classdesc This class represents a Payment Request component produced by {@link module:braintree-web/payment-request.create|braintree-web/payment-request.create}. Instances of this class have methods for initializing a Payment Request.
 */
function PaymentRequestComponent(options) {
  var enabledPaymentMethods = options.enabledPaymentMethods || {};

  this._componentId = uuid();
  this._client = options.client;
  this._analyticsName = 'payment-request';
  this._enabledPaymentMethods = {
    basicCard: enabledPaymentMethods.basicCard !== false,
    payWithGoogle: enabledPaymentMethods.payWithGoogle !== false
  };
  this._supportedPaymentMethods = this._constructDefaultSupportedPaymentMethods();
  this._defaultSupportedPaymentMethods = Object.keys(this._supportedPaymentMethods).map(function (key) {
    return this._supportedPaymentMethods[key];
  }.bind(this));
  this._bus = new Bus({channel: this._componentId});
}

PaymentRequestComponent.prototype._constructDefaultSupportedPaymentMethods = function () {
  var configuration = this._client.getConfiguration();
  var isProduction = configuration.gatewayConfiguration.environment === 'production';
  var metadata = configuration.analyticsMetadata;
  var androidPayConfiguration = configuration.gatewayConfiguration.androidPay;
  var cardConfiguration = configuration.gatewayConfiguration.creditCards;
  var supportedPaymentMethods = {};

  if (this._enabledPaymentMethods.basicCard && cardConfiguration && cardConfiguration.supportedCardTypes.length > 0) {
    supportedPaymentMethods.basicCard = {
      supportedMethods: ['basic-card'],
      data: {
        supportedNetworks: cardConfiguration.supportedCardTypes.map(function (cardType) {
          return CARD_TYPE_MAPPINGS[cardType];
        })
      }
    };
  }

  if (this._enabledPaymentMethods.payWithGoogle && androidPayConfiguration && androidPayConfiguration.enabled) {
    supportedPaymentMethods.payWithGoogle = {
      supportedMethods: ['https://google.com/pay'],
      data: {
        merchantId: BRAINTREE_PAY_WITH_GOOGLE_MERCHANT_ID,
        apiVersion: 1,
        environment: isProduction ? 'PRODUCTION' : 'TEST',
        allowedPaymentMethods: ['CARD', 'TOKENIZED_CARD'],
        paymentMethodTokenizationParameters: {
          tokenizationType: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'braintree',
            'braintree:merchantId': configuration.gatewayConfiguration.merchantId,
            'braintree:authorizationFingerprint': androidPayConfiguration.googleAuthorizationFingerprint,
            'braintree:apiVersion': 'v1',
            'braintree:sdkVersion': VERSION,
            'braintree:metadata': JSON.stringify({
              source: metadata.source,
              integration: metadata.integration,
              sessionId: metadata.sessionId,
              version: VERSION,
              platform: metadata.platform
            })
          }
        },
        cardRequirements: {
          allowedCardNetworks: androidPayConfiguration.supportedNetworks.map(function (card) { return card.toUpperCase(); })
        }
      }
    };
  }

  return supportedPaymentMethods;
};

PaymentRequestComponent.prototype.initialize = function () {
  var clientConfiguration = this._client.getConfiguration();

  this._frame = iFramer({
    allowPaymentRequest: true,
    name: 'braintree-payment-request-frame',
    'class': 'braintree-payment-request-frame',
    height: 0,
    width: 0,
    style: {
      position: 'absolute',
      left: '-9999px'
    }
  });

  if (this._defaultSupportedPaymentMethods.length === 0) {
    return Promise.reject(new BraintreeError(errors.PAYMENT_REQUEST_NO_VALID_SUPPORTED_PAYMENT_METHODS));
  }

  return new Promise(function (resolve) {
    this._bus.on(events.FRAME_READY, function (reply) {
      reply(this._client);
    }.bind(this));
    this._bus.on(events.FRAME_CAN_MAKE_REQUESTS, function () {
      analytics.sendEvent(this._client, this._analyticsName + '.initialized');
      resolve(this);
    }.bind(this));

    // TODO - We may need to apply the same setTimeout hack that Hosted Fields
    // uses for iframes to load correctly in Edge. See:
    // https://github.com/braintree/braintree-web/blob/0c951e5f9859c606652485de14188b6bd6656677/src/hosted-fields/external/hosted-fields.js#L449-L469
    this._frame.src = composeUrl(clientConfiguration.gatewayConfiguration.assetsUrl, this._componentId, clientConfiguration.isDebug);
    document.body.appendChild(this._frame);
  }.bind(this));
};

/**
 * Create an object to pass into tokenize to specify a custom configuration. If no overrides are provided, the default configuration will be provided.
 * @public
 * @param {string} type The supported payment method type. Possible values are `basicCard` and `payWithGoogle`.
 * If no type is provided, the function will throw an error. If the type provided is not an enabled payemnt method for the merchant account , the function will throw an error.
 * @param {object} [overrides] The configuration overrides for the [data property on the supported payment methods objects](https://developers.google.com/web/fundamentals/payments/deep-dive-into-payment-request). If not passed in, the default configuration for the specified type will be provided. If a property is not provided, the value from the default configruation will be used.
 * @example <caption>Getting the default configuration for a specified type</caption>
 * var configuration = paymentRequestInstance.createSupportedPaymentMethodsConfiguration('basicCard');
 *
 * configuration.supportedMethods; // ['basic-card']
 * configuration.data.supportedNetworks; // ['visa', 'mastercard', 'amex'] <- whatever the supported card networks for the merchant account are
 * @example <caption>Specifying overrides</caption>
 * var configuration = paymentRequestInstance.createSupportedPaymentMethodsConfiguration('basicCard', {
 *   supportedNetworks: ['visa'],
 *   supportedTypes: ['credit', 'debit']
 * });
 *
 * configuration.supportedMethods; // ['basic-card']
 * configuration.data.supportedNetworks; // ['visa']
 * configuration.data.supportedTypes; // ['credit', 'debit']
 * @returns {object} Returns a configuration object for use in the tokenize function.
 */
PaymentRequestComponent.prototype.createSupportedPaymentMethodsConfiguration = function (type, overrides) {
  var configuration;

  if (!type) {
    throw new BraintreeError(errors.PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_MUST_INCLUDE_TYPE);
  }

  if (!this._enabledPaymentMethods[type]) {
    throw new BraintreeError(errors.PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_TYPE_NOT_ENABLED);
  }

  configuration = assign({}, this._supportedPaymentMethods[type]);
  configuration.data = assign({}, configuration.data, overrides);

  return configuration;
};

/**
 * Tokenizes a Payment Request
 * @public
 * @param {object} configuration The payment details.
 * @param {object} configuration.details The payment details. For details on this object, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_payment_details).
 * @param {array} [configuration.supportedPaymentMethods] The supported payment methods. If not passed in, the supported payment methods from the merchant account that generated the authorization for the client will be used. For details on this array, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_supported_payment_methods).
 * @param {object} [configuration.options] Additional payment request options. For details on this object, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_options_optional). **Note:** `requestShipping` is not supported by Braintree at this time.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link PaymentRequest~paymentPayload|paymentPayload}. If no callback is provided, `tokenize` returns a function that resolves with a {@link PaymentRequest~paymentPayload|paymentPayload}.
 * @example
 * paymentRequestInstance.tokenize({
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
 *
 *   // examine the raw response (with card details removed for security) from the payment request
 *   console.log(payload.details.rawPaymentResponse);
 * }).catch(function (err) {
 *   if (err.code === 'PAYMENT_REQUEST_CANCELED') {
 *     // payment request was canceled by user
 *   } else {
 *     // an error occurred while processing
 *   }
 * });
 * @example <caption>Tokenize only Visa cards</caption>
 * var basicCardConfiguration = paymentRequestInstance.createSupportedPaymentMethodsConfiguration('basicCard', {
 *   supportedNetworks: ['visa']
 * };
 *
 * paymentRequestInstance.tokenize({
 *   supportedPaymentMethods: [basicCardConfiguration],
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
 *   // send payload.nonce to your server
 * });
 * @example <caption>Include payment request options</caption>
 * paymentRequestInstance.tokenize({
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
 *   // send payload.nonce to your server
 *   // collect shipping information from payload
 *   console.log(payload.details.rawPaymentResponse.shippingAddress);
 * });
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
PaymentRequestComponent.prototype.tokenize = function (configuration) {
  return new Promise(function (resolve, reject) {
    this._bus.emit(events.PAYMENT_REQUEST_INITIALIZED, {
      supportedPaymentMethods: configuration.supportedPaymentMethods || this._defaultSupportedPaymentMethods,
      details: configuration.details,
      options: configuration.options
    });

    this._bus.on(events.PAYMENT_REQUEST_SUCCESSFUL, function (payload) {
      analytics.sendEvent(this._client, this._analyticsName + '.tokenize.succeeded');
      resolve(payload);
    }.bind(this));

    this._bus.on(events.PAYMENT_REQUEST_FAILED, function (error) {
      var formattedError;

      if (error.name === 'AbortError') {
        formattedError = new BraintreeError({
          type: errors.PAYMENT_REQUEST_CANCELED.type,
          code: errors.PAYMENT_REQUEST_CANCELED.code,
          message: errors.PAYMENT_REQUEST_CANCELED.message,
          details: {
            originalError: error
          }
        });
        analytics.sendEvent(this._client, this._analyticsName + '.tokenize.canceled');
      } else if (error.name === 'PAYMENT_REQUEST_INITIALIZATION_FAILED') {
        formattedError = new BraintreeError({
          type: errors.PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED.type,
          code: errors.PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED.code,
          message: errors.PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED.message,
          details: {
            originalError: error
          }
        });
      } else if (error.name === 'BRAINTREE_GATEWAY_PAY_WITH_GOOGLE_TOKENIZATION_ERROR') {
        formattedError = new BraintreeError({
          type: errors.PAYMENT_REQUEST_PAY_WITH_GOOGLE_FAILED_TO_TOKENIZE.type,
          code: errors.PAYMENT_REQUEST_PAY_WITH_GOOGLE_FAILED_TO_TOKENIZE.code,
          message: errors.PAYMENT_REQUEST_PAY_WITH_GOOGLE_FAILED_TO_TOKENIZE.message,
          details: {
            originalError: error
          }
        });
      } else if (error.name === 'BRAINTREE_GATEWAY_PAY_WITH_GOOGLE_PARSING_ERROR') {
        formattedError = new BraintreeError({
          type: errors.PAYMENT_REQUEST_PAY_WITH_GOOGLE_PARSING_ERROR.type,
          code: errors.PAYMENT_REQUEST_PAY_WITH_GOOGLE_PARSING_ERROR.code,
          message: errors.PAYMENT_REQUEST_PAY_WITH_GOOGLE_PARSING_ERROR.message,
          details: {
            originalError: error
          }
        });
      } else {
        formattedError = new BraintreeError({
          code: errors.PAYMENT_REQUEST_NOT_COMPLETED.code,
          type: error.type || BraintreeError.types.CUSTOMER,
          message: errors.PAYMENT_REQUEST_NOT_COMPLETED.message,
          details: {
            originalError: error
          }
        });
        analytics.sendEvent(this._client, this._analyticsName + '.tokenize.failed');
      }
      reject(formattedError);
    }.bind(this));
  }.bind(this));
};

/**
 * Cleanly remove anything set up by {@link module:braintree-web/payment-request.create|create}.
 * @public
 * @param {callback} [callback] Called on completion.
 * @example
 * paymentRequestInstance.teardown();
 * @example <caption>With callback</caption>
 * paymentRequestInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {Promise|void} Returns a promise if no callback is provided.
 */
PaymentRequestComponent.prototype.teardown = function () {
  this._bus.teardown();
  this._frame.parentNode.removeChild(this._frame);

  convertMethodsToError(this, methods(PaymentRequestComponent.prototype));

  analytics.sendEvent(this._client, this._analyticsName + '.teardown-completed');

  return Promise.resolve();
};

module.exports = wrapPromise.wrapPrototype(PaymentRequestComponent);
