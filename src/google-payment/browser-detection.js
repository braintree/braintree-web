"use strict";

var supportsPaymentRequestApi = require("@braintree/browser-detection/supports-payment-request-api");
var isAndroid = require("@braintree/browser-detection/is-android");

module.exports = {
  isAndroid: isAndroid,
  supportsPaymentRequestApi: supportsPaymentRequestApi,
};
