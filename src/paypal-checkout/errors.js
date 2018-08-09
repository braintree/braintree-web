'use strict';

/**
 * @name BraintreeError.PayPal Checkout - Creation Error Codes
 * @description Errors that occur when [creating the PayPal Checkout component](/current/module-braintree-web_paypal-checkout.html#.create).
 * @property {MERCHANT} PAYPAL_NOT_ENABLED Occurs when PayPal is not enabled on the Braintree control panel.
 * @property {MERCHANT} PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED Occurs only when testing in Sandbox, when a PayPal sandbox account is not linked to the merchant account in the Braintree control panel.
 */

/**
 * @name BraintreeError.PayPal Checkout - createPayment Error Codes
 * @description Errors that occur when using the [`createPayment` method](/current/PayPalCheckout.html#createPayment).
 * @property {MERCHANT} PAYPAL_FLOW_OPTION_REQUIRED Occurs when a required option is missing.
 * @property {MERCHANT} PAYPAL_INVALID_PAYMENT_OPTION Occurs when an option contains an invalid value.
 * @property {NETWORK} PAYPAL_FLOW_FAILED Occurs when something goes wrong when initializing the flow.
 */

/**
 * @name BraintreeError.PayPal Checkout - tokenizePayment Error Codes
 * @description Errors that occur when using the [`tokenizePayment` method](/current/PayPalCheckout.html#tokenizePayment).
 * @property {NETWORK} PAYPAL_ACCOUNT_TOKENIZATION_FAILED Occurs when PayPal account could not be tokenized.
 */

var BraintreeError = require('../lib/braintree-error');

module.exports = {
  PAYPAL_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYPAL_NOT_ENABLED',
    message: 'PayPal is not enabled for this merchant.'
  },
  PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED',
    message: 'A linked PayPal Sandbox account is required to use PayPal Checkout in Sandbox. See https://developers.braintreepayments.com/guides/paypal/testing-go-live/#linked-paypal-testing for details on linking your PayPal sandbox with Braintree.'
  },
  PAYPAL_ACCOUNT_TOKENIZATION_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: 'PAYPAL_ACCOUNT_TOKENIZATION_FAILED',
    message: 'Could not tokenize user\'s PayPal account.'
  },
  PAYPAL_FLOW_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: 'PAYPAL_FLOW_FAILED',
    message: 'Could not initialize PayPal flow.'
  },
  PAYPAL_FLOW_OPTION_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYPAL_FLOW_OPTION_REQUIRED',
    message: 'PayPal flow property is invalid or missing.'
  },
  PAYPAL_INVALID_PAYMENT_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYPAL_INVALID_PAYMENT_OPTION',
    message: 'PayPal payment options are invalid.'
  }
};
