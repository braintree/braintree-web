'use strict';

var BraintreeError = require('../lib/braintree-error');

module.exports = {
  US_BANK_ACCOUNT_OPTION_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'US_BANK_ACCOUNT_OPTION_REQUIRED'
  },
  US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS: {
    type: BraintreeError.types.MERCHANT,
    code: 'US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS'
  },
  US_BANK_ACCOUNT_LOGIN_LOAD_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: 'US_BANK_ACCOUNT_LOGIN_LOAD_FAILED',
    message: 'Bank login flow failed to load.'
  },
  US_BANK_ACCOUNT_LOGIN_CLOSED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'US_BANK_ACCOUNT_LOGIN_CLOSED',
    message: 'Customer closed bank login flow before authorizing.'
  },
  US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE: {
    type: BraintreeError.types.MERCHANT,
    code: 'US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE',
    message: 'Another bank login tokenization request is active.'
  },
  US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: 'US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR',
    message: 'A tokenization network error occurred.'
  },
  US_BANK_ACCOUNT_FAILED_TOKENIZATION: {
    type: BraintreeError.types.CUSTOMER,
    code: 'US_BANK_ACCOUNT_FAILED_TOKENIZATION',
    message: 'The supplied data failed tokenization.'
  },
  US_BANK_ACCOUNT_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'US_BANK_ACCOUNT_NOT_ENABLED',
    message: 'US bank account is not enabled.'
  },
  US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED',
    message: 'Bank login is not enabled.'
  }
};
