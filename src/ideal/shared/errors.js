'use strict';

var BraintreeError = require('../../lib/braintree-error');

module.exports = {
  IDEAL_BROWSER_NOT_SUPPORTED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'IDEAL_BROWSER_NOT_SUPPORTED',
    message: 'Browser is not supported.'
  },
  IDEAL_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'IDEAL_NOT_ENABLED',
    message: 'iDEAL is not enabled for this merchant.'
  },
  IDEAL_PAYMENT_ALREADY_IN_PROGRESS: {
    type: BraintreeError.types.MERCHANT,
    code: 'IDEAL_PAYMENT_ALREADY_IN_PROGRESS',
    message: 'iDEAL payment is already in progress.'
  },
  IDEAL_PAYMENT_NOT_COMPLETE_OR_PENDING: {
    code: 'IDEAL_PAYMENT_NOT_COMPLETE_OR_PENDING',
    type: BraintreeError.types.CUSTOMER
  },
  IDEAL_WINDOW_CLOSED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'IDEAL_WINDOW_CLOSED',
    message: 'Customer closed iDEAL window before authorizing.'
  },
  IDEAL_WINDOW_OPEN_FAILED: {
    type: BraintreeError.types.MERCHANT,
    code: 'IDEAL_WINDOW_OPEN_FAILED',
    message: 'iDEAL window failed to open; make sure startPayment was called in response to a user action.'
  },
  IDEAL_START_PAYMENT_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: 'IDEAL_START_PAYMENT_FAILED',
    message: 'iDEAL startPayment failed.'
  },
  IDEAL_START_PAYMENT_UNEXPECTED_STATUS: {
    type: BraintreeError.types.INTERNAL,
    code: 'IDEAL_START_PAYMENT_UNEXPECTED_STATUS',
    message: 'iDEAL startPayment returned an unexpected status without an error.'
  },
  IDEAL_START_PAYMENT_MISSING_REQUIRED_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: 'IDEAL_START_PAYMENT_MISSING_REQUIRED_OPTION',
    message: 'Missing required option for startPayment.'
  }
};

