"use strict";

var browserDetection = require("./browser-detection");
var inIframe = require("../../lib/in-iframe");

// eslint-disable-next-line complexity
function isBrowserSupported(options) {
  var isKnownUnsupportedMobileBrowser,
    merchantAllowsDesktopBrowsers,
    merchantAllowsIosChrome,
    merchantAllowsReturningToNewBrowserTab,
    merchantAllowsWebviews;
  var isAndroid = browserDetection.isAndroid();
  var isMobileDevice = isAndroid || browserDetection.isIos();
  var isAndroidChrome = isAndroid && browserDetection.isChrome();
  var isMobileDeviceThatSupportsReturnToSameTab =
    browserDetection.isIosSafari() || isAndroidChrome;

  options = options || {};
  // NEXT_MAJOR_VERSION allowDesktop will default to true, but can be opted out
  merchantAllowsDesktopBrowsers =
    (options.allowDesktopWebLogin || options.allowDesktop) === true;
  merchantAllowsReturningToNewBrowserTab = options.hasOwnProperty(
    "allowNewBrowserTab"
  )
    ? options.allowNewBrowserTab
    : true;
  // NEXT_MAJOR_VERSION webviews are not supported, except for the case where
  // the merchant themselves is presenting venmo in a webview using the deep
  // link url to get back to their app. For the next major version, we should
  // just not have this option and instead require the merchant to determine
  // if the venmo button should be displayed when presenting it in the
  // merchant's app via a webview.
  merchantAllowsWebviews = options.hasOwnProperty("allowWebviews")
    ? options.allowWebviews
    : true;
  // Venmo only works on iOS Chrome when the
  // button is not rendered in an iFrame and
  // allowNewBrowserTab is set to true
  merchantAllowsIosChrome =
    merchantAllowsReturningToNewBrowserTab && !inIframe();

  isKnownUnsupportedMobileBrowser =
    (!merchantAllowsIosChrome && browserDetection.isIosChrome()) ||
    browserDetection.isFacebookOwnedBrowserOnAndroid() ||
    browserDetection.isSamsung();

  if (isKnownUnsupportedMobileBrowser) {
    return false;
  }

  if (
    !merchantAllowsWebviews &&
    (browserDetection.isAndroidWebview() || browserDetection.isIosWebview())
  ) {
    return false;
  }

  if (!isMobileDevice) {
    return merchantAllowsDesktopBrowsers;
  }

  if (!merchantAllowsReturningToNewBrowserTab) {
    return isMobileDeviceThatSupportsReturnToSameTab;
  }

  return isMobileDevice;
}

module.exports = {
  isBrowserSupported: isBrowserSupported,
};
