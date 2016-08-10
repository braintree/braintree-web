'use strict';

var BaseInput = require('./base-input').BaseInput;

var PATTERN = '{{9999}}';

function ExpirationYearInput() {
  this.maxLength = 4;

  BaseInput.apply(this, arguments);
  this.formatter.setPattern(PATTERN);
}

ExpirationYearInput.prototype = Object.create(BaseInput.prototype);
ExpirationYearInput.prototype.constructor = ExpirationYearInput;

module.exports = {
  ExpirationYearInput: ExpirationYearInput
};
