"use strict";

var analytics = require("../../lib/analytics");
var BraintreeError = require("../../lib/braintree-error");
var Bus = require("framebus");
var constants = require("./constants");
var isVerifiedDomain = require("../../lib/is-verified-domain");
var useMin = require("../../lib/use-min");
var convertMethodsToError = require("../../lib/convert-methods-to-error");
var errors = require("./errors");
var events = constants.events;
var iFramer = require("@braintree/iframer");
var methods = require("../../lib/methods");
var VERSION = process.env.npm_package_version;
var uuid = require("@braintree/uuid");
var wrapPromise = require("@braintree/wrap-promise");
var BUS_CONFIGURATION_REQUEST_EVENT =
  require("../../lib/constants").BUS_CONFIGURATION_REQUEST_EVENT;

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
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link UnionPay#fetchCapabilitiesPayload fetchCapabilitiesPayload}. If no callback is provided, `fetchCapabilities` returns a promise that resolves with a {@link UnionPay#fetchCapabilitiesPayload fetchCapabilitiesPayload}.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
UnionPay.prototype.fetchCapabilities = function (options) {
  var self = this;
  var client = this._options.client;
  var cardNumber = options.card ? options.card.number : null;
  var hostedFields = options.hostedFields;

  if (cardNumber && hostedFields) {
    return Promise.reject(
      new BraintreeError(errors.UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES)
    );
  }
  if (cardNumber) {
    return client
      .request({
        method: "get",
        endpoint: "payment_methods/credit_cards/capabilities",
        data: {
          _meta: { source: "unionpay" },
          creditCard: {
            number: cardNumber,
          },
        },
      })
      .then(function (response) {
        analytics.sendEvent(client, "unionpay.capabilities-received");

        return response;
      })
      .catch(function (err) {
        var status = err.details && err.details.httpStatus;

        analytics.sendEvent(client, "unionpay.capabilities-failed");

        if (status === 403) {
          return Promise.reject(err);
        }

        return Promise.reject(
          new BraintreeError({
            type: errors.UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR.type,
            code: errors.UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR.code,
            message: errors.UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR.message,
            details: {
              originalError: err,
            },
          })
        );
      });
  }
  if (hostedFields) {
    if (!hostedFields._bus) {
      return Promise.reject(
        new BraintreeError(errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID)
      );
    }

    return self._initializeHostedFields().then(function () {
      return new Promise(function (resolve, reject) {
        self._bus.emit(
          events.HOSTED_FIELDS_FETCH_CAPABILITIES,
          { hostedFields: hostedFields },
          function (response) {
            if (response.err) {
              reject(new BraintreeError(response.err));

              return;
            }

            resolve(response.payload);
          }
        );
      });
    });
  }

  return Promise.reject(
    new BraintreeError(errors.UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED)
  );
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
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link UnionPay~enrollPayload|enrollPayload}. If no callback is provided, `enroll` returns a promise that resolves with {@link UnionPay~enrollPayload|enrollPayload}.
 * @returns {void}
 */
UnionPay.prototype.enroll = function (options) {
  var self = this;
  var client = this._options.client;
  var card = options.card;
  var mobile = options.mobile;
  var hostedFields = options.hostedFields;
  var data;

  if (!mobile) {
    return Promise.reject(
      new BraintreeError(errors.UNIONPAY_MISSING_MOBILE_PHONE_DATA)
    );
  }

  if (hostedFields) {
    if (!hostedFields._bus) {
      return Promise.reject(
        new BraintreeError(errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID)
      );
    }
    if (card) {
      return Promise.reject(
        new BraintreeError(errors.UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES)
      );
    }

    return new Promise(function (resolve, reject) {
      self._initializeHostedFields().then(function () {
        self._bus.emit(
          events.HOSTED_FIELDS_ENROLL,
          { hostedFields: hostedFields, mobile: mobile },
          function (response) {
            if (response.err) {
              reject(new BraintreeError(response.err));

              return;
            }

            resolve(response.payload);
          }
        );
      });
    });
  }
  if (card && card.number) {
    data = {
      _meta: { source: "unionpay" },
      unionPayEnrollment: {
        number: card.number,
        mobileCountryCode: mobile.countryCode,
        mobileNumber: mobile.number,
      },
    };

    if (card.expirationDate) {
      data.unionPayEnrollment.expirationDate = card.expirationDate;
    } else if (card.expirationMonth || card.expirationYear) {
      if (card.expirationMonth && card.expirationYear) {
        data.unionPayEnrollment.expirationYear = card.expirationYear;
        data.unionPayEnrollment.expirationMonth = card.expirationMonth;
      } else {
        return Promise.reject(
          new BraintreeError(errors.UNIONPAY_EXPIRATION_DATE_INCOMPLETE)
        );
      }
    }

    return client
      .request({
        method: "post",
        endpoint: "union_pay_enrollments",
        data: data,
      })
      .then(function (response) {
        analytics.sendEvent(client, "unionpay.enrollment-succeeded");

        return {
          enrollmentId: response.unionPayEnrollmentId,
          smsCodeRequired: response.smsCodeRequired,
        };
      })
      .catch(function (err) {
        var error;
        var status = err.details && err.details.httpStatus;

        if (status === 403) {
          error = err;
        } else if (status < 500) {
          error = new BraintreeError(
            errors.UNIONPAY_ENROLLMENT_CUSTOMER_INPUT_INVALID
          );
          error.details = { originalError: err };
        } else {
          error = new BraintreeError(errors.UNIONPAY_ENROLLMENT_NETWORK_ERROR);
          error.details = { originalError: err };
        }

        analytics.sendEvent(client, "unionpay.enrollment-failed");

        return Promise.reject(error);
      });
  }

  return Promise.reject(
    new BraintreeError(errors.UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED)
  );
};

/**
 * @typedef {object} UnionPay~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {string} type Always <code>CreditCard</code>.
 * @property {object} details Additional account details:
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard.
 * @property {string} details.lastFour Last four digits of card number.
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
 * @param {string} [options.smsCode] The SMS code received from the user if {@link UnionPay#enroll} payload have `smsCodeRequired`. if `smsCodeRequired` is false, smsCode should not be passed.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link UnionPay~tokenizePayload|tokenizePayload}. If no callback is provided, `tokenize` returns a promise that resolves with a {@link UnionPay~tokenizePayload|tokenizePayload}.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
UnionPay.prototype.tokenize = function (options) {
  var data;
  var self = this;
  var client = this._options.client;
  var card = options.card;
  var hostedFields = options.hostedFields;

  if (card && hostedFields) {
    return Promise.reject(
      new BraintreeError(errors.UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES)
    );
  }
  if (card) {
    data = {
      _meta: { source: "unionpay" },
      creditCard: {
        number: options.card.number,
        options: {
          unionPayEnrollment: {
            id: options.enrollmentId,
          },
        },
      },
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

    return client
      .request({
        method: "post",
        endpoint: "payment_methods/credit_cards",
        data: data,
      })
      .then(function (response) {
        var tokenizedCard = response.creditCards[0];

        delete tokenizedCard.consumed;
        delete tokenizedCard.threeDSecureInfo;

        analytics.sendEvent(client, "unionpay.nonce-received");

        return tokenizedCard;
      })
      .catch(function (err) {
        var error;
        var status = err.details && err.details.httpStatus;

        analytics.sendEvent(client, "unionpay.nonce-failed");

        if (status === 403) {
          error = err;
        } else if (status < 500) {
          error = new BraintreeError(errors.UNIONPAY_FAILED_TOKENIZATION);
          error.details = { originalError: err };
        } else {
          error = new BraintreeError(
            errors.UNIONPAY_TOKENIZATION_NETWORK_ERROR
          );
          error.details = { originalError: err };
        }

        return Promise.reject(error);
      });
  }
  if (hostedFields) {
    if (!hostedFields._bus) {
      return Promise.reject(
        new BraintreeError(errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID)
      );
    }

    return new Promise(function (resolve, reject) {
      self._initializeHostedFields().then(function () {
        self._bus.emit(
          events.HOSTED_FIELDS_TOKENIZE,
          options,
          function (response) {
            if (response.err) {
              reject(new BraintreeError(response.err));

              return;
            }

            resolve(response.payload);
          }
        );
      });
    });
  }

  return Promise.reject(
    new BraintreeError(errors.UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED)
  );
};

/**
 * Cleanly remove anything set up by {@link module:braintree-web/unionpay.create|create}. This only needs to be called when using UnionPay with Hosted Fields.
 * @public
 * @param {callback} [callback] Called on completion. If no callback is provided, returns a promise.
 * @example
 * unionpayInstance.teardown();
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
UnionPay.prototype.teardown = function () {
  if (this._bus) {
    this._hostedFieldsFrame.parentNode.removeChild(this._hostedFieldsFrame);
    this._bus.teardown();
  }

  convertMethodsToError(this, methods(UnionPay.prototype));

  return Promise.resolve();
};

UnionPay.prototype._initializeHostedFields = function () {
  var assetsUrl, isDebug;
  var componentId = uuid();
  var self = this;

  if (this._hostedFieldsInitializePromise) {
    return this._hostedFieldsInitializePromise;
  }

  this._hostedFieldsInitializePromise = new Promise(function (resolve) {
    assetsUrl =
      self._options.client.getConfiguration().gatewayConfiguration.assetsUrl;
    isDebug = self._options.client.getConfiguration().isDebug;

    self._bus = new Bus({
      channel: componentId,
      verifyDomain: isVerifiedDomain,
    });
    self._hostedFieldsFrame = iFramer({
      name: constants.HOSTED_FIELDS_FRAME_NAME + "_" + componentId,
      src:
        assetsUrl +
        "/web/" +
        VERSION +
        "/html/unionpay-hosted-fields-frame" +
        useMin(isDebug) +
        ".html",
      height: 0,
      width: 0,
    });

    self._bus.on(BUS_CONFIGURATION_REQUEST_EVENT, function (reply) {
      reply(self._options.client);

      resolve();
    });

    document.body.appendChild(self._hostedFieldsFrame);
  });

  return this._hostedFieldsInitializePromise;
};

module.exports = wrapPromise.wrapPrototype(UnionPay);
