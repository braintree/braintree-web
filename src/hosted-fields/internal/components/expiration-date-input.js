'use strict';

var BaseInput = require('./base-input').BaseInput;
var validate = require('card-validator');

var DEFAULT_PATTERN = '{{99}} / {{9999}}';
var ZERO_PADDED_PATTERN = '0{{9}} / {{9999}}';

function ExpirationDateInput() {
  this.maxLength = 9;

  BaseInput.apply(this, arguments);
  this.formatter.setPattern(DEFAULT_PATTERN);

  this.model.on('change:expirationDate.value', function (date) {
    if (date.length === 0) {
      this.formatter.setPattern(DEFAULT_PATTERN);
    } else if (this.formatter.pattern === DEFAULT_PATTERN) {
      if ((date[0] !== '0' && date[0] !== '1') || ((date.length === 3 || date.length === 5) && validate.expirationDate(date).isValid)) { // eslint-disable-line no-extra-parens
        this.formatter.setPattern(ZERO_PADDED_PATTERN);
      }
    } else if ((date[0] === '0' || date[0] === '1') || ((date.length === 4 || date.length === 6) && validate.expirationDate(date).isValid)) { // eslint-disable-line no-extra-parens
      this.formatter.setPattern(DEFAULT_PATTERN);
    }
  }.bind(this));
}

ExpirationDateInput.prototype = Object.create(BaseInput.prototype);
ExpirationDateInput.prototype.constructor = ExpirationDateInput;

module.exports = {
  ExpirationDateInput: ExpirationDateInput
};
