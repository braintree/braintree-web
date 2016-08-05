'use strict';

var BraintreeError = require('../lib/error');

module.exports = {
  NONCE_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'NONCE_REQUIRED'
  },
  AMEX_NETWORK_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: 'AMEX_NETWORK_ERROR'
  }
};
