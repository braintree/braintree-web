'use strict';

var BraintreeError = require('../../error');

module.exports = {
  FRAME_CLOSED: {
    type: BraintreeError.types.CUSTOMER,
    code: 'FRAME_CLOSED',
    message: 'Frame closed before tokenization could occur.'
  }
};
