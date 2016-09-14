'use strict';

var RestrictedInput = require('restricted-input');
var FakeRestrictedInput = require('./fake-restricted-input');
var browserDetection = require('./browser-detection');
var SUPPORTED_INPUT_TYPES = ['text', 'tel', 'url', 'search', 'password'];

module.exports = function (options) {
  var shouldFormat = options.shouldFormat;

  if (browserDetection.isAndroid()) {
    shouldFormat = false;
  } else if (browserDetection.isIos()) {
    shouldFormat = false;
  } else if (SUPPORTED_INPUT_TYPES.indexOf(options.element.type) === -1) {
    shouldFormat = false;
  }

  return shouldFormat ? new RestrictedInput(options) : new FakeRestrictedInput(options);
};
