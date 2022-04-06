"use strict";

var isAndroid = require("@braintree/browser-detection/is-android");
var isChrome = require("@braintree/browser-detection/is-chrome");
var isIos = require("@braintree/browser-detection/is-ios");
var isIosSafari = require("@braintree/browser-detection/is-ios-safari");
var isIosWebview = require("@braintree/browser-detection/is-ios-webview");
var isSamsung = require("@braintree/browser-detection/is-samsung");

function isAndroidWebview() {
  return (
    isAndroid() && window.navigator.userAgent.toLowerCase().indexOf("wv") > -1
  );
}

function doesNotSupportWindowOpenInIos() {
  if (!isIos()) {
    return false;
  }

  return isIosWebview() || !isIosSafari();
}

function isFacebookOwnedBrowserOnAndroid() {
  var ua = window.navigator.userAgent.toLowerCase();

  // Huawei's Facebook useragent does not include Android
  if (ua.indexOf("huawei") > -1 && ua.indexOf("fban") > -1) {
    return true;
  }

  if (!isAndroid()) {
    return false;
  }

  return ua.indexOf("fb_iab") > -1 || ua.indexOf("instagram") > -1;
}

// iOS chrome used to work with Venmo, but now it does not
// we are unsure if something changed in the iOS Chrome app
// itself, or if something about iOS webviews has changed
// until we find out more info, we've created a helper to
// easilly turn off iOS Chrome as a supported browser in
// the isBrowserSupported helper function
function isIosChrome() {
  return isIos() && isChrome();
}

module.exports = {
  isAndroid: isAndroid,
  isAndroidWebview: isAndroidWebview,
  isChrome: isChrome,
  isIos: isIos,
  isIosChrome: isIosChrome,
  isSamsung: isSamsung,
  isIosSafari: isIosSafari,
  isIosWebview: isIosWebview,
  isFacebookOwnedBrowserOnAndroid: isFacebookOwnedBrowserOnAndroid,
  doesNotSupportWindowOpenInIos: doesNotSupportWindowOpenInIos,
};
