'use strict';

var analytics = require('../../lib/analytics');
var assign = require('../../lib/assign').assign;
var Bus = require('framebus');
var convertMethodsToError = require('../../lib/convert-methods-to-error');
var generateGooglePayConfiguration = require('../../lib/generate-google-pay-configuration');
var iFramer = require('@braintree/iframer');
var uuid = require('@braintree/uuid');
var useMin = require('../../lib/use-min');
var methods = require('../../lib/methods');
var Promise = require('../../lib/promise');
var EventEmitter = require('@braintree/event-emitter');
var BraintreeError = require('../../lib/braintree-error');
var VERSION = process.env.npm_package_version;
var constants = require('../shared/constants');
var events = constants.events;
var errors = constants.errors;
var wrapPromise = require('@braintree/wrap-promise');

/**
 * @typedef {object} PaymentRequestComponent~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {object} details Additional account details.
 * @property {string} details.bin The BIN number of the card..
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard.
 * @property {string} details.lastFour Last four digits of card number.
 * @property {string} details.lastTwo Last two digits of card number.
 * @property {object} details.rawPaymentResponse The raw payment response from the payment request, with sensitive card details removed.
 * @property {string} description A human-readable description.
 * @property {string} type The payment method type, `CreditCard` or `AndroidPayCard`.
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
 * @typedef {object} PaymentRequestComponent~paymentRequestConfiguration
 * @property {object} configuration.details The payment details. For details on this object, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_payment_details).
 * @property {array} [configuration.supportedPaymentMethods] The supported payment methods. If not passed in, the supported payment methods from the merchant account that generated the authorization for the client will be used. For details on this array, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_supported_payment_methods).
 * @property {object} [configuration.options] Additional payment request options. For details on this object, see [Google's PaymentRequest API documentation](https://developers.google.com/web/fundamentals/discovery-and-monetization/payment-request/deep-dive-into-payment-request#defining_options_optional).
 */

/**
 * @typedef {object} PaymentRequestComponent~shippingEventObject
 * @description The event payload sent from {@link PaymentRequestComponent#on|on}.
 * @property {object} target An object which contains data about the event.
 * @property {function} updateWith A method to call with the updated Payment Request details.
 */

/**
 * @name PaymentRequestComponent#on
 * @function
 * @param {string} event The name of the event to which you are subscribing.
 * @param {function} handler A callback to handle the event.
 * @description Subscribes a handler function to a named event. `event` should be {@link PaymentRequestComponent#event:shippingAddressChange|shippingAddressChange} or {@link PaymentRequestComponent#event:shippingOptionChange|shippingOptionChange}. For convenience, you can also listen on `shippingaddresschange` or `shippingoptionchange` to match the event listeners in the [Payment Request API documentation](https://developers.google.com/web/fundamentals/payments/deep-dive-into-payment-request#shipping_in_payment_request_api). Events will emit a {@link PaymentRequestComponent~shippingEventObject|shippingEventObject}.
 * @example
 * <caption>Listening to a Payment Request event, in this case 'shippingAddressChange'</caption>
 * braintree.paymentRequest.create({ ... }, function (createErr, paymentRequestInstance) {
 *   paymentRequestInstance.on('shippingAddressChange', function (event) {
 *     console.log(event.target.shippingAddress);
 *   });
 * });
 * @returns {void}
 */

/**
 * @name PaymentRequestComponent#off
 * @function
 * @param {string} event The name of the event to which you are unsubscribing.
 * @param {function} handler The callback for the event you are unsubscribing from.
 * @description Unsubscribes the handler function to a named event.
 * @example
 * <caption>Subscribing and then unsubscribing from a Payment Request event, in this case 'shippingAddressChange'</caption>
 * braintree.paymentRequest.create({ ... }, function (createErr, paymentRequestInstance) {
 *   var callback = function (event) {
 *     console.log(event.target.shippingAddress);
 *   };
 *   paymentRequestInstance.on('shippingAddressChange', callback);
 *
 *   // later on
 *   paymentRequestInstance.off('shippingAddressChange', callback);
 * });
 * @returns {void}
 */

/**
 * This event is emitted when the customer selects a shipping address.
 * @event PaymentRequestComponent#shippingAddressChange
 * @type {PaymentRequestComponent~shippingEventObject}
 * @example
 * <caption>Listening to a shipping address change event</caption>
 * braintree.paymentRequest.create({ ... }, function (createErr, paymentRequestInstance) {
 *   paymentRequestInstance.on('shippingAddressChange', function (event) {
 *     // validate event.target.shippingAddress if needed
 *
 *     event.updateWith(paymentRequestDetails);
 *   });
 * });
 */

/**
 * This event is emitted when the customer selects a shipping option.
 * @event PaymentRequestComponent#shippingOptionChange
 * @type {PaymentRequestComponent~shippingEventObject}
 * @example
 * <caption>Listening to a shipping option change event</caption>
 * braintree.paymentRequest.create({ ... }, function (createErr, paymentRequestInstance) {
 *   paymentRequestInstance.on('shippingOptionChange', function (event) {
 *     // validate event.target.shippingOption if needed
 *
 *     paymentRequestDetails.shippingOptions.forEach(function (option) {
 *       option.selected = option.id === event.target.shippingOption;
 *     });
 *
 *     event.updateWith(paymentRequestDetails);
 *   });
 * });
 */

var CARD_TYPE_MAPPINGS = {
  Visa: 'visa',
  MasterCard: 'mastercard',
  'American Express': 'amex',
  'Diners Club': 'diners',
  Discover: 'discover',
  JCB: 'jcb',
  UnionPay: 'unionpay',
  Maestro: 'maestro'
};

var BRAINTREE_GOOGLE_PAY_MERCHANT_ID = '18278000977346790994';

function composeUrl(assetsUrl, componentId, isDebug) {
  var baseUrl = assetsUrl;

  // removeIf(production)
  if (process.env.BRAINTREE_JS_ENV === 'development') {
    // Pay with Google cannot tokenize in our dev environment
    // so in development, we have to use a sandbox merchant
    // but set the iFrame url to the development url
    baseUrl = 'https://' + process.env.BT_DEV_HOST + ':9000';
  }
  // endRemoveIf(production)

  return baseUrl + '/web/' + VERSION + '/html/payment-request-frame' + useMin(isDebug) + '.html#' + componentId;
}

/**
 * @class PaymentRequestComponent
 * @param {object} options The Payment Request Component {@link module:braintree-web/payment-request.create create} options.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/payment-request.create|braintree-web.payment-request.create} instead.</strong>
 *
 * @classdesc This class represents a Payment Request component produced by {@link module:braintree-web/payment-request.create|braintree-web/payment-request.create}. Instances of this class have methods for initializing a Payment Request.
 *
 * **Note:** This component is currently in beta and the API may include breaking changes when upgrading. Please review the [Changelog](https://github.com/braintree/braintree-web/blob/main/CHANGELOG.md) for upgrade steps whenever you upgrade the version of braintree-web.
 */
function PaymentRequestComponent(options) {
  var enabledPaymentMethods = options.enabledPaymentMethods || {};

  EventEmitter.call(this);

  this._componentId = uuid();
  this._client = options.client;
  this._enabledPaymentMethods = {
    basicCard: enabledPaymentMethods.basicCard !== false,
    googlePay: enabledPaymentMethods.googlePay !== false
  };
  this._googlePayVersion = options.googlePayVersion === 2 ? 2 : 1;
  this._googleMerchantId = BRAINTREE_GOOGLE_PAY_MERCHANT_ID;
  this._supportedPaymentMethods = this._constructDefaultSupportedPaymentMethods();
  this._defaultSupportedPaymentMethods = Object.keys(this._supportedPaymentMethods).map(function (key) {
    return this._supportedPaymentMethods[key];
  }.bind(this));
  this._bus = new Bus({channel: this._componentId});
}

EventEmitter.createChild(PaymentRequestComponent);

PaymentRequestComponent.prototype._constructDefaultSupportedPaymentMethods = function () {
  var configuration = this._client.getConfiguration();
  var androidPayConfiguration = configuration.gatewayConfiguration.androidPay;
  var cardConfiguration = configuration.gatewayConfiguration.creditCards;
  var supportedPaymentMethods = {};

  if (this._enabledPaymentMethods.basicCard && cardConfiguration && cardConfiguration.supportedCardTypes.length > 0) {
    supportedPaymentMethods.basicCard = {
      supportedMethods: 'basic-card',
      data: {
        supportedNetworks: cardConfiguration.supportedCardTypes.reduce(function (types, cardType) {
          if (cardType in CARD_TYPE_MAPPINGS) {
            types.push(CARD_TYPE_MAPPINGS[cardType]);
          }

          return types;
        }, [])
      }
    };
  }

  if (this._enabledPaymentMethods.googlePay && androidPayConfiguration && androidPayConfiguration.enabled) {
    supportedPaymentMethods.googlePay = {
      supportedMethods: 'https://google.com/pay',
      data: generateGooglePayConfiguration(
        configuration, this._googlePayVersion, this._googleMerchantId
      )
    };
  }

  return supportedPaymentMethods;
};

PaymentRequestComponent.prototype.initialize = function () {
  var clientConfiguration = this._client.getConfiguration();
  var self = this;

  this._frame = iFramer({
    allowPaymentRequest: true,
    name: 'braintree-payment-request-frame',
    'class': 'braintree-payment-request-frame',
    height: 0,
    width: 0,
    style: {
      position: 'absolute',
      left: '-9999px'
    },
    title: 'Secure Payment Frame'
  });

  if (this._defaultSupportedPaymentMethods.length === 0) {
    return Promise.reject(new BraintreeError(errors.PAYMENT_REQUEST_NO_VALID_SUPPORTED_PAYMENT_METHODS));
  }

  return new Promise(function (resolve) {
    self._bus.on(events.FRAME_READY, function (reply) {
      reply(self._client);
    });
    self._bus.on(events.FRAME_CAN_MAKE_REQUESTS, function () {
      analytics.sendEvent(self._client, 'payment-request.initialized');
      self._bus.on(events.SHIPPING_ADDRESS_CHANGE, function (shippingAddress) {
        var shippingAddressChangeEvent = {
          target: {
            shippingAddress: shippingAddress
          },
          updateWith: function (paymentDetails) {
            self._bus.emit(events.UPDATE_SHIPPING_ADDRESS, paymentDetails);
          }
        };

        self._emit('shippingAddressChange', shippingAddressChangeEvent);
        self._emit('shippingaddresschange', shippingAddressChangeEvent);
      });
      self._bus.on(events.SHIPPING_OPTION_CHANGE, function (shippingOption) {
        var shippingOptionChangeEvent = {
          target: {
            shippingOption: shippingOption
          },
          updateWith: function (paymentDetails) {
            self._bus.emit(events.UPDATE_SHIPPING_OPTION, paymentDetails);
          }
        };

        self._emit('shippingOptionChange', shippingOptionChangeEvent);
        self._emit('shippingoptionchange', shippingOptionChangeEvent);
      });
      resolve(self);
    });

    // TODO - We may need to apply the same setTimeout hack that Hosted Fields
    // uses for iframes to load correctly in Edge. See:
    // https://github.com/braintree/braintree-web/blob/0c951e5f9859c606652485de14188b6bd6656677/src/hosted-fields/external/hosted-fields.js#L449-L469
    self._frame.src = composeUrl(clientConfiguration.gatewayConfiguration.assetsUrl, self._componentId, clientConfiguration.isDebug);
    document.body.appendChild(self._frame);
  });
};

/**
 * Create an object to pass into tokenize to specify a custom configuration. If no overrides are provided, the default configuration will be provided.
 * @public
 * @param {string} type The supported payment method type. Possible values are `basicCard` and `googlePay`.
 * If no type is provided, the function will throw an error. If the type provided is not an enabled payment method for the merchant account , the function will throw an error.
 * @param {object} [overrides] The configuration overrides for the [data property on the supported payment methods objects](https://developers.google.com/web/fundamentals/payments/deep-dive-into-payment-request). If not passed in, the default configuration for the specified type will be provided. If a property is not provided, the value from the default configuration will be used.
 * @example <caption>Getting the default configuration for a specified type</caption>
 * var configuration = paymentRequestInstance.createSupportedPaymentMethodsConfiguration('basicCard');
 *
 * configuration.supportedMethods; // 'basic-card'
 * configuration.data.supportedNetworks; // ['visa', 'mastercard', 'amex'] <- whatever the supported card networks for the merchant account are
 * @example <caption>Specifying overrides</caption>
 * var configuration = paymentRequestInstance.createSupportedPaymentMethodsConfiguration('basicCard', {
 *   supportedNetworks: ['visa'],
 *   supportedTypes: ['credit', 'debit']
 * });
 *
 * configuration.supportedMethods; // 'basic-card'
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
 * @param {object} configuration A {@link PaymentRequestComponent~paymentRequestConfiguration|paymentRequestConfiguration}.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link PaymentRequest~paymentPayload|paymentPayload}. If no callback is provided, `tokenize` returns a function that resolves with a {@link PaymentRequestComponent~tokenizePayload|tokenizePayload}.
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
 *   // collect additional info from the raw response
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
 * paymentRequestInstance.on('shippingAddressChange', function (event) {
 *   // validate shipping address on event.target.shippingAddress
 *   // make changes to the paymentDetails or shippingOptions if necessary
 *
 *   event.updateWith(paymentDetails)
 * });
 *
 * paymentRequestInstance.on('shippingOptionChange', function (event) {
 *   shippingOptions.forEach(function (option) {
 *     option.selected = option.id === event.target.shippingOption;
 *   });
 *
 *   event.updateWith(paymentDetails)
 * });
 *
 * paymentRequestInstance.tokenize({
 *   details: paymentDetails,
 *   options: {
 *     requestShipping: true
 *   }
 * }).then(function (payload) {
 *   // send payload.nonce to your server
 *   // collect shipping information from payload
 *   console.log(payload.details.rawPaymentResponse.shippingAddress);
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PaymentRequestComponent.prototype.tokenize = function (configuration) {
  var self = this;

  // NEXT_MAJOR_VERSION fail early if a payment method is passed in
  // that the component does not support
  return new Promise(function (resolve, reject) {
    self._bus.emit(events.PAYMENT_REQUEST_INITIALIZED, {
      supportedPaymentMethods: configuration.supportedPaymentMethods || self._defaultSupportedPaymentMethods,
      details: configuration.details,
      options: configuration.options
    }, function (response) {
      var rawError = response[0];
      var payload = response[1];

      if (rawError) {
        reject(self._formatTokenizationError(rawError));

        return;
      }

      analytics.sendEvent(self._client, 'payment-request.tokenize.succeeded');
      resolve({
        nonce: payload.nonce,
        type: payload.type,
        description: payload.description,
        details: {
          rawPaymentResponse: payload.details.rawPaymentResponse,
          cardType: payload.details.cardType,
          lastFour: payload.details.lastFour,
          lastTwo: payload.details.lastTwo
        },
        binData: payload.binData
      });
    });
  });
};

/**
 * Check if the customer can make payments.
 * @public
 * @param {object} configuration A {@link PaymentRequestComponent~paymentRequestConfiguration|paymentRequestConfiguration}.
 * @param {callback} [callback] Called on completion.
 * @example
 * var paymentDetails = {
 * 	 total: {
 *     label: 'Total',
 *     amount: {
 *       currency: 'USD',
 *       value: '10.00',
 *     }
 *   }
 * };
 *
 * paymentRequestInstance.canMakePayment({
 *   details: paymentDetails
 * }).then(function (result) {
 *   if (result) {
 *     // set up payment request button
 *   }
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PaymentRequestComponent.prototype.canMakePayment = function (configuration) {
  var self = this;
  var unsupportedPaymentMethod;

  // NEXT_MAJOR_VERSION Move this check to component creation
  if (!window.PaymentRequest) {
    analytics.sendEvent(self._client, 'payment-request.can-make-payment.not-available');

    return Promise.resolve(false);
  }

  if (configuration.supportedPaymentMethods) {
    configuration.supportedPaymentMethods.forEach(function (config) {
      var supportedMethods = config.supportedMethods;

      if (!(supportedMethods in constants.SUPPORTED_METHODS)) {
        unsupportedPaymentMethod = supportedMethods;
      }
    });

    if (unsupportedPaymentMethod) {
      return Promise.reject(new BraintreeError({
        type: errors.PAYMENT_REQUEST_UNSUPPORTED_PAYMENT_METHOD.type,
        code: errors.PAYMENT_REQUEST_UNSUPPORTED_PAYMENT_METHOD.code,
        message: unsupportedPaymentMethod + ' is not a supported payment method.'
      }));
    }
  }

  return new Promise(function (resolve, reject) {
    self._bus.emit(events.CAN_MAKE_PAYMENT, {
      supportedPaymentMethods: configuration.supportedPaymentMethods || self._defaultSupportedPaymentMethods,
      details: configuration.details,
      options: configuration.options
    }, function (response) {
      var error = response[0];
      var payload = response[1];

      if (error) {
        reject(self._formatCanMakePaymentError(error));

        return;
      }

      analytics.sendEvent(self._client, 'payment-request.can-make-payment.' + payload);

      resolve(payload);
    });
  });
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
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
PaymentRequestComponent.prototype.teardown = function () {
  this._bus.teardown();
  this._frame.parentNode.removeChild(this._frame);

  convertMethodsToError(this, methods(PaymentRequestComponent.prototype));

  analytics.sendEvent(this._client, 'payment-request.teardown-completed');

  return Promise.resolve();
};

PaymentRequestComponent.prototype._formatTokenizationError = function (error) {
  var formattedError;

  switch (error.name) {
    case 'AbortError':
      formattedError = new BraintreeError({
        type: errors.PAYMENT_REQUEST_CANCELED.type,
        code: errors.PAYMENT_REQUEST_CANCELED.code,
        message: errors.PAYMENT_REQUEST_CANCELED.message,
        details: {
          originalError: error
        }
      });

      analytics.sendEvent(this._client, 'payment-request.tokenize.canceled');

      return formattedError;
    case 'PAYMENT_REQUEST_INITIALIZATION_FAILED':
      formattedError = new BraintreeError({
        type: errors.PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED.type,
        code: errors.PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED.code,
        message: errors.PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED.message,
        details: {
          originalError: error
        }
      });
      break;
    case 'BRAINTREE_GATEWAY_GOOGLE_PAYMENT_TOKENIZATION_ERROR':
      formattedError = new BraintreeError({
        type: errors.PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE.type,
        code: errors.PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE.code,
        message: errors.PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE.message,
        details: {
          originalError: error
        }
      });
      break;
    case 'BRAINTREE_GATEWAY_GOOGLE_PAYMENT_PARSING_ERROR':
      formattedError = new BraintreeError({
        type: errors.PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR.type,
        code: errors.PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR.code,
        message: errors.PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR.message,
        details: {
          originalError: error
        }
      });
      break;
    default:
      formattedError = new BraintreeError({
        code: errors.PAYMENT_REQUEST_NOT_COMPLETED.code,
        type: error.type || BraintreeError.types.CUSTOMER,
        message: errors.PAYMENT_REQUEST_NOT_COMPLETED.message,
        details: {
          originalError: error
        }
      });
  }

  analytics.sendEvent(this._client, 'payment-request.tokenize.failed');

  return formattedError;
};

PaymentRequestComponent.prototype._formatCanMakePaymentError = function (error) {
  var formattedError;

  switch (error.name) {
    case 'PAYMENT_REQUEST_INITIALIZATION_FAILED':
      formattedError = new BraintreeError({
        type: errors.PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED.type,
        code: errors.PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED.code,
        message: errors.PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED.message,
        details: {
          originalError: error
        }
      });
      break;
    case 'NotAllowedError':
      formattedError = new BraintreeError({
        type: errors.PAYMENT_REQUEST_CAN_MAKE_PAYMENT_NOT_ALLOWED.type,
        code: errors.PAYMENT_REQUEST_CAN_MAKE_PAYMENT_NOT_ALLOWED.code,
        message: errors.PAYMENT_REQUEST_CAN_MAKE_PAYMENT_NOT_ALLOWED.message,
        details: {
          originalError: error
        }
      });
      break;
    default:
      formattedError = new BraintreeError({
        code: errors.PAYMENT_REQUEST_CAN_MAKE_PAYMENT_FAILED.code,
        type: errors.PAYMENT_REQUEST_CAN_MAKE_PAYMENT_FAILED.type,
        message: errors.PAYMENT_REQUEST_CAN_MAKE_PAYMENT_FAILED.message,
        details: {
          originalError: error
        }
      });
  }

  analytics.sendEvent(this._client, 'payment-request.can-make-payment.failed');

  return formattedError;
};

module.exports = wrapPromise.wrapPrototype(PaymentRequestComponent);
