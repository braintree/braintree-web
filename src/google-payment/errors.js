"use strict";

/**
 * @name BraintreeError.Google Payment - Creation Error Codes
 * @description Errors that occur when [creating the Google Payment component](./module-braintree-web_google-payment.html#.create).
 * @property {MERCHANT} GOOGLE_PAYMENT_NOT_ENABLED Occurs when Google Pay is not enabled on the Braintree control panel.
 * @property {MERCHANT} GOOGLE_PAYMENT_UNSUPPORTED_VERSION Occurs when a Google Pay version is used that is not supported by the Braintree SDK.
 */

/**
 * @name BraintreeError.Google Payment - parseResponse Error Codes
 * @description Errors that occur when [parsing the response from Google](./GooglePayment.html#parseResponse).
 * @property {UNKNOWN} GOOGLE_PAYMENT_GATEWAY_ERROR Occurs when Google Pay could not be tokenized.
 */

var BraintreeError = require("../lib/braintree-error");

module.exports = {
  GOOGLE_PAYMENT_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "GOOGLE_PAYMENT_NOT_ENABLED",
    message: "Google Pay is not enabled for this merchant.",
  },
  GOOGLE_PAYMENT_GATEWAY_ERROR: {
    code: "GOOGLE_PAYMENT_GATEWAY_ERROR",
    message:
      "There was an error when tokenizing the Google Pay payment method.",
    type: BraintreeError.types.UNKNOWN,
  },
  GOOGLE_PAYMENT_UNSUPPORTED_VERSION: {
    code: "GOOGLE_PAYMENT_UNSUPPORTED_VERSION",
    type: BraintreeError.types.MERCHANT,
  },
};
