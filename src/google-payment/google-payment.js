// @ts-nocheck
import analytics from "../lib/analytics";
import { assign } from "../lib/assign";
import convertMethodsToError from "../lib/convert-methods-to-error";
import find from "../lib/find";
import generateGooglePayConfiguration from "./generate-google-pay-configuration";
import BraintreeError from "../lib/braintree-error";
import errors from "./errors";
import methods from "../lib/methods";

var CREATE_PAYMENT_DATA_REQUEST_METHODS = {
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
 * @property {string} binData.business Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.consumer Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.purchase Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} binData.corporate Possible values: 'Yes', 'No', 'Unknown'.
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
  this._googlePayVersion = 2;
  this._googleMerchantId = options.googleMerchantId;

  if (this._isUnsupportedGooglePayAPIVersion()) {
    throw new BraintreeError({
      code: errors.GOOGLE_PAYMENT_UNSUPPORTED_VERSION.code,
      message:
        "The Braintree SDK only supports version 2 of the Google Pay API. Please upgrade the version of your Braintree SDK and contact support if this error persists.",
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
 * **Important**: The Braintree SDK Google Pay component now only supports Google Pay API version 2. When calling Google Pay API methods
 * such as `isReadyToPay()` and `loadPaymentData()`, you MUST set `apiVersion: 2` in the configuration object.
 * Using `apiVersion: 1` will cause errors and unexpected behavior as the SDK generates v2-compatible payment requests.
 *
 * @public
 * @param {object} overrides The supplied parameters for creating the PaymentDataRequest object. Required parameters are:
 * @param {object} overrides.transactionInfo Object according to the [Google Pay Transaction Info](https://developers.google.com/pay/api/web/reference/object#TransactionInfo) spec.
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
 * });
 *
 * // IMPORTANT: You must use apiVersion: 2 when calling Google Pay API methods
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
 *   });
 *
 *   // IMPORTANT: You must use apiVersion: 2 when calling Google Pay API methods
 *   return paymentsClient.loadPaymentData(paymentDataRequest);
 * }).then(function (response) {
 *   // handle response with googlePaymentInstance.parseResponse
 *   // (see below)
 * });
 * @returns {Promise} Returns a promise that resolves with the configuration object for Google PaymentDataRequest.
 */
GooglePayment.prototype.createPaymentDataRequest = function (overrides) {
  if (!this._useDeferredClient) {
    return this._createPaymentDataRequestSynchronously(overrides);
  }

  return this._waitForClient().then(
    function () {
      return this._createPaymentDataRequestSynchronously(overrides);
    }.bind(this)
  );
};

GooglePayment.prototype._createPaymentDataRequestSynchronously = function (
  overrides
) {
  var paymentDataRequest = assign({}, overrides);
  var version = this._googlePayVersion;
  var createPaymentDataRequestMethod =
    CREATE_PAYMENT_DATA_REQUEST_METHODS[version];

  if (
    paymentDataRequest.transactionInfo &&
    paymentDataRequest.transactionInfo.totalPrice
  ) {
    paymentDataRequest.transactionInfo.totalPrice =
      paymentDataRequest.transactionInfo.totalPrice.toString();
  }

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
 * @example
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
 * @returns {Promise} Returns a promise that resolves the parsed response.
 */
GooglePayment.prototype.parseResponse = function (response) {
  var self = this;
  var payload, rawResponse, parsedResponse, error;

  try {
    rawResponse =
      response.apiVersion === 2
        ? response.paymentMethodData.tokenizationData.token
        : response.paymentMethodToken.token;
    parsedResponse = JSON.parse(rawResponse);
    error = parsedResponse.error;

    if (error) {
      // oxlint-disable-next-line no-throw-literal
      throw error;
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
  } catch (error) {
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
  }
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/google-payment.create|create}.
 * @public
 * @example
 * googlePaymentInstance.teardown();
 * @returns {Promise} Returns a promise.
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

export default GooglePayment;
