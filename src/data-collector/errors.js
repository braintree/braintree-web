'use strict';

var BraintreeError = require('../lib/error');

module.exports = {
  KOUNT_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'KOUNT_NOT_ENABLED',
    message: 'Kount is not enabled for this merchant.'
  },
  KOUNT_ERROR: {
    type: BraintreeError.types.MERCHANT,
    code: 'KOUNT_ERROR'
  },
  PAYPAL_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYPAL_NOT_ENABLED',
    message: 'PayPal is not enabled for this merchant.'
  },
  REQUIRES_CREATE_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: 'REQUIRES_CREATE_OPTIONS',
    message: 'Data Collector must be created with Kount and/or PayPal.'
  }
};
