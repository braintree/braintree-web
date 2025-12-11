"use strict";

var BraintreeError = require("../lib/braintree-error");

/**
 * @name BraintreeError.InstantVerification - Creation Error Codes
 * @description Errors that occur when [creating the Instant Verification component](./module-braintree-web_instant-verification.html#.create).
 * @property {MERCHANT} INSTANT_VERIFICATION_NOT_ENABLED Occurs when Instant Verification is not enabled on the Braintree control panel.
 */

/**
 * @name BraintreeError.InstantVerification - startPayment Error Codes
 * @description Errors that occur when using the [`startPayment` method](./InstantVerification.html#startPayment).
 * @property {MERCHANT} INSTANT_VERIFICATION_JWT_MISSING Occurs when the JWT parameter is missing from the startPayment call.
 */

/**
 * @name BraintreeError.InstantVerification - handleRedirect Error Codes
 * @description Errors that occur when using the [`handleRedirect` method](./InstantVerification.html#handleRedirect).
 * @property {CUSTOMER} INSTANT_VERIFICATION_CANCELED Occurs when the customer cancels the Instant Verification payment before authorizing.
 * @property {UNKNOWN} INSTANT_VERIFICATION_FAILURE Occurs when the Instant Verification payment fails during the authorization process.
 */

/**
 * @name BraintreeError.InstantVerification - General Error Codes
 * @description General errors that can occur when using Instant Verification.
 * @property {MERCHANT} INSTANT_VERIFICATION_ERROR Occurs when a general Instant Verification error is encountered.
 */

module.exports = {
  INSTANT_VERIFICATION_ERROR: {
    type: BraintreeError.types.MERCHANT,
    code: "INSTANT_VERIFICATION_ERROR",
  },
  INSTANT_VERIFICATION_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "INSTANT_VERIFICATION_NOT_ENABLED",
    message: "Instant Verification is not enabled for this merchant account.",
  },
  INSTANT_VERIFICATION_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: "INSTANT_VERIFICATION_CANCELED",
    message:
      "Customer canceled the Instant Verification payment before authorizing.",
  },
  INSTANT_VERIFICATION_FAILURE: {
    type: BraintreeError.types.UNKNOWN,
    code: "INSTANT_VERIFICATION_FAILURE",
    message: "Instant Verification payment failed during authorizing.",
  },
  INSTANT_VERIFICATION_JWT_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "INSTANT_VERIFICATION_JWT_MISSING",
    message: "JWT is required for Instant Verification payment flow.",
  },
  INSTANT_VERIFICATION_MANDATE_ID_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "INSTANT_VERIFICATION_MANDATE_ID_REQUIRED",
    message: "Mandate ID is required to fetch ACH mandate details.",
  },
  INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "INSTANT_VERIFICATION_MANDATE_DETAILS_FAILED",
    message: "Failed to fetch ACH mandate details.",
  },
};
