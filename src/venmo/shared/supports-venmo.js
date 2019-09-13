'use strict';

var browserDetection = require('./browser-detection');

// NEXT_MAJOR_VERSION webviews are not supported, except for the case where
// the merchant themselves is presenting venmo in a webview on iOS and
// using the deep link url to get back to their app. For the next major
// version, we'll need to make that behavior opt in so that this is
// browser supported logic will reflect the case that webviews are not
// supported.
function isBrowserSupported(options) {
  var isAndroidChrome = browserDetection.isAndroid() && browserDetection.isChrome();
  var isIosChrome = browserDetection.isIos() && browserDetection.isChrome();
  var supportsReturnToSameTab = browserDetection.isIosSafari() || isAndroidChrome;
  var supportsReturnToNewTab = isIosChrome || browserDetection.isSamsungBrowser() || browserDetection.isMobileFirefox();

  options = options || {
    allowNewBrowserTab: true
  };

  return supportsReturnToSameTab || (options.allowNewBrowserTab && supportsReturnToNewTab);
}

module.exports = {
  isBrowserSupported: isBrowserSupported
};
