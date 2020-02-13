'use strict';

var BraintreeError = require('../../braintree-error');
var frameService = require('./');
var frameServiceErrors = require('../shared/errors');

function start() {
  frameService.report(
    new BraintreeError(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED)
  );

  frameService.asyncClose();
}

module.exports = {
  start: start
};
