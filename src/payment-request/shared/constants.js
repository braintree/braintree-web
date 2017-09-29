'use strict';

var BraintreeError = require('../../lib/braintree-error');
var enumerate = require('../../lib/enumerate');

var constants = {};

constants.events = enumerate([
  'FRAME_READY',
  'FRAME_CAN_MAKE_REQUESTS',
  'PAYMENT_REQUEST_INITIALIZED',
  'PAYMENT_REQUEST_FAILED',
  'PAYMENT_REQUEST_SUCCESSFUL'
], 'payment-request:');

constants.errors = {
  PAYMENT_REQUEST_NO_VALID_SUPPORTED_PAYMENT_METHODS: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYMENT_REQUEST_NO_VALID_SUPPORTED_PAYMENT_METHODS',
    message: 'There are no supported payment methods associated with this account.'
  },
  PAYMENT_REQUEST_CANCELED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'PAYMENT_REQUEST_CANCELED',
    message: 'Payment request was canceled.'
  },
  PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED',
    message: 'Something went wrong when configuring the payment request.'
  },
  PAYMENT_REQUEST_PAY_WITH_GOOGLE_FAILED_TO_TOKENIZE: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYMENT_REQUEST_PAY_WITH_GOOGLE_FAILED_TO_TOKENIZE',
    message: 'Something went wrong when tokenizing the Pay with Google card.'
  },
  PAYMENT_REQUEST_PAY_WITH_GOOGLE_PARSING_ERROR: {
    type: BraintreeError.types.UNKNOWN,
    code: 'PAYMENT_REQUEST_PAY_WITH_GOOGLE_PARSING_ERROR',
    message: 'Something went wrong when tokenizing the Pay with Google card.'
  },
  PAYMENT_REQUEST_NOT_COMPLETED: {
    code: 'PAYMENT_REQUEST_NOT_COMPLETED',
    message: 'Payment request could not be completed.'
  },
  PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_MUST_INCLUDE_TYPE: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_MUST_INCLUDE_TYPE',
    message: 'createSupportedPaymentMethodsConfiguration must include a type parameter.'
  },
  PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_TYPE_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_TYPE_NOT_ENABLED',
    message: 'createSupportedPaymentMethodsConfiguration type parameter must be valid or enabled.'
  }
};

module.exports = constants;
