'use strict';

var BraintreeError = require('../lib/error');

module.exports = {
  US_BANK_OPTION_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'US_BANK_OPTION_REQUIRED'
  },
  US_BANK_MUTUALLY_EXCLUSIVE_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: 'US_BANK_MUTUALLY_EXCLUSIVE_OPTIONS'
  },
  US_BANK_LOGIN_LOAD_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: 'US_BANK_LOGIN_LOAD_FAILED',
    message: 'Bank login flow failed to load.'
  }
};
