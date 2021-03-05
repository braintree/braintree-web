'use strict';

/**
 * @name BraintreeError.Union Pay - Creation Error Codes
 * @description Errors that occur when [creating the Union Pay component](./module-braintree-web_union-pay.html#.create).
 * @property {MERCHANT} UNIONPAY_NOT_ENABLED Occurs when Union Pay is not enabled on the Braintree control panel.
 */

/**
 * @name BraintreeError.Union Pay - Shared Error Codes
 * @description Errors that occur when starting the Union Pay Flow
 * @property {MERCHANT} UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES Occurs when a method is used with both card details and a Hosted Fields instance.
 * @property {MERCHANT} UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID Occurs when Hosted Fields instance used is not a valid Hosted Fields instance.
 * @property {MERCHANT} UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED Occurs when neither card details or Hosted Fields are used.
 * @property {MERCHANT} UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED Occurs when Hosted Fields cannot be found on the page.
 */

/**
 * @name BraintreeError.Union Pay - fetchCapabilities Error Codes
 * @description Errors that occur when using the [`fetchCapabilities` method](./UnionPay.html#fetchCapabilities).
 * @property {NETWORK} UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR Occurs when there is an error looking up the Union Pay capabilities.
 */

/**
 * @name BraintreeError.Union Pay - enroll Error Codes
 * @description Errors that occur when using the [`enroll` method](./UnionPay.html#enroll).
 * @property {MERCHANT} UNIONPAY_MISSING_MOBILE_PHONE_DATA Occurs when no mobile phone data is provided.
 * @property {MERCHANT} UNIONPAY_EXPIRATION_DATE_INCOMPLETE Occurs when expiration date is incomplete.
 * @property {CUSTOMER} UNIONPAY_ENROLLMENT_CUSTOMER_INPUT_INVALID Occurs when customer enrollment input is invalid.
 * @property {NETWORK} UNIONPAY_ENROLLMENT_NETWORK_ERROR Occurs when there is an error during enrollment.
 */

/**
 * @name BraintreeError.Union Pay - tokenize Error Codes
 * @description Errors that occur when using the [`tokenize` method](./UnionPay.html#tokenize).
 * @property {CUSTOMER} UNIONPAY_FAILED_TOKENIZATION Occurs when data cannot be tokenized.
 * @property {NETWORK} UNIONPAY_TOKENIZATION_NETWORK_ERROR Occurs when the Braintree gateway cannot be reached.
 */

var BraintreeError = require('../../lib/braintree-error');

module.exports = {
  UNIONPAY_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'UNIONPAY_NOT_ENABLED',
    message: 'UnionPay is not enabled for this merchant.'
  },
  UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID: {
    type: BraintreeError.types.MERCHANT,
    code: 'UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID',
    message: 'Found an invalid Hosted Fields instance. Please use a valid Hosted Fields instance.'
  },
  UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED',
    message: 'Could not find the Hosted Fields instance.'
  },
  UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED',
    message: 'A card or a Hosted Fields instance is required. Please supply a card or a Hosted Fields instance.'
  },
  UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES: {
    type: BraintreeError.types.MERCHANT,
    code: 'UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES',
    message: 'Please supply either a card or a Hosted Fields instance, not both.'
  },
  UNIONPAY_EXPIRATION_DATE_INCOMPLETE: {
    type: BraintreeError.types.MERCHANT,
    code: 'UNIONPAY_EXPIRATION_DATE_INCOMPLETE',
    message: 'You must supply expiration month and year or neither.'
  },
  UNIONPAY_ENROLLMENT_CUSTOMER_INPUT_INVALID: {
    type: BraintreeError.types.CUSTOMER,
    code: 'UNIONPAY_ENROLLMENT_CUSTOMER_INPUT_INVALID',
    message: 'Enrollment failed due to user input error.'
  },
  UNIONPAY_ENROLLMENT_NETWORK_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: 'UNIONPAY_ENROLLMENT_NETWORK_ERROR',
    message: 'Could not enroll UnionPay card.'
  },
  UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: 'UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR',
    message: 'Could not fetch card capabilities.'
  },
  UNIONPAY_TOKENIZATION_NETWORK_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: 'UNIONPAY_TOKENIZATION_NETWORK_ERROR',
    message: 'A tokenization network error occurred.'
  },
  UNIONPAY_MISSING_MOBILE_PHONE_DATA: {
    type: BraintreeError.types.MERCHANT,
    code: 'UNIONPAY_MISSING_MOBILE_PHONE_DATA',
    message: 'A `mobile` with `countryCode` and `number` is required.'
  },
  UNIONPAY_FAILED_TOKENIZATION: {
    type: BraintreeError.types.CUSTOMER,
    code: 'UNIONPAY_FAILED_TOKENIZATION',
    message: 'The supplied card data failed tokenization.'
  }
};
