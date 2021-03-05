'use strict';

/**
 * @name BraintreeError.Payment Request - Creation Error Codes
 * @description Errors that occur when [creating the Payment Request component](./module-braintree-web_payment-request.html#.create).
 * @property {MERCHANT} PAYMENT_REQUEST_NO_VALID_SUPPORTED_PAYMENT_METHODS Occurs when there are no valid payment methods configured.
 */

/**
 * @name BraintreeError.Payment Request - createSupportedPaymentMethodsConfiguration  Error Codes
 * @description Errors that occur when using the [`createSupportedPaymentMethodsConfiguration` method](./PaymentRequestComponent.html#createSupportedPaymentMethodsConfiguration)
 * @property {MERCHANT} PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_MUST_INCLUDE_TYPE Occurs when no type is supplied for method.
 * @property {MERCHANT} PAYMENT_REQUEST_CREATE_SUPPORTED_PAYMENT_METHODS_CONFIGURATION_TYPE_NOT_ENABLED Occurs when configured type is not enabled.
 */

/**
 * @name BraintreeError.Payment Request - tokenize  Error Codes
 * @description Errors that occur when using the [`tokenize` method](./PaymentRequestComponent.html#tokenize)
 * @property {CUSTOMER} PAYMENT_REQUEST_CANCELED Occurs when customer cancels the Payment Request.
 * @property {MERCHANT} PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED Occurs when the Payment Request is closed do to the options being misconfigured.
 * @property {MERCHANT} PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE Occurs when a Google Payment payment method is unable to be tokenized.
 * @property {UNKNOWN} PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR Occurs when the result of tokenizing a Google Payment payment method could not be parsed.
 * @property {CUSTOMER} PAYMENT_REQUEST_NOT_COMPLETED Occurs when an error prevented the Payment Request from being completed.
 */

/**
 * @name BraintreeError.Payment Request - canMakePayment  Error Codes
 * @description Errors that occur when using the [`canMakePayment` method](./PaymentRequestComponent.html#canMakePayment)
 * @property {MERCHANT} PAYMENT_REQUEST_INITIALIZATION_MISCONFIGURED Occurs when the Payment Request is instantiated with misconfigured options.
 * @property {MERCHANT} PAYMENT_REQUEST_CAN_MAKE_PAYMENT_NOT_ALLOWED Occurs when `canMakePayment` results in a `DomException` with a `NotAllowedError`. This usually occurs when `canMakePayment` is called multiple times with different supported payment options.
 * @property {MERCHANT} PAYMENT_REQUEST_UNSUPPORTED_PAYMENT_METHOD Occurs when `canMakePayment` is called with a `supportedPaymentMethods` array that contains a payment method that is not supported by the Braintree SDK.
 * @property {UNKNOWN} PAYMENT_REQUEST_CAN_MAKE_PAYMENT_FAILED Occurs when `canMakePayment` fails for any reason other than a misconfigured Payment Request object.
 */

var BraintreeError = require('../../lib/braintree-error');

module.exports = {
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
  PAYMENT_REQUEST_CAN_MAKE_PAYMENT_FAILED: {
    type: BraintreeError.types.UNKNOWN,
    code: 'PAYMENT_REQUEST_CAN_MAKE_PAYMENT_FAILED',
    message: 'Something went wrong when calling `canMakePayment`'
  },
  PAYMENT_REQUEST_CAN_MAKE_PAYMENT_NOT_ALLOWED: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYMENT_REQUEST_CAN_MAKE_PAYMENT_NOT_ALLOWED',
    message: 'Something went wrong when calling `canMakePayment`. Most likely, `canMakePayment` was called multiple times with different supportedMethods configurations.'
  },
  PAYMENT_REQUEST_UNSUPPORTED_PAYMENT_METHOD: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYMENT_REQUEST_UNSUPPORTED_PAYMENT_METHOD'
  },
  PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE: {
    type: BraintreeError.types.MERCHANT,
    code: 'PAYMENT_REQUEST_GOOGLE_PAYMENT_FAILED_TO_TOKENIZE',
    message: 'Something went wrong when tokenizing the Google Pay card.'
  },
  PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR: {
    type: BraintreeError.types.UNKNOWN,
    code: 'PAYMENT_REQUEST_GOOGLE_PAYMENT_PARSING_ERROR',
    message: 'Something went wrong when tokenizing the Google Pay card.'
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
