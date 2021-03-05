'use strict';

/**
 * @name BraintreeError.Visa Checkout - Creation Error Codes
 * @description Errors that occur when [creating the Visa Checkout component](./module-braintree-web_venmo.html#.create).
 * @property {MERCHANT} VISA_CHECKOUT_NOT_ENABLED Occurs when Visa Checkout is not enabled in the Braintree control panel.
 */

/**
 * @name BraintreeError.Visa Checkout - createInitOptions Error Codes
 * @description Errors that occur when using the [`createInitOptions` method](./VisaCheckout.html#createInitOptions).
 * @property {MERCHANT} VISA_CHECKOUT_INIT_OPTIONS_REQUIRED Occurs when no options are provided to method.
 */

/**
 * @name BraintreeError.Visa Checkout - tokenize Error Codes
 * @description Errors that occur when using the [`tokenize` method](./VisaCheckout.html#tokenize).
 * @property {MERCHANT} VISA_CHECKOUT_PAYMENT_REQUIRED Occurs when no payment data is not provided.
 * @property {NETWORK} VISA_CHECKOUT_TOKENIZATION Occurs when tokenization fails.
 */

var BraintreeError = require('../lib/braintree-error');

module.exports = {
  VISA_CHECKOUT_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'VISA_CHECKOUT_NOT_ENABLED',
    message: 'Visa Checkout is not enabled for this merchant.'
  },
  VISA_CHECKOUT_INIT_OPTIONS_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'VISA_CHECKOUT_INIT_OPTIONS_REQUIRED',
    message: 'initOptions requires an object.'
  },
  VISA_CHECKOUT_PAYMENT_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'VISA_CHECKOUT_PAYMENT_REQUIRED',
    message: 'tokenize requires callid, encKey, and encPaymentData.'
  },
  VISA_CHECKOUT_TOKENIZATION: {
    type: BraintreeError.types.NETWORK,
    code: 'VISA_CHECKOUT_TOKENIZATION',
    message: 'A network error occurred when processing the Visa Checkout payment.'
  }
};
