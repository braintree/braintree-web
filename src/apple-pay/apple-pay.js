// @ts-nocheck
import BraintreeError from "../lib/braintree-error";
import analytics from "../lib/analytics";
import assets from "../lib/assets";
import * as constants from "./constants";
import errors from "./errors";
import methods from "../lib/methods";
import convertMethodsToError from "../lib/convert-methods-to-error";
import inIframe from "../lib/in-iframe";

// Maps the GraphQL `supportedCardBrands` enum values from the gateway
// configuration to the network identifiers Apple Pay expects in a
// payment request's `supportedNetworks`. Brands without an Apple Pay
// equivalent are omitted.
var SUPPORTED_NETWORKS_BY_CARD_BRAND = {
  VISA: "visa",
  MASTERCARD: "masterCard",
  DISCOVER: "discover",
  AMERICAN_EXPRESS: "amex",
  INTERNATIONAL_MAESTRO: "maestro",
  ELO: "elo",
};

/**
 * @typedef {object} ApplePay~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {object} details Additional details.
 * @property {string} details.cardType Type of card, ex: Visa, MasterCard.
 * @property {string} details.cardHolderName The name of the card holder.
 * @property {string} details.dpanLastTwo Last two digits of card number.
 * @property {boolean} details.isDeviceToken Whether this tokenized card is a
 * device-specific account number (DPAN) ('true') or merchant/cloud token (MPAN) ('false').
 * @property {string} description A human-readable description.
 * @property {string} type The payment method type, always `ApplePayCard`.
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
 * An Apple Pay Payment Authorization Event object.
 * @typedef {object} ApplePayPaymentAuthorizedEvent
 * @external ApplePayPaymentAuthorizedEvent
 * @see {@link https://developer.apple.com/reference/applepayjs/applepaypaymentauthorizedevent ApplePayPaymentAuthorizedEvent}
 */

/**
 * An Apple Pay Payment Request object.
 * @typedef {object} ApplePayPaymentRequest
 * @external ApplePayPaymentRequest
 * @see {@link https://developer.apple.com/reference/applepayjs/1916082-applepay_js_data_types/paymentrequest PaymentRequest}
 */

/**
 * @class
 * @param {object} options Options
 * @description <strong>You cannot use this constructor directly. Use {@link module:braintree-web/apple-pay.create|braintree.applePay.create} instead.</strong>
 * @classdesc This class represents an Apple Pay component. Instances of this class have methods for validating the merchant server and tokenizing payments.
 */
function ApplePay(options) {
  this._instantiatedWithClient = Boolean(!options.useDeferredClient);
  this._client = options.client;
  this._createPromise = options.createPromise;
  this._shouldLoadApplePaySDK = options.loadApplePaySDK !== false;

  if (this._client) {
    this._setMerchantIdentifier();
  }

  this._sdkLoadPromise = this._loadApplePaySDK();
}

ApplePay.prototype._loadApplePaySDK = async function () {
  try {
    await this._waitForClient();
  } catch {
    // Deferred client failed; it's surfaced via create(). Stop the SDK load.
    return;
  }

  if (!this._shouldLoadApplePaySDK) {
    analytics.sendEvent(this._client, "applepay.sdk.load.skipped");

    return;
  }

  analytics.sendEvent(this._client, "applepay.sdk.load.started");

  try {
    await assets.loadScript({
      src: constants.APPLE_PAY_SDK_URL,
      crossorigin: "anonymous",
    });
  } catch {
    analytics.sendEvent(this._client, "applepay.sdk.load.failed");

    return;
  }

  analytics.sendEvent(this._client, "applepay.sdk.load.succeeded");
};

ApplePay.prototype._waitForClient = function () {
  if (this._client) {
    return Promise.resolve();
  }

  return this._createPromise.then(
    function (client) {
      this._client = client;

      this._setMerchantIdentifier();
    }.bind(this)
  );
};

ApplePay.prototype._setMerchantIdentifier = function () {
  var applePayConfig =
    this._client.getConfiguration().gatewayConfiguration.applePayWeb;

  if (!applePayConfig) {
    return;
  }
  /**
   * @name ApplePay#merchantIdentifier
   * @description A special merchant ID which represents the merchant association with Braintree. Pass it to `ApplePaySession.applePayCapabilities` when checking payment capability directly, or use {@link ApplePay#applePayCapabilities} which supplies it for you.
   * @example
   * ApplePaySession.applePayCapabilities(applePayInstance.merchantIdentifier).then(function (result) {
   *   if (result.paymentCredentialStatus === "paymentCredentialsAvailable") {
   *     // Set up Apple Pay buttons
   *   }
   * });
   */
  Object.defineProperty(this, "merchantIdentifier", {
    value: applePayConfig.merchantIdentifier,
    configurable: false,
    writable: false,
  });
};

/**
 * Merges a payment request with Braintree defaults to return an {external:ApplePayPaymentRequest}.
 *
 * The following properties are assigned to `paymentRequest` if not already defined. Their default values come from the Braintree gateway.
 * - `countryCode`
 * - `currencyCode`
 * - `merchantCapabilities`
 * - `supportedNetworks`
 * @public
 * @param {external:ApplePayPaymentRequest} paymentRequest The payment request details to apply on top of those from Braintree.
 * @returns {external:ApplePayPaymentRequest|Promise} The decorated `paymentRequest` object. If `useDeferredClient` is used along with an `authorization`, this method will return a promise that resolves with the `paymentRequest` object.
 * @example
 * const applePay = require('braintree-web/apple-pay');
 *
 * try {
 *   const applePayInstance = await applePay.create({client: clientInstance});
 *
 *   const paymentRequest = applePayInstance.createPaymentRequest({
 *     total: {
 *       label: 'My Company',
 *       amount: '19.99'
 *     }
 *   });
 *
 *   const session = new ApplePaySession(3, paymentRequest);
 *
 *   // ...
 * } catch (applePayErr) {
 *   // Handle error here
 * }
 * @example <caption>With deferred client</caption>
 * const applePay = require('braintree-web/apple-pay');
 *
 * try {
 *   const applePayInstance = await applePay.create({
 *     authorization: 'client-token-or-tokenization-key',
 *     useDeferredClient: true
 *   });
 *
 *   const paymentRequest = await applePayInstance.createPaymentRequest({
 *     total: {
 *       label: 'My Company',
 *       amount: '19.99'
 *     }
 *   });
 *
 *   const session = new ApplePaySession(3, paymentRequest);
 *
 *   // ...
 * } catch (applePayErr) {
 *   // Handle error here
 * }
 */
ApplePay.prototype.createPaymentRequest = function (paymentRequest) {
  if (this._instantiatedWithClient) {
    return this._createPaymentRequestSynchronously(paymentRequest);
  }

  return this._waitForClient().then(
    function () {
      return this._createPaymentRequestSynchronously(paymentRequest);
    }.bind(this)
  );
};

ApplePay.prototype._createPaymentRequestSynchronously = function (
  paymentRequest
) {
  var applePay =
    this._client.getConfiguration().gatewayConfiguration.applePayWeb;
  var defaults = {
    countryCode: applePay.countryCode,
    currencyCode: applePay.currencyCode,
    merchantCapabilities: applePay.merchantCapabilities || ["supports3DS"],
    supportedNetworks: applePay.supportedCardBrands.reduce(function (
      networks,
      cardBrand
    ) {
      if (SUPPORTED_NETWORKS_BY_CARD_BRAND.hasOwnProperty(cardBrand)) {
        networks.push(SUPPORTED_NETWORKS_BY_CARD_BRAND[cardBrand]);
      }

      return networks;
    }, []),
  };

  return Object.assign({}, defaults, paymentRequest);
};

/**
 * Validates your merchant website, as required by `ApplePaySession` before payment can be authorized.
 * @public
 * @param {object} options Options
 * @param {string} options.validationURL The validationURL from an `ApplePayValidateMerchantEvent`.
 * @param {string} options.displayName The canonical name for your store. Use a non-localized name. This parameter should be a UTF-8 string that is a maximum of 64 characters. The system may display this name to the user.
 * @returns {Promise} Returns a promise that resolves when validation is complete.
 * @example
 * var applePay = require('braintree-web/apple-pay');
 * var applePayInstance;
 *
 * applePay.create({client: clientInstance}).then(function (instance) {
 *   applePayInstance = instance;
 *
 *   return applePayInstance.createPaymentRequest({
 *     total: {
 *       label: 'My Company',
 *       amount: '19.99'
 *     }
 *   });
 * }).then(function (paymentRequest) {
 *   var session = new ApplePaySession(3, paymentRequest);
 *
 *   session.onvalidatemerchant = function (event) {
 *     applePayInstance.performValidation({
 *       validationURL: event.validationURL,
 *       displayName: 'My Great Store'
 *     }).then(function (validationData) {
 *       session.completeMerchantValidation(validationData);
 *     }).catch(function (validationErr) {
 *       console.error(validationErr);
 *       session.abort();
 *     });
 *   };
 * }).catch(function (applePayErr) {
 *   // Handle error here
 * });
 */
ApplePay.prototype.performValidation = function (options) {
  var self = this;

  if (!options || !options.validationURL) {
    return Promise.reject(
      new BraintreeError(errors.APPLE_PAY_VALIDATION_URL_REQUIRED)
    );
  }

  return this._waitForClient()
    .then(function () {
      var applePayWebSession = {
        validationUrl: options.validationURL,
        domainName:
          options.domainName ||
          (inIframe()
            ? window.parent.location.hostname
            : window.location.hostname),
        merchantIdentifier:
          options.merchantIdentifier || self.merchantIdentifier,
      };

      if (options.displayName != null) {
        applePayWebSession.displayName = options.displayName;
      }

      return self._client.request({
        method: "post",
        endpoint: "apple_pay_web/sessions",
        data: {
          _meta: { source: "apple-pay" },
          applePayWebSession: applePayWebSession,
        },
      });
    })
    .then(function (response) {
      analytics.sendEvent(self._client, "applepay.performValidation.succeeded");

      return response;
    })
    .catch(function (err) {
      analytics.sendEvent(self._client, "applepay.performValidation.failed");

      if (err.code === "CLIENT_REQUEST_ERROR") {
        throw new BraintreeError({
          type: errors.APPLE_PAY_MERCHANT_VALIDATION_FAILED.type,
          code: errors.APPLE_PAY_MERCHANT_VALIDATION_FAILED.code,
          message: errors.APPLE_PAY_MERCHANT_VALIDATION_FAILED.message,
          details: {
            originalError: err.details.originalError,
          },
        });
      }

      throw new BraintreeError({
        type: errors.APPLE_PAY_MERCHANT_VALIDATION_NETWORK.type,
        code: errors.APPLE_PAY_MERCHANT_VALIDATION_NETWORK.code,
        message: errors.APPLE_PAY_MERCHANT_VALIDATION_NETWORK.message,
        details: {
          originalError: err,
        },
      });
    });
};

/**
 * Tokenizes an Apple Pay payment. This will likely be called in your `ApplePaySession`'s `onpaymentauthorized` callback.
 * @public
 * @param {object} options Options
 * @param {object} options.token The `payment.token` property of an {@link external:ApplePayPaymentAuthorizedEvent}.
 * @returns {Promise} Returns a promise that resolves when the tokenization is complete.
 * @example
 * var applePay = require('braintree-web/apple-pay');
 * var applePayInstance;
 *
 * applePay.create({client: clientInstance}).then(function (instance) {
 *   applePayInstance = instance;
 *
 *   return applePayInstance.createPaymentRequest({
 *     total: {
 *       label: 'My Company',
 *       amount: '19.99'
 *     }
 *   });
 * }).then(function (paymentRequest) {
 *   var session = new ApplePaySession(3, paymentRequest);
 *
 *   session.onpaymentauthorized = function (event) {
 *     applePayInstance.tokenize({
 *       token: event.payment.token
 *     }).then(function (tokenizedPayload) {
 *       // Send the tokenizedPayload to your server here!
 *       // Once the transaction is complete, call completePayment
 *       // to close the Apple Pay sheet
 *       session.completePayment(ApplePaySession.STATUS_SUCCESS);
 *     }).catch(function (tokenizeErr) {
 *       session.completePayment(ApplePaySession.STATUS_FAILURE);
 *     });
 *   };
 * }).catch(function (applePayErr) {
 *   // Handle error here
 * });
 */
ApplePay.prototype.tokenize = function (options) {
  var self = this;

  if (!options.token) {
    return Promise.reject(
      new BraintreeError(errors.APPLE_PAY_PAYMENT_TOKEN_REQUIRED)
    );
  }

  return this._waitForClient()
    .then(function () {
      return self._client.request({
        method: "post",
        endpoint: "payment_methods/apple_payment_tokens",
        data: {
          _meta: {
            source: "apple-pay",
          },
          applePaymentToken: Object.assign({}, options.token, {
            // The gateway requires this key to be base64-encoded.
            paymentData: btoa(JSON.stringify(options.token.paymentData)),
          }),
        },
      });
    })
    .then(function (response) {
      analytics.sendEvent(self._client, "applepay.tokenize.succeeded");

      return response.applePayCards[0];
    })
    .catch(function (err) {
      analytics.sendEvent(self._client, "applepay.tokenize.failed");

      throw new BraintreeError({
        type: errors.APPLE_PAY_TOKENIZATION.type,
        code: errors.APPLE_PAY_TOKENIZATION.code,
        message: errors.APPLE_PAY_TOKENIZATION.message,
        details: {
          originalError: err,
        },
      });
    });
};

/**
 * Checks the Apple Pay capability.
 * @public
 * @example
 * applePayInstance.applePayCapabilities().then(function (result) {
 *   if (result.paymentCredentialStatus === "paymentCredentialsAvailable") {
 *     // Set up Apple Pay buttons
 *   }
 * });
 * @returns {Promise<object>} Resolves with Apple's `PaymentCredentialStatusResponse`
 * (`{ paymentCredentialStatus }`, one of `paymentCredentialsAvailable`,
 * `paymentCredentialStatusUnknown`, `paymentCredentialsUnavailable`, or
 * `applePayUnsupported`).
 */
ApplePay.prototype.applePayCapabilities = function () {
  var self = this;

  return this._waitForClient()
    .then(function () {
      return self._sdkLoadPromise;
    })
    .then(function () {
      if (
        !window.ApplePaySession ||
        typeof window.ApplePaySession.applePayCapabilities !== "function"
      ) {
        throw new BraintreeError(errors.APPLE_PAY_SDK_NOT_LOADED);
      }

      return window.ApplePaySession.applePayCapabilities(
        self.merchantIdentifier
      );
    })
    .then(function (result) {
      analytics.sendEvent(self._client, "applepay.capabilities.succeeded");

      return result;
    })
    .catch(function (err) {
      analytics.sendEvent(self._client, "applepay.capabilities.failed");

      throw err;
    });
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/apple-pay.create|create}.
 * @public
 * @example
 * applePayInstance.teardown().then(function () {
 *   // teardown is complete
 * });
 * @returns {Promise} Returns a promise that resolves once teardown is complete.
 */
ApplePay.prototype.teardown = function () {
  convertMethodsToError(this, methods(ApplePay.prototype));

  this._sdkLoadPromise = null;

  return Promise.resolve();
};

export default ApplePay;
