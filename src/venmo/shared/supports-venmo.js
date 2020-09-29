'use strict';

var browserDetection = require('./browser-detection');

function isBrowserSupported(options) {
  var allowNewBrowserTab, allowWebviews;
  var isAndroid = browserDetection.isAndroid();
  var isAndroidChrome = isAndroid && browserDetection.isChrome();
  var isIosChrome = browserDetection.isIos() && browserDetection.isChrome();
  var supportsReturnToSameTab = browserDetection.isIosSafari() || isAndroidChrome;
  var supportsReturnToNewTab = isIosChrome || browserDetection.isSamsungBrowser() || browserDetection.isMobileFirefox();

  options = options || {};
  allowNewBrowserTab = options.hasOwnProperty('allowNewBrowserTab') ? options.allowNewBrowserTab : true;
  // NEXT_MAJOR_VERSION webviews are not supported, except for the case where
  // the merchant themselves is presenting venmo in a webview using the deep
  // link url to get back to their app. For the next major version, we should
  // just not have this option and instead require the merchant to determine
  // if the venmo button should be displayed when presenting it in the
  // merchant's app via a webview.
  allowWebviews = options.hasOwnProperty('allowWebviews') ? options.allowWebviews : true;

  if (!allowWebviews && (browserDetection.isAndroidWebview() || browserDetection.isIosWebview())) {
    return false;
  }

  if (!allowNewBrowserTab) {
    return supportsReturnToSameTab;
  }

  return supportsReturnToSameTab || supportsReturnToNewTab;
}

module.exports = {
  isBrowserSupported: isBrowserSupported
};
