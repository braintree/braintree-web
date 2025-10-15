"use strict";

var isAndroid = require("@braintree/browser-detection/is-android");
var isChrome = require("@braintree/browser-detection/is-chrome");
var isIos = require("@braintree/browser-detection/is-ios");
var isIosSafari = require("@braintree/browser-detection/is-ios-safari");
var isIosWebview = require("@braintree/browser-detection/is-ios-webview");
var isIncognito;

try {
  isIncognito = require("@braintree/browser-detection/is-incognito");
  // eslint-disable-next-line no-unused-vars
} catch (e) {
  isIncognito = function () {
    return Promise.resolve({
      isPrivate: false,
      browserName: "unknown",
    });
  };
}

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

function isIosChrome() {
  return isIos() && isChrome();
}

function isWebview() {
  return isAndroidWebview() || isIosWebview();
}

module.exports = {
  isAndroid: isAndroid,
  isAndroidWebview: isAndroidWebview,
  isChrome: isChrome,
  isIos: isIos,
  isIosChrome: isIosChrome,
  isIosSafari: isIosSafari,
  isIosWebview: isIosWebview,
  isWebview: isWebview,
  isFacebookOwnedBrowserOnAndroid: isFacebookOwnedBrowserOnAndroid,
  doesNotSupportWindowOpenInIos: doesNotSupportWindowOpenInIos,
  isIncognito: isIncognito,
};
