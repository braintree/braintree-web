"use strict";

var BraintreeError = require("../lib/braintree-error");

module.exports = {
  PAYMENT_READY_ERROR: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYMENT_READY_ERROR",
  },

  PAYMENT_READY_MISSING_REQUIRED_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYMENT_READY_MISSING_REQUIRED_OPTION",
    message: "Missing required option for Payment Ready method.",
  },

  PAYMENT_READY_CREATE_SESSION_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: "PAYMENT_READY_CREATE_SESSION_ERROR",
    message: "Error creating customer session.",
  },

  PAYMENT_READY_UPDATE_SESSION_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: "PAYMENT_READY_UPDATE_SESSION_ERROR",
    message: "Error updating customer session.",
  },

  PAYMENT_READY_NO_SESSION_ID: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYMENT_READY_NO_SESSION_ID",
    message: "A session ID is required",
  },

  PAYMENT_READY_GET_RECOMMENDATIONS_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: "PAYMENT_READY_GET_RECOMMENDATIONS_ERROR",
    message: "Error getting customer recommendations",
  },
};
