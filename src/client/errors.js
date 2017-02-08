'use strict';

var BraintreeError = require('../lib/braintree-error');

module.exports = {
  CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN: {
    type: BraintreeError.types.MERCHANT,
    code: 'CLIENT_GATEWAY_CONFIGURATION_INVALID_DOMAIN'
  },
  CLIENT_OPTION_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'CLIENT_OPTION_REQUIRED'
  },
  CLIENT_OPTION_INVALID: {
    type: BraintreeError.types.MERCHANT,
    code: 'CLIENT_OPTION_INVALID'
  },
  CLIENT_MISSING_GATEWAY_CONFIGURATION: {
    type: BraintreeError.types.INTERNAL,
    code: 'CLIENT_MISSING_GATEWAY_CONFIGURATION',
    message: 'Missing gatewayConfiguration.'
  },
  CLIENT_INVALID_AUTHORIZATION: {
    type: BraintreeError.types.MERCHANT,
    code: 'CLIENT_INVALID_AUTHORIZATION',
    message: 'Authorization is invalid. Make sure your client token or tokenization key is valid.'
  },
  CLIENT_GATEWAY_NETWORK: {
    type: BraintreeError.types.NETWORK,
    code: 'CLIENT_GATEWAY_NETWORK',
    message: 'Cannot contact the gateway at this time.'
  },
  CLIENT_REQUEST_TIMEOUT: {
    type: BraintreeError.types.NETWORK,
    code: 'CLIENT_REQUEST_TIMEOUT',
    message: 'Request timed out waiting for a reply.'
  },
  CLIENT_REQUEST_ERROR: {
    type: BraintreeError.types.NETWORK,
    code: 'CLIENT_REQUEST_ERROR',
    message: 'There was a problem with your request.'
  },
  CLIENT_RATE_LIMITED: {
    type: BraintreeError.types.MERCHANT,
    code: 'CLIENT_RATE_LIMITED',
    message: 'You are being rate-limited; please try again in a few minutes.'
  },
  CLIENT_AUTHORIZATION_INSUFFICIENT: {
    type: BraintreeError.types.MERCHANT,
    code: 'CLIENT_AUTHORIZATION_INSUFFICIENT',
    message: 'The authorization used has insufficient privileges.'
  }
};
