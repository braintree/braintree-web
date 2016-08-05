'use strict';

var BraintreeError = require('../../lib/error');

module.exports = {
  AUTHENTICATION_IN_PROGRESS: {
    type: BraintreeError.types.MERCHANT,
    code: 'AUTHENTICATION_IN_PROGRESS',
    message: 'Cannot call verifyCard while existing authentication is in progress.'
  },
  MISSING_VERIFY_CARD_OPTION: {
    type: BraintreeError.types.MERCHANT,
    code: 'MISSING_VERIFY_CARD_OPTION'
  },
  NO_VERIFICATION_PAYLOAD: {
    type: BraintreeError.types.MERCHANT,
    code: 'NO_VERIFICATION_PAYLOAD',
    message: 'No verification payload available.'
  },
  THREEDS_NOT_ENABLED: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_NOT_ENABLED',
    message: '3D Secure is not enabled for this merchant.'
  },
  THREEDS_HTTPS_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'THREEDS_HTTPS_REQUIRED',
    message: '3D Secure requires HTTPS.'
  },
  TERM_URL_REQUIRES_BRAINTREE_DOMAIN: {
    type: BraintreeError.types.INTERNAL,
    code: 'TERM_URL_REQUIRES_BRAINTREE_DOMAIN',
    message: 'Term Url must be on a Braintree domain.'
  }
};
