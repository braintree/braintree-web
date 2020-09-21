'use strict';

var BaseInput = require('./base-input').BaseInput;

var DEFAULT_MAX_LENGTH = 255;

function CardholderNameInput() {
  var pattern;

  BaseInput.apply(this, arguments);

  this.maxLength = DEFAULT_MAX_LENGTH;
  this.element.setAttribute('maxlength', this.maxLength);

  pattern = '{{' + Array(this.maxLength + 1).join('*') + '}}';

  this.formatter.setPattern(pattern);
  this.element.setAttribute('type', this.getConfiguration().type || 'text');
  // all the other fields are number based, so they have a digit
  // pattern set on iOS to ensure that the number keyboard is
  // presented, so we manually remove the pattern attribute here
  this.element.removeAttribute('pattern');
}

CardholderNameInput.prototype = Object.create(BaseInput.prototype);
CardholderNameInput.prototype.constructor = CardholderNameInput;

module.exports = {
  CardholderNameInput: CardholderNameInput
};
