'use strict';

var RestrictedInput = require('restricted-input');
var FakeRestrictedInput = require('./fake-restricted-input');

module.exports = function (options) {
  var Klass = options.shouldFormat ? RestrictedInput : FakeRestrictedInput;

  return new Klass(options);
};
