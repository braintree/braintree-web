"use strict";

var BraintreeError = require("../lib/braintree-error");
var analytics = require("../lib/analytics");
var errors = require("./errors");
var jsonClone = require("../lib/json-clone");
var methods = require("../lib/methods");
var convertMethodsToError = require("../lib/convert-methods-to-error");
var Promise = require("../lib/promise");
var wrapPromise = require("@braintree/wrap-promise");
var cardTypeTransformMap = {
  Visa: "VISA",
  MasterCard: "MASTERCARD",
  Discover: "DISCOVER",
  "American Express": "AMEX",
};

/**
 * Visa Checkout Address object.
 * @typedef {object} VisaCheckout~Address
 * @property {string} countryCode The customer's country code.
 * @property {string} extendedAddress The customer's extended address.
 * @property {string} firstName The customer's first name.
 * @property {string} lastName The customer's last name.
 * @property {string} locality The customer's locality.
 * @property {string} postalCode The customer's postal code.
 * @property {string} region The customer's region.
 * @property {string} streetAddress The customer's street address.
 * @property {string} phoneNumber The customer's phone number.
 */

/**
 * Visa Checkout UserData object.
 * @typedef {object} VisaCheckout~UserData
 * @property {string} userEmail The customer's email address.
 * @property {string} userFirstName The customer's first name.
 * @property {string} userLastName The customer's last name.
 * @property {string} userFullName The customer's full name.
 * @property {string} userName The customer's username.
 */

/**
 * Visa Checkout tokenize payload.
 * @typedef {object} VisaCheckout~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {object} details Additional account details.
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard.
 * @property {string} details.lastFour Last four digits of card number.
 * @property {string} details.lastTwo Last two digits of card number.
 * @property {string} description A human-readable description.
 * @property {string} type The payment method type, always `VisaCheckoutCard`.
 * @property {VisaCheckout~Address} billingAddress The customer's billing address.
 * @property {VisaCheckout~Address} shippingAddress The customer's shipping address.
 * @property {VisaCheckout~UserData} userData Information about the customer.
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
 * @class
 * @param {object} options The Visa Checkout {@link module:braintree-web/visa-checkout.create create} options.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/visa-checkout.create|braintree-web.visa-checkout.create} instead.</strong>
 * @classdesc This class represents a Visa Checkout component produced by {@link module:braintree-web/visa-checkout.create|braintree-web/visa-checkout.create}. Instances of this class have methods for interacting with Visa Checkout's JavaScript library.
 */
function VisaCheckout(options) {
  this._client = options.client;
}

function transformCardTypes(cardTypes) {
  return cardTypes.reduce(function (acc, type) {
    if (cardTypeTransformMap.hasOwnProperty(type)) {
      return acc.concat(cardTypeTransformMap[type]);
    }

    return acc;
  }, []);
}

/**
 * Creates an `initOptions` object from the passed `options`, applying properties that Braintree needs to transact Visa Checkout.
 *
 * Braintree will apply these properties if they do not exist on the given `options`:
 *  - `apikey`
 *  - `externalClientId`
 *  - `settings.payment.cardBrands`
 *
 * Braintree will overwrite `settings.dataLevel = 'FULL'` to access the full payment method.
 * @public
 * @param {object} options The base `initOptions` that will be used to init Visa Checkout.
 * @param {string} [options.apikey] The API key used to initialize Visa Checkout. When not supplied, Braintree will set this property.
 * @param {string} [options.externalClientId] The external client ID key used to initialize Visa Checkout. When not supplied, Braintree will set this property.
 * @param {object} [options.settings] The settings object used to initialize Visa Checkout.
 * @param {string} [options.settings.dataLevel] The data level used to initialize Visa Checkout. Braintree will overwrite this property to 'FULL'.
 * @param {object} [options.settings.payment] The payment object used to initialize Visa Checkout.
 * @param {string[]} [options.settings.payment.cardBrands] The card brands that Visa Checkout will allow the customer to pay with. When not supplied, Braintree will set this property.
 * @returns {object} `initOptions` The `initOptions` that Visa Checkout should be initialized with.
 */
VisaCheckout.prototype.createInitOptions = function (options) {
  var initOptions;
  var gatewayConfiguration =
    this._client.getConfiguration().gatewayConfiguration;
  var visaCheckoutConfiguration = gatewayConfiguration.visaCheckout;

  if (!options) {
    throw new BraintreeError(errors.VISA_CHECKOUT_INIT_OPTIONS_REQUIRED);
  }

  initOptions = jsonClone(options);
  initOptions.apikey = initOptions.apikey || visaCheckoutConfiguration.apikey;
  initOptions.encryptionKey = visaCheckoutConfiguration.encryptionKey;
  initOptions.externalClientId =
    initOptions.externalClientId || visaCheckoutConfiguration.externalClientId;
  initOptions.settings = initOptions.settings || {};
  initOptions.settings.dataLevel = "FULL";
  initOptions.settings.payment = initOptions.settings.payment || {};

  if (!initOptions.settings.payment.cardBrands) {
    initOptions.settings.payment.cardBrands = transformCardTypes(
      gatewayConfiguration.visaCheckout.supportedCardTypes
    );
  }

  return initOptions;
};

/**
 * Tokenizes the Visa Checkout payload, returning a payment method nonce.
 * @public
 * @param {object} payment The object that Visa Checkout supplies on `payment.success`.
 * @param {string} payment.callid Visa Checkout transaction ID associated with this payment.
 * @param {string} payment.encKey The encrypted key used to decrypt the payment data.
 * @param {string} payment.encPaymentData The encrypted payment data.
 * @param {callback} [callback] The second argument, <code>tokenizePayload</code> is a {@link VisaCheckout~tokenizePayload|tokenizePayload}. If no callback is provided, `tokenize` returns a promise that resolves with the {@link VisaCheckout~tokenizePayload|tokenizePayload}.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
VisaCheckout.prototype.tokenize = function (payment) {
  var self = this;

  if (!payment.callid || !payment.encKey || !payment.encPaymentData) {
    return Promise.reject(
      new BraintreeError(errors.VISA_CHECKOUT_PAYMENT_REQUIRED)
    );
  }

  return this._client
    .request({
      method: "post",
      endpoint: "payment_methods/visa_checkout_cards",
      data: {
        _meta: {
          source: "visa-checkout",
        },
        visaCheckoutCard: {
          callId: payment.callid,
          encryptedPaymentData: payment.encPaymentData,
          encryptedKey: payment.encKey,
        },
      },
    })
    .then(function (response) {
      analytics.sendEvent(self._client, "visacheckout.tokenize.succeeded");

      return response.visaCheckoutCards[0];
    })
    .catch(function (err) {
      analytics.sendEvent(self._client, "visacheckout.tokenize.failed");

      return Promise.reject(
        new BraintreeError({
          type: errors.VISA_CHECKOUT_TOKENIZATION.type,
          code: errors.VISA_CHECKOUT_TOKENIZATION.code,
          message: errors.VISA_CHECKOUT_TOKENIZATION.message,
          details: {
            originalError: err,
          },
        })
      );
    });
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/visa-checkout.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * visaCheckoutInstance.teardown();
 * @example <caption>With callback</caption>
 * visaCheckoutInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
VisaCheckout.prototype.teardown = function () {
  convertMethodsToError(this, methods(VisaCheckout.prototype));

  return Promise.resolve();
};

module.exports = wrapPromise.wrapPrototype(VisaCheckout);
