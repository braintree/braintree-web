"use strict";

/**
 * @name BraintreeError.PayPal Checkout - Creation Error Codes
 * @description Errors that occur when [creating the PayPal Checkout component](./module-braintree-web_paypal-checkout.html#.create).
 * @property {MERCHANT} PAYPAL_NOT_ENABLED Occurs when PayPal is not enabled on the Braintree control panel.
 * @property {MERCHANT} PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED Occurs only when testing in Sandbox, when a PayPal sandbox account is not linked to the merchant account in the Braintree control panel.
 */

/**
 * @name BraintreeError.PayPal Checkout - createPayment Error Codes
 * @description Errors that occur when using the [`createPayment` method](./PayPalCheckout.html#createPayment).
 * @property {MERCHANT} PAYPAL_FLOW_OPTION_REQUIRED Occurs when a required option is missing.
 * @property {MERCHANT} PAYPAL_INVALID_PAYMENT_OPTION Occurs when an option contains an invalid value.
 * @property {NETWORK} PAYPAL_FLOW_FAILED Occurs when something goes wrong when initializing the flow.
 */

/**
 * @name BraintreeError.PayPal Checkout - startVaultInitiatedCheckout Error Codes
 * @description Errors that occur when using the [`startVaultInitiatedCheckout` method](./PayPalCheckout.html#startVaultInitiatedCheckout).
 * @property {MERCHANT} PAYPAL_START_VAULT_INITIATED_CHECKOUT_PARAM_REQUIRED Occurs when a required param is missing when calling the method.
 * @property {MERCHANT} PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED Occurs when PayPal window could not be opened. This often occurs because the call to start the vault initiated flow was not triggered from a click event.
 * @property {CUSTOMER} PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED Occurs when a customer closes the PayPal flow before completion.
 * @property {MERCHANT} PAYPAL_START_VAULT_INITIATED_CHECKOUT_IN_PROGRESS Occurs when the flow is initialized while an authorization is already in progress.
 * @property {NETWORK} PAYPAL_START_VAULT_INITIATED_CHECKOUT_SETUP_FAILED Occurs when something went wrong setting up the flow.
 */

/**
 * @name BraintreeError.PayPal Checkout - tokenizePayment Error Codes
 * @description Errors that occur when using the [`tokenizePayment` method](./PayPalCheckout.html#tokenizePayment).
 * @property {NETWORK} PAYPAL_ACCOUNT_TOKENIZATION_FAILED Occurs when PayPal account could not be tokenized.
 */

/**
 * @name BraintreeError.Paypal Checkout - updatePayment Error Codes
 * @description Errors that occur when using the [`updatePayment` method](./PayPalCheckout.html#updatePayment).
 * @property {MERCHANT} PAYPAL_INVALID_PAYMENT_OPTION Occurs when an option contains an invalid value.
 * @property {MERCHANT} PAYPAL_MISSING_REQUIRED_OPTION Occurs when a required option is missing.
 * @property {NETWORK} PAYPAL_FLOW_FAILED Occurs when something goes wrong when initializing the flow or communicating with the server.
 */
var BraintreeError = require("../lib/braintree-error");

module.exports = {
  PAYPAL_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_NOT_ENABLED",
    message: "PayPal is not enabled for this merchant.",
  },
  PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED",
    message:
      "A linked PayPal Sandbox account is required to use PayPal Checkout in Sandbox. See https://developer.paypal.com/braintree/docs/guides/paypal/testing-go-live#linked-paypal-testing for details on linking your PayPal sandbox with Braintree.",
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
  PAYPAL_START_VAULT_INITIATED_CHECKOUT_PARAM_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_PARAM_REQUIRED",
  },
  PAYPAL_START_VAULT_INITIATED_CHECKOUT_SETUP_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_SETUP_FAILED",
    message: "Something went wrong when setting up the checkout workflow.",
  },
  PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_POPUP_OPEN_FAILED",
    message:
      "PayPal popup failed to open, make sure to initiate the vault checkout in response to a user action.",
  },
  PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_CANCELED",
    message: "Customer closed PayPal popup before authorizing.",
  },
  PAYPAL_START_VAULT_INITIATED_CHECKOUT_IN_PROGRESS: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_START_VAULT_INITIATED_CHECKOUT_IN_PROGRESS",
    message: "Vault initiated checkout already in progress.",
  },
  PAYPAL_INVALID_PAYMENT_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_INVALID_PAYMENT_OPTION",
    message: "PayPal payment options are invalid.",
  },
  PAYPAL_MISSING_REQUIRED_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: "PAYPAL_MISSING_REQUIRED_OPTION",
    message: "Missing required option.",
  },
};
