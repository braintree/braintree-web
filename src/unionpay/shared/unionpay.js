'use strict';

var analytics = require('../../lib/analytics');
var assign = require('../../lib/assign').assign;
var BraintreeError = require('../../lib/error');
var Bus = require('../../lib/bus');
var constants = require('./constants');
var convertMethodsToError = require('../../lib/convert-methods-to-error');
var deferred = require('../../lib/deferred');
var errors = require('./errors');
var events = constants.events;
var iFramer = require('iframer');
var methods = require('../../lib/methods');
var VERSION = require('package.version');
var uuid = require('../../lib/uuid');

/**
 * @class
 * @param {object} options See {@link module:braintree-web/unionpay.create|unionpay.create}.
 * @description <strong>You cannot use this constructor directly. Use {@link module:braintree-web/unionpay.create|braintree-web.unionpay.create} instead.</strong>
 * @classdesc This class represents a UnionPay component. Instances of this class have methods for {@link UnionPay#fetchCapabilities fetching capabilities} of UnionPay cards, {@link UnionPay#enroll enrolling} a UnionPay card, and {@link UnionPay#tokenize tokenizing} a UnionPay card.
 */
function UnionPay(options) {
  this._options = options;
}

/**
 * @typedef {object} UnionPay~fetchCapabilitiesPayload
 * @property {boolean} isUnionPay Determines if this card is a UnionPay card.
 * @property {boolean} isDebit Determines if this card is a debit card. This property is only present if `isUnionPay` is `true`.
 * @property {object} unionPay UnionPay specific properties. This property is only present if `isUnionPay` is `true`.
 * @property {boolean} unionPay.supportsTwoStepAuthAndCapture Determines if the card allows for an authorization, but settling the transaction later.
 * @property {boolean} unionPay.isSupported Determines if Braintree can process this UnionPay card. When false, Braintree cannot process this card and the user should use a different card.
 */

/**
 * Fetches the capabilities of a card, including whether or not the SMS enrollment process is required.
 * @public
 * @param {object} options UnionPay {@link UnionPay#fetchCapabilities fetchCapabilities} options
 * @param {object} [options.card] The card from which to fetch capabilities. Note that this will only have one property, `number`. Required if you are not using the `hostedFields` option.
 * @param {string} options.card.number Card number.
 * @param {HostedFields} [options.hostedFields] The Hosted Fields instance used to collect card data. Required if you are not using the `card` option.
 * @param {callback} callback The second argument, <code>data</code>, is a {@link UnionPay#fetchCapabilitiesPayload fetchCapabilitiesPayload}.
 * @example <caption>With raw card data</caption>
 * unionpayInstance.fetchCapabilities({
 *   card: {
 *     number: '4111111111111111'
 *   }
 * }, function (fetchErr, cardCapabilities) {
 *   if (fetchErr) {
 *     console.error(fetchErr);
 *     return;
 *   }
 *
 *   if (cardCapabilities.isUnionPay) {
 *     if (cardCapabilities.unionPay && !cardCapabilities.unionPay.isSupported) {
 *       // Braintree cannot process this UnionPay card.
 *       // Ask the user for a different card.
 *       return;
 *     }
 *
 *     if (cardCapabilities.isDebit) {
 *       // CVV and expiration date are not required
 *     } else {
 *       // CVV and expiration date are required
 *     }
 *
 *     // Show mobile phone number field for enrollment
 *   }
 * });
 * @example <caption>With Hosted Fields</caption>
 * // Fetch capabilities on `blur` inside of the Hosted Fields `create` callback
 * hostedFieldsInstance.on('blur', function (event) {
 *   // Only attempt to fetch capabilities when a valid card number has been entered
 *   if (event.emittedBy === 'number' && event.fields.number.isValid) {
 *     unionpayInstance.fetchCapabilities({
 *       hostedFields: hostedFieldsInstance
 *     }, function (fetchErr, cardCapabilities) {
 *       if (fetchErr) {
 *         console.error(fetchErr);
 *         return;
 *       }
 *
 *       if (cardCapabilities.isUnionPay) {
 *         if (cardCapabilities.unionPay && !cardCapabilities.unionPay.isSupported) {
 *           // Braintree cannot process this UnionPay card.
 *           // Ask the user for a different card.
 *           return;
 *         }
 *         if (cardCapabilities.isDebit) {
 *           // CVV and expiration date are not required
 *           // Hide the containers with your `cvv` and `expirationDate` fields
 *         } else {
 *           // CVV and expiration date are required
 *         }
 *       } else {
 *         // Not a UnionPay card
 *         // When form is complete, tokenize using your Hosted Fields instance
 *       }
 *
 *       // Show your own mobile country code and phone number inputs for enrollment
 *     });
 *   });
 * });
 * @returns {void}
 */
UnionPay.prototype.fetchCapabilities = function (options, callback) {
  var client = this._options.client;
  var cardNumber = options.card ? options.card.number : null;
  var hostedFields = options.hostedFields;

  callback = deferred(callback);

  if (cardNumber && hostedFields) {
    callback(new BraintreeError(errors.UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES));
    return;
  } else if (cardNumber) {
    client.request({
      method: 'get',
      endpoint: 'payment_methods/credit_cards/capabilities',
      data: {
        _meta: {source: 'unionpay'},
        creditCard: {
          number: cardNumber
        }
      }
    }, function (err, response) {
      if (err) {
        callback(new BraintreeError({
          type: errors.UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR.type,
          code: errors.UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR.code,
          message: errors.UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR.message,
          details: {
            originalError: err
          }
        }));
        analytics.sendEvent(client, 'web.unionpay.capabilities-failed');
        return;
      }

      analytics.sendEvent(client, 'web.unionpay.capabilities-received');
      callback(null, response);
    });
  } else if (hostedFields) {
    if (!hostedFields._bus) {
      callback(new BraintreeError(errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID));
      return;
    }
    this._initializeHostedFields(function () {
      this._bus.emit(events.HOSTED_FIELDS_FETCH_CAPABILITIES, {hostedFields: hostedFields}, function (response) {
        if (response.err) {
          callback(new BraintreeError(response.err));
          return;
        }

        callback(null, response.payload);
      });
    }.bind(this));
  } else {
    callback(new BraintreeError(errors.UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED));
    return;
  }
};

/**
 * @typedef {object} UnionPay~enrollPayload
 * @property {string} enrollmentId UnionPay enrollment ID. This value should be passed to `tokenize`.
 * @property {boolean} smsCodeRequired UnionPay `smsCodeRequired` flag.
 * </p><b>true</b> - the user will receive an SMS code that needs to be supplied for tokenization.
 * </p><b>false</b> - the card can be immediately tokenized.
 */

/**
 * Enrolls a UnionPay card. Use {@link UnionPay#fetchCapabilities|fetchCapabilities} to determine if the SMS enrollment process is required.
 * @public
 * @param {object} options UnionPay enrollment options:
 * @param {object} [options.card] The card to enroll. Required if you are not using the `hostedFields` option.
 * @param {string} options.card.number The card number.
 * @param {string} [options.card.expirationDate] The card's expiration date. May be in the form `MM/YY` or `MM/YYYY`. When defined `expirationMonth` and `expirationYear` are ignored.
 * @param {string} [options.card.expirationMonth] The card's expiration month. This should be used with the `expirationYear` parameter. When `expirationDate` is defined this parameter is ignored.
 * @param {string} [options.card.expirationYear] The card's expiration year. This should be used with the `expirationMonth` parameter. When `expirationDate` is defined this parameter is ignored.
 * @param {HostedFields} [options.hostedFields] The Hosted Fields instance used to collect card data. Required if you are not using the `card` option.
 * @param {object} options.mobile The mobile information collected from the customer.
 * @param {string} options.mobile.countryCode The country code of the customer's mobile phone number.
 * @param {string} options.mobile.number The customer's mobile phone number.
 * @param {callback} callback The second argument, <code>data</code>, is a {@link UnionPay~enrollPayload|enrollPayload}.
 * @example <caption>With raw card data</caption>
 * unionpayInstance.enroll({
 *   card: {
 *     number: '4111111111111111',
 *     expirationMonth: '12',
 *     expirationYear: '2038'
 *   },
 *   mobile: {
 *     countryCode: '62',
 *     number: '111111111111'
 *   }
 * }, function (enrollErr, response) {
 *   if (enrollErr) {
 *      console.error(enrollErr);
 *      return;
 *   }
 *
 *   if (response.smsCodeRequired) {
 *     // If smsCodeRequired, wait for SMS auth code from customer
 *     // Then use response.enrollmentId during {@link UnionPay#tokenize}
 *   } else {
 *     // SMS code is not required from the user.
 *     // {@link UnionPay#tokenize} can be called immediately
 * });
 * @example <caption>With Hosted Fields</caption>
 * unionpayInstance.enroll({
 *   hostedFields: hostedFields,
 *   mobile: {
 *     countryCode: '62',
 *     number: '111111111111'
 *   }
 * }, function (enrollErr, response) {
 *   if (enrollErr) {
 *     console.error(enrollErr);
 *     return;
 *   }
 *
 *   if (response.smsCodeRequired) {
 *     // If smsCodeRequired, wait for SMS auth code from customer
 *     // Then use response.enrollmentId during {@link UnionPay#tokenize}
 *   } else {
 *     // SMS code is not required from the user.
 *     // {@link UnionPay#tokenize} can be called immediately
 *   }
 * });
 * @returns {void}
 */
UnionPay.prototype.enroll = function (options, callback) {
  var client = this._options.client;
  var card = options.card;
  var mobile = options.mobile;
  var hostedFields = options.hostedFields;
  var data;

  callback = deferred(callback);

  if (!mobile) {
    callback(new BraintreeError(errors.UNIONPAY_MISSING_MOBILE_PHONE_DATA));
    return;
  }

  if (hostedFields) {
    if (!hostedFields._bus) {
      callback(new BraintreeError(errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID));
      return;
    } else if (card) {
      callback(new BraintreeError(errors.UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES));
      return;
    }

    this._initializeHostedFields(function () {
      this._bus.emit(events.HOSTED_FIELDS_ENROLL, {hostedFields: hostedFields, mobile: mobile}, function (response) {
        if (response.err) {
          callback(new BraintreeError(response.err));
          return;
        }

        callback(null, response.payload);
      });
    }.bind(this));
  } else if (card && card.number) {
    data = {
      _meta: {source: 'unionpay'},
      unionPayEnrollment: {
        number: card.number,
        mobileCountryCode: mobile.countryCode,
        mobileNumber: mobile.number
      }
    };

    if (card.expirationDate) {
      data.unionPayEnrollment.expirationDate = card.expirationDate;
    } else if (card.expirationMonth || card.expirationYear) {
      if (card.expirationMonth && card.expirationYear) {
        data.unionPayEnrollment.expirationYear = card.expirationYear;
        data.unionPayEnrollment.expirationMonth = card.expirationMonth;
      } else {
        callback(new BraintreeError(errors.UNIONPAY_EXPIRATION_DATE_INCOMPLETE));
        return;
      }
    }

    client.request({
      method: 'post',
      endpoint: 'union_pay_enrollments',
      data: data
    }, function (err, response, status) {
      var error;

      if (err) {
        if (status < 500) {
          error = errors.UNIONPAY_ENROLLMENT_CUSTOMER_INPUT_INVALID;
        } else {
          error = errors.UNIONPAY_ENROLLMENT_NETWORK_ERROR;
        }
        error = assign({}, error, {
          details: {originalError: err}
        });

        analytics.sendEvent(client, 'web.unionpay.enrollment-failed');
        callback(new BraintreeError(error));
        return;
      }

      analytics.sendEvent(client, 'web.unionpay.enrollment-succeeded');
      callback(null, {
        enrollmentId: response.unionPayEnrollmentId,
        smsCodeRequired: response.smsCodeRequired
      });
    });
  } else {
    callback(new BraintreeError(errors.UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED));
    return;
  }
};

/**
 * @typedef {object} UnionPay~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {string} type Always <code>CreditCard</code>.
 * @property {object} details Additional account details:
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard.
 * @property {string} details.lastTwo Last two digits of card number.
 * @property {string} description A human-readable description.
 */

/**
 * Tokenizes a UnionPay card and returns a nonce payload.
 * @public
 * @param {object} options UnionPay tokenization options:
 * @param {object} [options.card] The card to enroll. Required if you are not using the `hostedFields` option.
 * @param {string} options.card.number The card number.
 * @param {string} [options.card.expirationDate] The card's expiration date. May be in the form `MM/YY` or `MM/YYYY`. When defined `expirationMonth` and `expirationYear` are ignored.
 * @param {string} [options.card.expirationMonth] The card's expiration month. This should be used with the `expirationYear` parameter. When `expirationDate` is defined this parameter is ignored.
 * @param {string} [options.card.expirationYear] The card's expiration year. This should be used with the `expirationMonth` parameter. When `expirationDate` is defined this parameter is ignored.
 * @param {string} [options.card.cvv] The card's security number.
 * @param {HostedFields} [options.hostedFields] The Hosted Fields instance used to collect card data. Required if you are not using the `card` option.
 * @param {string} options.enrollmentId The enrollment ID from {@link UnionPay#enroll}.
 * @param {boolean} [options.vault=false] When true, will vault the tokenized card. Cards will only be vaulted when using a client created with a client token that includes a customer ID.
 * @param {string} [options.smsCode] The SMS code received from the user if {@link UnionPay#enroll} payload have `smsCodeRequired`. if `smsCodeRequired` is false, smsCode should not be passed.
 * @param {callback} callback The second argument, <code>data</code>, is a {@link UnionPay~tokenizePayload|tokenizePayload}.
 * @example <caption>With raw card data</caption>
 * unionpayInstance.tokenize({
 *   card: {
 *     number: '4111111111111111',
 *     expirationMonth: '12',
 *     expirationYear: '2038',
 *     cvv: '123'
 *   },
 *   enrollmentId: enrollResponse.enrollmentId, // Returned from enroll
 *   smsCode: '11111' // Received by customer's phone, if SMS enrollment was required. Otherwise it should be omitted
 * }, function (tokenizeErr, response) {
 *   if (tokenizeErr) {
 *     console.error(tokenizeErr);
 *     return;
 *   }
 *
 *   // Send response.nonce to your server
 * });
 * @example <caption>With Hosted Fields</caption>
 * unionpayInstance.tokenize({
 *   hostedFields: hostedFieldsInstance,
 *   enrollmentId: enrollResponse.enrollmentId, // Returned from enroll
 *   smsCode: '11111' // Received by customer's phone, if SMS enrollment was required. Otherwise it should be omitted
 * }, function (tokenizeErr, response) {
 *   if (tokenizeErr) {
 *     console.error(tokenizeErr);
 *     return;
 *   }
 *
 *   // Send response.nonce to your server
 * });
 * @returns {void}
 */
UnionPay.prototype.tokenize = function (options, callback) {
  var data, tokenizedCard, error;
  var client = this._options.client;
  var card = options.card;
  var hostedFields = options.hostedFields;

  callback = deferred(callback);

  if (card && hostedFields) {
    callback(new BraintreeError(errors.UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES));
    return;
  } else if (card) {
    data = {
      _meta: {source: 'unionpay'},
      creditCard: {
        number: options.card.number,
        options: {
          unionPayEnrollment: {
            id: options.enrollmentId
          }
        }
      }
    };

    if (options.smsCode) {
      data.creditCard.options.unionPayEnrollment.smsCode = options.smsCode;
    }

    if (card.expirationDate) {
      data.creditCard.expirationDate = card.expirationDate;
    } else if (card.expirationMonth && card.expirationYear) {
      data.creditCard.expirationYear = card.expirationYear;
      data.creditCard.expirationMonth = card.expirationMonth;
    }

    if (options.card.cvv) {
      data.creditCard.cvv = options.card.cvv;
    }

    data.creditCard.options.validate = options.vault === true;

    client.request({
      method: 'post',
      endpoint: 'payment_methods/credit_cards',
      data: data
    }, function (err, response, status) {
      if (err) {
        analytics.sendEvent(client, 'web.unionpay.nonce-failed');

        if (status < 500) {
          error = errors.UNIONPAY_FAILED_TOKENIZATION;
        } else {
          error = errors.UNIONPAY_TOKENIZATION_NETWORK_ERROR;
        }
        error = assign({}, error, {
          details: {originalError: err}
        });
        callback(new BraintreeError(error));
        return;
      }

      tokenizedCard = response.creditCards[0];
      delete tokenizedCard.consumed;
      delete tokenizedCard.threeDSecureInfo;

      analytics.sendEvent(client, 'web.unionpay.nonce-received');
      callback(null, tokenizedCard);
    });
  } else if (hostedFields) {
    if (!hostedFields._bus) {
      callback(new BraintreeError(errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID));
      return;
    }

    this._initializeHostedFields(function () {
      this._bus.emit(events.HOSTED_FIELDS_TOKENIZE, options, function (response) {
        if (response.err) {
          callback(new BraintreeError(response.err));
          return;
        }

        callback(null, response.payload);
      });
    }.bind(this));
  } else {
    callback(new BraintreeError(errors.UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED));
    return;
  }
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/unionpay.create|create}. This only needs to be called when using UnionPay with Hosted Fields.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * unionpayInstance.teardown(function (teardownErr) {
 *   if (teardownErr) {
 *     console.error('Could not tear down UnionPay.');
 *   } else {
 *     console.log('UnionPay has been torn down.');
 *   }
 * });
 * @returns {void}
 */
UnionPay.prototype.teardown = function (callback) {
  if (this._bus) {
    this._hostedFieldsFrame.parentNode.removeChild(this._hostedFieldsFrame);
    this._bus.teardown();
  }

  convertMethodsToError(this, methods(UnionPay.prototype));

  if (typeof callback === 'function') {
    callback = deferred(callback);
    callback();
  }
};

UnionPay.prototype._initializeHostedFields = function (callback) {
  var componentId = uuid();

  if (this._bus) {
    callback();
    return;
  }

  this._bus = new Bus({
    channel: componentId,
    merchantUrl: location.href
  });
  this._hostedFieldsFrame = iFramer({
    name: constants.HOSTED_FIELDS_FRAME_NAME + '_' + componentId,
    src: this._options.client.getConfiguration().gatewayConfiguration.assetsUrl + '/web/' + VERSION + '/html/unionpay-hosted-fields-frame@DOT_MIN.html',
    height: 0,
    width: 0
  });

  this._bus.on(Bus.events.CONFIGURATION_REQUEST, function (reply) {
    reply(this._options.client);

    callback();
  }.bind(this));

  document.body.appendChild(this._hostedFieldsFrame);
};

module.exports = UnionPay;
