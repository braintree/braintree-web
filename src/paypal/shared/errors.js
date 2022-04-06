"use strict";

/**
 * @name BraintreeError.PayPal - Creation Error Codes
 * @description Errors that occur when [creating the PayPal component](./module-braintree-web_paypal.html#.create).
 * @property {MERCHANT} PAYPAL_NOT_ENABLED Occurs when PayPal is not enabled on the Braintree control panel.
 */

/**
 * @name BraintreeError.PayPal - tokenize Error Codes
 * @description Errors that occur when using the [`tokenize` method](./PayPal.html#tokenize).
 * @property {MERCHANT} PAYPAL_TOKENIZATION_REQUEST_ACTIVE Occurs when a tokenization request is already in progress.
 * @property {MERCHANT} PAYPAL_FLOW_OPTION_REQUIRED Occurs when flow option is not provided.
 * @property {NETWORK} PAYPAL_ACCOUNT_TOKENIZATION_FAILED Occurs when PayPal account could not be tokenized.
 * @property {NETWORK} PAYPAL_FLOW_FAILED Occurs when PayPal flow could not be initiated.
 * @property {MERCHANT} PAYPAL_POPUP_OPEN_FAILED Occurs when PayPal window could not be opened.
 * @property {CUSTOMER} PAYPAL_POPUP_CLOSED Occurs when customer closes the PayPal window before completing the flow.
 * @property {MERCHANT} PAYPAL_INVALID_PAYMENT_OPTION Occurs when an invalid payment option is passed.
 */

var BraintreeError = require("../../lib/braintree-error");

module.exports = {
  PAYPAL_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_NOT_ENABLED",
    message: "PayPal is not enabled for this merchant.",
  },
  PAYPAL_TOKENIZATION_REQUEST_ACTIVE: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_TOKENIZATION_REQUEST_ACTIVE",
    message: "Another tokenization request is active.",
  },
  PAYPAL_ACCOUNT_TOKENIZATION_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "PAYPAL_ACCOUNT_TOKENIZATION_FAILED",
    message: "Could not tokenize user's PayPal account.",
  },
  PAYPAL_FLOW_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "PAYPAL_FLOW_FAILED",
    message: "Could not initialize PayPal flow.",
  },
  PAYPAL_FLOW_OPTION_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_FLOW_OPTION_REQUIRED",
    message: "PayPal flow property is invalid or missing.",
  },
  PAYPAL_POPUP_OPEN_FAILED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_POPUP_OPEN_FAILED",
    message:
      "PayPal popup failed to open, make sure to tokenize in response to a user action.",
  },
  PAYPAL_POPUP_CLOSED: {
    type: BraintreeError.types.CUSTOMER,
    code: "PAYPAL_POPUP_CLOSED",
    message: "Customer closed PayPal popup before authorizing.",
  },
  PAYPAL_INVALID_PAYMENT_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_INVALID_PAYMENT_OPTION",
    message: "PayPal payment options are invalid.",
  },
};
