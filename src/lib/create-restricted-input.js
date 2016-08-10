'use strict';

var RestrictedInput = require('restricted-input');
var FakeRestrictedInput = require('./fake-restricted-input');
var browserDetection = require('./browser-detection');

module.exports = function (options) {
  var shouldFormat = options.shouldFormat && !browserDetection.isAndroid() && !browserDetection.isIos();
  var Klass = shouldFormat ? RestrictedInput : FakeRestrictedInput;

  return new Klass(options);
};
