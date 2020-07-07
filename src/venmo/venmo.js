'use strict';

var analytics = require('../lib/analytics');
var isBrowserSupported = require('./shared/supports-venmo');
var constants = require('./shared/constants');
var errors = require('./shared/errors');
var querystring = require('../lib/querystring');
var methods = require('../lib/methods');
var convertMethodsToError = require('../lib/convert-methods-to-error');
var wrapPromise = require('@braintree/wrap-promise');
var BraintreeError = require('../lib/braintree-error');
var Promise = require('../lib/promise');
var ExtendedPromise = require('@braintree/extended-promise');

/**
 * Venmo tokenize payload.
 * @typedef {object} Venmo~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {string} type The payment method type, always `VenmoAccount`.
 * @property {object} details Additional Venmo account details.
 * @property {string} details.username Username of the Venmo account.
 */

/**
 * @class
 * @param {object} options The Venmo {@link module:braintree-web/venmo.create create} options.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/venmo.create|braintree-web.venmo.create} instead.</strong>
 * @classdesc This class represents a Venmo component produced by {@link module:braintree-web/venmo.create|braintree-web/venmo.create}. Instances of this class have methods for tokenizing Venmo payments.
 */
function Venmo(options) {
  this._createPromise = options.createPromise;
  this._allowNewBrowserTab = options.allowNewBrowserTab !== false;
  this._profileId = options.profileId;
  this._deepLinkReturnUrl = options.deepLinkReturnUrl;
  this._ignoreHistoryChanges = options.ignoreHistoryChanges;
}

Venmo.prototype.getUrl = function () {
  if (this._url) {
    return Promise.resolve(this._url);
  }

  return this._createPromise.then(function (client) {
    var configuration = client.getConfiguration();
    var params = {};
    var currentUrl = this._deepLinkReturnUrl || window.location.href.replace(window.location.hash, '');
    var venmoConfiguration = configuration.gatewayConfiguration.payWithVenmo;
    var analyticsMetadata = configuration.analyticsMetadata;
    var braintreeData = {
      _meta: {
        version: analyticsMetadata.sdkVersion,
        integration: analyticsMetadata.integration,
        platform: analyticsMetadata.platform,
        sessionId: analyticsMetadata.sessionId
      }
    };

    params['x-success'] = currentUrl + '#venmoSuccess=1';
    params['x-cancel'] = currentUrl + '#venmoCancel=1';
    params['x-error'] = currentUrl + '#venmoError=1';
    params.ua = window.navigator.userAgent;
    /* eslint-disable camelcase */
    params.braintree_merchant_id = this._profileId || venmoConfiguration.merchantId;
    params.braintree_access_token = venmoConfiguration.accessToken;
    params.braintree_environment = venmoConfiguration.environment;
    params.braintree_sdk_data = btoa(JSON.stringify(braintreeData));
    /* eslint-enable camelcase */

    this._url = constants.VENMO_OPEN_URL + '?' + querystring.stringify(params);

    return this._url;
  }.bind(this));
};

/**
 * Returns a boolean indicating whether the current browser supports Venmo as a payment method.
 *
 * If `options.allowNewBrowserTab` is false when calling {@link module:braintree-web/venmo.create|venmo.create}, this method will return true only for browsers known to support returning from the Venmo app to the same browser tab. Currently, this is limited to iOS Safari and Android Chrome.
 * @public
 * @returns {boolean} True if the current browser is supported, false if not.
 */
Venmo.prototype.isBrowserSupported = function () {
  return isBrowserSupported.isBrowserSupported({
    allowNewBrowserTab: this._allowNewBrowserTab
  });
};

/**
 * Returns a boolean indicating whether a Venmo tokenization result is ready to be processed immediately.
 *
 * This method should be called after initialization to see if the result of Venmo authorization is available. If it returns true, call {@link Venmo#tokenize|tokenize} immediately to process the results.
 *
 * @public
 * @returns {boolean} True if the results of Venmo payment authorization are available and ready to process.
 */
Venmo.prototype.hasTokenizationResult = function () {
  return this._hasTokenizationResult();
};

// a private version that lets us pass in a custom hash
// when listening on a hashchange event
Venmo.prototype._hasTokenizationResult = function (hash) {
  var params = getFragmentParameters(hash);

  return typeof (params.venmoSuccess || params.venmoError || params.venmoCancel) !== 'undefined';
};

/**
 * Launches the Venmo flow and returns a nonce payload.
 *
 * If {@link Venmo#hasTokenizationResult|hasTokenizationResult} returns true, calling tokenize will immediately process and return the results without initiating the Venmo payment authorization flow.
 *
 * Only one Venmo flow can be active at a time. One way to achieve this is to disable your Venmo button while the flow is open.
 * @public
 * @param {object} [options] Options for tokenization.
 * @param {number} [options.processResultsDelay=500] The amount of time in milliseeconds to delay processing the results. In most cases, this value should be left as the default.
 * @param {callback} [callback] The second argument, <code>data</code>, is a {@link Venmo~tokenizePayload|tokenizePayload}. If no callback is provided, the method will return a Promise that resolves with a {@link Venmo~tokenizePayload|tokenizePayload}.
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * button.addEventListener('click', function () {
 *   // Disable the button so that we don't attempt to open multiple popups.
 *   button.setAttribute('disabled', 'disabled');
 *
 *   // Because tokenize opens a new window, this must be called
 *   // as a result of a user action, such as a button click.
 *   venmoInstance.tokenize().then(function (payload) {
 *     // Submit payload.nonce to your server
 *     // Use payload.username to get the Venmo username and display any UI
 *   }).catch(function (tokenizeError) {
 *     // Handle flow errors or premature flow closure
 *     switch (tokenizeErr.code) {
 *       case 'VENMO_APP_CANCELED':
 *         console.log('User canceled Venmo flow.');
 *         break;
 *       case 'VENMO_CANCELED':
 *         console.log('User canceled Venmo, or Venmo app is not available.');
 *         break;
 *       default:
 *         console.error('Error!', tokenizeErr);
 *     }
 *   }).then(function () {
 *     button.removeAttribute('disabled');
 *   });
 * });
 */
Venmo.prototype.tokenize = function (options) {
  var self = this;
  var resultProcessingInProgress, visibilityChangeListenerTimeout;

  options = options || {};

  if (this._tokenizationInProgress === true) {
    return Promise.reject(new BraintreeError(errors.VENMO_TOKENIZATION_REQUEST_ACTIVE));
  }

  if (this.hasTokenizationResult()) {
    return this._processResults();
  }

  this._tokenizationInProgress = true;
  this._tokenizePromise = new ExtendedPromise();

  this._previousHash = window.location.hash;

  function completeFlow(hash) {
    var error;

    self._processResults(hash).catch(function (err) {
      error = err;
    }).then(function (res) {
      if (!self._ignoreHistoryChanges && window.location.hash !== self._previousHash) {
        window.location.hash = self._previousHash;
      }
      self._removeVisibilityEventListener();

      if (error) {
        self._tokenizePromise.reject(error);
      } else {
        self._tokenizePromise.resolve(res);
      }
      delete self._tokenizePromise;
    });
  }

  // The Venmo SDK app switches back with the results of the
  // tokenization encoded in the hash
  this._onHashChangeListener = function (e) {
    var hash = e.newURL.split('#')[1];

    if (!self._hasTokenizationResult(hash)) {
      return;
    }

    resultProcessingInProgress = true;
    clearTimeout(visibilityChangeListenerTimeout);
    self._tokenizationInProgress = false;
    completeFlow(hash);
  };

  window.addEventListener('hashchange', this._onHashChangeListener, false);

  // Subscribe to document visibility change events to detect when app switch
  // has returned. Acts as a fallback for the hashchange listener and catches
  // the cancel case via manual app switch back
  this._visibilityChangeListener = function () {
    var delay = options.processResultsDelay || constants.DEFAULT_PROCESS_RESULTS_DELAY;

    if (!window.document.hidden) {
      self._tokenizationInProgress = false;

      if (!resultProcessingInProgress) {
        visibilityChangeListenerTimeout = setTimeout(completeFlow, delay);
      }
    }
  };

  return this.getUrl().then(function (url) {
    if (self._deepLinkReturnUrl) {
      if (isIosWebview()) {
        analytics.sendEvent(self._createPromise, 'venmo.appswitch.start.ios-webview');
        // Deep link URLs do not launch iOS apps from a webview when using window.open or PopupBridge.open.
        window.location.href = url;
      } else if (global.popupBridge && typeof global.popupBridge.open === 'function') {
        analytics.sendEvent(self._createPromise, 'venmo.appswitch.start.popup-bridge');
        window.popupBridge.open(url);
      } else {
        analytics.sendEvent(self._createPromise, 'venmo.appswitch.start.webview');
        window.open(url);
      }
    } else {
      analytics.sendEvent(self._createPromise, 'venmo.appswitch.start.browser');
      window.open(url);
    }

    // Add a brief delay to ignore visibility change events that occur right before app switch
    setTimeout(function () {
      window.document.addEventListener(documentVisibilityChangeEventName(), self._visibilityChangeListener);
    }, constants.DOCUMENT_VISIBILITY_CHANGE_EVENT_DELAY);

    return self._tokenizePromise;
  });
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/venmo.create|create}.
 * @public
 * @param {callback} [callback] Called once teardown is complete. No data is returned if teardown completes successfully.
 * @example
 * venmoInstance.teardown();
 * @example <caption>With callback</caption>
 * venmoInstance.teardown(function () {
 *   // teardown is complete
 * });
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 */
Venmo.prototype.teardown = function () {
  this._removeVisibilityEventListener();
  convertMethodsToError(this, methods(Venmo.prototype));

  return Promise.resolve();
};

Venmo.prototype._removeVisibilityEventListener = function () {
  window.removeEventListener('hashchange', this._onHashChangeListener);
  window.document.removeEventListener(documentVisibilityChangeEventName(), this._visibilityChangeListener);

  delete this._visibilityChangeListener;
  delete this._onHashChangeListener;
};

Venmo.prototype._processResults = function (hash) {
  var self = this;
  var params = getFragmentParameters(hash);

  return new Promise(function (resolve, reject) {
    if (params.venmoSuccess) {
      analytics.sendEvent(self._createPromise, 'venmo.appswitch.handle.success');
      resolve(formatTokenizePayload(params));
    } else if (params.venmoError) {
      analytics.sendEvent(self._createPromise, 'venmo.appswitch.handle.error');
      reject(new BraintreeError({
        type: errors.VENMO_APP_FAILED.type,
        code: errors.VENMO_APP_FAILED.code,
        message: errors.VENMO_APP_FAILED.message,
        details: {
          originalError: {
            message: decodeURIComponent(params.errorMessage),
            code: params.errorCode
          }
        }
      }));
    } else if (params.venmoCancel) {
      analytics.sendEvent(self._createPromise, 'venmo.appswitch.handle.cancel');
      reject(new BraintreeError(errors.VENMO_APP_CANCELED));
    } else {
      // User has either manually switched back to browser, or app is not available for app switch
      analytics.sendEvent(self._createPromise, 'venmo.appswitch.cancel-or-unavailable');
      reject(new BraintreeError(errors.VENMO_CANCELED));
    }

    self._clearFragmentParameters();
  });
};

Venmo.prototype._clearFragmentParameters = function () {
  if (this._ignoreHistoryChanges) {
    return;
  }

  if (typeof window.history.replaceState === 'function' && window.location.hash) {
    history.pushState({}, '', window.location.href.slice(0, window.location.href.indexOf('#')));
  }
};

function getFragmentParameters(hash) {
  var keyValuesArray = (hash || window.location.hash.substring(1)).split('&');

  return keyValuesArray.reduce(function (toReturn, keyValue) {
    var parts = keyValue.split('=');
    // some Single Page Apps may pre-pend a / to the first value
    // in the hash, assuming it's a route in their app
    // instead of information from Venmo, this removes all
    // non-alphanumeric characters from the keys in the params
    var key = decodeURIComponent(parts[0]).replace(/\W/g, '');
    var value = decodeURIComponent(parts[1]);

    toReturn[key] = value;

    return toReturn;
  }, {});
}

function formatTokenizePayload(fragmentParams) {
  return {
    nonce: fragmentParams.paymentMethodNonce,
    type: 'VenmoAccount',
    details: {
      username: fragmentParams.username
    }
  };
}

// From https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
function documentVisibilityChangeEventName() {
  var visibilityChange;

  if (typeof window.document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support
    visibilityChange = 'visibilitychange';
  } else if (typeof window.document.msHidden !== 'undefined') {
    visibilityChange = 'msvisibilitychange';
  } else if (typeof window.document.webkitHidden !== 'undefined') {
    visibilityChange = 'webkitvisibilitychange';
  }

  return visibilityChange;
}

function isIosWebview() {
  // we know it's a webview because this flow only gets
  // used when checking the deep link flow
  // test the platform here to get around custom useragents
  return window.navigator.platform &&
    /iPhone|iPad|iPod/.test(window.navigator.platform);
}

module.exports = wrapPromise.wrapPrototype(Venmo);
