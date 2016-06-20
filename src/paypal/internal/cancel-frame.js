'use strict';

var frameService = require('../../lib/frame-service/internal');
var BraintreeError = require('../../lib/error');

function start() {
  frameService.report(
    new BraintreeError({
      type: BraintreeError.types.CUSTOMER,
      message: frameService.constants.FRAME_CLOSED_ERROR_MESSAGE
    })
  );
  // IE 11 metro mode needs this to close popup
  frameService.asyncClose();
}

module.exports = {
  start: start
};
