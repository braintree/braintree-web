"use strict";

var atob = require("../lib/vendor/polyfill").atob;
var analytics = require("../lib/analytics");
var BraintreeError = require("../lib/braintree-error");
var constants = require("./constants");
var errors = require("./errors");
var querystring = require("../lib/querystring");
var wrapPromise = require("@braintree/wrap-promise");

/**
 * @class
 * @param {object} options see {@link module:braintree-web/instant-verification.create|instant-verification.create}
 * @classdesc This class represents an InstantVerification component. Instances of this class open an InstantVerification window for paying using banking account details in specific regions. Any additional UI, such as disabling the page while authentication is taking place, is up to the developer.
 *
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/instant-verification.create|braintree-web.instant-verification.create} instead.</strong>
 */
function InstantVerification(options) {
  this._instantiatedWithClient = Boolean(!options.useDeferredClient);
  this._client = options.client;
  this._createPromise = options.createPromise;

  analytics.sendEvent(
    this._client,
    "instant-verification.component.initialized"
  );
}

/**
 * Options used for startPayment
 * @typedef {object} InstantVerification~startPaymentOptions
 * @property {string} jwt - A JSON Web Token (JWT) containing the redirect URL and callback URL for the Instant Verification payment flow.
 */

/**
 * Initiates the Instant Verification payment flow by redirecting to the authorization page.
 * @public
 * @param {InstantVerification~startPaymentOptions} options The options for starting a payment session.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * button.addEventListener('click', function () {
 *   instantVerificationInstance.startPayment({
 *     jwt: 'JWT_STRING_FROM_YOUR_SERVER',
 *   }).catch(function (err) {
 *     // Handle error
 *     console.error(err);
 *   });
 * });
 */
InstantVerification.prototype.startPayment = function (options) {
  var self = this;

  var clientAuthFingerprint =
    self._client.getConfiguration().authorizationFingerprint;

  var redirectUrl = "";

  // Check if jwt is provided
  if (!options.jwt) {
    return Promise.reject(
      new BraintreeError(errors.INSTANT_VERIFICATION_JWT_REQUIRED)
    );
  }

  redirectUrl =
    getBaseUrl(self._client.getConfiguration()) +
    "?" +
    querystring.stringify({
      ct: options.jwt,
      at: clientAuthFingerprint,
    });

  // Just perform the redirect directly instead of using _createPromise
  if (typeof window !== "undefined" && window.location) {
    analytics.sendEvent(
      self._client,
      "instant-verification.redirect.initiated"
    );
    window.location.href = redirectUrl;
  }

  return Promise.resolve();
};

function getBaseUrl(configuration) {
  var url = constants.EXPERIENCE_URL.production;

  if (
    process.env.BRAINTREE_JS_ENV &&
    process.env.BRAINTREE_JS_ENV === "development"
  ) {
    url = constants.EXPERIENCE_URL.development;
  }
  if (
    configuration &&
    configuration.gatewayConfiguration &&
    configuration.gatewayConfiguration.environment &&
    constants.EXPERIENCE_URL[configuration.gatewayConfiguration.environment]
  ) {
    url =
      constants.EXPERIENCE_URL[configuration.gatewayConfiguration.environment];
  }

  return url;
}

/**
 * Handle redirect back to merchant page from Instant Verification experience.
 * @param {object} options - Options for the handling redirect back from Instant Verification UI.
 * @param {string} [options.success] URL query param returned from Instant Verification UI
 * @param {string} [options.cancel] URL query param return from Instant Verification UI
 * @param {string} [options.error] URL query param return from Instant Verification UI
 * @returns {Promise<string>|BraintreeError}  Returns a promise if no callback is provided.
 * If the redirect from the Instant Verification page is successful, the Promise will resolve with a nonce.
 * Otherwise, the promise rejects with a `BraintreeError`.
 * @example
 * const urlParams = new URL(window.location.href).searchParams;
 * instantVerificationInstance.handleRedirect({
 *   success: urlParams.get('success');,
 *   cancel: urlParams.get('cancel');,
 *   error: urlParams.get('error');
 * })
 * .then((result) => {
 *   if (result) {
 *     console.log('nonce: %s', result);
 *   } else {
 *     console.log('empty result');
 *   }
 * })
 * .catch((err) => {
 *   console.error(error: ${JSON.stringify(err)}`);
 * })
 */
InstantVerification.prototype.handleRedirect = function (options) {
  var self = this;
  var error, payload, nonce;

  if (options.success) {
    payload = JSON.parse(atob(options.success));

    analytics.sendEvent(
      self._client,
      "instant-verification.redirect.completed.success"
    );

    if (payload.tokenizedAccounts && payload.tokenizedAccounts[0]) {
      nonce = payload.tokenizedAccounts[0].tokenized_account;
    }

    return Promise.resolve(nonce);
  }

  if (options.cancel) {
    payload = JSON.parse(atob(options.cancel));
    analytics.sendEvent(
      self._client,
      "instant-verification.redirect.completed.canceled"
    );
    error = new BraintreeError(errors.INSTANT_VERIFICATION_CANCELED);
  }

  if (options.error) {
    payload = JSON.parse(atob(options.error));
    analytics.sendEvent(
      self._client,
      "instant-verification.redirect.completed.error"
    );
    error = new BraintreeError(errors.INSTANT_VERIFICATION_FAILURE);
  }

  return Promise.reject(error);
};

/**
 * Fetches ACH mandate details for a specific mandate ID.
 * @public
 * @param {object} options - Options for fetching ACH mandate details.
 * @param {string} options.mandateId - The ID of the mandate to retrieve details for.
 * @returns {Promise<object>} Returns a promise that resolves with the ACH mandate details.
 * If successful, the promise resolves with an object containing mandate information.
 * Otherwise, the promise rejects with a `BraintreeError`.
 * @example
 * instantVerificationInstance.getAchMandateDetails({
 *   mandateId: 'mandate-id-from-tokenization'
 * })
 * .then(function (mandateDetails) {
 *   console.log('Bank name:', mandateDetails.bankName);
 *   console.log('Account holder:', mandateDetails.accountHolderName);
 *   console.log('Last 4:', mandateDetails.last4);
 *   console.log('Routing number:', mandateDetails.routingNumber);
 * })
 * .catch(function (err) {
 *   if (err.code === 'INSTANT_VERIFICATION_MANDATE_ID_REQUIRED') {
 *     console.error('A mandate ID is required');
 *   } else if (err.code === 'INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED') {
 *     console.error('Failed to fetch mandate details:', err);
 *   }
 * });
 */
InstantVerification.prototype.getAchMandateDetails = function (options) {
  var self = this;
  var mandateId = options && options.mandateId;

  return new Promise(function (resolve, reject) {
    if (!mandateId) {
      reject(
        new BraintreeError(errors.INSTANT_VERIFICATION_MANDATE_ID_REQUIRED)
      );
      return;
    }
    self._client.request(
      {
        api: "graphQLApi",
        method: "post",
        data: {
          query: constants.ACH_MANDATE_DETAILS_QUERY,
          variables: { id: mandateId },
          operationName: "AchMandateDetails",
        },
      },
      function (err, response) {
        if (err) {
          analytics.sendEvent(
            self._client,
            "instant-verification.ach-mandate-details.failed"
          );

          reject(
            new BraintreeError({
              type: errors.INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED.type,
              code: errors.INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED.code,
              message:
                errors.INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED.message,
              details: { originalError: err },
            })
          );
          return;
        }

        if (!response.data || !response.data.node) {
          reject(
            new BraintreeError({
              type: errors.INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED.type,
              code: errors.INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED.code,
              message: "No mandate details found for the provided ID.",
            })
          );
          return;
        }

        var node = response.data.node;

        if (!node.details) {
          reject(
            new BraintreeError({
              type: errors.INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED.type,
              code: errors.INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED.code,
              message: "Mandate details are missing in the response.",
            })
          );
          return;
        }

        analytics.sendEvent(
          self._client,
          "instant-verification.ach-mandate-details.succeeded"
        );

        resolve(_formatMandateResponse(node));
      }
    );
  });
};

function _formatMandateResponse(nodeData) {
  return {
    accountHolderName: nodeData.details.accountholderName,
    accountType: nodeData.details.accountType,
    bankName: nodeData.details.bankName,
    last4: nodeData.details.last4,
    ownershipType: nodeData.details.ownershipType,
    routingNumber: nodeData.details.routingNumber,
  };
}

module.exports = wrapPromise.wrapPrototype(InstantVerification);
