'use strict';

/**
 * @name BraintreeError.Venmo - Creation Error Codes
 * @description Errors that occur when [creating the Venmo component](./module-braintree-web_venmo.html#.create).
 * @property {MERCHANT} VENMO_NOT_ENABLED Occurs when Venmo is not enabled on the Braintree control panel.
 * @property {MERCHANT} VENMO_INVALID_PROFILE_ID Occurs when Venmo is initialized with a profile id, but it is invalid.
 * @property {UNKNOWN} VENMO_MOBILE_POLLING_SETUP_FAILED __Deprecated__ No longer returned. Use `VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED` instead.
 * @property {UNKNOWN} VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED Occurs when the request to set up a Venmo Payment Context object fails.
 */

/**
 * @name BraintreeError.Venmo - tokenize Error Codes
 * @description Errors that occur when using the [`tokenize` method](./Venmo.html#tokenize).
 * @property {MERCHANT} VENMO_TOKENIZATION_REQUEST_ACTIVE Occurs when `tokenize` is called when the flow is already in progress.
 * @property {MERCHANT} VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE Occurs when `cancelTokenization` is called when the flow is not in progress.
 * @property {UNKNOWN} VENMO_APP_FAILED Occurs when tokenization fails.
 * @property {CUSTOMER} VENMO_APP_CANCELED Occurs when customer cancels flow from the Venmo app.
 * @property {CUSTOMER} VENMO_CANCELED Occurs when customer cancels the flow or Venmo app is not available.
 * @property {CUSTOMER} VENMO_DESKTOP_CANCELED Occurs when customer cancels the Venmo Desktop flow by closing the modal.
 * @property {MERCHANT} VENMO_TOKENIZATION_CANCELED_BY_MERCHANT Occurs when `cancelTokenization` is called while tokenization is in progress.
 * @property {UNKNOWN} VENMO_DESKTOP_UNKNOWN_ERROR Occurs when an unknown error causes the Venmo Desktop flow to fail.
 * @property {UNKNOWN} VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR Occurs when an unknown network error causes the mobile polling process to fail.
 * @property {CUSTOMER} VENMO_MOBILE_POLLING_TOKENIZATION_EXPIRED Occurs when the polling has expired and the payment cannot be completed.
 * @property {CUSTOMER} VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED Occurs when the polling operation is canceled by the customer.
 * @property {CUSTOMER} VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT Occurs when customer takes too long to complete payment.
 * @property {UNKNOWN} VENMO_MOBILE_POLLING_TOKENIZATION_FAILED Occurs if there is an unknown error during the mobile polling process.
 */

var BraintreeError = require('../../lib/braintree-error');

module.exports = {
  VENMO_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'VENMO_NOT_ENABLED',
    message: 'Venmo is not enabled for this merchant.'
  },
  VENMO_TOKENIZATION_REQUEST_ACTIVE: {
    type: BraintreeError.types.MERCHANT,
    code: 'VENMO_TOKENIZATION_REQUEST_ACTIVE',
    message: 'Another tokenization request is active.'
  },
  VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE: {
    type: BraintreeError.types.MERCHANT,
    code: 'VENMO_TOKENIZATION_REQUEST_NOT_ACTIVE',
    message: 'No tokenization in progress.'
  },
  VENMO_APP_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: 'VENMO_APP_FAILED',
    message: 'Venmo app encountered a problem.'
  },
  VENMO_APP_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'VENMO_APP_CANCELED',
    message: 'Venmo app authorization was canceled.'
  },
  VENMO_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'VENMO_CANCELED',
    message: 'User canceled Venmo authorization, or Venmo app is not available.'
  },
  VENMO_DESKTOP_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'VENMO_DESKTOP_CANCELED',
    message: 'User canceled Venmo authorization by closing the Venmo Desktop modal.'
  },
  VENMO_TOKENIZATION_CANCELED_BY_MERCHANT: {
    type: BraintreeError.types.MERCHANT,
    code: 'VENMO_TOKENIZATION_CANCELED_BY_MERCHANT',
    message: 'The Venmo tokenization was canceled by the merchant.'
  },
  VENMO_DESKTOP_UNKNOWN_ERROR: {
    type: BraintreeError.types.UNKNOWN,
    code: 'VENMO_DESKTOP_UNKNOWN_ERROR',
    message: 'Something went wrong with the Venmo Desktop flow.'
  },
  VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: 'VENMO_MOBILE_PAYMENT_CONTEXT_SETUP_FAILED',
    message: 'Something went wrong creating the Venmo Payment Context.'
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR: {
    type: BraintreeError.types.UNKNOWN,
    code: 'VENMO_MOBILE_POLLING_TOKENIZATION_NETWORK_ERROR',
    message: 'Something went wrong during mobile polling.'
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_EXPIRED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'VENMO_MOBILE_POLLING_TOKENIZATION_EXPIRED',
    message: 'The Venmo authorization request is expired.'
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'VENMO_MOBILE_POLLING_TOKENIZATION_CANCELED',
    message: 'The Venmo authorization was canceled'
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT: {
    type: BraintreeError.types.CUSTOMER,
    code: 'VENMO_MOBILE_POLLING_TOKENIZATION_TIMEOUT',
    message: 'Customer took too long to authorize Venmo payment.'
  },
  VENMO_MOBILE_POLLING_TOKENIZATION_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: 'VENMO_MOBILE_POLLING_TOKENIZATION_FAILED',
    message: 'The Venmo authorization failed.'
  },
  VENMO_INVALID_PROFILE_ID: {
    type: BraintreeError.types.MERCHANT,
    code: 'VENMO_INVALID_PROFILE_ID',
    message: 'Venmo profile ID is invalid.'
  },
  VENMO_INVALID_DEEP_LINK_RETURN_URL: {
    type: BraintreeError.types.MERCHANT,
    code: 'VENMO_INVALID_DEEP_LINK_RETURN_URL',
    message: 'Venmo deep link return URL is invalid.'
  }
};
