"use strict";
/** @module braintree-web/venmo */

var analytics = require("../lib/analytics");
var basicComponentVerification = require("../lib/basic-component-verification");
var createDeferredClient = require("../lib/create-deferred-client");
var createAssetsUrl = require("../lib/create-assets-url");
var errors = require("./shared/errors");
var wrapPromise = require("@braintree/wrap-promise");
var BraintreeError = require("../lib/braintree-error");
var Venmo = require("./venmo");
var supportsVenmo = require("./shared/supports-venmo");
var VERSION = process.env.npm_package_version;

/**
 * @typedef {object} Venmo~lineItem
 * @property {number} quantity Number of units of the item purchased. This value must be a whole number and can't be negative or zero.
 * @property {string} unitAmount Per-unit price of the item. Can include up to 2 decimal places. This value can't be negative or zero.
 * @property {string} name Item name. Maximum 127 characters.
 * @property {string} kind Indicates whether the line item is a debit (sale) or credit (refund) to the customer. Accepted values: `debit` and `credit`.
 * @property {?string} unitTaxAmount Per-unit tax price of the item. Can include up to 2 decimal places. This value can't be negative or zero.
 * @property {?string} description Item description. Maximum 127 characters.
 * @property {?string} productCode Product or UPC code for the item. Maximum 127 characters.
 * @property {?string} url The URL to product information.
 */

/**
 * @static
 * @function create
 * @param {object} options Creation options:
 * @param {Client} [options.client] A {@link Client} instance.
 * @param {string} [options.authorization] A tokenizationKey or clientToken. Can be used in place of `options.client`.
 * @param {boolean} [options.allowNewBrowserTab=true] This should be set to false if your payment flow requires returning to the same tab, e.g. single page applications. Doing so causes {@link Venmo#isBrowserSupported|isBrowserSupported} to return true only for mobile web browsers that support returning from the Venmo app to the same tab.
 * @param {boolean} [options.allowWebviews=true] This should be set to false if your payment flow does not occur from within a webview that you control. Doing so causes {@link Venmo#isBrowserSupported|isBrowserSupported} to return true only for mobile web browsers that are not webviews.
 * @param {boolean} [options.ignoreHistoryChanges=false] When the Venmo app returns to the website, it will modify the hash of the url to include data about the tokenization. By default, the SDK will put the state of the hash back to where it was before the change was made. Pass `true` to handle the hash change instead of the SDK.
 * @param {string} [options.profileId] The Venmo profile ID to be used during payment authorization. Customers will see the business name and logo associated with this Venmo profile, and it will show up in the Venmo app as a "Connected Merchant". Venmo profile IDs can be found in the Braintree Control Panel. Omitting this value will use the default Venmo profile.
 * @param {string} [options.deepLinkReturnUrl] An override for the URL that the Venmo iOS app opens to return from an app switch.
 * @param {boolean} [options.requireManualReturn=false] When `true`, the customer will have to manually switch back to the browser/webview that is presenting Venmo to complete the payment.
 * @param {boolean} [options.useRedirectForIOS=false] Normally, the Venmo flow is launched using `window.open` and the Venmo app intercepts that call and opens the Venmo app instead. If the customer does not have the Venmo app installed, it opens the Venmo website in a new window and instructs the customer to install the app.
 
 * In iOS webviews and Safari View Controllers (a webview-like environment which is indistinguishable from Safari for JavaScript environments), this call to `window.open` will always fail to app switch to Venmo, resulting instead in a white screen. Because of this, an alternate approach is required to launch the Venmo flow.
 *
 * When `useRedirectForIOS` is `true` and the Venmo flow is started in an iOS environment, the Venmo flow will be started by setting `window.location.href` to the Venmo website (which will still be intercepted by the Venmo app and should be the same behavior as if `window.open` was called). However, if the customer does not have the Venmo app installed, the merchant page will instead be replaced with the Venmo website and the customer will need to use the browser's back button to return to the merchant's website. Ensure that your customer's checkout information will not be lost if they are navigated away from the website and return using the browser back button.
 *
 * Due to a bug in iOS's implementation of `window.open` in iOS webviews and Safari View Controllers, if `useRedirectForIOS` is not set to `true` and the flow is launched from an iOS webview or Safari View Controller, the customer will be presented with a blank screen, halting the flow and leaving the customer unable to return to the merchant's website. Setting `useRedirectForIOS` to `true` will allow the flow to continue, but the Venmo app will be unable to return back to the webview/Safari View Controller. It will instead open the merchant's site in a new window in the customer's browser, which means the merchant site must be able to process the Venmo payment. If the SDK is configured with `allowNewBrowserTab = false`, it is unlikely that the website is set up to process the Venmo payment from a new window.
 *
 * If processing the payment from a new window is not possible, use this flag in conjunction with `requireManualReturn` so that the customer may start the flow from a webview/Safari View Controller or their Safari browser and manually return to the place that originated the flow once the Venmo app has authorized the payment and instructed them to do so.
 * @param {string} [options.paymentMethodUsage] The intended usage for the Venmo payment method nonce. Possible options are:
 * * single_use - intended as a one time transaction
 * * multi_use - intended to be vaulted and used for multiple transactions
 * @param {string} [options.displayName] The business name that will be displayed in the Venmo app payment approval screen. Only applicable when used with `paymentMethodUsage` and used by merchants onboarded as PayFast channel partners.
 * @param {boolean} [options.allowDesktop] Used to support desktop users. When enabled, the default mode is to render a scannable QR-code customers scan with their phone's to approve via the mobile app.
 * @param {boolean} [options.allowDesktopWebLogin=false] When `true`, the customer will authorize payment via a window popup that allows them to sign in to their Venmo account. This is used explicitly for customers operating from desktop browsers wanting to avoid the QR Code flow.
 * @param {boolean} [options.mobileWebFallBack] Use this option when you want to use a web-login experience, such as if on mobile and the Venmo app isn't installed.
 * @param {boolean} [options.allowAndroidRecreation=true] This flag is for when your integration uses the [Android PopupBridge](https://github.com/braintree/popup-bridge-android). Setting this flag to false will avoid a page refresh when returning to your page after payment authorization. If not specified, it defaults to true and the Android activity will be recreated, resulting in a page refresh.
 * @param {boolean} [options.collectCustomerBillingAddress] When `true`, the customer's billing address will be collected and displayed on the Venmo paysheet (provided the Enriched Customer Data checkbox is also enabled for the merchant account).
 * @param {boolean} [options.collectCustomerShippingAddress] When `true`, the customer's shipping address will be collected and displayed on the Venmo paysheet (provided the Enriched Customer Data checkbox is also enabled for the merchant account).
 * @param {boolean} [options.isFinalAmount=false] When `true`, it denotes that the purchase amount (`totalAmount`) is final and will not change.
 * @param {lineItem[]} [options.lineItems] The {@link Venmo~lineItem|line items} belonging to the transaction. It can include up to 249 line items.
 * @param {string} [options.subTotalAmount] The subtotal amount of the transaction, excluding taxes, discounts, and shipping.
 * @param {string} [options.discountAmount] The total discount amount applied on the transaction.
 * @param {string} [options.shippingAmount] Shipping amount to be charged for the transaction.
 * @param {string} [options.taxAmount] The total tax amount applied to the transaction. This value can't be negative or zero.
 * @param {string} [options.totalAmount] The grand total amount of the transaction.
 *
 * Note: This flow currently requires a full page redirect, which means to utilize this flow your page will need to be able to handle the checkout session across different pages.
 * @param {callback} [callback] The second argument, `data`, is the {@link Venmo} instance. If no callback is provided, `create` returns a promise that resolves with the {@link Venmo} instance.
 * @example
 * braintree.venmo.create({
 *   client: clientInstance
 * }).then(function (venmoInstance) {
 *   // venmoInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating Venmo instance', createErr);
 * });
 * @example <caption>Allow desktop flow to be used</caption>
 * braintree.venmo.create({
 *   client: clientInstance,
 *   allowDesktop: true
 * }).then(function (venmoInstance) {
 *   // venmoInstance is ready to be used.
 * }).catch(function (createErr) {
 *   console.error('Error creating Venmo instance', createErr);
 * });
 * @returns {(Promise|void)} Returns the Venmo instance.
 */
function create(options) {
  var name = "Venmo";

  return basicComponentVerification
    .verify({
      name: name,
      client: options.client,
      authorization: options.authorization,
    })
    .then(function () {
      var createPromise, instance;

      if (options.profileId && typeof options.profileId !== "string") {
        return Promise.reject(
          new BraintreeError(errors.VENMO_INVALID_PROFILE_ID)
        );
      }

      if (
        options.deepLinkReturnUrl &&
        typeof options.deepLinkReturnUrl !== "string"
      ) {
        return Promise.reject(
          new BraintreeError(errors.VENMO_INVALID_DEEP_LINK_RETURN_URL)
        );
      }

      createPromise = createDeferredClient
        .create({
          authorization: options.authorization,
          client: options.client,
          debug: options.debug,
          assetsUrl: createAssetsUrl.create(options.authorization),
          name: name,
        })
        .then(function (client) {
          var configuration = client.getConfiguration();

          options.client = client;

          if (!configuration.gatewayConfiguration.payWithVenmo) {
            return Promise.reject(new BraintreeError(errors.VENMO_NOT_ENABLED));
          }

          return client;
        });

      options.createPromise = createPromise;
      instance = new Venmo(options);

      analytics.sendEvent(createPromise, "venmo.initialized");

      return createPromise.then(function () {
        return instance;
      });
    });
}

/**
 * @static
 * @function isBrowserSupported
 * @param {object} [options] browser support options:
 * @param {boolean} [options.allowNewBrowserTab=true] This should be set to false if your payment flow requires returning to the same tab, e.g. single page applications.
 * @param {boolean} [options.allowWebviews=true] This should be set to false if your payment flow does not occur from within a webview that you control.
 * @example
 * if (braintree.venmo.isBrowserSupported()) {
 *   // set up Venmo
 * }
 * @example <caption>Explicitly require browser support returning to the same tab</caption>
 * if (braintree.venmo.isBrowserSupported({
 *   allowNewBrowserTab: false
 * })) {
 *   // set up Venmo
 * }
 * @example <caption>Explicitly set webviews as disallowed browsers</caption>
 * if (braintree.venmo.isBrowserSupported({
 *   allowWebviews: false
 * })) {
 *   // set up Venmo
 * }
 * @returns {boolean} Whether or not the browser supports Venmo.
 */
function isBrowserSupported(options) {
  return supportsVenmo.isBrowserSupported(options);
}

module.exports = {
  create: wrapPromise(create),
  isBrowserSupported: isBrowserSupported,
  /**
   * @description The current version of the SDK, i.e. `{@pkg version}`.
   * @type {string}
   */
  VERSION: VERSION,
};
