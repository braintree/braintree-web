'use strict';

/**
 * @name BraintreeError.Masterpass - Creation Error Codes
 * @description Errors that occur when [creating the Masterpass component](./module-braintree-web_masterpass#.create).
 * @property {CUSTOMER} MASTERPASS_BROWSER_NOT_SUPPORTED Occurs when browser is not a supported browser for Masterpass.
 * @property {MERCHANT} MASTERPASS_NOT_ENABLED Occurs when Masterpass is not enabled in the Braintree control panel.
 */

/**
 * @name BraintreeError.Masterpass - Tokenize Error Codes
 * @description Errors that occur when [tokenizing](./Masterpass.html#tokenize).
 * @property {MERCHANT} MASTERPASS_TOKENIZE_MISSING_REQUIRED_OPTION Occurs when tokenize is called without a required option.
 * @property {MERCHANT} MASTERPASS_TOKENIZATION_ALREADY_IN_PROGRESS Occurs if tokenization flow is initialized while another flow is already in progress.
 * @property {NETWORK} MASTERPASS_ACCOUNT_TOKENIZATION_FAILED Occurs when tokenization of Masterpass details fails.
 * @property {MERCHANT} MASTERPASS_POPUP_OPEN_FAILED Occurs when the popup fails to open.
 * @property {MERCHANT} MASTERPASS_POPUP_MISSING_REQUIRED_PARAMETERS Occurs when Masterpass is missing required parameters for tokenization.
 * @property {CUSTOMER} MASTERPASS_POPUP_CLOSED Occurs when the popup is closed by the customer.
 * @property {MERCHANT} MASTERPASS_INVALID_PAYMENT_OPTION Occurs when an invalid payment option is used to tokenize Masterpass.
 * @property {NETWORK} MASTERPASS_FLOW_FAILED Occurs when an error is returned from request to tokenize.
 */

var BraintreeError = require('../../lib/braintree-error');

module.exports = {
  MASTERPASS_BROWSER_NOT_SUPPORTED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'MASTERPASS_BROWSER_NOT_SUPPORTED',
    message: 'Browser is not supported.'
  },
  MASTERPASS_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'MASTERPASS_NOT_ENABLED',
    message: 'Masterpass is not enabled for this merchant.'
  },
  MASTERPASS_TOKENIZE_MISSING_REQUIRED_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: 'MASTERPASS_TOKENIZE_MISSING_REQUIRED_OPTION',
    message: 'Missing required option for tokenize.'
  },
  MASTERPASS_TOKENIZATION_ALREADY_IN_PROGRESS: {
    type: BraintreeError.types.MERCHANT,
    code: 'MASTERPASS_TOKENIZATION_ALREADY_IN_PROGRESS',
    message: 'Masterpass tokenization is already in progress.'
  },
  MASTERPASS_ACCOUNT_TOKENIZATION_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: 'MASTERPASS_ACCOUNT_TOKENIZATION_FAILED',
    message: 'Could not tokenize user\'s Masterpass account.'
  },
  MASTERPASS_POPUP_OPEN_FAILED: {
    type: BraintreeError.types.MERCHANT,
    code: 'MASTERPASS_POPUP_OPEN_FAILED',
    message: 'Masterpass popup failed to open. Make sure to tokenize in response to a user action, such as a click.'
  },
  MASTERPASS_POPUP_MISSING_REQUIRED_PARAMETERS: {
    type: BraintreeError.types.MERCHANT,
    code: 'MASTERPASS_POPUP_MISSING_REQUIRED_PARAMETERS',
    message: 'Masterpass popup failed to return all required parameters needed to continue tokenization.'
  },
  MASTERPASS_POPUP_CLOSED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'MASTERPASS_POPUP_CLOSED',
    message: 'Customer closed Masterpass popup before authorizing.'
  },
  MASTERPASS_INVALID_PAYMENT_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: 'MASTERPASS_INVALID_PAYMENT_OPTION',
    message: 'Masterpass payment options are invalid.'
  },
  MASTERPASS_FLOW_FAILED: {
    type: BraintreeError.types.NETWORK,
    code: 'MASTERPASS_FLOW_FAILED',
    message: 'Could not initialize Masterpass flow.'
  }
};

