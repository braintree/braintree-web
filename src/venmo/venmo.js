// @ts-nocheck
import analytics from "../lib/analytics";
import { assign } from "../lib/assign";
import isBrowserSupported from "./shared/supports-venmo";
import browserDetection from "./shared/browser-detection";
import constants from "./shared/constants";
import errors from "./shared/errors";
import querystring from "../lib/querystring";
import isVerifiedDomain from "../lib/is-verified-domain";
import methods from "../lib/methods";
import convertMethodsToError from "../lib/convert-methods-to-error";
import BraintreeError from "../lib/braintree-error";
import inIframe from "../lib/in-iframe";
import documentVisibility from "../lib/document-visibility";
import ExtendedPromise from "@braintree/extended-promise";
import getVenmoUrl from "./shared/get-venmo-url";
import desktopWebLogin from "./shared/web-login-backdrop";
import createVenmoDesktop from "./external/";
import graphqlQueries from "./external/queries";

import { ASSETS_URLS as CONSTANTS_ASSETS_URLS } from "../lib/constants";
const VERSION = __SDK_VERSION__;
var ASSETS_URLS;
if (process.env.BRAINTREE_JS_ENV === "development") {
  ASSETS_URLS = CONSTANTS_ASSETS_URLS;
}
var DEFAULT_MOBILE_POLLING_INTERVAL = 250; // 1/4 second
var DEFAULT_MOBILE_EXPIRING_THRESHOLD = 300000; // 5 minutes

ExtendedPromise.suppressUnhandledPromiseMessage = true;

/**
 * Venmo tokenize payload.
 * @typedef {object} Venmo~tokenizePayload
 * @property {string} nonce The payment method nonce.
 * @property {string} type The payment method type, always `VenmoAccount`.
 * @property {object} details Additional Venmo account details.
 * @property {string} details.username The username of the Venmo account.
 * @property {string} details.paymentContextId The context ID of the Venmo payment.
 */

/**
 * @class
 * @param {object} options The Venmo {@link module:braintree-web/venmo.create create} options.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/venmo.create|braintree-web.venmo.create} instead.</strong>
 * @classdesc This class represents a Venmo component produced by {@link module:braintree-web/venmo.create|braintree-web/venmo.create}. Instances of this class have methods for tokenizing Venmo payments.
 */

function Venmo(options) {
  var self = this;

  this._allowDesktopWebLogin = Boolean(options.allowDesktopWebLogin);
  this._mobileWebFallBack = Boolean(options.mobileWebFallBack);
  this._createPromise = options.createPromise;
  this._allowNewBrowserTab = options.allowNewBrowserTab !== false;
  this._allowWebviews = options.allowWebviews !== false;
  this._allowDesktop = options.allowDesktop === true;
  this._useRedirectForIOS = options.useRedirectForIOS === true;
  this._profileId = options.profileId;
  this._displayName = options.displayName;
  this._deepLinkReturnUrl = options.deepLinkReturnUrl;
  this._paymentMethodUsage = options.paymentMethodUsage.toUpperCase();
  this._requireManualReturn = options.requireManualReturn === true;
  this._useDesktopQRFlow =
    this._allowDesktop && this._isDesktop() && !this._allowDesktopWebLogin;
  this._useAllowDesktopWebLogin =
    this._allowDesktopWebLogin && this._isDesktop();
  this._cannotHaveReturnUrls = inIframe() || this._requireManualReturn;
  this._allowAndroidRecreation = options.allowAndroidRecreation !== false;
  this._allowNonDefaultBrowsers = options.allowNonDefaultBrowsers !== false;
  this._maxRetryCount = 3;
  this._collectCustomerBillingAddress =
    options.collectCustomerBillingAddress || false;
  this._collectCustomerShippingAddress =
    options.collectCustomerShippingAddress || false;
  this._cancelOnReturnToBrowser =
    options.cancelOnReturnToBrowser === true && !browserDetection.isAndroid();
  this._isFinalAmount = options.isFinalAmount || false;
  this._lineItems = options.lineItems;
  this._subTotalAmount = options.subTotalAmount;
  this._discountAmount = options.discountAmount;
  this._taxAmount = options.taxAmount;
  this._shippingAmount = options.shippingAmount;
  this._totalAmount = options.totalAmount;
  this._cspNonce =
    (this._mobileWebFallBack || this._allowDesktopWebLogin) &&
    (options.styleCspNonce || false);
  this._mobilePollingInterval = DEFAULT_MOBILE_POLLING_INTERVAL;
  this._mobilePollingExpiresThreshold = DEFAULT_MOBILE_EXPIRING_THRESHOLD;
  this._pollCount = 0;
  this._riskCorrelationId = options.riskCorrelationId;

  this._isIncognito = options._isIncognito;
  this._enableVenmoSandbox = options.enableVenmoSandbox || false;

  analytics.sendEvent(
    this._createPromise,
    "venmo.options.is-incognito." + String(Boolean(this._isIncognito))
  );

  analytics.sendEvent(
    this._createPromise,
    "venmo.desktop-flow.configured." + String(Boolean(this._allowDesktop))
  );

  if (this._useDesktopQRFlow) {
    this._createPromise = this._createPromise.then(function (client) {
      var config = client.getConfiguration().gatewayConfiguration;

      if (
        (self._collectCustomerBillingAddress ||
          self._collectCustomerShippingAddress) &&
        !config.venmo.enrichedCustomerDataEnabled
      ) {
        throw new BraintreeError(errors.VENMO_ECD_DISABLED);
      }

      return createVenmoDesktop({
        url:
          getAssetsBaseUrl(config.assetsUrl) + "/html/venmo-desktop-frame.html",
        environment:
          config.environment === "production" ? "PRODUCTION" : "SANDBOX",
        profileId: self._profileId || config.venmo.merchantId,
        paymentMethodUsage: self._paymentMethodUsage,
        collectCustomerBillingAddress: self._collectCustomerBillingAddress,
        collectCustomerShippingAddress: self._collectCustomerShippingAddress,
        riskCorrelationId: self._riskCorrelationId,
        displayName: self._displayName,
        Promise: Promise,
        apiRequest: function (query, data) {
          return client
            .request({
              api: "graphQLApi",
              data: {
                query: query,
                variables: data,
              },
            })
            .then(function (response) {
              return response.data;
            });
        },
        sendEvent: function (eventName, params) {
          analytics.sendEventPlus(self._createPromise, eventName, params || {});
        },
        verifyDomain: isVerifiedDomain,
      })
        .then(function (venmoDesktopInstance) {
          self._venmoDesktopInstance = venmoDesktopInstance;
          analytics.sendEvent(
            self._createPromise,
            "venmo.desktop-flow.presented"
          );

          return client;
        })
        .catch(function () {
          analytics.sendEvent(
            self._createPromise,
            "venmo.desktop-flow.setup-failed"
          );
          self._useDesktopQRFlow = false;

          return client;
        });
    });
  } else {
    this._createPromise = this._createPromise.then(function (client) {
      var platform = self._determineAnalyticsCategory();
      var paymentContextPromise, webLoginPromise;
      var analyticsCategory = self._cannotHaveReturnUrls
        ? "manual-return"
        : "mobile-payment-context";
      var config = client.getConfiguration();

      webLoginPromise = desktopWebLogin
        .setupDesktopWebLogin({
          assetsUrl: getAssetsBaseUrl(config.gatewayConfiguration.assetsUrl),
          debug: config.isDebug,
        })
        .then(function (frameServiceInstance) {
          self._frameServiceInstance = frameServiceInstance;
        })
        .catch(function (desktopWebErr) {
          return desktopWebErr;
        });

      self._mobilePollingContextEnvironment =
        config.gatewayConfiguration.environment.toUpperCase();

      paymentContextPromise = self
        ._createVenmoPaymentContext(client)
        .then(function () {
          analytics.sendEventPlus(
            self._createPromise,
            "venmo." + analyticsCategory + ".presented",
            {
              platform: platform,
            }
          );

          return client;
        })
        .catch(function (err) {
          analytics.sendEvent(
            self._createPromise,
            "venmo." + analyticsCategory + ".setup-failed"
          );

          throw new BraintreeError({
            type: errors.VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED.type,
            code: errors.VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED.code,
            message: isValidationError(err)
              ? err.details.originalError[0].message
              : errors.VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED.message,
            details: {
              originalError: err,
            },
          });
        });

      return ExtendedPromise.all([webLoginPromise, paymentContextPromise])
        .then(function (results) {
          var paymentContextResult = results[1]; // We only care about the returned value of the paymentContextPromise

          return paymentContextResult;
        })
        .catch(function (promiseErr) {
          // ExtendedPromise.all returns just one error and it's either which fails first/at all.
          throw promiseErr;
        });
    });
  }
}

/**
 * Determines the calling workflow, defaulting to `'mobile'`.
 * @returns `'mobile'` | `'popup-bridge'` | `'desktop-qr'` | `'web-login-flow'` | `'desktop'`
 */
Venmo.prototype._determineAnalyticsCategory = function () {
  var category;
  if (this._popupBridgeIsInstalled()) {
    category = "popup-bridge";
  } else if (this._useDesktopQRFlow) {
    category = "desktop-qr";
  } else if (this._useAllowDesktopWebLogin) {
    category = "web-login-flow";
  } else if (this._isDesktop()) {
    category = "desktop";
  } else {
    category = "mobile";
  }
  return category;
};

function isValidationError(err) {
  return (
    err.details &&
    err.details.originalError &&
    err.details.originalError[0] &&
    err.details.originalError[0].extensions &&
    err.details.originalError[0].extensions.errorClass === "VALIDATION" &&
    err.details.originalError[0].extensions.errorType === "user_error"
  );
}

function getAssetsBaseUrl(gatewayAssetsUrl) {
  // removeIf(production)
  if (
    process.env.BRAINTREE_JS_ENV === "development" &&
    ASSETS_URLS.development
  ) {
    return ASSETS_URLS.development;
  }
  // endRemoveIf(production)
  return gatewayAssetsUrl + "/web/" + VERSION;
}

Venmo.prototype._createVenmoPaymentContext = function (
  client,
  cancelIfTokenizationInProgress
) {
  var self = this;
  var promise, transactionDetails;
  var configuration = client.getConfiguration();
  var platform = self._determineAnalyticsCategory();
  var venmoConfiguration = configuration.gatewayConfiguration.venmo;
  var transactionDetailsPresent = false;
  var customerClientChannel = self._useAllowDesktopWebLogin
    ? "NATIVE_WEB"
    : "MOBILE_WEB";

  if (
    (this._collectCustomerBillingAddress ||
      this._collectCustomerShippingAddress) &&
    !venmoConfiguration.enrichedCustomerDataEnabled
  ) {
    return Promise.reject(new BraintreeError(errors.VENMO_ECD_DISABLED));
  }

  if (this._lineItems) {
    this._lineItems.forEach(function (item) {
      item.unitTaxAmount = item.unitTaxAmount || "0";
    });
  }
  transactionDetails = {
    subTotalAmount: this._subTotalAmount,
    discountAmount: this._discountAmount,
    taxAmount: this._taxAmount,
    shippingAmount: this._shippingAmount,
    totalAmount: this._totalAmount,
    lineItems: this._lineItems,
  };
  transactionDetailsPresent = Object.keys(transactionDetails).some(
    function (detail) {
      return transactionDetails[detail] !== undefined;
    }
  );

  analytics.sendEventPlus(
    self._createPromise,
    "venmo.create-payment-context.started",
    {
      platform: platform,
    }
  );

  promise = client
    .request({
      api: "graphQLApi",
      data: {
        query: graphqlQueries.CREATE_PAYMENT_CONTEXT_QUERY,
        variables: {
          input: {
            venmoRiskCorrelationId: this._riskCorrelationId,
            paymentMethodUsage: this._paymentMethodUsage,
            intent: "CONTINUE",
            customerClient: customerClientChannel,
            isFinalAmount: this._isFinalAmount,
            displayName: this._displayName,
            paysheetDetails: {
              collectCustomerBillingAddress:
                this._collectCustomerBillingAddress,
              collectCustomerShippingAddress:
                this._collectCustomerShippingAddress,
              transactionDetails: transactionDetailsPresent
                ? transactionDetails
                : undefined,
            },
          },
        },
      },
    })
    .then(function (response) {
      var context = response.data.createVenmoPaymentContext.venmoPaymentContext;
      analytics.sendEventPlus(
        self._createPromise,
        "venmo.create-payment-context.succeeded",
        {
          // eslint-disable-next-line camelcase
          context_id: context.id,
          platform: platform,
        }
      );
      return context;
    })
    .catch(function (err) {
      analytics.sendEventPlus(
        self._createPromise,
        "venmo.create-payment-context.failed",
        {
          platform: platform,
        }
      );
      throw err;
    });

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

Venmo.prototype._popupBridgeIsInstalled = function () {
  return window.popupBridge && typeof window.popupBridge.open === "function";
};

Venmo.prototype._venmoNativeAppIsInstalled = function () {
  return Boolean(
    window.popupBridge &&
    ((window.parent && window.parent.popupBridge.isVenmoInstalled) ||
      window.popupBridge.isVenmoInstalled)
  );
};

/**
 * Handle app switching when a deep link return URL is configured
 * @private
 * @param {string} url - The URL to redirect to
 * @returns {void}
 */
Venmo.prototype._handleDeepLinkAppSwitch = function (url) {
  if (isIosWebviewInDeepLinkReturnUrlFlow()) {
    this._handleIosWebviewDeepLink(url);
  } else if (this._popupBridgeIsInstalled()) {
    this._handlePopupBridgeAppSwitch(url);
  } else if (browserDetection.isAndroidWebview()) {
    analytics.sendEvent(
      this._createPromise,
      "venmo.appswitch.start.android-webview-redirect"
    );

    if (inIframe()) {
      this._handleIFrameBreakout(url);
    } else {
      window.location.href = url;
    }
  } else if (browserDetection.isAndroid() && !browserDetection.isWebview()) {
    analytics.sendEvent(
      this._createPromise,
      "venmo.appswitch.start.android-browser-redirect"
    );

    if (inIframe()) {
      this._handleIFrameBreakout(url);
    } else {
      window.location.href = url;
    }
  } else {
    analytics.sendEvent(this._createPromise, "venmo.appswitch.start.webview");
    this._venmoWindow = window.open(url);
  }
};

/**
 * Handle app switching for iOS webview with deep link return URL
 * @private
 * @param {string} url - The URL to redirect to
 * @returns {void}
 */
Venmo.prototype._handleIosWebviewDeepLink = function (url) {
  analytics.sendEvent(this._createPromise, "venmo.appswitch.start.ios-webview");

  if (inIframe()) {
    this._handleIosWebviewInIframe(url);
  } else if (
    !this._venmoNativeAppIsInstalled() &&
    this._popupBridgeIsInstalled()
  ) {
    this._handlePopupBridgeAppSwitch(url);
  } else {
    // Deep link URLs do not launch iOS apps from a webview when using window.open or PopupBridge.open
    window.location.href = url;
  }
};

/**
 * Handle iOS webview app switching when in an iframe
 * @private
 * @param {string} url - The URL to redirect to
 * @returns {void}
 */
Venmo.prototype._handleIosWebviewInIframe = function (url) {
  if (this._venmoNativeAppIsInstalled()) {
    this._handleIFrameBreakout(url);
  } else if (this._popupBridgeIsInstalled()) {
    this._handlePopupBridgeAppSwitch(url);
  } else {
    this._handleIFrameBreakout(url);
  }
};

/**
 * Handle app switching with PopupBridge
 * @private
 * @param {string} url - The URL to redirect to
 * @returns {void}
 */
Venmo.prototype._handlePopupBridgeAppSwitch = function (url) {
  analytics.sendEvent(
    this._createPromise,
    "venmo.appswitch.start.popup-bridge"
  );
  window.popupBridge.open(url);
};

/**
 * Handle app switching for standard browser environments
 * @private
 * @param {string} url - The URL to redirect to
 * @returns {void}
 */
Venmo.prototype._handleBrowserAppSwitch = function (url) {
  analytics.sendEvent(this._createPromise, "venmo.appswitch.start.browser");

  if (
    browserDetection.doesNotSupportWindowOpenInIos() ||
    this._shouldUseRedirectStrategy()
  ) {
    window.location.href = url;
  } else if (
    inIframe() &&
    browserDetection.isAndroid() &&
    browserDetection.isChrome()
  ) {
    // Chrome Android in iframe cannot use window.open()
    // due to popup blocking. Break out to parent page to enable app switch.
    analytics.sendEvent(
      this._createPromise,
      "venmo.appswitch.start.chrome-android-iframe-breakout"
    );
    this._handleIFrameBreakout(url);
  } else if (
    this._mobileWebFallBack &&
    browserDetection.isAndroid() &&
    browserDetection.isChrome()
  ) {
    // Android chrome needs to use window.location.href
    // to remain in the same tab as expected.
    // Chrome now defaults to opening a new tab.
    window.location.href = url;
  } else {
    this._venmoWindow = window.open(url);
  }
};

/**
 * Handle breaking out of the iframe we're in
 * @private
 * @param {string} url - The URL to redirect to
 * @returns {void}
 */
Venmo.prototype._handleIFrameBreakout = function (url) {
  window.top.location.href = url;
};

Venmo.prototype.appSwitch = function (url) {
  if (this._deepLinkReturnUrl) {
    this._handleDeepLinkAppSwitch(url);
  } else {
    this._handleBrowserAppSwitch(url);
  }
};

Venmo.prototype.getUrl = function () {
  return this._createPromise.then(
    function (client) {
      var configuration = client.getConfiguration();
      var params = {};
      var currentUrl =
        this._deepLinkReturnUrl ||
        window.location.href.replace(window.location.hash, "");
      var venmoConfiguration = configuration.gatewayConfiguration.venmo;
      var analyticsMetadata = configuration.analyticsMetadata;
      var accessToken = venmoConfiguration.accessToken;
      var braintreeData = {
        _meta: {
          version: analyticsMetadata.sdkVersion,
          integration: analyticsMetadata.integration,
          platform: analyticsMetadata.platform,
          sessionId: analyticsMetadata.sessionId,
        },
      };

      this._isDebug = configuration.isDebug;
      this._assetsUrl = getAssetsBaseUrl(
        configuration.gatewayConfiguration.assetsUrl
      );

      currentUrl = currentUrl.replace(/#*$/, "");

      if (this._venmoPaymentContextId) {
        params.resource_id = this._venmoPaymentContextId; // eslint-disable-line camelcase
      }

      if (this._riskCorrelationId) {
        params["client-metadata-id"] = this._riskCorrelationId;
      }

      if (this._shouldIncludeReturnUrls() || this._useAllowDesktopWebLogin) {
        if (this._useAllowDesktopWebLogin) {
          currentUrl = this._assetsUrl + "/html/redirect-frame.html";
        }
        params["x-success"] = currentUrl;
        params["x-cancel"] = currentUrl;
        params["x-error"] = currentUrl;
      } else {
        params["x-success"] = "NOOP";
        params["x-cancel"] = "NOOP";
        params["x-error"] = "NOOP";
      }

      if (!this._allowAndroidRecreation) {
        params.allowAndroidRecreation = 0;
      } else {
        params.allowAndroidRecreation = 1;
      }

      params.ua = window.navigator.userAgent;
      params.braintree_merchant_id = // eslint-disable-line camelcase
        this._profileId || venmoConfiguration.merchantId;
      params.braintree_access_token = accessToken; // eslint-disable-line camelcase
      params.braintree_environment =
        venmoConfiguration.environment.toLowerCase(); // eslint-disable-line camelcase
      params.braintree_sdk_data = btoa(JSON.stringify(braintreeData)); // eslint-disable-line camelcase

      return (
        getVenmoUrl({
          useAllowDesktopWebLogin: this._useAllowDesktopWebLogin,
          mobileWebFallBack: this._mobileWebFallBack,
          enableVenmoSandbox: this._enableVenmoSandbox,
          environment: venmoConfiguration.environment.toLowerCase(),
        }) +
        "?" +
        querystring.stringify(params)
      );
    }.bind(this)
  );
};

/**
 * Returns a boolean indicating whether the current browser supports Venmo as a payment method. Please note that iOS Chrome is not supported when the Venmo button is rendered in an iFrame.
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
    allowDesktop: this._allowDesktop,
    allowDesktopWebLogin: this._allowDesktopWebLogin,
    allowNonDefaultBrowsers: this._allowNonDefaultBrowsers,
  });
};

Venmo.prototype._shouldIncludeReturnUrls = function () {
  // When the SDK is initialized in a non-default mobile browser (but not webviews
  // and not Android)), it is not possible to automatically return to the browser
  // from which the Venmo app was launched. When return URLs are omitted,
  // the Venmo app prompts the user to return manually.
  //
  // Note: webviews are excluded from this restriction because deep link return URLs are
  // specifically designed to work with webviews.
  // Note: Android is excluded from this restriction because it can always return to the
  // browser from which the Venmo app was launched.
  if (
    isBrowserSupported.isNonDefaultBrowser() &&
    !browserDetection.isWebview() &&
    !browserDetection.isAndroid()
  ) {
    return (
      Boolean(this._deepLinkReturnUrl) && this._shouldUseRedirectStrategy()
    );
  }

  // For all other cases (webviews, Android, default browsers), if a deep link
  // return URL is provided, always include return URLs so the Venmo app can
  // deep link back
  if (this._deepLinkReturnUrl) {
    return true;
  }

  // Cannot include return URLs if in iframe or manual return is required
  if (this._cannotHaveReturnUrls) {
    return false;
  }

  // Special case: iOS Safari in private mode should include return URLs
  // because it does allow app switching back to Safari
  if (this._isIncognito && browserDetection.isIosSafari()) {
    return true;
  }

  // For all other incognito/private modes, exclude return URLs
  if (this._isIncognito) {
    return false;
  }

  // Default case: include return URLs
  return true;
};

Venmo.prototype._isDesktop = function () {
  return !(browserDetection.isIos() || browserDetection.isAndroid());
};

/**
 * Detects iOS Safari in iframe without Venmo app installed
 * @private
 * @returns {boolean} True if we're on iOS mobile web, in an iframe, and the Venmo app is not installed
 */
Venmo.prototype._isIOSIframeWithoutVenmoApp = function () {
  return (
    // Respect explicit merchant override
    browserDetection.isIos() &&
    inIframe() &&
    !this._venmoNativeAppIsInstalled() &&
    !this._requireManualReturn
  );
};

/**
 * Launches the Venmo flow and returns a nonce payload.
 *
 * Only one Venmo flow can be active at a time. One way to achieve this is to disable your Venmo button while the flow is open.
 * @public
 * @param {object} [options] Options for tokenization.
 * @param {number} [options.processResultsDelay=500] The amount of time in milliseconds to delay processing the results. In most cases, this value should be left as the default.
 * @returns {Promise} Returns a promise that resolves with a {@link Venmo~tokenizePayload|tokenizePayload}.
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
    return Promise.reject(
      new BraintreeError(errors.VENMO_TOKENIZATION_REQUEST_ACTIVE)
    );
  }

  this._tokenizationInProgress = true;
  if (this._useDesktopQRFlow) {
    // for the desktop flow, we create a venmo payment
    // context and then present a qr code modal to the
    // customer and they will open up their venmo app
    // and scan it and approve the purchase on their
    // mobile device. The sdk will start polling
    // in order to determine when the status of the
    // payment context has updated and then pass the
    // resulting nonce back to the merchant.
    tokenizationPromise = this._tokenizeForDesktopQRFlow(options);
  } else if (this._useAllowDesktopWebLogin) {
    /**
     * For Desktop Web Login, we open a browser popup to allow for authorization. Once authorized, the redirect urls are used by Venmo, and we query the API for a payment context status update.
     *
     * - Payment context is created on initialization
     * - Popup is opened to Venmo login url.
     *  - The payment is authorized or canceled, and the popup is closed
     * - Once the popup is closed, we query the API for a payment context status update
     *
     * This is an alternate, opt-in flow to be used the Desktop QR Flow is not desired for Pay with Venmo desktop experiences.
     */
    tokenizationPromise = this._tokenizeWebLoginWithRedirect(options);
  } else if (
    this._cannotHaveReturnUrls &&
    !this._isIOSIframeWithoutVenmoApp()
  ) {
    // in the manual return strategy, we create the payment
    // context on initialization, then continually poll once
    // the app switch begins until we get a response indicating
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
    // NOTE: We exclude iOS iframe without Venmo app because it causes
    // network errors due to Apple's iframe cross-domain restrictions
    tokenizationPromise = this._tokenizeForMobileWithManualReturn();
  } else {
    // The default mobile flow app switches to the Venmo app
    // with a payment context resource ID. On return, we poll
    // the payment context status query to determine the result.
    tokenizationPromise = this._tokenizeForMobileWithPolling(options);
  }

  return tokenizationPromise
    .then(function (payload) {
      return self._createPromise
        .then(function (client) {
          return self._createVenmoPaymentContext(client);
        })
        .then(function () {
          self._tokenizationInProgress = false;
          self._venmoWindow = null;

          return formatTokenizePayload(payload);
        });
    })
    .catch(function (err) {
      return self._createPromise
        .then(function (client) {
          // We create a new Payment Context because if the last one failed, then presumably we don't want to use it again.
          // On the first pass, we create the payment context at initialization, and since we used that first one we now need to create a new one
          // for the next time someone tries to tokenize.
          return self._createVenmoPaymentContext(client);
        })
        .then(function () {
          self._tokenizationInProgress = false;
          self._venmoWindow = null;

          throw err;
        });
    });
};

/**
 * Cancels the venmo tokenization process
 *
 * @public
 * @function Venmo~cancelTokenization
 * @returns {Promise} Returns a promise.
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
    return Promise.reject(
      new BraintreeError(errors.VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE)
    );
  }

  this._removeVisibilityEventListener();

  // important to reject the tokenization promise first
  // so the tokenize method rejects with this error
  // rather than a customer canceled error in the mobile
  // polling and desktop flows
  if (this._tokenizePromise) {
    this._tokenizePromise.reject(
      new BraintreeError(errors.VENMO_TOKENIZATION_CANCELED_BY_MERCHANT)
    );
  }

  // Clear polling flag
  this._pollingInProgress = false;

  return Promise.all([
    this._cancelMobilePaymentContext(),
    this._cancelVenmoDesktopContext(),
  ]);
};

Venmo.prototype._tokenizeWebLoginWithRedirect = function () {
  var self = this;
  var webLoginOptions;

  analytics.sendEventPlus(
    self._createPromise,
    "venmo.tokenize.web-login.start",
    {
      context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
    }
  );
  this._tokenizePromise = new ExtendedPromise();

  return this.getUrl().then(function (url) {
    webLoginOptions = {
      checkForStatusChange:
        self._checkPaymentContextStatusAndProcessResult.bind(self),
      cancelTokenization: self.cancelTokenization.bind(self),
      frameServiceInstance: self._frameServiceInstance,
      venmoUrl: url,
      debug: self._isDebug,
      checkPaymentContextStatus: self._checkPaymentContextStatus.bind(self),
      analyticsCallback: function (event, status) {
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.desktop." + event + "." + status,
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
          }
        );
      },
    };
    if (self._cspNonce) {
      webLoginOptions = assign({}, webLoginOptions, {
        styleCspNonce: self._cspNonce,
      });
    }
    desktopWebLogin
      .runWebLogin(webLoginOptions)
      .then(function (payload) {
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.tokenize.web-login.success",
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
          }
        );

        self._tokenizePromise.resolve({
          paymentMethodNonce: payload.paymentMethodId,
          username: payload.userName,
          payerInfo: payload.payerInfo,
          id: self._venmoPaymentContextId,
        });
      })
      .catch(function (err) {
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.tokenize.web-login.failure",
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
          }
        );

        self._tokenizePromise.reject(err);
      });

    return self._tokenizePromise;
  });
};

Venmo.prototype._queryPaymentContextStatus = function (id) {
  var self = this;

  analytics.sendEventPlus(
    self._createPromise,
    "venmo.query-payment-context.started",
    {
      context_id: id, // eslint-disable-line camelcase
    }
  );

  return this._createPromise
    .then(function (client) {
      return client.request({
        api: "graphQLApi",
        data: {
          query: graphqlQueries.VENMO_PAYMENT_CONTEXT_STATUS_QUERY,
          variables: {
            id: id,
          },
        },
      });
    })
    .then(function (response) {
      analytics.sendEventPlus(
        self._createPromise,
        "venmo.query-payment-context.succeeded",
        {
          context_id: id, // eslint-disable-line camelcase
        }
      );

      return response.data.node;
    })
    .catch(function (err) {
      analytics.sendEventPlus(
        self._createPromise,
        "venmo.query-payment-context.failed",
        {
          context_id: id, // eslint-disable-line camelcase
        }
      );
      throw err;
    });
};

/**
 * Queries the GraphQL API to get the payment context and process the status. Retries until there is an update to the payment context status.
 * @name Venmo~checkPaymentContextStatusAndProcessResult
 * @ignore
 * @param {number} retryCount The counter for tracking number of retries made against the API.
 * @returns {Promise} Returns a promise
 */
Venmo.prototype._checkPaymentContextStatusAndProcessResult = function (
  retryCount
) {
  var self = this;

  return self._checkPaymentContextStatus().then(function (node) {
    var resultStatus = node.status;

    if (resultStatus !== self._venmoPaymentContextStatus) {
      self._venmoPaymentContextStatus = resultStatus;

      analytics.sendEventPlus(
        self._createPromise,
        "venmo.tokenize.web-login.status-change." + resultStatus.toLowerCase(),
        {
          context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
        }
      );

      switch (resultStatus) {
        case "APPROVED":
          return node;
        case "CANCELED":
          throw new BraintreeError(errors.VENMO_CUSTOMER_CANCELED);
        case "EXPIRED":
        case "FAILED":
          throw new BraintreeError(errors.VENMO_TOKENIZATION_FAILED);
        default:
      }
    }

    return new Promise(function (resolve, reject) {
      if (retryCount < self._maxRetryCount) {
        retryCount++;

        self
          ._checkPaymentContextStatusAndProcessResult(retryCount)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new BraintreeError(errors.VENMO_TOKENIZATION_FAILED));
      }
    });
  });
};

Venmo.prototype._checkPaymentContextStatus = function () {
  var self = this;

  return self
    ._queryPaymentContextStatus(self._venmoPaymentContextId)
    .catch(function (networkError) {
      throw new BraintreeError({
        type: errors.VENMO_NETWORK_ERROR.type,
        code: errors.VENMO_NETWORK_ERROR.code,
        message: errors.VENMO_NETWORK_ERROR.message,
        details: networkError,
      });
    })
    .then(function (node) {
      return node;
    });
};

Venmo.prototype._validatePollingContext = function () {
  if (!this._venmoPaymentContextId) {
    return Promise.reject(
      new BraintreeError(errors.VENMO_MOBILE_POLLING_TOKENIZATION_NO_CONTEXT_ID)
    );
  }

  if (Date.now() > this._mobilePollingContextExpiresIn) {
    return Promise.reject(
      new BraintreeError(errors.VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT)
    );
  }

  return null;
};

Venmo.prototype._handleWindowClosure = function () {
  var self = this;
  var platform = self._determineAnalyticsCategory();

  if (
    self._venmoWindow &&
    self._venmoWindow.closed &&
    self._venmoPaymentContextStatus === "CREATED" &&
    self._cancelOnReturnToBrowser === true
  ) {
    analytics.sendEventPlus(
      self._createPromise,
      "venmo.appswitch.browser-window.closed",
      {
        context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
      }
    );

    self
      ._cancelMobilePaymentContext()
      .then(function () {
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.tokenize.manual-return.canceled",
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
            platform: platform,
          }
        );
      })
      .catch(function (_err) {
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.tokenize.manual-return.canceled.error",
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
            platform: platform,
          }
        );
      });

    return Promise.reject(
      new BraintreeError(errors.VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED)
    );
  }

  return null;
};

Venmo.prototype._handleCancelOnReturn = function () {
  var self = this;
  var minPollsBeforeCancel;

  if (!self._cancelOnReturnToBrowser) {
    return null;
  }

  minPollsBeforeCancel = Math.ceil(
    constants.DEFAULT_PROCESS_RESULTS_DELAY / self._mobilePollingInterval
  );

  self._pollCount++;

  if (
    self._venmoPaymentContextStatus === "CREATED" &&
    self._pollCount >= minPollsBeforeCancel
  ) {
    analytics.sendEventPlus(
      self._createPromise,
      "venmo.appswitch.cancel-on-return-to-browser",
      {
        context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
      }
    );

    return self
      ._cancelMobilePaymentContext()
      .then(function () {
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.appswitch.cancel-on-return-to-browser.success",
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
          }
        );
      })
      .catch(function () {
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.appswitch.cancel-on-return-to-browser.error",
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
          }
        );
      })
      .finally(function () {
        self._pollCount = 0;
      });
  }

  return null;
};

Venmo.prototype._handleStatusChange = function (node) {
  var self = this;
  var newStatus = node.status;

  if (newStatus !== self._venmoPaymentContextStatus) {
    self._venmoPaymentContextStatus = newStatus;

    analytics.sendEventPlus(
      self._createPromise,
      "venmo.tokenize.manual-return.status-change." + newStatus.toLowerCase(),
      {
        context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
        platform: self._determineAnalyticsCategory(),
      }
    );

    switch (newStatus) {
      case "EXPIRED":
      case "FAILED":
      case "CANCELED":
        return Promise.reject(
          new BraintreeError(
            errors["VENMO_MOBILE_POLLING_TOKENIZATION_" + newStatus]
          )
        );
      case "APPROVED":
        return Promise.resolve(node);
      case "CREATED":
      case "SCANNED":
      default:
      // any other statuses are irrelevant to the polling
      // and can just be ignored
    }
  }

  return self._continuePolling();
};

Venmo.prototype._continuePolling = function () {
  var self = this;

  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      self._pollForStatusChange().then(resolve).catch(reject);
    }, self._mobilePollingInterval);
  });
};

Venmo.prototype._queryAndProcessStatus = function () {
  var self = this;

  return this._queryPaymentContextStatus(this._venmoPaymentContextId)
    .catch(function (networkError) {
      throw new BraintreeError({
        type: errors.VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR.type,
        code: errors.VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR.code,
        message: errors.VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR.message,
        details: {
          originalError: networkError,
        },
      });
    })
    .then(function (node) {
      return self._handleStatusChange(node);
    });
};

Venmo.prototype._pollForStatusChange = function () {
  var validationError = this._validatePollingContext();

  if (validationError) {
    return validationError;
  }

  var windowClosureResult = this._handleWindowClosure();
  if (windowClosureResult) {
    return windowClosureResult;
  }

  // This function might cancel the payment context. We will still rely on
  // _queryAndProcessStatus to see that the status has changed to CANCELED.
  this._handleCancelOnReturn();

  return this._queryAndProcessStatus();
};

Venmo.prototype._startPolling = function () {
  var self = this;
  var platform = self._determineAnalyticsCategory();

  // Prevent multiple concurrent polling loops
  if (this._pollingInProgress) {
    return this._tokenizePromise;
  }

  this._pollingInProgress = true;

  this._pollForStatusChange()
    .then(function (payload) {
      self._pollingInProgress = false;
      analytics.sendEventPlus(
        self._createPromise,
        "venmo.tokenize.manual-return.success",
        {
          context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
          platform: platform,
        }
      );

      self._tokenizePromise.resolve({
        paymentMethodNonce: payload.paymentMethodId,
        username: payload.userName,
        payerInfo: payload.payerInfo,
        id: self._venmoPaymentContextId,
      });
    })
    .catch(function (err) {
      self._pollingInProgress = false;
      analytics.sendEventPlus(
        self._createPromise,
        "venmo.tokenize.manual-return.failure",
        {
          context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
          platform: platform,
        }
      );

      self._tokenizePromise.reject(err);
    });

  return this._tokenizePromise;
};

Venmo.prototype._tokenizeForMobileWithManualReturn = function () {
  var self = this;

  this._mobilePollingContextExpiresIn =
    Date.now() + this._mobilePollingExpiresThreshold;

  analytics.sendEventPlus(
    this._createPromise,
    "venmo.tokenize.manual-return.start",
    {
      context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
      platform: self._determineAnalyticsCategory(),
    }
  );

  this._tokenizePromise = new ExtendedPromise();

  this._startPolling();

  return this.getUrl().then(function (url) {
    self.appSwitch(url);

    return self._tokenizePromise;
  });
};

Venmo.prototype._shouldUseRedirectStrategy = function () {
  if (!browserDetection.isIos()) {
    return false;
  }

  if (this._mobileWebFallBack === true) {
    return true;
  }

  return this._useRedirectForIOS;
};

Venmo.prototype._tokenizeForMobileWithPolling = function (options) {
  var self = this;
  var completionInProgress = false;
  var platform = this._determineAnalyticsCategory();

  analytics.sendEventPlus(this._createPromise, "venmo.tokenize.mobile.start", {
    context_id: this._venmoPaymentContextId, // eslint-disable-line camelcase
    platform: platform,
  });
  this._tokenizePromise = new ExtendedPromise();
  this._mobilePollingContextExpiresIn =
    Date.now() + this._mobilePollingExpiresThreshold;

  function completeFlow() {
    if (completionInProgress) {
      return;
    }
    completionInProgress = true;
    self
      ._pollForStatusChange()
      .then(function (payload) {
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.appswitch.handle.payment-context-status-query.success",
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
            platform: platform,
          }
        );
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.tokenize.mobile.success",
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
            platform: platform,
          }
        );

        self._removeVisibilityEventListener();
        self._tokenizePromise.resolve({
          paymentMethodNonce: payload.paymentMethodId,
          username: payload.userName,
          payerInfo: payload.payerInfo,
          id: self._venmoPaymentContextId,
        });
      })
      .catch(function (err) {
        analytics.sendEventPlus(
          self._createPromise,
          "venmo.tokenize.mobile.failure",
          {
            context_id: self._venmoPaymentContextId, // eslint-disable-line camelcase
            platform: platform,
          }
        );
        self._removeVisibilityEventListener();
        self._tokenizePromise.reject(err);
      });
  }

  this._visibilityChangeListener = function () {
    var delay =
      options.processResultsDelay || constants.DEFAULT_PROCESS_RESULTS_DELAY;

    if (!documentVisibility.isDocumentHidden()) {
      if (self._venmoWindow && !self._venmoWindow.closed) {
        self._venmoWindow.close();
      }

      setTimeout(completeFlow, delay);
    }
  };

  return this.getUrl().then(function (url) {
    self.appSwitch(url);

    setTimeout(function () {
      window.document.addEventListener(
        documentVisibility.getVisibilityChangeEventName(),
        self._visibilityChangeListener
      );
    }, constants.DOCUMENT_VISIBILITY_CHANGE_EVENT_DELAY);

    return self._tokenizePromise;
  });
};

Venmo.prototype._tokenizeForDesktopQRFlow = function () {
  var self = this;

  analytics.sendEvent(this._createPromise, "venmo.tokenize.desktop.start");

  this._tokenizePromise = new ExtendedPromise();

  this._createPromise
    .then(function () {
      return self._venmoDesktopInstance.launchDesktopFlow();
    })
    .then(function (payload) {
      self._venmoDesktopInstance.hideDesktopFlow();

      analytics.sendEventPlus(
        self._createPromise,
        "venmo.tokenize.desktop.success",
        {
          context_id: payload && payload.id, // eslint-disable-line camelcase
        }
      );

      self._tokenizePromise.resolve(payload);
    })
    .catch(function (err) {
      analytics.sendEventPlus(
        self._createPromise,
        "venmo.tokenize.desktop.failure",
        {
          // eslint-disable-next-line camelcase
          context_id:
            self._venmoDesktopInstance &&
            self._venmoDesktopInstance.venmoContextId,
        }
      );

      if (self._venmoDesktopInstance) {
        self._venmoDesktopInstance.hideDesktopFlow();
      }

      if (err && err.reason === "CUSTOMER_CANCELED") {
        self._tokenizePromise.reject(
          new BraintreeError(errors.VENMO_DESKTOP_CANCELED)
        );

        return;
      }

      self._tokenizePromise.reject(
        new BraintreeError({
          type: errors.VENMO_DESKTOP_UNKNOWN_ERROR.type,
          code: errors.VENMO_DESKTOP_UNKNOWN_ERROR.code,
          message: errors.VENMO_DESKTOP_UNKNOWN_ERROR.message,
          details: {
            originalError: err,
          },
        })
      );
    });

  return this._tokenizePromise;
};

Venmo.prototype._cancelMobilePaymentContext = function () {
  var self = this;

  return this._createPromise.then(function (client) {
    if (self._venmoPaymentContextId) {
      return client.request({
        api: "graphQLApi",
        data: {
          query: graphqlQueries.UPDATE_PAYMENT_CONTEXT_QUERY,
          variables: {
            input: {
              id: self._venmoPaymentContextId,
              status: "CANCELED",
            },
          },
        },
      });
    }

    return undefined;
  });
};

Venmo.prototype._cancelVenmoDesktopContext = function () {
  var self = this;

  return this._createPromise.then(function () {
    if (self._venmoDesktopInstance) {
      self._venmoDesktopInstance.updateVenmoDesktopPaymentContext("CANCELED");
    }
  });
};

/**
 * Cleanly tear down anything set up by {@link module:braintree-web/venmo.create|create}.
 * @public
 * @example
 * venmoInstance.teardown();
 * @returns {Promise} Returns a promise.
 */
Venmo.prototype.teardown = function () {
  var self = this;

  this._removeVisibilityEventListener();

  return this._createPromise.then(
    function () {
      if (self._venmoDesktopInstance) {
        self._venmoDesktopInstance.teardown();
      }

      clearTimeout(self._refreshPaymentContextTimeout);
      self._cancelMobilePaymentContext();

      convertMethodsToError(this, methods(Venmo.prototype));
    }.bind(this)
  );
};

Venmo.prototype._removeVisibilityEventListener = function () {
  window.document.removeEventListener(
    documentVisibility.getVisibilityChangeEventName(),
    this._visibilityChangeListener
  );

  delete this._visibilityChangeListener;
};

function formatTokenizePayload(payload) {
  var formattedPayload = {
    nonce: payload.paymentMethodNonce,
    type: "VenmoAccount",
    details: {
      username: payload.username || "",
      paymentContextId: payload.id,
    },
  };

  if (payload.payerInfo) {
    formattedPayload.details.payerInfo = payload.payerInfo;
  }

  return formattedPayload;
}

function isIosWebviewInDeepLinkReturnUrlFlow() {
  // we know it's a webview because this flow only gets
  // used when checking the deep link flow
  // test the platform here to get around custom useragents
  return (
    window.navigator.platform &&
    /iPhone|iPad|iPod/.test(window.navigator.platform)
  );
}

export default Venmo;
