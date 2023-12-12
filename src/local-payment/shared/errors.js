"use strict";

/**
 * @name BraintreeError.LocalPayment - Creation Error Codes
 * @description Errors that occur when [creating the Local Payment component](./module-braintree-web_local-payment.html#.create).
 * @property {MERCHANT} LOCAL_PAYMENT_NOT_ENABLED Occurs when Local Payment is not enabled on the Braintree control panel.
 */

/**
 * @name BraintreeError.LocalPayment - startPayment Error Codes
 * @description Errors that occur when using the [`startPayment` method](./LocalPayment.html#startPayment).
 * @property {MERCHANT} LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION Occurs when a startPayment is missing a required option.
 * @property {MERCHANT} LOCAL_PAYMENT_ALREADY_IN_PROGRESS Occurs when a startPayment call is already in progress.
 * @property {MERCHANT} LOCAL_PAYMENT_INVALID_PAYMENT_OPTION Occurs when a startPayment call has an invalid option.
 * @property {NETWORK} LOCAL_PAYMENT_START_PAYMENT_FAILED Occurs when a startPayment call fails.
 * @property {NETWORK} LOCAL_PAYMENT_TOKENIZATION_FAILED Occurs when a startPayment call fails to tokenize the result from authorization.
 * @property {CUSTOMER} LOCAL_PAYMENT_CANCELED Occurs when the customer cancels the Local Payment.
 * @property {CUSTOMER} LOCAL_PAYMENT_WINDOW_CLOSED Occurs when the customer closes the Local Payment window.
 * @property {MERCHANT} LOCAL_PAYMENT_WINDOW_OPEN_FAILED Occurs when the Local Payment window fails to open. Usually because `startPayment` was not called as a direct result of a user action.
 */

var BraintreeError = require("../../lib/braintree-error");

module.exports = {
  LOCAL_PAYMENT_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "LOCAL_PAYMENT_NOT_ENABLED",
    message: "LocalPayment is not enabled for this merchant.",
  },
  LOCAL_PAYMENT_ALREADY_IN_PROGRESS: {
    type: BraintreeError.types.MERCHANT,
    code: "LOCAL_PAYMENT_ALREADY_IN_PROGRESS",
    message: "LocalPayment payment is already in progress.",
  },
  LOCAL_PAYMENT_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: "LOCAL_PAYMENT_CANCELED",
    message: "Customer canceled the LocalPayment before authorizing.",
  },
  LOCAL_PAYMENT_WINDOW_CLOSED: {
    type: BraintreeError.types.CUSTOMER,
    code: "LOCAL_PAYMENT_WINDOW_CLOSED",
    message: "Customer closed LocalPayment window before authorizing.",
  },
  LOCAL_PAYMENT_WINDOW_OPEN_FAILED: {
    type: BraintreeError.types.MERCHANT,
    code: "LOCAL_PAYMENT_WINDOW_OPEN_FAILED",
    message:
      "LocalPayment window failed to open; make sure startPayment was called in response to a user action.",
  },
  LOCAL_PAYMENT_START_PAYMENT_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "LOCAL_PAYMENT_START_PAYMENT_FAILED",
    message: "LocalPayment startPayment failed.",
  },
  LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: "LOCAL_PAYMENT_START_PAYMENT_MISSING_REQUIRED_OPTION",
    message: "Missing required option for startPayment.",
  },
  LOCAL_PAYMENT_START_PAYMENT_DEFERRED_PAYMENT_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: "LOCAL_PAYMENT_START_PAYMENT_DEFERRED_PAYMENT_FAILED",
    message: "LocalPayment startPayment deferred payment failed.",
  },
  LOCAL_PAYMENT_TOKENIZATION_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "LOCAL_PAYMENT_TOKENIZATION_FAILED",
    message: "Could not tokenize user's local payment method.",
  },
  LOCAL_PAYMENT_INVALID_PAYMENT_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: "LOCAL_PAYMENT_INVALID_PAYMENT_OPTION",
    message: "Local payment options are invalid.",
  },
};
