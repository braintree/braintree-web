'use strict';

var BraintreeError = require('../../lib/braintree-error');
var frameService = require('../../lib/frame-service/internal');
var frameServiceErrors = require('../../lib/frame-service/shared/errors');

function start() {
  frameService.report(
    new BraintreeError(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED)
  );

  frameService.asyncClose();
}

module.exports = {
  start: start
};
