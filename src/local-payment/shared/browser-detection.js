"use strict";

var isAndroid = require("@braintree/browser-detection/is-android");
var isIos = require("@braintree/browser-detection/is-ios");

function isMobileDevice() {
  return isAndroid() || isIos();
}

module.exports = {
  isMobileDevice: isMobileDevice,
};
