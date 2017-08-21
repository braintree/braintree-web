'use strict';

var Promise = require('../../lib/promise');
var frameService = require('../../lib/frame-service/external');
var BraintreeError = require('../../lib/braintree-error');
var convertToBraintreeError = require('../../lib/convert-to-braintree-error');
var errors = require('../shared/errors');
var VERSION = process.env.npm_package_version;
var INTEGRATION_TIMEOUT_MS = require('../../lib/constants').INTEGRATION_TIMEOUT_MS;
var methods = require('../../lib/methods');
var wrapPromise = require('@braintree/wrap-promise');
var convertMethodsToError = require('../../lib/convert-methods-to-error');
var analytics = require('../../lib/analytics');
var useMin = require('../../lib/use-min');
var once = require('../../lib/once');
var deferred = require('../../lib/deferred');
var constants = require('./constants');
var events = require('../shared/events');

/**
 * @typedef {object} iDEAL~startPaymentPayload
 * @property {string} nonce The payment method nonce.
 * @property {object} details Additional iDEAL payment details.
 * @property {string} details.id The identifier for the iDEAL Payment.
 * @property {string} details.status The status of the iDEAL Payment.
 * @property {string} type The payment method type, always `IdealPayment`.
 */

/**
 * @class
 * @param {object} options see {@link module:braintree-web/ideal.create|ideal.create}
 * @description <strong>You cannot use this constructor directly. Use {@link module:braintree-web/ideal.create|braintree.ideal.create} instead.</strong>
 * @classdesc This class represents an iDEAL component. Instances of this class have methods for launching a new window to process a transaction with iDEAL.
 */
function Ideal(options) {
  var configuration = options.client.getConfiguration();

  this._client = options.client;
  this._assetsUrl = configuration.gatewayConfiguration.ideal.assetsUrl + '/web/' + VERSION;
  this._isDebug = configuration.isDebug;
  this._idealPaymentStatus = {
    authInProgress: false,
    id: '',
    status: ''
  };
}

Ideal.prototype._initialize = function () {
  var self = this;

  var failureTimeout = setTimeout(function () {
    analytics.sendEvent(self._client, 'ideal.load.timed-out');
  }, INTEGRATION_TIMEOUT_MS);

  return this._client.request({
    api: 'braintreeApi',
    method: 'get',
    endpoint: 'issuers/ideal'
  }).then(function (response) {
    return new Promise(function (resolve) {
      frameService.create({
        name: 'braintreeideallanding',
        height: 550,
        width: 960,
        dispatchFrameUrl: self._assetsUrl + '/html/dispatch-frame' + useMin(self._isDebug) + '.html',
        openFrameUrl: self._assetsUrl + '/html/ideal-issuers-frame' + useMin(self._isDebug) + '.html',
        state: {bankData: response.data}
      }, function (service) {
        self._frameService = service;
        clearTimeout(failureTimeout);
        analytics.sendEvent(self._client, 'ideal.load.succeeded');

        self._frameService._bus.on(events.BANK_CHOSEN, self._createBankChosenHandler());
        self._frameService._bus.on(events.REDIRECT_PAGE_REACHED, self._createRedirectPageReachedHandler());

        resolve(self);
      });
    });
  });
};

/**
 * Launches the iDEAL flow and returns a nonce payload. Only one iDEAL flow should be active at a time. One way to achieve this is to disable your iDEAL button while the flow is open.
 * @public
 * @function
 * @param {object} options All options for initiating the iDEAL payment flow.
 * @param {string} options.orderId An ID supplied by the merchant for creating the iDEAL transaction.
 * @param {string} options.amount The amount to authorize for the transaction.
 * @param {string} options.currency The currency to process the payment.
 * @param {string} [options.locale=nl] An optional string to specify the locale of the bank selection window. Possible values: `nl`, `en`.
 * @param {string} [options.descriptor] An optional string that will appear on the customer's bank statement.
 * @param {function} options.onPaymentStart A function that will be called with an object containing the iDEAL Payment `id` and `status` when the customer chooses an issuing bank. You can use this hook to update your payment page.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link iDEAL~startPaymentPayload|startPaymentPayload}. If no callback is provided, the method will return a Promise that resolves with a {@link iDEAL~startPaymentPayload|startPaymentPayload}.
 * @example
 * button.addEventListener('click', function () {
 *   // Disable the button when iDEAL payment is in progress
 *   button.setAttribute('disabled', 'disabled');
 *
 *   // Because startPayment opens a new window, this must be called
 *   // as a result of a user action, such as a button click.
 *   idealInstance.startPayment({
 *     orderId: 'some id',
 *     amount: '10.00',
 *     currency: 'EUR',
 *     descriptor: 'Merchant Name',
 *     onPaymentStart: function (data) {
 *       // disable payment form on the page
 *     }
 *   }).then(function (payload) {
 *     button.removeAttribute('disabled');
 *     // Submit payload.nonce to your server
 *   }).catch(function (startPaymentError) {
 *     button.removeAttribute('disabled');
 *     // Handle flow errors or premature flow closure
 *
 *     switch (startPaymentError.code) {
 *       case 'IDEAL_WINDOW_CLOSED':
 *         console.error('Customer closed iDEAL window.');
 *         break;
 *       case 'IDEAL_START_PAYMENT_FAILED':
 *         console.error('iDEAL startPayment failed. See details:', startPaymentError.details);
 *         break;
 *       default:
 *         console.error('Error!', startPaymentError);
 *     }
 *   });
 * });
 * @returns {Promise|void}
 */
Ideal.prototype.startPayment = wrapPromise(function (options) {
  var self = this; // eslint-disable-line no-invalid-this

  return new Promise(function (resolve, reject) {
    if (!options || hasMissingOption(options)) {
      reject(new BraintreeError(errors.IDEAL_START_PAYMENT_MISSING_REQUIRED_OPTION));
      return;
    }

    if (self._idealPaymentStatus.authInProgress) {
      analytics.sendEvent(self._client, 'ideal.start-payment.error.already-opened');
      reject(new BraintreeError(errors.IDEAL_PAYMENT_ALREADY_IN_PROGRESS));
      return;
    }

    self._idealPaymentStatus.authInProgress = true;
    analytics.sendEvent(self._client, 'ideal.start-payment.opened');

    self._startPaymentCallback = self._createStartPaymentCallback(resolve, reject);
    self._startPaymentOptions = options;

    self._frameService.open({
      state: {
        locale: options.locale
      }
    }, self._startPaymentCallback);
  });
});

/**
 * Closes the iDEAL window if it is open.
 * @public
 * @example
 * idealInstance.closeWindow();
 * @returns {void}
 */
Ideal.prototype.closeWindow = function () {
  if (this._idealPaymentStatus.authInProgress) {
    analytics.sendEvent(this._client, 'ideal.start-payment.closed.by-merchant');
  }
  this._frameService.close();
};

/**
 * Focuses the iDEAL window if it is open.
 * @public
 * @example
 * idealInstance.focusWindow();
 * @returns {void}
 */
Ideal.prototype.focusWindow = function () {
  this._frameService.focus();
};

Ideal.prototype._createRedirectPageReachedHandler = function () {
  var self = this;

  return function () {
    self._pollForCompleteTransactionStatus(0);
  };
};

Ideal.prototype._createStartPaymentCallback = function (resolve, reject) {
  var self = this;

  return function (err) {
    var idealPaymentId = self._idealPaymentStatus.id;
    var idealPaymentStatus = self._idealPaymentStatus.status;

    self._idealPaymentStatus.authInProgress = false;
    delete self._idealPaymentStatus.id;
    delete self._idealPaymentStatus.status;

    self._frameService.close();

    if (shouldResolveWithSuccess(err, idealPaymentStatus)) {
      analytics.sendEvent(self._client, 'ideal.start-payment.success-' + idealPaymentStatus.toLowerCase());
      resolve({
        nonce: idealPaymentId,
        type: 'IdealPayment',
        details: {
          id: idealPaymentId,
          status: idealPaymentStatus
        }
      });
      return;
    }

    if (err) {
      if (err.code === 'FRAME_SERVICE_FRAME_CLOSED') {
        analytics.sendEvent(self._client, 'ideal.start-payment.closed.by-user');
        reject(new BraintreeError(errors.IDEAL_WINDOW_CLOSED));
        return;
      } else if (err.code === 'FRAME_SERVICE_FRAME_OPEN_FAILED') {
        reject(new BraintreeError(errors.IDEAL_WINDOW_OPEN_FAILED));
        return;
      }

      analytics.sendEvent(self._client, 'ideal.start-payment.failed');

      reject(convertToBraintreeError(err, errors.IDEAL_START_PAYMENT_FAILED));
    } else {
      reject(new BraintreeError(errors.IDEAL_START_PAYMENT_UNEXPECTED_STATUS));
    }
  };
};

function shouldResolveWithSuccess(err, status) {
  if (err && err.code !== 'FRAME_SERVICE_FRAME_CLOSED') {
    return false;
  }

  return status === 'COMPLETE' || status === 'PENDING';
}

Ideal.prototype._createBankChosenHandler = function () {
  var self = this;

  return function (config) {
    var options = self._startPaymentOptions;
    var onPaymentStart;

    if (typeof options.onPaymentStart === 'function') {
      onPaymentStart = once(deferred(options.onPaymentStart));
    } else {
      onPaymentStart = function noop() {};
    }

    self._client.request({
      api: 'braintreeApi',
      method: 'post',
      data: {
        route_id: self._client.getConfiguration().gatewayConfiguration.ideal.routeId, // eslint-disable-line camelcase
        issuer: config.issuingBankId,
        order_id: options.orderId, // eslint-disable-line camelcase
        amount: options.amount,
        currency: options.currency,
        descriptor: options.descriptor,
        redirect_url: self._assetsUrl + '/html/ideal-redirect-frame.html' // eslint-disable-line camelcase
      },
      endpoint: 'ideal-payments'
    }).then(function (response) {
      onPaymentStart({
        id: response.data.id,
        status: response.data.status
      });

      self._idealPaymentStatus.id = response.data.id;
      self._idealPaymentStatus.status = response.data.status;
      self._frameService.redirect(response.data.approval_url);
    }).catch(function (err) {
      self._idealPaymentStatus.authInProgress = false;
      self._startPaymentCallback(err);
    });
  };
};

Ideal.prototype._pollForCompleteTransactionStatus = function (retryCount) {
  var self = this;

  if (!this._idealPaymentStatus.id) {
    this._startPaymentCallback(errors.IDEAL_PAYMENT_ALREADY_IN_PROGRESS);
    return;
  }

  this._client.request({
    api: 'braintreeApi',
    method: 'get',
    endpoint: 'ideal-payments/' + this._idealPaymentStatus.id + '/status'
  }).then(function (response) {
    self._idealPaymentStatus.status = response.data.status;

    if (response.data.status === 'PENDING' && retryCount < constants.MAX_TRANSACTION_STATUS_POLLING_RETRIES) {
      setTimeout(function () {
        self._pollForCompleteTransactionStatus(retryCount + 1);
      }, constants.POLL_RETRY_TIME);
    } else if (response.data.status === 'COMPLETE' || response.data.status === 'PENDING') {
      self._startPaymentCallback();
    } else {
      self._startPaymentCallback(new BraintreeError({
        code: errors.IDEAL_PAYMENT_NOT_COMPLETE_OR_PENDING.code,
        type: errors.IDEAL_PAYMENT_NOT_COMPLETE_OR_PENDING.type,
        message: 'Transaction is not complete. It has a status of: ' + response.data.status
      }));
    }
  }).catch(self._startPaymentCallback);
};

function hasMissingOption(options) {
  var i, option;

  for (i = 0; i < constants.REQUIRED_OPTIONS_FOR_START_PAYMENT.length; i++) {
    option = constants.REQUIRED_OPTIONS_FOR_START_PAYMENT[i];

    if (!options.hasOwnProperty(option)) {
      return true;
    }
  }

  return false;
}

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/ideal.create|create}.
 * @public
 * @function
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @returns {Promise|void} If no callback is provided, returns a promise.
 */
Ideal.prototype.teardown = wrapPromise(function () {
  var self = this; // eslint-disable-line no-invalid-this

  self._frameService.teardown();

  convertMethodsToError(self, methods(Ideal.prototype));

  analytics.sendEvent(self._client, 'ideal.teardown-completed');

  return Promise.resolve();
});

module.exports = Ideal;
