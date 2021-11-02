'use strict';

var frameService = require('../../lib/frame-service/external');
var BraintreeError = require('../../lib/braintree-error');
var useMin = require('../../lib/use-min');
var VERSION = process.env.npm_package_version;
var INTEGRATION_TIMEOUT_MS = require('../../lib/constants').INTEGRATION_TIMEOUT_MS;
var analytics = require('../../lib/analytics');
var methods = require('../../lib/methods');
var convertMethodsToError = require('../../lib/convert-methods-to-error');
var convertToBraintreeError = require('../../lib/convert-to-braintree-error');
var Promise = require('../../lib/promise');
var ExtendedPromise = require('@braintree/extended-promise');
var querystring = require('../../lib/querystring');
var wrapPromise = require('@braintree/wrap-promise');
var constants = require('./constants');
var errors = require('../shared/errors');

var DEFAULT_WINDOW_WIDTH = 1282;
var DEFAULT_WINDOW_HEIGHT = 720;

/**
 * @class
 * @param {object} options see {@link module:braintree-web/local-payment.create|local-payment.create}
 * @classdesc This class represents a LocalPayment component. Instances of this class can open a LocalPayment window for paying with alternate payments local to a specific country. Any additional UI, such as disabling the page while authentication is taking place, is up to the developer.
 *
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/local-payment.create|braintree-web.local-payment.create} instead.</strong>
 */
function LocalPayment(options) {
  this._client = options.client;
  this._assetsUrl = options.client.getConfiguration().gatewayConfiguration.assetsUrl + '/web/' + VERSION;
  this._isDebug = options.client.getConfiguration().isDebug;
  this._loadingFrameUrl = this._assetsUrl + '/html/local-payment-landing-frame' + useMin(this._isDebug) + '.html';
  this._authorizationInProgress = false;
  this._paymentType = 'unknown';
  this._merchantAccountId = options.merchantAccountId;
}

LocalPayment.prototype._initialize = function () {
  var self = this;
  var client = this._client;
  var failureTimeout = setTimeout(function () {
    analytics.sendEvent(client, 'local-payment.load.timed-out');
  }, INTEGRATION_TIMEOUT_MS);

  return new Promise(function (resolve) {
    frameService.create({
      name: 'localpaymentlandingpage',
      dispatchFrameUrl: self._assetsUrl + '/html/dispatch-frame' + useMin(self._isDebug) + '.html',
      openFrameUrl: self._loadingFrameUrl
    }, function (service) {
      self._frameService = service;
      clearTimeout(failureTimeout);
      analytics.sendEvent(client, 'local-payment.load.succeeded');
      resolve(self);
    });
  });
};

/**
 * Launches the local payment flow and returns a nonce payload. Only one local payment flow should be active at a time. One way to achieve this is to disable your local payment button while the flow is open.
 * @public
 * @function
 * @param {object} options All options for initiating the local payment payment flow.
 * @param {object} options.fallback Configuration for what to do when app switching back from a Bank app on a mobile device.
 * @param {string} options.fallback.buttonText The text to display in a button to redirect back to the merchant page.
 * @param {string} options.fallback.url The url to redirect to when the redirect button is pressed. Query params will be added to the url to process the data returned from the bank.
 * @param {string} options.fallback.cancelButtonText The text to display in a button to redirect back to the merchant page when the customer cancels. If no `cancelButtonText` is provided, `buttonText` will be used.
 * @param {string} options.fallback.cancelUrl The url to redirect to when the redirect button is pressed when the customer cancels. Query params will be added to the url to check the state of the payment. If no `cancelUrl` is provided, `url` will be used.
 * @param {object} [options.windowOptions] The options for configuring the window that is opened when starting the payment.
 * @param {number} [options.windowOptions.width=1282] The width in pixels of the window opened when starting the payment. The default width size is this large to allow various banking partner landing pages to display the QR Code to be scanned by the bank's mobile app. Many will not display the QR code when the window size is smaller than a standard desktop screen.
 * @param {number} [options.windowOptions.height=720] The height in pixels of the window opened when starting the payment.
 * @param {string} options.amount The amount to authorize for the transaction.
 * @param {string} options.currencyCode The currency to process the payment.
 * @param {string} [options.displayName] The merchant name displayed inside of the window that is opened when starting the payment.
 * @param {string} options.paymentType The type of local payment.
 * @param {string} options.paymentTypeCountryCode The country code of the local payment. This value must be one of the supported country codes for a given local payment type listed {@link https://developer.paypal.com/braintree/docs/guides/local-payment-methods/client-side-custom/javascript/v3#render-local-payment-method-buttons|here}. For local payments supported in multiple countries, this value may determine which banks are presented to the customer.
 * @param {string} options.email Payer email of the customer.
 * @param {string} options.givenName First name of the customer.
 * @param {string} options.surname Last name of the customer.
 * @param {string} options.phone Phone number of the customer.
 * @param {string} options.bic Bank Identification Code of the customer (specific to iDEAL transactions).
 * @param {boolean} options.shippingAddressRequired Indicates whether or not the payment needs to be shipped. For digital goods, this should be false. Defaults to false.
 * @param {string} options.address.streetAddress Line 1 of the Address (eg. number, street, etc). An error will occur if this address is not valid.
 * @param {string} options.address.extendedAddress Line 2 of the Address (eg. suite, apt #, etc.). An error will occur if this address is not valid.
 * @param {string} options.address.locality Customer's city.
 * @param {string} options.address.region Customer's region or state.
 * @param {string} options.address.postalCode Customer's postal code.
 * @param {string} options.address.countryCode Customer's country code.
 * @param {function} options.onPaymentStart A function that will be called with two parameters: an object containing the  `paymentId` and a `continueCallback` that must be called to launch the flow. You can use method to do any preprocessing on your server before the flow begins..
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link LocalPayment~startPaymentPayload|startPaymentPayload}. If no callback is provided, the method will return a Promise that resolves with a {@link LocalPayment~startPaymentPayload|startPaymentPayload}.
 * @example
 * button.addEventListener('click', function () {
 *   // Disable the button when local payment is in progress
 *   button.setAttribute('disabled', 'disabled');
 *
 *   // Because startPayment opens a new window, this must be called
 *   // as a result of a user action, such as a button click.
 *   localPaymentInstance.startPayment({
 *     paymentType: 'ideal',
 *     paymentTypeCountryCode: 'NL',
 *     fallback: {
 *       buttonText: 'Return to Merchant',
 *       url: 'https://example.com/my-checkout-page'
 *     },
 *     amount: '10.00',
 *     currencyCode: 'EUR',
 *     onPaymentStart: function (data, continueCallback) {
 *       // Do any preprocessing before starting the flow
 *       // data.paymentId is the ID of the localPayment
 *       continueCallback();
 *     }
 *   }).then(function (payload) {
 *     button.removeAttribute('disabled');
 *     // Submit payload.nonce to your server
 *   }).catch(function (startPaymentError) {
 *     button.removeAttribute('disabled');
 *     // Handle flow errors or premature flow closure
 *     console.error('Error!', startPaymentError);
 *   });
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
LocalPayment.prototype.startPayment = function (options) {
  var address, params, promise;
  var self = this; // eslint-disable-line no-invalid-this
  var serviceId = this._frameService._serviceId; // eslint-disable-line no-invalid-this
  var windowOptions = options.windowOptions || {};

  if (hasMissingOption(options)) {
    return Promise.reject(new BraintreeError(errors.LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION));
  }

  address = options.address || {};
  params = {
    intent: 'sale',
    returnUrl: querystring.queryify(self._assetsUrl + '/html/local-payment-redirect-frame' + useMin(self._isDebug) + '.html', {
      channel: serviceId,
      r: options.fallback.url,
      t: options.fallback.buttonText
    }),
    cancelUrl: querystring.queryify(self._assetsUrl + '/html/local-payment-redirect-frame' + useMin(self._isDebug) + '.html', {
      channel: serviceId,
      r: options.fallback.cancelUrl || options.fallback.url,
      t: options.fallback.cancelButtonText || options.fallback.buttonText,
      c: 1 // indicating we went through the cancel flow
    }),
    experienceProfile: {
      brandName: options.displayName,
      noShipping: !options.shippingAddressRequired
    },
    fundingSource: options.paymentType,
    paymentTypeCountryCode: options.paymentTypeCountryCode,
    amount: options.amount,
    currencyIsoCode: options.currencyCode,
    firstName: options.givenName,
    lastName: options.surname,
    payerEmail: options.email,
    phone: options.phone,
    line1: address.streetAddress,
    line2: address.extendedAddress,
    city: address.locality,
    state: address.region,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    merchantAccountId: self._merchantAccountId,
    bic: options.bic
  };

  self._paymentType = options.paymentType.toLowerCase();
  if (self._authorizationInProgress) {
    analytics.sendEvent(self._client, self._paymentType + '.local-payment.start-payment.error.already-opened');

    return Promise.reject(new BraintreeError(errors.LOCAL_PAYMENT_ALREADY_IN_PROGRESS));
  }

  self._authorizationInProgress = true;

  promise = new ExtendedPromise();

  self._startPaymentCallback = self._createStartPaymentCallback(function (val) {
    promise.resolve(val);
  }, function (err) {
    promise.reject(err);
  });
  self._frameService.open({
    width: windowOptions.width || DEFAULT_WINDOW_WIDTH,
    height: windowOptions.height || DEFAULT_WINDOW_HEIGHT
  }, self._startPaymentCallback);

  self._client.request({
    method: 'post',
    endpoint: 'local_payments/create',
    data: params
  }).then(function (response) {
    analytics.sendEvent(self._client, self._paymentType + '.local-payment.start-payment.opened');
    self._startPaymentOptions = options;
    options.onPaymentStart({paymentId: response.paymentResource.paymentToken}, function () {
      self._frameService.redirect(response.paymentResource.redirectUrl);
    });
  }).catch(function (err) {
    var status = err.details && err.details.httpStatus;

    self._frameService.close();
    self._authorizationInProgress = false;

    if (status === 422) {
      promise.reject(new BraintreeError({
        type: errors.LOCAL_PAYMENT_INVALID_PAYMENT_OPTION.type,
        code: errors.LOCAL_PAYMENT_INVALID_PAYMENT_OPTION.code,
        message: errors.LOCAL_PAYMENT_INVALID_PAYMENT_OPTION.message,
        details: {
          originalError: err
        }
      }));

      return;
    }

    promise.reject(convertToBraintreeError(err, {
      type: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.type,
      code: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.code,
      message: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.message
    }));
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

  if (params.c || params.wasCanceled) {
    return Promise.reject(new BraintreeError({
      type: errors.LOCAL_PAYMENT_CANCELED.type,
      code: errors.LOCAL_PAYMENT_CANCELED.code,
      message: errors.LOCAL_PAYMENT_CANCELED.message,
      details: {
        originalError: {
          errorcode: params.errorcode,
          token: params.btLpToken
        }
      }
    }));
  } else if (params.errorcode) {
    return Promise.reject(new BraintreeError({
      type: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.type,
      code: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.code,
      message: errors.LOCAL_PAYMENT_START_PAYMENT_FAILED.message,
      details: {
        originalError: {
          errorcode: params.errorcode,
          token: params.btLpToken
        }
      }
    }));
  }

  return client.request({
    endpoint: 'payment_methods/paypal_accounts',
    method: 'post',
    data: this._formatTokenizeData(params)
  }).then(function (response) {
    var payload = self._formatTokenizePayload(response);

    if (window.popupBridge) {
      analytics.sendEvent(client, self._paymentType + '.local-payment.tokenization.success-popupbridge');
    } else {
      analytics.sendEvent(client, self._paymentType + '.local-payment.tokenization.success');
    }

    return payload;
  }).catch(function (err) {
    analytics.sendEvent(client, self._paymentType + '.local-payment.tokenization.failed');

    return Promise.reject(convertToBraintreeError(err, {
      type: errors.LOCAL_PAYMENT_TOKENIZATION_FAILED.type,
      code: errors.LOCAL_PAYMENT_TOKENIZATION_FAILED.code,
      message: errors.LOCAL_PAYMENT_TOKENIZATION_FAILED.message
    }));
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
    analytics.sendEvent(this._client, this._paymentType + '.local-payment.start-payment.closed.by-merchant');
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

LocalPayment.prototype._createStartPaymentCallback = function (resolve, reject) {
  var self = this;
  var client = this._client;

  return function (err, params) {
    self._authorizationInProgress = false;
    if (err) {
      if (err.code === 'FRAME_SERVICE_FRAME_CLOSED') {
        if (params && params.errorcode === 'processing_error') {
          // something failed within the payment window (rather than when
          // tokenizing with Braintree)
          analytics.sendEvent(client, self._paymentType + '.local-payment.failed-in-window');
          reject(new BraintreeError(errors.LOCAL_PAYMENT_START_PAYMENT_FAILED));

          return;
        }

        // its possible to have a query param with errorcode=payment_error, which
        // indicates that the customer cancelled the flow from within the UI,
        // but as there's no meaningful difference to the merchant whether the
        // customer closes via the UI or by manually closing the window, we
        // don't differentiate these
        analytics.sendEvent(client, self._paymentType + '.local-payment.tokenization.closed.by-user');
        reject(new BraintreeError(errors.LOCAL_PAYMENT_WINDOW_CLOSED));
      } else if (err.code && err.code.indexOf('FRAME_SERVICE_FRAME_OPEN_FAILED') > -1) {
        reject(new BraintreeError({
          code: errors.LOCAL_PAYMENT_WINDOW_OPEN_FAILED.code,
          type: errors.LOCAL_PAYMENT_WINDOW_OPEN_FAILED.type,
          message: errors.LOCAL_PAYMENT_WINDOW_OPEN_FAILED.message,
          details: {
            originalError: err
          }
        }));
      }
    } else if (params) {
      if (!window.popupBridge) {
        self._frameService.redirect(self._loadingFrameUrl);
      }

      self.tokenize(params).then(resolve).catch(reject).then(function () {
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
    type: account.type
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

  return Boolean(params.btLpToken && params.btLpPaymentId && params.btLpPayerId);
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
      intent: 'sale'
    }
  };

  return data;
};

function hasMissingOption(options) {
  var i, option;

  if (!options) {
    return true;
  }

  for (i = 0; i < constants.REQUIRED_OPTIONS_FOR_START_PAYMENT.length; i++) {
    option = constants.REQUIRED_OPTIONS_FOR_START_PAYMENT[i];

    if (!options.hasOwnProperty(option)) {
      return true;
    }
  }

  if (!(options.fallback.url && options.fallback.buttonText)) {
    return true;
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

  analytics.sendEvent(self._client, 'local-payment.teardown-completed');

  return Promise.resolve();
};

module.exports = wrapPromise.wrapPrototype(LocalPayment);
