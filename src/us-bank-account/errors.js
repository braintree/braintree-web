'use strict';

/**
 * @name BraintreeError.Us Bank Account - Creation Error Codes
 * @description Errors that occur when [creating the Us Bank Account component](./module-braintree-web_us-bank-account.html#.create).
 * @property {MERCHANT} US_BANK_ACCOUNT_NOT_ENABLED Occurs when US Bank Account is not enabled in the Braintree control panel.
 */

/**
 * @name BraintreeError.Us Bank Account - tokenize Error Codes
 * @description Errors that occur when using the [`tokenize` method](./UsBankAccount.html#tokenize).
 * @property {MERCHANT} US_BANK_ACCOUNT_OPTION_REQUIRED Occurs when a required option is not passed.
 * @property {MERCHANT} US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS Occurs when 1 or more incompatible options are passed.
 * @property {NETWORK} US_BANK_ACCOUNT_LOGIN_LOAD_FAILED Occurs when bank login flow fails.
 * @property {CUSTOMER} US_BANK_ACCOUNT_LOGIN_CLOSED Occurs when bank login window is closed.
 * @property {MERCHANT} US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE Occurs when a bank login flow is already active.
 * @property {NETWORK} US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR Occurs when payment details could not be tokenized.
 * @property {CUSTOMER} US_BANK_ACCOUNT_FAILED_TOKENIZATION Occurs when payment details failed to be tokenized.
 * @property {MERCHANT} US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED Occurs when bank login flow is not enabled in the Braintree control panel.
 */

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
