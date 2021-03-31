'use strict';

var BraintreeError = require('../../braintree-error');
var frameService = require('./');
var frameServiceErrors = require('../shared/errors');
var querystring = require('../../querystring');

function start() {
  frameService.report(
    new BraintreeError(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED),
    querystring.parse()
  );

  frameService.asyncClose();
}

module.exports = {
  start: start
};
