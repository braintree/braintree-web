"use strict";

var browserDetection = require("./browser-detection");
var inIframe = require("../../lib/in-iframe");

function _parseOptions(options) {
  options = options || {};

  return {
    // NEXT_MAJOR_VERSION allowDesktop will default to true, but can be opted out
    merchantAllowsDesktopBrowsers:
      (options.allowDesktopWebLogin || options.allowDesktop) === true,

    merchantAllowsReturningToNewBrowserTab: options.hasOwnProperty(
      "allowNewBrowserTab"
    )
      ? options.allowNewBrowserTab
      : true,

    merchantAllowsNonDefaultBrowsers: options.hasOwnProperty(
      "allowNonDefaultBrowsers"
    )
      ? options.allowNonDefaultBrowsers
      : true,
    // NEXT_MAJOR_VERSION webviews are not supported, except for the case where
    // the merchant themselves is presenting venmo in a webview using the deep
    // link url to get back to their app. For the next major version, we should
    // just not have this option and instead require the merchant to determine
    // if the venmo button should be displayed when presenting it in the
    // merchant's app via a webview.
    merchantAllowsWebviews: options.hasOwnProperty("allowWebviews")
      ? options.allowWebviews
      : true,
  };
}

function _getBrowserInfo() {
  var isAndroid = browserDetection.isAndroid();
  var isAndroidChrome = isAndroid && browserDetection.isChrome();
  var isIos = browserDetection.isIos();
  var isIosSafari = browserDetection.isIosSafari();
  var isMobileDevice = isAndroid || isIos;
  var isMobileDeviceThatSupportsReturnToSameTab =
    isIosSafari || isAndroidChrome;
  var isWebview =
    browserDetection.isAndroidWebview() || browserDetection.isIosWebview();

  return {
    isAndroid: isAndroid,
    isAndroidChrome: isAndroidChrome,
    isIos: isIos,
    isIosSafari: isIosSafari,
    isMobileDevice: isMobileDevice,
    isMobileDeviceThatSupportsReturnToSameTab:
      isMobileDeviceThatSupportsReturnToSameTab,
    isWebview: isWebview,
  };
}

function _isUnsupportedMobileBrowser(parsedOptions, browserInfo) {
  // Venmo only works on iOS Chrome when the
  // button is not rendered in an iFrame and
  // allowNewBrowserTab is set to true
  var merchantAllowsIosChrome =
    (parsedOptions.merchantAllowsNonDefaultBrowsers ||
      parsedOptions.merchantAllowsReturningToNewBrowserTab) &&
    !inIframe();

  if (merchantAllowsIosChrome && browserDetection.isIosChrome()) {
    return false;
  }

  if (browserInfo.isIos && !browserInfo.isIosSafari) {
    return !parsedOptions.merchantAllowsReturningToNewBrowserTab;
  }

  if (browserInfo.isAndroid && !browserInfo.isAndroidChrome) {
    return !parsedOptions.merchantAllowsReturningToNewBrowserTab;
  }

  return browserDetection.isFacebookOwnedBrowserOnAndroid();
}

function _isUnsupportedWebview(parsedOptions, browserInfo) {
  return !parsedOptions.merchantAllowsWebviews && browserInfo.isWebview;
}

function isNonDefaultBrowser() {
  var browserInfo = _getBrowserInfo();
  return (
    browserInfo.isMobileDevice &&
    !browserInfo.isIosSafari &&
    !browserInfo.isAndroidChrome
  );
}

function isBrowserSupported(options) {
  var parsedOptions = _parseOptions(options);
  var browserInfo = _getBrowserInfo();

  if (
    isNonDefaultBrowser() &&
    !parsedOptions.merchantAllowsNonDefaultBrowsers
  ) {
    return false;
  }

  if (_isUnsupportedWebview(parsedOptions, browserInfo)) {
    return false;
  }

  if (_isUnsupportedMobileBrowser(parsedOptions, browserInfo)) {
    return false;
  }

  if (!browserInfo.isMobileDevice) {
    return parsedOptions.merchantAllowsDesktopBrowsers;
  }

  return true;
}

module.exports = {
  isBrowserSupported: isBrowserSupported,
  isNonDefaultBrowser: isNonDefaultBrowser,
};
