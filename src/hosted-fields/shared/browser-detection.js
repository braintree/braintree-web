'use strict';

var isAndroid = require('@braintree/browser-detection/is-android');
var isChromeOS = require('@braintree/browser-detection/is-chrome-os');
var isIos = require('@braintree/browser-detection/is-ios');

function hasSoftwareKeyboard() {
  return isAndroid() || isChromeOS() || isIos();
}

module.exports = {
  isIE: require('@braintree/browser-detection/is-ie'),
  isEdge: require('@braintree/browser-detection/is-edge'),
  isIe9: require('@braintree/browser-detection/is-ie9'),
  isIe10: require('@braintree/browser-detection/is-ie10'),
  isAndroid: isAndroid,
  isChromeOS: isChromeOS,
  isFirefox: require('@braintree/browser-detection/is-firefox'),
  isIos: isIos,
  isIosWebview: require('@braintree/browser-detection/is-ios-webview'),
  hasSoftwareKeyboard: hasSoftwareKeyboard
};
