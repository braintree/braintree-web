'use strict';

var BaseInput = require('./base-input').BaseInput;

function PostalCodeInput() {
  this.maxLength = 10;

  BaseInput.apply(this, arguments);

  this.formatter.setPattern('{{**********}}');
  this.element.setAttribute('type', 'text');
}

PostalCodeInput.prototype = Object.create(BaseInput.prototype);
PostalCodeInput.prototype.constructor = PostalCodeInput;

module.exports = {
  PostalCodeInput: PostalCodeInput
};
