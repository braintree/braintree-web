'use strict';

var isAndroid = require('@braintree/browser-detection/is-android');
var isChrome = require('@braintree/browser-detection/is-chrome');
var isIos = require('@braintree/browser-detection/is-ios');
var isIosSafari = require('@braintree/browser-detection/is-ios-safari');
var isIosWebview = require('@braintree/browser-detection/is-ios-webview');

function isAndroidWebview() {
  return isAndroid() && window.navigator.userAgent.toLowerCase().indexOf('wv') > -1;
}

module.exports = {
  isAndroid: isAndroid,
  isAndroidWebview: isAndroidWebview,
  isChrome: isChrome,
  isIos: isIos,
  isIosSafari: isIosSafari,
  isIosWebview: isIosWebview
};
