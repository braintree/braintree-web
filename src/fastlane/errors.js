"use strict";

var BraintreeError = require("../lib/braintree-error");

module.exports = {
  FASTLANE_SDK_LOAD_ERROR: {
    type: BraintreeError.types.MERCHANT,
    code: "FASTLANE_SDK_LOAD_ERROR",
  },
};
