"use strict";

var wrapPromise = require("@braintree/wrap-promise");
var BraintreeError = require("../../lib/braintree-error");
var sepaErrors = require("../shared/errors");
var constants = require("../shared/constants");
var mandates = require("./mandate");
var hasMissingOption = require("../../lib/has-missing-option");
var analytics = require("../../lib/analytics");
var VERSION = process.env.npm_package_version;
var assign = require("../../lib/assign").assign;

/**
 * @class
 * @param {object} options see {@link module:braintree-web/sepa.create|sepa.create}
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/sepa.create|braintree-web.sepa.create} instead.</strong>
 * @classdesc This class represents a SEPA component produced by {@link module:braintree-web/sepa.create|braintree-web.sepa.create}. Instances provide methods for tokenizing SEPA payments.
 */
function SEPA(options) {
  var getConfiguration = options.client.getConfiguration();

  this._client = options.client;
  this._assetsUrl =
    getConfiguration.gatewayConfiguration.assetsUrl + "/web/" + VERSION;
  this._isDebug = getConfiguration.isDebug;
  if (options.redirectUrl) {
    this._returnUrl = options.redirectUrl;
    this._cancelUrl = options.redirectUrl + "?cancel=1";
    this._isRedirectFlow = true;
  } else {
    this._returnUrl = this._assetsUrl + "/html/redirect-frame.html?success=1";
    this._cancelUrl = this._assetsUrl + "/html/redirect-frame.html?cancel=1";
  }
  if (options.tokenizePayload) {
    this.tokenizePayload = options.tokenizePayload;
  }

  analytics.sendEvent(this._client, "sepa.component.initialized");
}

/**
 * SEPA tokenize payload.
 * @typedef SEPA~tokenizePayload
 * @property {string} nonce The payment nonce.
 * @property {string} ibanLastFour The last four digits of the customer's IBAN.
 * @property {string} mandateType The specified mandateType used.
 * @property {string} customerId The provided customer id.
 */

/**
 * @public
 * @param {object} options All options for intiating the SEPA payment flow.
 * @param {string} [options.accountHolderName] The account holder name.
 * @param {string} [options.customerId] The customer's id.
 * @param {string} [options.iban] The customer's International Bank Account Number.
 * @param {string} [options.mandateType] Specify ONE_OFF or RECURRENT payment.
 * @param {string} [options.countryCode] The customer's country code.
 * @param {string} [options.merchantAccountId] The merchant's account id.
 * @param {callback} [callback] The first argument is an error object, where the second is a {@link SEPA~tokenizePayload|tokenizePayload}
 * @returns {(Promise<tokenizePayload|error>)} Returns a promise if no callback is provided.
 *
 * @example
 * button.addEventListener('click', function () {
 *   var tokenizeInputs = {
 *     accountHolderName: "some-accnt-holder-name",
 *     customerId: "a-customer-id",
 *     iban: "a-full-iban",
 *     mandateType: "ONE_OFF",
 *     countryCode: "LI",
 *     merchantAccountId: "a-merchant-account-id"
 *   }
 *   sepaInstance.tokenize(tokenizeInputs).then(function (payload) {
 *      // Submit payload.nonce to your server
 *   }).catch(function(tokenizationErr) {
 *     // Handle errors in the flow
 *   })
 * })
 */
SEPA.prototype.tokenize = function (options) {
  var self = this;
  var popupPromise;
  var createMandateOptions = assign(
    { cancelUrl: self._cancelUrl, returnUrl: self._returnUrl },
    options
  );

  if (!options || hasMissingOption(options, constants.REQUIRED_OPTIONS)) {
    analytics.sendEvent(self._client, "sepa.input-validation.missing-options");

    return Promise.reject(
      new BraintreeError(sepaErrors.SEPA_TOKENIZE_MISSING_REQUIRED_OPTION)
    );
  }

  if (!constants.MANDATE_TYPE_ENUM.includes(options.mandateType)) {
    analytics.sendEvent(self._client, "sepa.input-validation.invalid-mandate");

    return Promise.reject(
      new BraintreeError(sepaErrors.SEPA_INVALID_MANDATE_TYPE)
    );
  }

  popupPromise = mandates
    .createMandate(self._client, createMandateOptions)
    .then(function (mandateResponse) {
      analytics.sendEvent(self._client, "sepa.create-mandate.success");

      if (self._isRedirectFlow) {
        return mandates.redirectPage(mandateResponse.approvalUrl);
      }

      options.last4 = mandateResponse.last4;
      options.bankReferenceToken = mandateResponse.bankReferenceToken;

      return mandates.openPopup(self._client, {
        approvalUrl: mandateResponse.approvalUrl,
        assetsUrl: self._assetsUrl,
      });
    });

  // Must be outside of .then() to return from top-level function
  if (self._isRedirectFlow) {
    return Promise.resolve();
  }

  // At this point, we know the promise came from the popup flow
  return popupPromise
    .then(function () {
      analytics.sendEvent(self._client, "sepa.mandate.approved");

      return mandates.handleApproval(self._client, {
        bankReferenceToken: options.bankReferenceToken,
        last4: options.last4,
        customerId: options.customerId,
        mandateType: options.mandateType,
        merchantAccountId: options.merchantAccountId,
      });
    })
    .then(function (approval) {
      analytics.sendEvent(self._client, "sepa.tokenization.success");

      return Promise.resolve(approval);
    })
    .catch(function (err) {
      analytics.sendEvent(self._client, "sepa." + err.details + ".failed");

      return Promise.reject(err);
    });
};

module.exports = wrapPromise.wrapPrototype(SEPA);
