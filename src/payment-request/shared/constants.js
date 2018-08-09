'use strict';

var enumerate = require('../../lib/enumerate');
var errors = require('./errors');

var constants = {};

constants.events = enumerate([
  'FRAME_READY',
  'FRAME_CAN_MAKE_REQUESTS',
  'PAYMENT_REQUEST_INITIALIZED',
  'SHIPPING_ADDRESS_CHANGE',
  'UPDATE_SHIPPING_ADDRESS',
  'SHIPPING_OPTION_CHANGE',
  'UPDATE_SHIPPING_OPTION',
  'PAYMENT_REQUEST_FAILED',
  'PAYMENT_REQUEST_SUCCESSFUL'
], 'payment-request:');

constants.errors = errors;

module.exports = constants;
