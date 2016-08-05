'use strict';

var BraintreeError = require('../../lib/error');

module.exports = {
  INVALID_FIELD_KEY: {
    type: BraintreeError.types.MERCHANT,
    code: 'INVALID_FIELD_KEY'
  },
  INVALID_FIELD_SELECTOR: {
    type: BraintreeError.types.MERCHANT,
    code: 'INVALID_FIELD_SELECTOR',
    message: 'Selector does not reference a valid DOM node.'
  },
  FIELD_DUPLICATE_IFRAME: {
    type: BraintreeError.types.MERCHANT,
    code: 'FIELD_DUPLICATE_IFRAME',
    message: 'Element already contains a Braintree iframe.'
  },
  INVALID_FIELD: {
    type: BraintreeError.types.MERCHANT,
    code: 'INVALID_FIELD'
  },
  FIELD_NOT_PRESENT: {
    type: BraintreeError.types.MERCHANT,
    code: 'FIELD_NOT_PRESENT'
  },
  TOKENIZATION_NETWORK_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: 'TOKENIZATION_NETWORK_ERROR',
    message: 'A tokenization network error occurred.'
  },
  FAILED_HOSTED_FIELDS_TOKENIZATION: {
    type: BraintreeError.types.CUSTOMER,
    code: 'FAILED_HOSTED_FIELDS_TOKENIZATION',
    message: 'The supplied card data failed tokenization.'
  },
  FIELDS_EMPTY: {
    type: BraintreeError.types.CUSTOMER,
    code: 'FIELDS_EMPTY',
    message: 'All fields are empty. Cannot tokenize empty card fields.'
  },
  FIELDS_INVALID: {
    type: BraintreeError.types.CUSTOMER,
    code: 'FIELDS_INVALID',
    message: 'Some payment input fields are invalid. Cannot tokenize invalid card fields.'
  }
};
