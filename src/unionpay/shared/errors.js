'use strict';

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
