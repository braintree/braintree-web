'use strict';

var BraintreeError = require('../lib/braintree-error');

module.exports = {
  DATA_COLLECTOR_KOUNT_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'DATA_COLLECTOR_KOUNT_NOT_ENABLED',
    message: 'Kount is not enabled for this merchant.'
  },
  DATA_COLLECTOR_KOUNT_ERROR: {
    type: BraintreeError.types.MERCHANT,
    code: 'DATA_COLLECTOR_KOUNT_ERROR'
  },
  DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: 'DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS',
    message: 'Data Collector must be created with Kount and/or PayPal.'
  }
};
