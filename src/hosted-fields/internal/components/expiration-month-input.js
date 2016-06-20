'use strict';

var BaseInput = require('./base-input').BaseInput;

var PATTERN = '{{99}}';

function ExpirationMonthInput() {
  this.maxLength = 2;

  BaseInput.apply(this, arguments);
  this.formatter.setPattern(PATTERN);
}

ExpirationMonthInput.prototype = Object.create(BaseInput.prototype);
ExpirationMonthInput.prototype.constructor = ExpirationMonthInput;

module.exports = {
  ExpirationMonthInput: ExpirationMonthInput
};
