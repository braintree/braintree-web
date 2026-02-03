"use strict";

/**
 * @name BraintreeError.PayPal Checkout V6 - Creation Error Codes
 * @description Errors that occur when creating the PayPal Checkout V6 component.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_NOT_ENABLED Occurs when PayPal is not enabled on the Braintree control panel.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_SANDBOX_ACCOUNT_NOT_LINKED Occurs only when testing in Sandbox, when a PayPal sandbox account is not linked to the merchant account in the Braintree control panel.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_TOKENIZATION_KEY_NOT_SUPPORTED Occurs when a tokenization key is used instead of a client token. V6 SDK requires client tokens.
 */

/**
 * @name BraintreeError.PayPal Checkout V6 - SDK Loading Error Codes
 * @description Errors that occur when loading the PayPal v6 SDK.
 * @property {NETWORK} PAYPAL_CHECKOUT_V6_SDK_SCRIPT_LOAD_FAILED Occurs when the PayPal v6 SDK script fails to load.
 * @property {NETWORK} PAYPAL_CHECKOUT_V6_SDK_INITIALIZATION_FAILED Occurs when the PayPal V6 SDK instance creation fails.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_CLIENT_TOKEN_INVALID Occurs when the client token is invalid or expired.
 */

/**
 * @name BraintreeError.PayPal Checkout V6 - Session Error Codes
 * @description Errors that occur when creating or starting payment sessions.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_SESSION_CREATION_FAILED Occurs when something goes wrong when initializing the flow.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_PAYMENT_START_FAILED Occurs when something goes wrong when starting the flow.
 * @property {CUSTOMER} PAYPAL_CHECKOUT_V6_PAYMENT_CANCELED Occurs when a customer cancels the payment flow.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_INVALID_SESSION_OPTIONS Occurs when session options are invalid or missing required fields.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED Occurs when returnUrl or cancelUrl is missing for direct-app-switch mode.
 */

/**
 * @name BraintreeError.PayPal Checkout V6 - Order Error Codes
 * @description Errors that occur when creating PayPal orders.
 * @property {NETWORK} PAYPAL_CHECKOUT_V6_ORDER_CREATION_FAILED Occurs when Braintree backend order creation fails.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_INVALID_ORDER_OPTIONS Occurs when order options are invalid or missing required fields.
 */

/**
 * @name BraintreeError.PayPal Checkout V6 - Tokenization Error Codes
 * @description Errors that occur when tokenizing PayPal payments.
 * @property {NETWORK} PAYPAL_CHECKOUT_V6_TOKENIZATION_FAILED Occurs when PayPal account could not be tokenized.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_MISSING_TOKENIZATION_DATA Occurs when required tokenization data (payerID, orderID) is missing.
 */

/**
 * @name BraintreeError.PayPal Checkout V6 - Update Error Codes
 * @description Errors that occur when updating PayPal payments.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_INVALID_UPDATE_OPTIONS Occurs when update options are invalid or missing required fields.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_PAYMENT_NOT_FOUND Occurs when the specified payment ID cannot be found.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_CURRENCY_MISMATCH Occurs when the update currency doesn't match the original payment currency.
 * @property {NETWORK} PAYPAL_CHECKOUT_V6_UPDATE_FAILED Occurs when the payment update request fails.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_INVALID_LINE_ITEMS Occurs when line items have invalid format or inconsistent currency.
 * @name BraintreeError.PayPal Checkout V6 - Billing Agreement Error Codes
 * @description Errors that occur when creating billing agreements for vault flow.
 * @property {NETWORK} PAYPAL_CHECKOUT_V6_BILLING_AGREEMENT_CREATION_FAILED Occurs when Braintree backend billing agreement creation fails.
 * @property {MERCHANT} PAYPAL_CHECKOUT_V6_INVALID_BILLING_AGREEMENT_OPTIONS Occurs when billing agreement options are invalid or missing required fields.
 * @property {CUSTOMER} PAYPAL_CHECKOUT_V6_BILLING_AGREEMENT_CANCELED Occurs when a customer cancels the billing agreement flow.
 */

var BraintreeError = require("../lib/braintree-error");

module.exports = {
  // Configuration/Setup Errors
  PAYPAL_CHECKOUT_V6_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_NOT_ENABLED",
    message: "PayPal is not enabled for this merchant.",
  },
  PAYPAL_CHECKOUT_V6_SANDBOX_ACCOUNT_NOT_LINKED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_SANDBOX_ACCOUNT_NOT_LINKED",
    message:
      "A linked PayPal Sandbox account is required to use PayPal Checkout V6 in Sandbox. See https://developer.paypal.com/braintree/docs/guides/paypal/testing-go-live#linked-paypal-testing for details on linking your PayPal sandbox with Braintree.",
  },
  PAYPAL_CHECKOUT_V6_TOKENIZATION_KEY_NOT_SUPPORTED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_TOKENIZATION_KEY_NOT_SUPPORTED",
    message:
      "PayPal Checkout V6 requires a client token for authorization. Tokenization keys are not supported.",
  },

  // SDK Loading Errors
  PAYPAL_CHECKOUT_V6_SDK_SCRIPT_LOAD_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "PAYPAL_CHECKOUT_V6_SDK_SCRIPT_LOAD_FAILED",
    message: "PayPal V6 SDK script failed to load.",
  },
  PAYPAL_CHECKOUT_V6_SDK_INITIALIZATION_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "PAYPAL_CHECKOUT_V6_SDK_INITIALIZATION_FAILED",
    message: "PayPal V6 SDK instance creation failed.",
  },
  PAYPAL_CHECKOUT_V6_CLIENT_TOKEN_INVALID: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_CLIENT_TOKEN_INVALID",
    message: "Client token is invalid or expired.",
  },

  // Session/Payment Errors
  PAYPAL_CHECKOUT_V6_SESSION_CREATION_FAILED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_SESSION_CREATION_FAILED",
    message: "Failed to create PayPal payment session.",
  },
  PAYPAL_CHECKOUT_V6_PAYMENT_START_FAILED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_PAYMENT_START_FAILED",
    message: "Failed to start PayPal payment flow.",
  },
  PAYPAL_CHECKOUT_V6_PAYMENT_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: "PAYPAL_CHECKOUT_V6_PAYMENT_CANCELED",
    message: "Customer canceled the PayPal payment.",
  },
  PAYPAL_CHECKOUT_V6_INVALID_SESSION_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_INVALID_SESSION_OPTIONS",
    message: "PayPal session options are invalid or missing required fields.",
  },
  PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_APP_SWITCH_URLS_REQUIRED",
    message:
      "returnUrl and cancelUrl are required when using direct-app-switch presentation mode.",
  },

  // Order Creation Errors
  PAYPAL_CHECKOUT_V6_ORDER_CREATION_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "PAYPAL_CHECKOUT_V6_ORDER_CREATION_FAILED",
    message: "Could not create PayPal order.",
  },
  PAYPAL_CHECKOUT_V6_INVALID_ORDER_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_INVALID_ORDER_OPTIONS",
    message: "PayPal order options are invalid or missing required fields.",
  },

  // Tokenization Errors
  PAYPAL_CHECKOUT_V6_TOKENIZATION_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "PAYPAL_CHECKOUT_V6_TOKENIZATION_FAILED",
    message: "Could not tokenize PayPal account.",
  },
  PAYPAL_CHECKOUT_V6_MISSING_TOKENIZATION_DATA: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_MISSING_TOKENIZATION_DATA",
    message: "Missing required tokenization data (payerID or orderID).",
  },

  // Update Payment Errors
  PAYPAL_CHECKOUT_V6_INVALID_UPDATE_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_INVALID_UPDATE_OPTIONS",
    message: "PayPal update options are invalid or missing required fields.",
  },
  PAYPAL_CHECKOUT_V6_PAYMENT_NOT_FOUND: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_PAYMENT_NOT_FOUND",
    message: "The specified payment ID cannot be found or is no longer active.",
  },
  PAYPAL_CHECKOUT_V6_CURRENCY_MISMATCH: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_CURRENCY_MISMATCH",
    message:
      "The currency provided for the update does not match the original payment currency.",
  },
  PAYPAL_CHECKOUT_V6_UPDATE_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "PAYPAL_CHECKOUT_V6_UPDATE_FAILED",
    message: "Could not update PayPal payment details.",
  },
  PAYPAL_CHECKOUT_V6_INVALID_LINE_ITEMS: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_INVALID_LINE_ITEMS",
    message: "Line items have invalid format or inconsistent currency.",
  },

  // Billing Agreement Errors
  PAYPAL_CHECKOUT_V6_BILLING_AGREEMENT_CREATION_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "PAYPAL_CHECKOUT_V6_BILLING_AGREEMENT_CREATION_FAILED",
    message: "Could not create PayPal billing agreement.",
  },
  PAYPAL_CHECKOUT_V6_INVALID_BILLING_AGREEMENT_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_CHECKOUT_V6_INVALID_BILLING_AGREEMENT_OPTIONS",
    message:
      "Billing agreement options are invalid or missing required fields.",
  },
  PAYPAL_CHECKOUT_V6_BILLING_AGREEMENT_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: "PAYPAL_CHECKOUT_V6_BILLING_AGREEMENT_CANCELED",
    message: "Customer canceled the billing agreement.",
  },
};
