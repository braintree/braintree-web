'use strict';

var analytics = require('../lib/analytics');
var isBrowserSupported = require('./shared/supports-venmo');
var browserDetection = require('./shared/browser-detection');
var constants = require('./shared/constants');
var errors = require('./shared/errors');
var querystring = require('../lib/querystring');
var isVerifiedDomain = require('../lib/is-verified-domain');
var methods = require('../lib/methods');
var convertMethodsToError = require('../lib/convert-methods-to-error');
var wrapPromise = require('@braintree/wrap-promise');
var BraintreeError = require('../lib/braintree-error');
var inIframe = require('../lib/in-iframe');
var Promise = require('../lib/promise');
var ExtendedPromise = require('@braintree/extended-promise');
// NEXT_MAJOR_VERSION the source code for this is actually in a
// typescript repo called venmo-desktop, once the SDK is migrated
// to typescript, we can move the TS files out of that separate
// repo and into the web SDK properly
var createVenmoDesktop = require('./external/');
var graphqlQueries = require('./external/queries');

var VERSION = process.env.npm_package_version;
var DEFAULT_MOBILE_POLLING_INTERVAL = 250; // 1/4 second
var DEFAULT_MOBILE_EXPIRING_THRESHOLD = 300000; // 5 minutes

/**
 * Venmo tokenize payload.
 * @typedef {object} Venmo~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {string} type The payment method type, always `VenmoAccount`.
 * @property {object} details Additional Venmo account details.
 * @property {string} details.username The username of the Venmo account.
 * @property {string} details.paymentContextId The context ID of the Venmo payment. Only available when used with {@link https://braintree.github.io/braintree-web/current/module-braintree-web_venmo.html#.create|`paymentMethodUsage`}.
 */

/**
 * @class
 * @param {object} options The Venmo {@link module:braintree-web/venmo.create create} options.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/venmo.create|braintree-web.venmo.create} instead.</strong>
 * @classdesc This class represents a Venmo component produced by {@link module:braintree-web/venmo.create|braintree-web/venmo.create}. Instances of this class have methods for tokenizing Venmo payments.
 */
function Venmo(options) {
  var self = this;

  this._createPromise = options.createPromise;
  this._allowNewBrowserTab = options.allowNewBrowserTab !== false;
  this._allowWebviews = options.allowWebviews !== false;
  this._allowDesktop = options.allowDesktop === true;
  this._requireManualReturn = options.requireManualReturn === true;
  this._useRedirectForIOS = options.useRedirectForIOS === true;
  this._profileId = options.profileId;
  this._displayName = options.displayName;
  this._deepLinkReturnUrl = options.deepLinkReturnUrl;
  this._ignoreHistoryChanges = options.ignoreHistoryChanges;
  this._paymentMethodUsage = (options.paymentMethodUsage || '').toUpperCase();
  this._shouldUseLegacyFlow = !this._paymentMethodUsage;
  this._useDesktopFlow = this._allowDesktop && this._isDesktop();
  this._cannotHaveReturnUrls = inIframe() || this._requireManualReturn;
  this._shouldCreateVenmoPaymentContext = this._cannotHaveReturnUrls || !this._shouldUseLegacyFlow;

  analytics.sendEvent(this._createPromise, 'venmo.desktop-flow.configured.' + String(Boolean(this._allowDesktop)));

  // if the url has a tokenization result, that indicates
  // that it cannot be the desktop flow or the manual return
  // flow. If it's the hash change with paymentMethodUsage
  // flow, we want to skip creating a new payment context, since
  // there is already a pending payment context waiting to be
  // processed. For the hash change flow without paymentMethodUsage,
  // no further actions are needed.
  if (this.hasTokenizationResult()) {
    analytics.sendEvent(this._createPromise, 'venmo.appswitch.return-in-new-tab');
  } else if (this._useDesktopFlow) {
    this._createPromise = this._createPromise.then(function (client) {
      var config = client.getConfiguration().gatewayConfiguration;

      return createVenmoDesktop({
        url: config.assetsUrl + '/web/' + VERSION + '/html/venmo-desktop-frame.html',
        environment: config.environment === 'production' ? 'PRODUCTION' : 'SANDBOX',
        profileId: self._profileId || config.payWithVenmo.merchantId,
        paymentMethodUsage: self._paymentMethodUsage,
        displayName: self._displayName,
        Promise: Promise,
        apiRequest: function (query, data) {
          return client.request({
            api: 'graphQLApi',
            data: {
              query: query,
              variables: data
            }
          }).then(function (response) {
            return response.data;
          });
        },
        sendEvent: function (eventName) {
          analytics.sendEvent(self._createPromise, eventName);
        },
        verifyDomain: isVerifiedDomain
      }).then(function (venmoDesktopInstance) {
        self._venmoDesktopInstance = venmoDesktopInstance;
        analytics.sendEvent(self._createPromise, 'venmo.desktop-flow.presented');

        return client;
      }).catch(function () {
        analytics.sendEvent(self._createPromise, 'venmo.desktop-flow.setup-failed');
        self._useDesktopFlow = false;

        return client;
      });
    });
  } else if (this._shouldCreateVenmoPaymentContext) {
    // these variables are only relevant for the manual return flow
    // and they are only set to make testing easier (so they can
    // be overwritten with smaller values in the tests)
    this._mobilePollingInterval = DEFAULT_MOBILE_POLLING_INTERVAL;
    this._mobilePollingExpiresThreshold = DEFAULT_MOBILE_EXPIRING_THRESHOLD;

    this._createPromise = this._createPromise.then(function (client) {
      var analyticsCategory = self._cannotHaveReturnUrls ?
        'manual-return' : 'mobile-payment-context';
      var config = client.getConfiguration().gatewayConfiguration;

      self._mobilePollingContextEnvironment = config.environment.toUpperCase();

      return self._createVenmoPaymentContext(client).then(function () {
        analytics.sendEvent(self._createPromise, 'venmo.' + analyticsCategory + '.presented');

        return client;
      }).catch(function (err) {
        analytics.sendEvent(self._createPromise, 'venmo.' + analyticsCategory + '.setup-failed');

        return Promise.reject(new BraintreeError({
          type: errors.VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED.type,
          code: errors.VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED.code,
          message: errors.VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED.message,
          details: {
            originalError: err
          }
        }));
      });
    });
  }
}

Venmo.prototype._createVenmoPaymentContext = function (client, cancelIfTokenizationInProgress) {
  var self = this;
  var promise;

  if (!this._shouldCreateVenmoPaymentContext) {
    return Promise.resolve();
  }

  if (this._shouldUseLegacyFlow) {
    promise = client.request({
      api: 'graphQLApi',
      data: {
        query: graphqlQueries.LEGACY_CREATE_PAYMENT_CONTEXT_QUERY,
        variables: {
          input: {
            environment: this._mobilePollingContextEnvironment,
            intent: 'PAY_FROM_APP'
          }
        }
      }
    }).then(function (response) {
      return response.data.createVenmoQRCodePaymentContext.venmoQRCodePaymentContext;
    });
  } else {
    promise = client.request({
      api: 'graphQLApi',
      data: {
        query: graphqlQueries.CREATE_PAYMENT_CONTEXT_QUERY,
        variables: {
          input: {
            paymentMethodUsage: this._paymentMethodUsage,
            intent: 'CONTINUE',
            customerClient: 'MOBILE_WEB',
            displayName: this._displayName
          }
        }
      }
    }).then(function (response) {
      return response.data.createVenmoPaymentContext.venmoPaymentContext;
    });
  }

  return promise.then(function (context) {
    var expiredTime = new Date(context.expiresAt) - new Date(context.createdAt);
    var refreshIn = expiredTime * 0.6666;

    // prevents multiple setTimeouts from firing from separate calls
    // to create a payment context by canceling the previous one
    // if there is a pending call
    clearTimeout(self._refreshPaymentContextTimeout);
    self._refreshPaymentContextTimeout = setTimeout(function () {
      if (self._tokenizationInProgress) {
        return;
      }
      self._createVenmoPaymentContext(client, true);
    }, refreshIn);

    if (cancelIfTokenizationInProgress && self._tokenizationInProgress) {
      return;
    }

    self._venmoPaymentContextStatus = context.status;
    self._venmoPaymentContextId = context.id;
  });
};

Venmo.prototype.appSwitch = function (url) {
  if (this._deepLinkReturnUrl) {
    if (isIosWebviewInDeepLinkReturnUrlFlow()) {
      analytics.sendEvent(this._createPromise, 'venmo.appswitch.start.ios-webview');
      // Deep link URLs do not launch iOS apps from a webview when using window.open or PopupBridge.open.
      window.location.href = url;
    } else if (window.popupBridge && typeof window.popupBridge.open === 'function') {
      analytics.sendEvent(this._createPromise, 'venmo.appswitch.start.popup-bridge');
      window.popupBridge.open(url);
    } else {
      analytics.sendEvent(this._createPromise, 'venmo.appswitch.start.webview');
      window.open(url);
    }
  } else {
    analytics.sendEvent(this._createPromise, 'venmo.appswitch.start.browser');

    if (browserDetection.doesNotSupportWindowOpenInIos() || this._shouldUseRedirectStrategy()) {
      window.location.href = url;
    } else {
      window.open(url);
    }
  }
};

Venmo.prototype.getUrl = function () {
  return this._createPromise.then(function (client) {
    var configuration = client.getConfiguration();
    var params = {};
    var currentUrl = this._deepLinkReturnUrl || window.location.href.replace(window.location.hash, '');
    var venmoConfiguration = configuration.gatewayConfiguration.payWithVenmo;
    var analyticsMetadata = configuration.analyticsMetadata;
    var accessToken = venmoConfiguration.accessToken;
    var braintreeData = {
      _meta: {
        version: analyticsMetadata.sdkVersion,
        integration: analyticsMetadata.integration,
        platform: analyticsMetadata.platform,
        sessionId: analyticsMetadata.sessionId
      }
    };

    currentUrl = currentUrl.replace(/#*$/, '');

    /* eslint-disable camelcase */
    if (this._venmoPaymentContextId) {
      if (this._shouldUseLegacyFlow) {
        // NEXT_MAJOR_VERSION stop adding the context id to the access token.
        // the context id is placed here for backwards compatiblity
        // with versions of the venmo app that did not support
        // pulling the resource id off of the query params
        accessToken += '|pcid:' + this._venmoPaymentContextId;
      } else {
        params.resource_id = this._venmoPaymentContextId;
      }
    }

    if (this._shouldIncludeReturnUrls()) {
      params['x-success'] = currentUrl + '#venmoSuccess=1';
      params['x-cancel'] = currentUrl + '#venmoCancel=1';
      params['x-error'] = currentUrl + '#venmoError=1';
    } else {
      params['x-success'] = 'NOOP';
      params['x-cancel'] = 'NOOP';
      params['x-error'] = 'NOOP';
    }
    params.ua = window.navigator.userAgent;
    params.braintree_merchant_id = this._profileId || venmoConfiguration.merchantId;
    params.braintree_access_token = accessToken;
    params.braintree_environment = venmoConfiguration.environment;
    params.braintree_sdk_data = btoa(JSON.stringify(braintreeData));
    /* eslint-enable camelcase */

    return constants.VENMO_OPEN_URL + '?' + querystring.stringify(params);
  }.bind(this));
};

/**
 * Returns a boolean indicating whether the current browser supports Venmo as a payment method.
 *
 * If `options.allowNewBrowserTab` is false when calling {@link module:braintree-web/venmo.create|venmo.create}, this method will return true only for browsers known to support returning from the Venmo app to the same browser tab. Currently, this is limited to iOS Safari and Android Chrome.
 * If `options.allowWebviews` is false when calling {@link module:braintree-web/venmo.create|venmo.create}, this method will return true only for mobile browsers that are not webviews.
 * @public
 * @returns {boolean} True if the current browser is supported, false if not.
 */
Venmo.prototype.isBrowserSupported = function () {
  return isBrowserSupported.isBrowserSupported({
    allowNewBrowserTab: this._allowNewBrowserTab,
    allowWebviews: this._allowWebviews,
    allowDesktop: this._allowDesktop
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

Venmo.prototype._shouldIncludeReturnUrls = function () {
  // when a deep link return url is passed, we should always
  // respect it and include the return urls so the venmo app
  // can app switch back to it
  if (this._deepLinkReturnUrl) {
    return true;
  }

  // when the sdk is initialized within an iframe, it's
  // impossible to return back to the correct place automatically
  // without also setting a deepLinkReturnUrl. When the return
  // urls are omitted, the Venmo app prompts the user to return
  // manually.
  return !this._cannotHaveReturnUrls;
};

Venmo.prototype._isDesktop = function () {
  return !(browserDetection.isIos() || browserDetection.isAndroid());
};

/**
 * Launches the Venmo flow and returns a nonce payload.
 *
 * If {@link Venmo#hasTokenizationResult|hasTokenizationResult} returns true, calling tokenize will immediately process and return the results without initiating the Venmo payment authorization flow.
 *
 * Only one Venmo flow can be active at a time. One way to achieve this is to disable your Venmo button while the flow is open.
 * @public
 * @param {object} [options] Options for tokenization.
 * @param {number} [options.processResultsDelay=500] The amount of time in milliseconds to delay processing the results. In most cases, this value should be left as the default.
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
  var tokenizationPromise;

  options = options || {};

  if (this._tokenizationInProgress === true) {
    return Promise.reject(new BraintreeError(errors.VENMO_TOKENIZATION_REQUEST_ACTIVE));
  }

  this._tokenizationInProgress = true;

  if (this._useDesktopFlow) {
    // for the desktop flow, we create a venmo payment
    // context and then present a qr code modal to the
    // customer and they will open up their venmo app
    // and scan it and approve the purchase on their
    // mobile device. The sdk will start polling
    // in order to determine when the status of the
    // payment context has updated and then pass the
    // resulting nonce back to the merchant.
    tokenizationPromise = this._tokenizeForDesktop(options);
  } else if (this._cannotHaveReturnUrls) {
    // in the manual return strategy, we create the payment
    // context on initialization, then continually poll once
    // the app switch begins until we get a response indiciating
    // the payment context was approved by the customer on the
    // Venmo app. The payment context response also includes a
    // nonce. There are 2 cases where we use the manual return
    // strategy:
    // 1. the sdk is instantiated in an iframe, because
    //    the venmo app is unable to redirect automatically
    //    when that is the case so we rely on the customer
    //    to do a manual redirect and continunally poll for
    //    updates on the payment context to get the nonce
    // 2. same deal for when `requireManualReturn` is configured
    tokenizationPromise = this._tokenizeForMobileWithManualReturn();
  } else {
    // the default mobile flow is to app switch to the
    // venmo app, and then have the venmo app switch
    // back to the page with the venmo nonce details
    // encoded into the hash portion of the url. If
    // `paymentMethodUsage` is provided when instantiating
    // the sdk, we also create a payment context and pass
    // the resource id to the Venmo app during the app switch.
    // Once we get a succesful return, we ping the payment
    // context query to get any additional data needed
    // to send back to the merchant.
    tokenizationPromise = this._tokenizeForMobileWithHashChangeListeners(options);
  }

  return tokenizationPromise.then(function (payload) {
    return self._createPromise.then(function (client) {
      return self._createVenmoPaymentContext(client);
    }).then(function () {
      self._tokenizationInProgress = false;

      return formatTokenizePayload(payload);
    });
  }).catch(function (err) {
    return self._createPromise.then(function (client) {
      return self._createVenmoPaymentContext(client);
    }).then(function () {
      self._tokenizationInProgress = false;

      return Promise.reject(err);
    });
  });
};

/**
 * Cancels the venmo tokenization process
 *
 * @public
 * @returns {(Promise|void)} Returns a promise if no callback is provided.
 * @example
 * venmoTokenizeButton.addEventListener('click', function () {
 *   venmoInstance.tokenize().then(function (payload) {
 *     // handle payload
 *   }).catch(function (err) {
 *     if (err.code === 'VENMO_TOKENIZATION_CANCELED_BY_MERCHANT') {
 *       // tokenization was canceled by calling cancelTokenization
 *     }
 *   });
 * });
 *
 * venmoCancelButton.addEventListener('click', function () {
 *   // Hide the button when the venmo flow is not in progress
 *   venmoCancelButton.style.display = "none";
 *
 *   venmoInstance.cancelTokenization().then(function () {
 *     // done canceling the flow
 *   }).catch(function (err) {
 *     // should only get here if there is no tokenization in progress
 *   });
 * });
 */
Venmo.prototype.cancelTokenization = function () {
  if (!this._tokenizationInProgress) {
    return Promise.reject(new BraintreeError(errors.VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE));
  }

  this._removeVisibilityEventListener();

  // important to reject the tokenization promise first
  // so the tokenize method rejects with this error
  // rather than a customer canceled error in the mobile
  // polling and desktop flows
  if (this._tokenizePromise) {
    this._tokenizePromise.reject(new BraintreeError(errors.VENMO_TOKENIZATION_CANCELED_BY_MERCHANT));
  }

  return Promise.all([
    this._cancelMobilePaymentContext(),
    this._cancelVenmoDesktopContext()
  ]);
};

Venmo.prototype._queryPaymentContextStatus = function (id) {
  var self = this;

  return this._createPromise.then(function (client) {
    var query = self._shouldUseLegacyFlow ?
      graphqlQueries.LEGACY_VENMO_PAYMENT_CONTEXT_STATUS_QUERY :
      graphqlQueries.VENMO_PAYMENT_CONTEXT_STATUS_QUERY;

    return client.request({
      api: 'graphQLApi',
      data: {
        query: query,
        variables: {
          id: id
        }
      }
    });
  }).then(function (response) {
    return response.data.node;
  });
};

Venmo.prototype._pollForStatusChange = function () {
  var self = this;

  if (Date.now() > self._mobilePollingContextExpiresIn) {
    return Promise.reject(new BraintreeError(errors.VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT));
  }

  return this._queryPaymentContextStatus(this._venmoPaymentContextId).catch(function (networkError) {
    return Promise.reject(new BraintreeError({
      type: errors.VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR.type,
      code: errors.VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR.code,
      message: errors.VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR.message,
      details: {
        originalError: networkError
      }
    }));
  }).then(function (node) {
    var newStatus = node.status;

    if (newStatus !== self._venmoPaymentContextStatus) {
      self._venmoPaymentContextStatus = newStatus;

      analytics.sendEvent(self._createPromise, 'venmo.tokenize.manual-return.status-change.' + newStatus.toLowerCase());

      switch (newStatus) {
        case 'EXPIRED':
        case 'FAILED':
        case 'CANCELED':
          return Promise.reject(new BraintreeError(errors['VENMO_MOBILE_POLLING_TOKENIZATION_' + newStatus]));
        case 'APPROVED':
          return Promise.resolve(node);
        case 'CREATED':
        case 'SCANNED':
        default:
          // any other statuses are irrelevant to the polling
          // and can just be ignored
      }
    }

    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        self._pollForStatusChange()
          .then(resolve)
          .catch(reject);
      }, self._mobilePollingInterval);
    });
  });
};

Venmo.prototype._tokenizeForMobileWithManualReturn = function () {
  var self = this;

  analytics.sendEvent(this._createPromise, 'venmo.tokenize.manual-return.start');

  this._mobilePollingContextExpiresIn = Date.now() + this._mobilePollingExpiresThreshold;
  this._tokenizePromise = new ExtendedPromise();

  this._pollForStatusChange().then(function (payload) {
    analytics.sendEvent(self._createPromise, 'venmo.tokenize.manual-return.success');

    self._tokenizePromise.resolve({
      paymentMethodNonce: payload.paymentMethodId,
      username: payload.userName,
      payerInfo: payload.payerInfo,
      id: self._venmoPaymentContextId
    });
  }).catch(function (err) {
    analytics.sendEvent(self._createPromise, 'venmo.tokenize.manual-return.failure');

    self._tokenizePromise.reject(err);
  });

  return this.getUrl().then(function (url) {
    self.appSwitch(url);

    return self._tokenizePromise;
  });
};

Venmo.prototype._shouldUseRedirectStrategy = function () {
  if (!browserDetection.isIos()) {
    return false;
  }

  return this._useRedirectForIOS;
};

Venmo.prototype._tokenizeForMobileWithHashChangeListeners = function (options) {
  var self = this;
  var resultProcessingInProgress, visibilityChangeListenerTimeout;

  if (this.hasTokenizationResult()) {
    return this.processResultsFromHash();
  }

  analytics.sendEvent(this._createPromise, 'venmo.tokenize.mobile.start');
  this._tokenizePromise = new ExtendedPromise();

  this._previousHash = window.location.hash;

  function completeFlow(hash) {
    var error;

    self.processResultsFromHash(hash).catch(function (err) {
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
    completeFlow(hash);
  };

  window.addEventListener('hashchange', this._onHashChangeListener, false);

  // Subscribe to document visibility change events to detect when app switch
  // has returned. Acts as a fallback for the hashchange listener and catches
  // the cancel case via manual app switch back
  this._visibilityChangeListener = function () {
    var delay = options.processResultsDelay || constants.DEFAULT_PROCESS_RESULTS_DELAY;

    if (!window.document.hidden) {
      if (!resultProcessingInProgress) {
        visibilityChangeListenerTimeout = setTimeout(completeFlow, delay);
      }
    }
  };

  return this.getUrl().then(function (url) {
    self.appSwitch(url);

    // Add a brief delay to ignore visibility change events that occur right before app switch
    setTimeout(function () {
      window.document.addEventListener(documentVisibilityChangeEventName(), self._visibilityChangeListener);
    }, constants.DOCUMENT_VISIBILITY_CHANGE_EVENT_DELAY);

    return self._tokenizePromise;
  });
};

Venmo.prototype._tokenizeForDesktop = function () {
  var self = this;

  analytics.sendEvent(this._createPromise, 'venmo.tokenize.desktop.start');

  this._tokenizePromise = new ExtendedPromise();

  this._createPromise.then(function () {
    return self._venmoDesktopInstance.launchDesktopFlow();
  }).then(function (payload) {
    self._venmoDesktopInstance.hideDesktopFlow();

    analytics.sendEvent(self._createPromise, 'venmo.tokenize.desktop.success');

    self._tokenizePromise.resolve(payload);
  }).catch(function (err) {
    analytics.sendEvent(self._createPromise, 'venmo.tokenize.desktop.failure');

    if (self._venmoDesktopInstance) {
      self._venmoDesktopInstance.hideDesktopFlow();
    }

    if (err && err.reason === 'CUSTOMER_CANCELED') {
      self._tokenizePromise.reject(new BraintreeError(errors.VENMO_DESKTOP_CANCELED));

      return;
    }

    self._tokenizePromise.reject(new BraintreeError({
      type: errors.VENMO_DESKTOP_UNKNOWN_ERROR.type,
      code: errors.VENMO_DESKTOP_UNKNOWN_ERROR.code,
      message: errors.VENMO_DESKTOP_UNKNOWN_ERROR.message,
      details: {
        originalError: err
      }
    }));
  });

  return this._tokenizePromise;
};

// TODO remove this once initial testing is done
Venmo.prototype._updateVenmoDesktopPaymentContext = function (status, options) {
  return this._venmoDesktopInstance.updateVenmoDesktopPaymentContext(status, options);
};

Venmo.prototype._cancelMobilePaymentContext = function () {
  var self = this;

  return this._createPromise.then(function (client) {
    var query;

    if (self._venmoPaymentContextId) {
      query = self._shouldUseLegacyFlow ?
        graphqlQueries.LEGACY_UPDATE_PAYMENT_CONTEXT_QUERY :
        graphqlQueries.UPDATE_PAYMENT_CONTEXT_QUERY;

      return client.request({
        api: 'graphQLApi',
        data: {
          query: query,
          variables: {
            input: {
              id: self._venmoPaymentContextId,
              status: 'CANCELED'
            }
          }
        }
      });
    }

    return Promise.resolve();
  });
};

Venmo.prototype._cancelVenmoDesktopContext = function () {
  var self = this;

  return this._createPromise.then(function () {
    if (self._venmoDesktopInstance) {
      self._venmoDesktopInstance.updateVenmoDesktopPaymentContext('CANCELED');
    }

    return Promise.resolve();
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
  var self = this;

  this._removeVisibilityEventListener();

  return this._createPromise.then(function () {
    if (self._venmoDesktopInstance) {
      self._venmoDesktopInstance.teardown();
    }

    clearTimeout(self._refreshPaymentContextTimeout);
    self._cancelMobilePaymentContext();

    convertMethodsToError(this, methods(Venmo.prototype));
  }.bind(this));
};

Venmo.prototype._removeVisibilityEventListener = function () {
  window.removeEventListener('hashchange', this._onHashChangeListener);
  window.document.removeEventListener(documentVisibilityChangeEventName(), this._visibilityChangeListener);

  delete this._visibilityChangeListener;
  delete this._onHashChangeListener;
};

Venmo.prototype.processResultsFromHash = function (hash) {
  var self = this;
  var params = getFragmentParameters(hash);

  return new Promise(function (resolve, reject) {
    if (params.venmoSuccess) {
      analytics.sendEvent(self._createPromise, 'venmo.appswitch.handle.success');

      if (params.resource_id && !self._shouldUseLegacyFlow) {
        self._queryPaymentContextStatus(params.resource_id).then(function (result) {
          if (result.status !== 'APPROVED') {
            analytics.sendEvent(self._createPromise, 'venmo.process-results.unexpected-payment-context-status.' + result.status.toLowerCase());
            resolve(params);

            return;
          }
          resolve({
            paymentMethodNonce: result.paymentMethodId,
            username: result.userName,
            payerInfo: result.payerInfo,
            id: params.resource_id
          });
        }).catch(function () {
          analytics.sendEvent(self._createPromise, 'venmo.process-results.payment-context-status-query-failed');
          resolve(params);
        });
      } else {
        resolve(params);
      }
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

function formatUserName(username) {
  username = username || '';

  // NEXT_MAJOR_VERSION the web sdks have a prepended @ sign
  // but the ios and android ones do not. This should be standardized
  return '@' + username.replace('@', '');
}

function formatTokenizePayload(payload) {
  var formattedPayload = {
    nonce: payload.paymentMethodNonce,
    type: 'VenmoAccount',
    details: {
      username: formatUserName(payload.username),
      paymentContextId: payload.id
    }
  };

  if (payload.payerInfo) {
    formattedPayload.details.payerInfo = payload.payerInfo;
    formattedPayload.details.payerInfo.userName = formatUserName(payload.payerInfo.userName);
  }

  return formattedPayload;
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

function isIosWebviewInDeepLinkReturnUrlFlow() {
  // we know it's a webview because this flow only gets
  // used when checking the deep link flow
  // test the platform here to get around custom useragents
  return window.navigator.platform &&
    /iPhone|iPad|iPod/.test(window.navigator.platform);
}

module.exports = wrapPromise.wrapPrototype(Venmo);
