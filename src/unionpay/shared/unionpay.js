'use strict';

var BraintreeError = require('../../lib/error');
var Bus = require('../../lib/bus');
var analytics = require('../../lib/analytics');
var iFramer = require('iframer');
var uuid = require('../../lib/uuid');
var methods = require('../../lib/methods');
var deferred = require('../../lib/deferred');
var convertMethodsToError = require('../../lib/convert-methods-to-error');
var VERSION = require('package.version');
var constants = require('./constants');
var events = constants.events;

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
 * @property {boolean} unionPay.isUnionPayEnrollmentRequired Notifies if {@link UnionPay#enroll|enrollment} should be completed.
 */

/**
 * Fetches the capabilities of a card, including whether or not the card needs to be enrolled before use. If the card needs to be enrolled, use {@link UnionPay#enroll|enroll}.
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
 *     if (cardCapabilities.isDebit) {
 *       // CVV and expiration date are not required
 *     } else {
 *       // CVV and expiration date are required
 *     }
 *   }
 *
 *   if (cardCapabilities.unionPay && cardCapabilities.unionPay.isUnionPayEnrollmentRequired) {
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
 *       if (cardCapabilities.unionPay && cardCapabilities.unionPay.isUnionPayEnrollmentRequired) {
 *         // Show your own mobile country code and phone number inputs for enrollment
 *       }
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
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_AND_HOSTED_FIELDS_ERROR_MESSAGE
    }));
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
          type: BraintreeError.types.NETWORK,
          message: 'Fetch capabilities network error.',
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
      callback(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: constants.INVALID_HOSTED_FIELDS_ERROR_MESSAGE
      }));
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
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_OR_HOSTED_FIELDS_REQUIRED_ERROR_MESSAGE
    }));
    return;
  }
};

/**
 * @typedef {object} UnionPay~enrollPayload
 * @property {string} enrollmentId UnionPay enrollment ID. This value should be passed to `tokenize`.
 */

/**
 * Enrolls a UnionPay card. Only call this method if the card needs to be enrolled. Use {@link UnionPay#fetchCapabilities|fetchCapabilities} to determine if the user's card needs to be enrolled.
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
 *   // Wait for SMS auth code from customer
 *   // Then use response.enrollmentId in tokenization
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
 *   // Wait for SMS auth code from customer
 *   // Then use response.enrollmentId in tokenization
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
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: 'A `mobile` with `countryCode` and `number` is required.'
    }));
    return;
  }

  if (hostedFields) {
    if (!hostedFields._bus) {
      callback(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: constants.INVALID_HOSTED_FIELDS_ERROR_MESSAGE
      }));
      return;
    } else if (card) {
      callback(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: constants.CARD_AND_HOSTED_FIELDS_ERROR_MESSAGE
      }));
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
        callback(new BraintreeError({
          type: BraintreeError.types.MERCHANT,
          message: 'You must supply expiration month and year or neither.'
        }));
        return;
      }
    }

    client.request({
      method: 'post',
      endpoint: 'union_pay_enrollments',
      data: data
    }, function (err, response, status) {
      var message, type;

      if (err) {
        if (status < 500) {
          type = BraintreeError.types.CUSTOMER;
          message = 'Enrollment invalid due to customer input error.';
        } else {
          type = BraintreeError.types.NETWORK;
          message = 'An enrollment network error occurred.';
        }

        analytics.sendEvent(client, 'web.unionpay.enrollment-failed');
        callback(new BraintreeError({
          type: type,
          message: message,
          details: {
            originalError: err
          }
        }));
        return;
      }

      analytics.sendEvent(client, 'web.unionpay.enrollment-succeeded');
      callback(null, {enrollmentId: response.unionPayEnrollmentId});
    });
  } else {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_OR_HOSTED_FIELDS_REQUIRED_ERROR_MESSAGE
    }));
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
 * @param {string} options.enrollmentId The enrollment ID if {@link UnionPay#enroll} was required.
 * @param {string} options.smsCode The SMS code recieved from the user if {@link UnionPay#enroll} was required.
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
 *   smsCode: '11111' // Sent to customer's phone
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
 *   smsCode: '11111' // Sent to customer's phone
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
  var data, tokenizedCard;
  var client = this._options.client;
  var card = options.card;
  var hostedFields = options.hostedFields;

  callback = deferred(callback);

  if (card && hostedFields) {
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_AND_HOSTED_FIELDS_ERROR_MESSAGE
    }));
    return;
  } else if (card) {
    data = {
      _meta: {source: 'unionpay'},
      creditCard: {
        number: options.card.number,
        options: {
          unionPayEnrollment: {
            id: options.enrollmentId,
            smsCode: options.smsCode
          }
        }
      }
    };

    if (card.expirationDate) {
      data.creditCard.expirationDate = card.expirationDate;
    } else if (card.expirationMonth && card.expirationYear) {
      data.creditCard.expirationYear = card.expirationYear;
      data.creditCard.expirationMonth = card.expirationMonth;
    }

    if (options.card.cvv) {
      data.creditCard.cvv = options.card.cvv;
    }

    client.request({
      method: 'post',
      endpoint: 'payment_methods/credit_cards',
      data: data
    }, function (err, response, status) {
      if (err) {
        analytics.sendEvent(client, 'web.unionpay.nonce-failed');

        if (status < 500) {
          callback(new BraintreeError({
            type: BraintreeError.types.CUSTOMER,
            message: 'The supplied card data failed tokenization.',
            details: {
              originalError: err
            }
          }));
        } else {
          callback(new BraintreeError({
            type: BraintreeError.types.NETWORK,
            message: 'A tokenization network error occurred.',
            details: {
              originalError: err
            }
          }));
        }

        return;
      }

      tokenizedCard = response.creditCards[0];
      delete tokenizedCard.consumed;
      delete tokenizedCard.threeDSecureInfo;
      delete tokenizedCard.type;

      analytics.sendEvent(client, 'web.unionpay.nonce-received');
      callback(null, tokenizedCard);
    });
  } else if (hostedFields) {
    if (!hostedFields._bus) {
      callback(new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        message: constants.INVALID_HOSTED_FIELDS_ERROR_MESSAGE
      }));
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
    callback(new BraintreeError({
      type: BraintreeError.types.MERCHANT,
      message: constants.CARD_OR_HOSTED_FIELDS_REQUIRED_ERROR_MESSAGE
    }));
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
