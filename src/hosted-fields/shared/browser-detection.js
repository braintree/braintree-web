"use strict";

var isAndroid = require("@braintree/browser-detection/is-android");
var isChromeOS = require("@braintree/browser-detection/is-chrome-os");
var isIos = require("@braintree/browser-detection/is-ios");
var isChrome = require("@braintree/browser-detection/is-chrome");
var isSafari = require("@braintree/browser-detection/is-safari");
var isIosSafari = require("@braintree/browser-detection/is-ios-safari");

function hasSoftwareKeyboard() {
  return isAndroid() || isChromeOS() || isIos();
}

function isChromeIos() {
  return isChrome() && isIos();
}

module.exports = {
  isAndroid: isAndroid,
  isChromeOS: isChromeOS,
  isChromeIos: isChromeIos,
  isFirefox: require("@braintree/browser-detection/is-firefox"),
  isIos: isIos,
  isIosWebview: require("@braintree/browser-detection/is-ios-webview"),
  isSafari: isSafari,
  isIosSafari: isIosSafari,
  hasSoftwareKeyboard: hasSoftwareKeyboard,
};
