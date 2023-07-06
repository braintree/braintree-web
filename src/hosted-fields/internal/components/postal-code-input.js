"use strict";

var BaseInput = require("./base-input").BaseInput;

var DEFAULT_MAX_LENGTH = 10;

function PostalCodeInput() {
  var pattern;

  BaseInput.apply(this, arguments);

  this.maxLength = this.getConfiguration().maxlength || DEFAULT_MAX_LENGTH;
  this.element.setAttribute("maxlength", this.maxLength);

  pattern = "{{" + Array(this.maxLength + 1).join("*") + "}}";

  this.formatter.setPattern(pattern);
  this.element.setAttribute("type", this.getConfiguration().type || "text");
  // to get the correct keyboard to show up on iOS,
  // we set a pattern on the base input to only allow
  // digits, however, global postal code can be alpha
  // numeric, so we remove the pattern and inputmode attributes
  this.element.removeAttribute("pattern");
  this.element.removeAttribute("inputmode");
}

PostalCodeInput.prototype = Object.create(BaseInput.prototype);
PostalCodeInput.prototype.constructor = PostalCodeInput;

module.exports = {
  PostalCodeInput: PostalCodeInput,
};
