'use strict';

var BraintreeError = require('../lib/error');

module.exports = {
  GATEWAY_CONFIGURATION_INVALID_DOMAIN: {
    type: BraintreeError.types.MERCHANT,
    code: 'GATEWAY_CONFIGURATION_INVALID_DOMAIN'
  },
  OPTION_REQUIRED: {
    type: BraintreeError.types.MERCHANT,
    code: 'OPTION_REQUIRED'
  },
  MISSING_GATEWAY_CONFIGURATION: {
    type: BraintreeError.types.INTERNAL,
    code: 'MISSING_GATEWAY_CONFIGURATION',
    message: 'Missing gatewayConfiguration.'
  },
  INVALID_AUTHORIZATION: {
    type: BraintreeError.types.MERCHANT,
    code: 'INVALID_AUTHORIZATION',
    message: 'Authorization is invalid. Make sure your client token or tokenization key is valid.'
  },
  GATEWAY_NETWORK: {
    type: BraintreeError.types.NETWORK,
    code: 'GATEWAY_NETWORK',
    message: 'Cannot contact the gateway at this time.'
  }
};
