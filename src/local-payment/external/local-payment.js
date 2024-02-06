"use strict";

var frameService = require("../../lib/frame-service/external");
var BraintreeError = require("../../lib/braintree-error");
var useMin = require("../../lib/use-min");
var VERSION = process.env.npm_package_version;
var INTEGRATION_TIMEOUT_MS =
  require("../../lib/constants").INTEGRATION_TIMEOUT_MS;
var analytics = require("../../lib/analytics");
var methods = require("../../lib/methods");
var convertMethodsToError = require("../../lib/convert-methods-to-error");
var convertToBraintreeError = require("../../lib/convert-to-braintree-error");
var ExtendedPromise = require("@braintree/extended-promise");
var querystring = require("../../lib/querystring");
var wrapPromise = require("@braintree/wrap-promise");
var constants = require("./constants");
var errors = require("../shared/errors");

var DEFAULT_WINDOW_WIDTH = 1282;
var DEFAULT_WINDOW_HEIGHT = 720;

ExtendedPromise.suppressUnhandledPromiseMessage = true;

/**
 * @class
 * @param {object} options see {@link module:braintree-web/local-payment.create|local-payment.create}
 * @classdesc This class represents a LocalPayment component. Instances of this class can open a LocalPayment window for paying with alternate payments local to a specific country. Any additional UI, such as disabling the page while authentication is taking place, is up to the developer.
 *
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/local-payment.create|braintree-web.local-payment.create} instead.</strong>
 */
function LocalPayment(options) {
  this._client = options.client;
  this._assetsUrl =
    options.client.getConfiguration().gatewayConfiguration.assetsUrl +
    "/web/" +
    VERSION;
  this._isDebug = options.client.getConfiguration().isDebug;
  this._loadingFrameUrl =
    this._assetsUrl +
    "/html/local-payment-landing-frame" +
    useMin(this._isDebug) +
    ".html";
  this._authorizationInProgress = false;
  this._paymentType = "unknown";
  this._merchantAccountId = options.merchantAccountId;
}

LocalPayment.prototype._initialize = function () {
  var self = this;
  var client = this._client;
  var failureTimeout = setTimeout(function () {
    analytics.sendEvent(client, "local-payment.load.timed-out");
  }, INTEGRATION_TIMEOUT_MS);

  return new Promise(function (resolve) {
    frameService.create(
      {
        name: "localpaymentlandingpage",
        dispatchFrameUrl:
          self._assetsUrl +
          "/html/dispatch-frame" +
          useMin(self._isDebug) +
          ".html",
        openFrameUrl: self._loadingFrameUrl,
      },
      function (service) {
        self._frameService = service;
        clearTimeout(failureTimeout);
        analytics.sendEvent(client, "local-payment.load.succeeded");
        resolve(self);
      }
    );
  });
};

/**
 * Options used for most local payment types.
 * @typedef {object} LocalPayment~StartPaymentOptions
 * @property {object} fallback Configuration for what to do when app switching back from a Bank app on a mobile device.
 * @property {string} fallback.buttonText The text to display in a button to redirect back to the merchant page.
 * @property {string} fallback.url The url to redirect to when the redirect button is pressed. Query params will be added to the url to process the data returned from the bank.
 * @property {string} fallback.cancelButtonText The text to display in a button to redirect back to the merchant page when the customer cancels. If no `cancelButtonText` is provided, `buttonText` will be used.
 * @property {string} fallback.cancelUrl The url to redirect to when the redirect button is pressed when the customer cancels. Query params will be added to the url to check the state of the payment. If no `cancelUrl` is provided, `url` will be used.
 * @property {object} [windowOptions] The options for configuring the window that is opened when starting the payment.
 * @property {number} [windowOptions.width=1282] The width in pixels of the window opened when starting the payment. The default width size is this large to allow various banking partner landing pages to display the QR Code to be scanned by the bank's mobile app. Many will not display the QR code when the window size is smaller than a standard desktop screen.
 * @property {number} [windowOptions.height=720] The height in pixels of the window opened when starting the payment.
 * @property {string} amount The amount to authorize for the transaction.
 * @property {string} currencyCode The currency to process the payment (three-character ISO-4217).
 * @property {string} [displayName] The merchant name displayed inside of the window that is opened when starting the payment.
 * @property {string} paymentType The type of local payment. See https://developer.paypal.com/braintree/docs/guides/local-payment-methods/client-side-custom
 * @property {string} paymentTypeCountryCode The country code of the local payment. This value must be one of the supported country codes for a given local payment type listed {@link https://developer.paypal.com/braintree/docs/guides/local-payment-methods/client-side-custom/javascript/v3#render-local-payment-method-buttons|here}. For local payments supported in multiple countries, this value may determine which banks are presented to the customer.
 * @property {string} email Payer email of the customer.
 * @property {string} givenName First name of the customer.
 * @property {string} surname Last name of the customer.
 * @property {string} phone Phone number of the customer.
 * @property {string} bic Bank Identification Code of the customer (specific to iDEAL transactions).
 * @property {boolean} recurrent Enable recurrent payment.
 * @property {string} customerId The customer's id in merchant's system (required for recurrent payments).
 * @property {boolean} shippingAddressRequired Indicates whether or not the payment needs to be shipped. For digital goods, this should be false. Defaults to false.
 * @property {object} address The shipping address.
 * @property {string} address.streetAddress Line 1 of the Address (eg. number, street, etc). An error will occur if this address is not valid.
 * @property {string} address.extendedAddress Line 2 of the Address (eg. suite, apt #, etc.). An error will occur if this address is not valid.
 * @property {string} address.locality Customer's city.
 * @property {string} address.region Customer's region or state.
 * @property {string} address.postalCode Customer's postal code.
 * @property {string} address.countryCode Customer's country code (two-character ISO 3166-1 code).
 * @property {function} onPaymentStart A function that will be called with two parameters: an object containing the  `paymentId` and a `continueCallback` that must be called to launch the flow. You can use method to do any preprocessing on your server before the flow begins..
 */

/**
 * Options used for the Pay Upon Invoice local payment type.
 * @typedef {object} LocalPayment~StartPaymentPayUponInvoiceOptions
 * @property {string} amount The amount to authorize for the transaction.
 * @property {string} currencyCode The currency to process the payment (three-character ISO-4217).
 * @property {string} [displayName] The merchant name displayed inside of the window that is opened when starting the payment.
 * @property {string} paymentType The type of local payment. Must be `pay_upon_invoice`.
 * @property {string} [paymentTypeCountryCode] The country code of the local payment. This value must be one of the supported country codes for a given local payment type listed {@link https://developer.paypal.com/braintree/docs/guides/local-payment-methods/client-side-custom/javascript/v3#render-local-payment-method-buttons|here}. For local payments supported in multiple countries, this value may determine which banks are presented to the customer.
 * @property {string} email Payer email of the customer.
 * @property {string} givenName First name of the customer.
 * @property {string} surname Last name of the customer.
 * @property {string} phone Phone number of the customer.
 * @property {string} phoneCountryCode The country calling code.
 * @property {string} birthDate The birth date of the customer in `YYYY-MM-DD` format.
 * @property {object} address The shipping address.
 * @property {string} address.streetAddress Line 1 of the Address (eg. number, street, etc). An error will occur if this address is not valid.
 * @property {string} [address.extendedAddress] Line 2 of the Address (eg. suite, apt #, etc.). An error will occur if this address is not valid.
 * @property {string} address.locality Customer's city.
 * @property {string} [address.region] Customer's region or state.
 * @property {string} address.postalCode Customer's postal code.
 * @property {string} address.countryCode Customer's country code (two-character ISO 3166-1 code).
 * @property {string} [shippingAmount] The shipping fee for all items. This value can not be a negative number.
 * @property {string} [discountAmount] The discount for all items. This value can not be a negative number.
 * @property {object} billingAddress The billing address.
 * @property {string} billingAddress.streetAddress Line 1 of the Address (eg. number, street, etc). An error will occur if this address is not valid.
 * @property {string} [billingAddress.extendedAddress] Line 2 of the Address (eg. suite, apt #, etc.). An error will occur if this address is not valid.
 * @property {string} billingAddress.locality Customer's city.
 * @property {string} [billingAddress.region] Customer's region or state.
 * @property {string} billingAddress.postalCode Customer's postal code.
 * @property {string} billingAddress.countryCode Customer's country code (two-character ISO 3166-1 code).
 * @property {object[]} lineItems List of line items.
 * @property {string} lineItems.category The item category type: `'DIGITAL_GOODS'`, `'PHYSICAL_GOODS'`, or `'DONATION'`.
 * @property {string} lineItems.name Item name. Maximum 127 characters.
 * @property {string} lineItems.quantity Number of units of the item purchased. This value must be a whole number and can't be negative or zero.
 * @property {string} lineItems.unitAmount Per-unit price of the item. Can include up to 2 decimal places. This value can't be negative or zero.
 * @property {string} lineItems.unitTaxAmount Per-unit tax price of the item. Can include up to 2 decimal places. This value can't be negative.
 * @property {string} locale The BCP 47-formatted locale. PayPal supports a five-character code. For example, `en-DE`, `da-DK`, `he-IL`, `id-ID`, `ja-JP`, `no-NO`, `pt-BR`, `ru-RU`, `sv-SE`, `th-TH`, `zh-CN`, `zh-HK`, or `zh-TW`.
 * @property {string} customerServiceInstructions Instructions for how to contact the merchant's customer service. Maximum 4,000 characters.
 * @property {string} correlationId Used to correlate user sessions with server transactions.
 * @property {function} onPaymentStart A function that will be called with an object containing the `paymentId`. The `continueCallback` is not provided as it is not needed for this use case.
 */

/**
 * Options used for the seamless/oneclick BLIK local payment type.
 * @typedef {object} LocalPayment~StartPaymentOptions
 * @property {string} amount The amount to authorize for the transaction.
 * @property {string} currencyCode The currency to process the payment (three-character ISO-4217).
 * @property {string} [displayName] The merchant name displayed inside of the window that is opened when starting the payment.
 * @property {string} paymentType The type of local payment. Must be `blik`.
 * @property {string} paymentTypeCountryCode The country code of the local payment. This value must be one of the supported country codes for a given local payment type listed {@link https://developer.paypal.com/braintree/docs/guides/local-payment-methods/client-side-custom/javascript/v3#render-local-payment-method-buttons|here}. For local payments supported in multiple countries, this value may determine which banks are presented to the customer.
 * @property {string} email Payer email of the customer.
 * @property {string} givenName First name of the customer.
 * @property {string} surname Last name of the customer.
 * @property {string} phone Phone number of the customer.
 * @property {boolean} shippingAddressRequired Indicates whether or not the payment needs to be shipped. For digital goods, this should be false. Defaults to false.
 * @property {object} address The shipping address.
 * @property {string} address.streetAddress Line 1 of the Address (eg. number, street, etc). An error will occur if this address is not valid.
 * @property {string} address.extendedAddress Line 2 of the Address (eg. suite, apt #, etc.). An error will occur if this address is not valid.
 * @property {string} address.locality Customer's city.
 * @property {string} address.region Customer's region or state.
 * @property {string} address.postalCode Customer's postal code.
 * @property {string} address.countryCode Customer's country code (two-character ISO 3166-1 code).
 * @property {object} blikOptions Blik seamless/oneclick specific options. Should contain only one object: `level_0` or `oneClick`.
 * @property {object} blikOptions.level_0 Blik seamless specific options.
 * @property {string} blikOptions.level_0.authCode 6-digit code used to authenticate a consumer within BLIK.
 * @property {object} blikOptions.oneClick Blik oneclick specific options.
 * @property {string} blikOptions.oneClick.authCode 6-digit code used to authenticate a consumer within BLIK.
 * @property {string} blikOptions.oneClick.consumerReference The merchant generated, unique reference serving as a primary identifier for accounts connected between Blik and a merchant.
 * @property {string} blikOptions.oneClick.aliasLabel A bank defined identifier used as a display name to allow the payer to differentiate between multiple registered bank accounts.
 * @property {string} blikOptions.oneClick.aliasKey A Blik-defined identifier for a specific Blik-enabled bank account that is associated with a given merchant. Used only in conjunction with a Consumer Reference.
 * @property {function} onPaymentStart A function that will be called with an object containing the `paymentId`. The `continueCallback` is not provided as it is not needed for this use case.
 */

/**
 * Launches the local payment flow and returns a nonce payload. Only one local payment flow should be active at a time. One way to achieve this is to disable your local payment button while the flow is open.
 * @public
 * @function
 * @param {LocalPayment~StartPaymentOptions|LocalPayment~StartPaymentPayUponInvoiceOptions} options Options for initiating the local payment payment flow.
 * @param {callback} callback The second argument, <code>data</code>, is a {@link LocalPayment~startPaymentPayload|startPaymentPayload}. If no callback is provided, the method will return a Promise that resolves with a {@link LocalPayment~startPaymentPayload|startPaymentPayload}.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * localPaymentInstance.startPayment({
 *   paymentType: 'ideal',
 *   paymentTypeCountryCode: 'NL',
 *   fallback: {
 *     buttonText: 'Return to Merchant',
 *     url: 'https://example.com/my-checkout-page'
 *   },
 *   amount: '10.00',
 *   currencyCode: 'EUR',
 *   givenName: 'Joe',
 *   surname: 'Doe',
 *   address: {
 *     countryCode: 'NL'
 *   },
 *   onPaymentStart: function (data, continueCallback) {
 *     // Do any preprocessing before starting the flow
 *     // data.paymentId is the ID of the localPayment
 *     continueCallback();
 *   }
 * }).then(function (payload) {
 *   // Submit payload.nonce to your server
 * }).catch(function (startPaymentError) {
 *   // Handle flow errors or premature flow closure
 *   console.error('Error!', startPaymentError);
 * });
 * @example <caption>Pay Upon Invoice</caption>
 * localPaymentInstance.startPayment({
 *   paymentType: 'pay_upon_invoice',
 *   amount: '100.00',
 *   currencyCode: 'EUR',
 *   givenName: 'Max',
 *   surname: 'Mustermann',
 *   address: { // This is used as the shipping address.
 *     streetAddress: 'Taunusanlage 12',
 *     locality: 'Frankfurt',
 *     postalCode: '60325',
 *     countryCode: 'DE',
 *   },
 *   billingAddress: {
 *     streetAddress: 'Schönhauser Allee 84',
 *     locality: 'Berlin',
 *     postalCode: '10439',
 *     countryCode: 'DE'
 *   },
 *   birthDate: '1990-01-01',
 *   email: 'buyer@example.com',
 *   locale: 'en-DE',
 *   customerServiceInstructions: 'Customer service phone is +49 6912345678.',
 *   lineItems: [{
 *     category: 'PHYSICAL_GOODS',
 *     name: 'Basketball Shoes',
 *     quantity: '1',
 *     unitAmount: '81.00',
 *     unitTaxAmount: '19.00',
 *   }],
 *   phone: '6912345678',
 *   phoneCountryCode: '49',
 *   correlationId: correlationId,
 *   onPaymentStart: function (data) {
 *     // NOTE: It is critical here to store data.paymentId on your server
 *     //       so it can be mapped to a webhook sent by Braintree once the
 *     //       buyer completes their payment.
 *     console.log('Payment ID:', data.paymentId);
 *   },
 * }).catch(function (err) {
 *   // Handle any error calling startPayment.
 *   console.error(err);
 * });
 * @example <caption>BLIK seamless</caption>
 * localPaymentInstance.startPayment({
 *   paymentType: 'blik',
 *   paymentTypeCountryCode: 'PL',
 *   amount: '10.00',
 *   currencyCode: 'PLN',
 *   givenName: 'Joe',
 *   surname: 'Doe',
 *   phone: '1234566789',
 *   address: {
 *     streetAddress: 'Mokotowska 1234',
 *     locality: 'Warsaw',
 *     postalCode: '02-697',
 *     countryCode: 'PL',
 *   },
 *   blikOptions: {
 *     level_0: {
 *       authCode: "123456",
 *     },
 *   },
 *   onPaymentStart: function (data) {
 *     // NOTE: It is critical here to store data.paymentId on your server
 *     //       so it can be mapped to a webhook sent by Braintree once the
 *     //       buyer completes their payment.
 *     console.log('Payment ID:', data.paymentId);
 *   },
 * }).catch(function (err) {
 *   // Handle any error calling startPayment.
 *   console.error(err);
 * });
 * @example <caption>BLIK oneclick first payment</caption>
 * localPaymentInstance.startPayment({
 *   paymentType: 'blik',
 *   paymentTypeCountryCode: 'PL',
 *   amount: '10.00',
 *   currencyCode: 'PLN',
 *   givenName: 'Joe',
 *   surname: 'Doe',
 *   phone: '1234566789',
 *   address: {
 *     streetAddress: 'Mokotowska 1234',
 *     locality: 'Warsaw',
 *     postalCode: '02-697',
 *     countryCode: 'PL',
 *   },
 *   blikOptions: {
 *     oneClick: {
 *       authCode: "123456",
 *       consumerReference: "ABCde123",
 *       aliasLabel: "my uniq alias",
 *     },
 *   },
 *   onPaymentStart: function (data) {
 *     // NOTE: It is critical here to store data.paymentId on your server
 *     //       so it can be mapped to a webhook sent by Braintree once the
 *     //       buyer completes their payment.
 *     console.log('Payment ID:', data.paymentId);
 *   },
 * }).catch(function (err) {
 *   // Handle any error calling startPayment.
 *   console.error(err);
 * });
 * @example <caption>BLIK oneclick subsequent payment</caption>
 * localPaymentInstance.startPayment({
 *   paymentType: 'blik',
 *   paymentTypeCountryCode: 'PL',
 *   amount: '10.00',
 *   currencyCode: 'PLN',
 *   givenName: 'Joe',
 *   surname: 'Doe',
 *   phone: '1234566789',
 *   address: {
 *     streetAddress: 'Mokotowska 1234',
 *     locality: 'Warsaw',
 *     postalCode: '02-697',
 *     countryCode: 'PL',
 *   },
 *   blikOptions: {
 *     oneClick: {
 *       consumerReference: "ABCde123",
 *       aliasKey: "123456789",
 *     },
 *   },
 *   onPaymentStart: function (data) {
 *     // NOTE: It is critical here to store data.paymentId on your server
 *     //       so it can be mapped to a webhook sent by Braintree once the
 *     //       buyer completes their payment.
 *     console.log('Payment ID:', data.paymentId);
 *   },
 * }).catch(function (err) {
 *   // Handle any error calling startPayment.
 *   console.error(err);
 * });
 */
LocalPayment.prototype.startPayment = function (options) {
  var missingOption,
    missingError,
    address,
    fallback,
    params,
    promise,
    billingAddress,
    windowOptions,
    onPaymentStartPromise;
  var self = this; // eslint-disable-line no-invalid-this
  var serviceId = this._frameService._serviceId; // eslint-disable-line no-invalid-this

  // In order to provide the merchant with appropriate error messaging,
  // more robust validation is being done on the client-side, since some
  // option names are mapped to legacy names for the sake of the API.
  // For example, if `billingAddress.streetAddress` was missing, then
  // the API error response would say that `billing_address.line1` was
  // missing. This client-side validation will correctly tell the
  // merchant that `billingAddress.streetAddress` was missing.
  missingOption = hasMissingOption(options);
  if (missingOption) {
    missingError = new BraintreeError(
      errors.LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION
    );
    if (typeof missingOption === "string") {
      missingError.details = "Missing required '" + missingOption + "' option.";
    }

    return Promise.reject(missingError);
  }
  windowOptions = options.windowOptions || {};
  address = options.address || {};
  fallback = options.fallback || {};
  billingAddress = options.billingAddress || {};
  params = {
    amount: options.amount,
    bic: options.bic,
    billingAddress: {
      line1: billingAddress.streetAddress,
      line2: billingAddress.extendedAddress,
      city: billingAddress.locality,
      state: billingAddress.region,
      postalCode: billingAddress.postalCode,
      countryCode: billingAddress.countryCode,
    },
    birthDate: options.birthDate,
    blikOptions: options.blikOptions,
    cancelUrl: querystring.queryify(
      self._assetsUrl +
        "/html/local-payment-redirect-frame" +
        useMin(self._isDebug) +
        ".html",
      {
        channel: serviceId,
        r: fallback.cancelUrl || fallback.url,
        t: fallback.cancelButtonText || fallback.buttonText,
        c: 1, // indicating we went through the cancel flow
      }
    ),
    city: address.locality,
    correlationId: options.correlationId,
    countryCode: address.countryCode,
    currencyIsoCode: options.currencyCode,
    discountAmount: options.discountAmount,
    experienceProfile: {
      brandName: options.displayName,
      customerServiceInstructions: options.customerServiceInstructions,
      locale: options.locale,
      noShipping: !options.shippingAddressRequired,
    },
    firstName: options.givenName,
    fundingSource: options.paymentType,
    intent: "sale",
    lastName: options.surname,
    line1: address.streetAddress,
    line2: address.extendedAddress,
    lineItems: options.lineItems,
    merchantAccountId: self._merchantAccountId,
    merchantOrPartnerCustomerId: options.customerId,
    payerEmail: options.email,
    paymentTypeCountryCode: options.paymentTypeCountryCode,
    phone: options.phone,
    phoneCountryCode: options.phoneCountryCode,
    postalCode: address.postalCode,
    recurrent: options.recurrent,
    returnUrl: querystring.queryify(
      self._assetsUrl +
        "/html/local-payment-redirect-frame" +
        useMin(self._isDebug) +
        ".html",
      {
        channel: serviceId,
        r: fallback.url,
        t: fallback.buttonText,
      }
    ),
    shippingAmount: options.shippingAmount,
    state: address.region,
  };

  self._paymentType = options.paymentType.toLowerCase();
  if (self._authorizationInProgress) {
    analytics.sendEvent(
      self._client,
      self._paymentType + ".local-payment.start-payment.error.already-opened"
    );

    return Promise.reject(
      new BraintreeError(errors.LOCAL_PAYMENT_ALREADY_IN_PROGRESS)
    );
  }

  self._authorizationInProgress = true;

  promise = new ExtendedPromise();

  // For deferred payment types, the popup window should not be opened,
  // since the actual payment will be done outside of this session.
  if (!isDeferredPaymentTypeOptions(options)) {
    self._startPaymentCallback = self._createStartPaymentCallback(
      function (val) {
        promise.resolve(val);
      },
      function (err) {
        promise.reject(err);
      }
    );

    self._frameService.open(
      {
        width: windowOptions.width || DEFAULT_WINDOW_WIDTH,
        height: windowOptions.height || DEFAULT_WINDOW_HEIGHT,
      },
      self._startPaymentCallback
    );
  }

  self._client
    .request({
      method: "post",
      endpoint: "local_payments/create",
      data: params,
    })
    .then(function (response) {
      var redirectUrl = response.paymentResource.redirectUrl;

      analytics.sendEvent(
        self._client,
        self._paymentType + ".local-payment.start-payment.opened"
      );
      self._startPaymentOptions = options;

      if (isDeferredPaymentTypeOptions(options)) {
        self._authorizationInProgress = false;

        if (typeof redirectUrl === "string" && redirectUrl.length) {
          promise.reject(
            new BraintreeError(
              errors.LOCAL_PAYMENT_START_PAYMENT_DEFERRED_PAYMENT_FAILED
            )
          );
        } else {
          onPaymentStartPromise = options.onPaymentStart({
            paymentId: response.paymentResource.paymentToken,
          });

          if (onPaymentStartPromise instanceof Promise) {
            onPaymentStartPromise.then(function () {
              promise.resolve();
            });
          } else {
            promise.resolve();
          }
        }
      } else {
        options.onPaymentStart(
          { paymentId: response.paymentResource.paymentToken },
          function () {
            self._frameService.redirect(response.paymentResource.redirectUrl);
          }
        );
      }
    })
    .catch(function (err) {
      var status = err.details && err.details.httpStatus;

      self._frameService.close();
      self._authorizationInProgress = false;

      if (status === 422) {
        promise.reject(
          new BraintreeError({
            type: errors.LOCAL_PAYMENT_INVALID_PAYMENT_OPTION.type,
            code: errors.LOCAL_PAYMENT_INVALID_PAYMENT_OPTION.code,
            message: errors.LOCAL_PAYMENT_INVALID_PAYMENT_OPTION.message,
            details: {
              originalError: err,
            },
          })
        );

        return;
      }

      promise.reject(
        convertToBraintreeError(err, {
          type: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.type,
          code: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.code,
          message: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.message,
        })
      );
    });

  return promise;
};

/**
 * Manually tokenizes params for a local payment received from PayPal.When app switching back from a mobile application (such as a bank application for an iDEAL payment), the window may lose context with the parent page. In that case, a fallback url is used, and this method can be used to finish the flow.
 * @public
 * @function
 * @param {object} [params] All options for tokenizing local payment parameters. If no params are passed in, the params will be pulled off of the query string of the page.
 * @param {string} params.btLpToken The token representing the local payment. Aliased to `token` if `btLpToken` is not present.
 * @param {string} params.btLpPaymentId The payment id for the local payment. Aliased to `paymentId` if `btLpPaymentId` is not present.
 * @param {string} params.btLpPayerId The payer id for the local payment. Aliased to `PayerID` if `btLpPayerId` is not present.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link LocalPayment~startPaymentPayload|startPaymentPayload}. If no callback is provided, the method will return a Promise that resolves with a {@link LocalPayment~startPaymentPayload|startPaymentPayload}.
 * @example
 * localPaymentInstance.tokenize().then(function (payload) {
 *   // send payload.nonce to your server
 * }).catch(function (err) {
 *   // handle tokenization error
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
LocalPayment.prototype.tokenize = function (params) {
  var self = this;
  var client = this._client;

  params = params || querystring.parse();

  // iOS Safari parses query params by adding the params inside an object called: queryItems
  if (params.queryItems) {
    params = params.queryItems;
  }

  if (params.c || params.wasCanceled) {
    return Promise.reject(
      new BraintreeError({
        type: errors.LOCAL_PAYMENT_CANCELED.type,
        code: errors.LOCAL_PAYMENT_CANCELED.code,
        message: errors.LOCAL_PAYMENT_CANCELED.message,
        details: {
          originalError: {
            errorcode: params.errorcode,
            token: params.btLpToken,
          },
        },
      })
    );
  } else if (params.errorcode) {
    return Promise.reject(
      new BraintreeError({
        type: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.type,
        code: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.code,
        message: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.message,
        details: {
          originalError: {
            errorcode: params.errorcode,
            token: params.btLpToken,
          },
        },
      })
    );
  }

  return client
    .request({
      endpoint: "payment_methods/paypal_accounts",
      method: "post",
      data: this._formatTokenizeData(params),
    })
    .then(function (response) {
      var payload = self._formatTokenizePayload(response);

      if (window.popupBridge) {
        analytics.sendEvent(
          client,
          self._paymentType + ".local-payment.tokenization.success-popupbridge"
        );
      } else {
        analytics.sendEvent(
          client,
          self._paymentType + ".local-payment.tokenization.success"
        );
      }

      return payload;
    })
    .catch(function (err) {
      analytics.sendEvent(
        client,
        self._paymentType + ".local-payment.tokenization.failed"
      );

      return Promise.reject(
        convertToBraintreeError(err, {
          type: errors.LOCAL_PAYMENT_TOKENIZATION_FAILED.type,
          code: errors.LOCAL_PAYMENT_TOKENIZATION_FAILED.code,
          message: errors.LOCAL_PAYMENT_TOKENIZATION_FAILED.message,
        })
      );
    });
};

/**
 * Closes the LocalPayment window if it is open.
 * @public
 * @example
 * localPaymentInstance.closeWindow();
 * @returns {void}
 */
LocalPayment.prototype.closeWindow = function () {
  if (this._authoriztionInProgress) {
    analytics.sendEvent(
      this._client,
      this._paymentType + ".local-payment.start-payment.closed.by-merchant"
    );
  }
  this._frameService.close();
};

/**
 * Focuses the LocalPayment window if it is open.
 * @public
 * @example
 * localPaymentInstance.focusWindow();
 * @returns {void}
 */
LocalPayment.prototype.focusWindow = function () {
  this._frameService.focus();
};

LocalPayment.prototype._createStartPaymentCallback = function (
  resolve,
  reject
) {
  var self = this;
  var client = this._client;

  return function (err, params) {
    self._authorizationInProgress = false;
    if (err) {
      if (err.code === "FRAME_SERVICE_FRAME_CLOSED") {
        if (params && params.errorcode === "processing_error") {
          // something failed within the payment window (rather than when
          // tokenizing with Braintree)
          analytics.sendEvent(
            client,
            self._paymentType + ".local-payment.failed-in-window"
          );
          reject(new BraintreeError(errors.LOCAL_PAYMENT_START_PAYMENT_FAILED));

          return;
        }

        // its possible to have a query param with errorcode=payment_error, which
        // indicates that the customer cancelled the flow from within the UI,
        // but as there's no meaningful difference to the merchant whether the
        // customer closes via the UI or by manually closing the window, we
        // don't differentiate these
        analytics.sendEvent(
          client,
          self._paymentType + ".local-payment.tokenization.closed.by-user"
        );
        reject(new BraintreeError(errors.LOCAL_PAYMENT_WINDOW_CLOSED));
      } else if (
        err.code &&
        err.code.indexOf("FRAME_SERVICE_FRAME_OPEN_FAILED") > -1
      ) {
        reject(
          new BraintreeError({
            code: errors.LOCAL_PAYMENT_WINDOW_OPEN_FAILED.code,
            type: errors.LOCAL_PAYMENT_WINDOW_OPEN_FAILED.type,
            message: errors.LOCAL_PAYMENT_WINDOW_OPEN_FAILED.message,
            details: {
              originalError: err,
            },
          })
        );
      }
    } else if (params) {
      if (!window.popupBridge) {
        self._frameService.redirect(self._loadingFrameUrl);
      }

      self
        .tokenize(params)
        .then(resolve)
        .catch(reject)
        .then(function () {
          self._frameService.close();
        });
    }
  };
};

LocalPayment.prototype._formatTokenizePayload = function (response) {
  var payload;
  var account = {};

  if (response.paypalAccounts) {
    account = response.paypalAccounts[0];
  }

  payload = {
    nonce: account.nonce,
    details: {},
    type: account.type,
  };

  if (account.details) {
    if (account.details.payerInfo) {
      payload.details = account.details.payerInfo;
    }
    if (account.details.correlationId) {
      payload.correlationId = account.details.correlationId;
    }
  }

  return payload;
};

/**
 * Checks if required tokenization parameters are available in querystring for manual tokenization requests.
 * @public
 * @function
 * @example
 * // if query string contains
 * // ?btLpToken=token&btLpPaymentId=payment-id&btLpPayerId=payer-id
 * localPaymentInstance.hasTokenizationParams(); // true
 *
 * // if query string is missing required params
 * localPaymentInstance.hasTokenizationParams(); // false
 *
 * if (localPaymentInstance.hasTokenizationParams()) {
 *   localPaymentInstance.tokenize();
 * }
 * @returns {Boolean} Returns a Boolean value for the state of the query string.
 */
LocalPayment.prototype.hasTokenizationParams = function () {
  var params = querystring.parse();

  if (params.errorcode) {
    return true;
  }

  return Boolean(
    params.btLpToken && params.btLpPaymentId && params.btLpPayerId
  );
};

LocalPayment.prototype._formatTokenizeData = function (params) {
  var clientConfiguration = this._client.getConfiguration();
  var gatewayConfiguration = clientConfiguration.gatewayConfiguration;
  var data = {
    merchantAccountId: this._merchantAccountId,
    paypalAccount: {
      correlationId: params.btLpToken || params.token,
      paymentToken: params.btLpPaymentId || params.paymentId,
      payerId: params.btLpPayerId || params.PayerID,
      unilateral: gatewayConfiguration.paypal.unvettedMerchant,
      intent: "sale",
    },
  };

  return data;
};

// Some payment types are deferred. Meaning, the actual payment will
// occur at a later time outside of this session. For example, with
// Pay Upon Invoice, the customer will later receive an email that will
// be used to make the actual payment through RatePay. This function
// will return `true` if the given options contain `paymentType` of
// a deferred payment type; and/or some payments, like blik, may have
// specific extra options to be treated as deferred. Otherwise, it
// will return `false`.
function isDeferredPaymentTypeOptions(options) {
  var blikOptions = options.blikOptions || {};
  var paymentType =
    typeof options.paymentType === "string"
      ? options.paymentType.toLowerCase()
      : options.paymentType;

  if (paymentType === "pay_upon_invoice") {
    return true;
  } else if (paymentType === "blik") {
    return (
      blikOptions.hasOwnProperty("level_0") ||
      blikOptions.hasOwnProperty("oneClick")
    );
  }

  return false;
}

function hasMissingAddressOption(options) {
  var i, option;

  for (i = 0; i < constants.REQUIRED_OPTIONS_FOR_ADDRESS.length; i++) {
    option = constants.REQUIRED_OPTIONS_FOR_ADDRESS[i];
    if (!options.hasOwnProperty(option)) {
      return option;
    }
  }

  return false;
}

function hasMissingLineItemsOption(items) {
  var i, j, item, option;

  for (j = 0; j < items.length; j++) {
    item = items[j];
    for (i = 0; i < constants.REQUIRED_OPTIONS_FOR_LINE_ITEMS.length; i++) {
      option = constants.REQUIRED_OPTIONS_FOR_LINE_ITEMS[i];
      if (!item.hasOwnProperty(option)) {
        return option;
      }
    }
  }

  return false;
}

function hasMissingBlikOptions(options) {
  var i, option, oneClick;
  var blikOptions = options.blikOptions || {};

  for (
    i = 0;
    i < constants.REQUIRED_OPTIONS_FOR_BLIK_SEAMLESS_PAYMENT_TYPE.length;
    i++
  ) {
    option = constants.REQUIRED_OPTIONS_FOR_BLIK_SEAMLESS_PAYMENT_TYPE[i];
    if (!options.hasOwnProperty(option)) {
      return option;
    }
  }

  if (blikOptions.hasOwnProperty("level_0")) {
    for (
      i = 0;
      i < constants.REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_LEVEL_0.length;
      i++
    ) {
      option = constants.REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_LEVEL_0[i];

      // eslint-disable-next-line camelcase
      if (!blikOptions.level_0.hasOwnProperty(option)) {
        return "blikOptions.level_0." + option;
      }
    }
  } else if (blikOptions.hasOwnProperty("oneClick")) {
    oneClick = blikOptions.oneClick || {};

    if (oneClick.hasOwnProperty("aliasKey")) {
      for (
        i = 0;
        i <
        constants.REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_ONE_CLICK_SUBSEQUENT.length;
        i++
      ) {
        option =
          constants.REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_ONE_CLICK_SUBSEQUENT[i];

        if (!oneClick.hasOwnProperty(option)) {
          return "blikOptions.oneClick." + option;
        }
      }
    } else {
      for (
        i = 0;
        i < constants.REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_ONE_CLICK_FIRST.length;
        i++
      ) {
        option = constants.REQUIRED_OPTIONS_FOR_BLIK_OPTIONS_ONE_CLICK_FIRST[i];

        if (!oneClick.hasOwnProperty(option)) {
          return "blikOptions.oneClick." + option;
        }
      }
    }
  }

  return false;
}

// This will return the name of the first missing required option that
// is found or `true` if `options` itself is not defined. Otherwise, it
// will return `false`.
function hasMissingOption(options) {
  var i, option, missingAddressOption, missingLineItemOption, paymentType;

  if (!options) {
    return true;
  }

  if (isDeferredPaymentTypeOptions(options)) {
    paymentType = options.paymentType || "";

    if (paymentType.toLowerCase() === "pay_upon_invoice") {
      for (
        i = 0;
        i < constants.REQUIRED_OPTIONS_FOR_PAY_UPON_INVOICE_PAYMENT_TYPE.length;
        i++
      ) {
        option =
          constants.REQUIRED_OPTIONS_FOR_PAY_UPON_INVOICE_PAYMENT_TYPE[i];
        if (!options.hasOwnProperty(option)) {
          return option;
        }
        if (option === "address" || option === "billingAddress") {
          missingAddressOption = hasMissingAddressOption(options[option]);
          if (missingAddressOption) {
            return option + "." + missingAddressOption;
          }
        } else if (option === "lineItems") {
          missingLineItemOption = hasMissingLineItemsOption(options[option]);
          if (missingLineItemOption) {
            return option + "." + missingLineItemOption;
          }
        }
      }
    } else if (paymentType.toLowerCase() === "blik") {
      return hasMissingBlikOptions(options);
    }
  } else {
    for (i = 0; i < constants.REQUIRED_OPTIONS_FOR_START_PAYMENT.length; i++) {
      option = constants.REQUIRED_OPTIONS_FOR_START_PAYMENT[i];

      if (!options.hasOwnProperty(option)) {
        return option;
      }
    }

    if (!options.fallback.url) {
      return "fallback.url";
    }
    if (!options.fallback.buttonText) {
      return "fallback.buttonText";
    }
    if (options.recurrent === true && !options.customerId) {
      return "customerId";
    }
  }

  return false;
}

/**
 * Cleanly remove anything set up by {@link module:braintree-web/local-payment.create|create}.
 * @public
 * @param {callback} [callback] Called on completion.
 * @example
 * localPaymentInstance.teardown();
 * @example <caption>With callback</caption>
 * localPaymentInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
LocalPayment.prototype.teardown = function () {
  var self = this; // eslint-disable-line no-invalid-this

  self._frameService.teardown();

  convertMethodsToError(self, methods(LocalPayment.prototype));

  analytics.sendEvent(self._client, "local-payment.teardown-completed");

  return Promise.resolve();
};

module.exports = wrapPromise.wrapPrototype(LocalPayment);
