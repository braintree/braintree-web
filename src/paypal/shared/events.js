'use strict';

var enumerate = require('../../lib/enumerate');

module.exports = enumerate([
  'BRIDGE_FRAME_READY',
  'AUTHORIZATION_COMPLETE'
], 'paypal:');
