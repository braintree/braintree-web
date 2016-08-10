'use strict';

var BraintreeError = require('../../lib/error');
var frameService = require('../../lib/frame-service/internal');
var frameServiceErrors = require('../../lib/frame-service/shared/errors');

function start() {
  frameService.report(
    new BraintreeError(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED)
  );
  // IE 11 metro mode needs this to close popup
  frameService.asyncClose();
}

module.exports = {
  start: start
};
