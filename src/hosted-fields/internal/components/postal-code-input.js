'use strict';

var BaseInput = require('./base-input').BaseInput;

var DEFAULT_MAX_LENGTH = 10;

function PostalCodeInput() {
  var length, pattern;

  BaseInput.apply(this, arguments);

  this.maxLength = DEFAULT_MAX_LENGTH;
  length = this.getConfiguration().maxlength;

  if (length && length < this.maxLength) {
    this.maxLength = length;
  }
  this.element.setAttribute('maxlength', this.maxLength);

  pattern = '{{' + Array(this.maxLength + 1).join('*') + '}}';

  this.formatter.setPattern(pattern);
  this.element.setAttribute('type', this.getConfiguration().type || 'text');
}

PostalCodeInput.prototype = Object.create(BaseInput.prototype);
PostalCodeInput.prototype.constructor = PostalCodeInput;

module.exports = {
  PostalCodeInput: PostalCodeInput
};
