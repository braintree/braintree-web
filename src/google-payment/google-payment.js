"use strict";

var analytics = require("../lib/analytics");
var assign = require("../lib/assign").assign;
var convertMethodsToError = require("../lib/convert-methods-to-error");
var find = require("../lib/find");
var generateGooglePayConfiguration = require("../lib/generate-google-pay-configuration");
var BraintreeError = require("../lib/braintree-error");
var errors = require("./errors");
var methods = require("../lib/methods");
var Promise = require("../lib/promise");
var wrapPromise = require("@braintree/wrap-promise");

var CREATE_PAYMENT_DATA_REQUEST_METHODS = {
  1: "_createV1PaymentDataRequest",
  2: "_createV2PaymentDataRequest",
};

/**
 * @typedef {object} GooglePayment~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {object} details Additional account details.
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard.
 * @property {string} details.lastFour Last four digits of card number.
 * @property {string} details.lastTwo Last two digits of card number.
 * @property {boolean} details.isNetworkTokenized True if the card is network tokenized.
 * @property {string} details.bin First six digits of card number.
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
 * @class GooglePayment
 * @param {object} options Google Payment {@link module:braintree-web/google-payment.create create} options.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/google-payment.create|braintree-web.google-payment.create} instead.</strong>
 * @classdesc This class represents a Google Payment component produced by {@link module:braintree-web/google-payment.create|braintree-web/google-payment.create}. Instances of this class have methods for initializing the Google Pay flow.
 */
function GooglePayment(options) {
  this._createPromise = options.createPromise;
  this._client = options.client;
  this._useDeferredClient = options.useDeferredClient;
  // NEXT_MAJOR_VERSION this should be updated to 2 (or whatever the current latest version is)
  this._googlePayVersion = options.googlePayVersion || 1;
  this._googleMerchantId = options.googleMerchantId;

  if (this._isUnsupportedGooglePayAPIVersion()) {
    throw new BraintreeError({
      code: errors.GOOGLE_PAYMENT_UNSUPPORTED_VERSION.code,
      message:
        "The Braintree SDK does not support Google Pay version " +
        this._googlePayVersion +
        ". Please upgrade the version of your Braintree SDK and contact support if this error persists.",
      type: errors.GOOGLE_PAYMENT_UNSUPPORTED_VERSION.type,
    });
  }
}

GooglePayment.prototype._waitForClient = function () {
  if (this._client) {
    return Promise.resolve();
  }

  return this._createPromise.then(
    function (client) {
      this._client = client;
    }.bind(this)
  );
};

GooglePayment.prototype._isUnsupportedGooglePayAPIVersion = function () {
  // if we don't have createPaymentDatqRequest method for the specific
  // API version, then the version is not supported
  return !(this._googlePayVersion in CREATE_PAYMENT_DATA_REQUEST_METHODS);
};

GooglePayment.prototype._getDefaultConfig = function () {
  if (!this._defaultConfig) {
    this._defaultConfig = generateGooglePayConfiguration(
      this._client.getConfiguration(),
      this._googlePayVersion,
      this._googleMerchantId
    );
  }

  return this._defaultConfig;
};

GooglePayment.prototype._createV1PaymentDataRequest = function (
  paymentDataRequest
) {
  var defaultConfig = this._getDefaultConfig();
  var overrideCardNetworks =
    paymentDataRequest.cardRequirements &&
    paymentDataRequest.cardRequirements.allowedCardNetworks;
  var defaultConfigCardNetworks =
    defaultConfig.cardRequirements.allowedCardNetworks;
  var allowedCardNetworks = overrideCardNetworks || defaultConfigCardNetworks;

  paymentDataRequest = assign({}, defaultConfig, paymentDataRequest);

  // this way we can preserve allowedCardNetworks from default integration
  // if merchant did not pass any in `cardRequirements`
  paymentDataRequest.cardRequirements.allowedCardNetworks = allowedCardNetworks;

  return paymentDataRequest;
};

GooglePayment.prototype._createV2PaymentDataRequest = function (
  paymentDataRequest
) {
  var defaultConfig = this._getDefaultConfig();

  if (paymentDataRequest.allowedPaymentMethods) {
    paymentDataRequest.allowedPaymentMethods.forEach(function (paymentMethod) {
      var defaultPaymentMethod = find(
        defaultConfig.allowedPaymentMethods,
        "type",
        paymentMethod.type
      );

      if (defaultPaymentMethod) {
        applyDefaultsToPaymentMethodConfiguration(
          paymentMethod,
          defaultPaymentMethod
        );
      }
    });
  }

  paymentDataRequest = assign({}, defaultConfig, paymentDataRequest);

  return paymentDataRequest;
};

/**
 * Create a configuration object for use in the `loadPaymentData` method.
 *
 * **Note**: Version 1 of the Google Pay Api is deprecated and will become unsupported in a future version. Until then, version 1 will continue to be used by default, and version 1 schema parameters and overrides will remain functional on existing integrations. However, new integrations and all following examples will be presented in the GooglePay version 2 schema. See [Google Pay's upgrade guide](https://developers.google.com/pay/api/web/guides/resources/update-to-latest-version) to see how to update your integration.
 *
 * If `options.googlePayVersion === 2` was set during the initial {@link module:braintree-web/google-payment.create|create} call, overrides must match the Google Pay v2 schema to be valid.
 *
 * @public
 * @param {object} overrides The supplied parameters for creating the PaymentDataRequest object. Required parameters are:
 *  @param {object} overrides.transactionInfo Object according to the [Google Pay Transaction Info](https://developers.google.com/pay/api/web/reference/object#TransactionInfo) spec.
 *  Optionally, any of the parameters in the [PaymentDataRequest](https://developers.google.com/pay/api/web/reference/object#PaymentDataRequest) parameters can be overridden, but note that it is recommended only to override top level parameters to avoid squashing deeply nested configuration objects. An example can be found below showing how to safely edit these deeply nested objects.
 * @example
 * var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
 *   merchantInfo: {
 *     merchantId: 'my-merchant-id-from-google'
 *   },
 *   transactionInfo: {
 *     currencyCode: 'USD',
 *     totalPriceStatus: 'FINAL',
 *     totalPrice: '100.00'
 *   }
 * });
 *
 * // Update card payment methods to require billing address
 * var cardPaymentMethod = paymentDataRequest.allowedPaymentMethods;
 * cardPaymentMethod.parameters.billingAddressRequired = true;
 * cardPaymentMethod.parameters.billingAddressParameters = {
 *   format: 'FULL',
 *   phoneNumberRequired: true
 * };
 *
 * var paymentsClient = new google.payments.api.PaymentsClient({
 *   environment: 'TEST' // or 'PRODUCTION'
 * })
 *
 * paymentsClient.loadPaymentData(paymentDataRequest).then(function (response) {
 *   // handle response with googlePaymentInstance.parseResponse
 *   // (see below)
 * });
 * @example <caption>With deferred client</caption>
 * googlePaymentInstance.createPaymentDataRequest({
 *   merchantInfo: {
 *     merchantId: 'my-merchant-id-from-google'
 *   },
 *   transactionInfo: {
 *     currencyCode: 'USD',
 *     totalPriceStatus: 'FINAL',
 *     totalPrice: '100.00'
 *   }
 * }).then(function (paymentDataRequest) {
 *   // Update card payment methods to require billing address
 *   var cardPaymentMethod = paymentDataRequest.allowedPaymentMethods;
 *   cardPaymentMethod.parameters.billingAddressRequired = true;
 *   cardPaymentMethod.parameters.billingAddressParameters = {
 *     format: 'FULL',
 *     phoneNumberRequired: true
 *   };
 *
 *   var paymentsClient = new google.payments.api.PaymentsClient({
 *     environment: 'TEST' // or 'PRODUCTION'
 *   })
 *
 *   return paymentsClient.loadPaymentData(paymentDataRequest);
 * }).then(function (response) {
 *   // handle response with googlePaymentInstance.parseResponse
 *   // (see below)
 * });
 * @returns {object|Promise} Returns a configuration object for Google PaymentDataRequest. If instantiated with `useDeferredClient` and an `authorization` it will return a promise that resolves with the configuration.
 */
GooglePayment.prototype.createPaymentDataRequest = function (overrides) {
  if (!this._useDeferredClient) {
    return this._createPaymentDataRequestSyncronously(overrides);
  }

  return this._waitForClient().then(
    function () {
      return this._createPaymentDataRequestSyncronously(overrides);
    }.bind(this)
  );
};

GooglePayment.prototype._createPaymentDataRequestSyncronously = function (
  overrides
) {
  var paymentDataRequest = assign({}, overrides);
  var version = this._googlePayVersion;
  var createPaymentDataRequestMethod =
    CREATE_PAYMENT_DATA_REQUEST_METHODS[version];

  analytics.sendEvent(
    this._createPromise,
    "google-payment.v" + version + ".createPaymentDataRequest"
  );

  return this[createPaymentDataRequestMethod](paymentDataRequest);
};

/**
 * Parse the response from the tokenization.
 * @public
 * @param {object} response The response back from the Google Pay tokenization.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link GooglePay~tokenizePayload|tokenizePayload}. If no callback is provided, `parseResponse` returns a promise that resolves with a {@link GooglePayment~tokenizePayload|tokenizePayload}.
 * @example with callback
 * var paymentsClient = new google.payments.api.PaymentsClient({
 *   environment: 'TEST' // or 'PRODUCTION'
 * })
 *
 * paymentsClient.loadPaymentData(paymentDataRequestFromCreatePaymentDataRequest).then(function (response) {
 *   googlePaymentInstance.parseResponse(response, function (err, data) {
 *     if (err) {
 *       // handle errors
 *     }
 *     // send parsedResponse.nonce to your server
 *   });
 * });
 * @example with promise
 * var paymentsClient = new google.payments.api.PaymentsClient({
 *   environment: 'TEST' // or 'PRODUCTION'
 * })
 *
 * paymentsClient.loadPaymentData(paymentDataRequestFromCreatePaymentDataRequest).then(function (response) {
 *   return googlePaymentInstance.parseResponse(response);
 * }).then(function (parsedResponse) {
 *   // send parsedResponse.nonce to your server
 * }).catch(function (err) {
 *   // handle errors
 * });
 * @returns {(Promise|void)} Returns a promise that resolves the parsed response if no callback is provided.
 */
GooglePayment.prototype.parseResponse = function (response) {
  var self = this;

  return Promise.resolve()
    .then(function () {
      var payload;
      var rawResponse =
        response.apiVersion === 2
          ? response.paymentMethodData.tokenizationData.token
          : response.paymentMethodToken.token;
      var parsedResponse = JSON.parse(rawResponse);
      var error = parsedResponse.error;

      if (error) {
        return Promise.reject(error);
      }

      analytics.sendEvent(
        self._createPromise,
        "google-payment.parseResponse.succeeded"
      );

      if (parsedResponse.paypalAccounts) {
        payload = parsedResponse.paypalAccounts[0];
        analytics.sendEvent(
          self._createPromise,
          "google-payment.parseResponse.succeeded.paypal"
        );

        return Promise.resolve({
          nonce: payload.nonce,
          type: payload.type,
          description: payload.description,
        });
      }
      payload = parsedResponse.androidPayCards[0];
      analytics.sendEvent(
        self._createPromise,
        "google-payment.parseResponse.succeeded.google-payment"
      );

      return Promise.resolve({
        nonce: payload.nonce,
        type: payload.type,
        description: payload.description,
        details: {
          cardType: payload.details.cardType,
          lastFour: payload.details.lastFour,
          lastTwo: payload.details.lastTwo,
          isNetworkTokenized: payload.details.isNetworkTokenized,
          bin: payload.details.bin,
        },
        binData: payload.binData,
      });
    })
    .catch(function (error) {
      analytics.sendEvent(
        self._createPromise,
        "google-payment.parseResponse.failed"
      );

      return Promise.reject(
        new BraintreeError({
          code: errors.GOOGLE_PAYMENT_GATEWAY_ERROR.code,
          message: errors.GOOGLE_PAYMENT_GATEWAY_ERROR.message,
          type: errors.GOOGLE_PAYMENT_GATEWAY_ERROR.type,
          details: {
            originalError: error,
          },
        })
      );
    });
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/google-payment.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * googlePaymentInstance.teardown();
 * @example <caption>With callback</caption>
 * googlePaymentInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
GooglePayment.prototype.teardown = function () {
  convertMethodsToError(this, methods(GooglePayment.prototype));

  return Promise.resolve();
};

function applyDefaultsToPaymentMethodConfiguration(
  merchantSubmittedPaymentMethod,
  defaultPaymentMethod
) {
  Object.keys(defaultPaymentMethod).forEach(function (parameter) {
    if (typeof defaultPaymentMethod[parameter] === "object") {
      merchantSubmittedPaymentMethod[parameter] = assign(
        {},
        defaultPaymentMethod[parameter],
        merchantSubmittedPaymentMethod[parameter]
      );
    } else {
      merchantSubmittedPaymentMethod[parameter] =
        merchantSubmittedPaymentMethod[parameter] ||
        defaultPaymentMethod[parameter];
    }
  });
}

module.exports = wrapPromise.wrapPrototype(GooglePayment);
