"use strict";

var BaseInput = require("./base-input").BaseInput;

var DEFAULT_MAX_LENGTH = 4;
var PATTERN_CACHE = {};

function _generatePattern(length) {
  var i;
  var pattern = "{{";

  for (i = 0; i < length; i++) {
    pattern += "9";
  }

  return pattern + "}}";
}

function _getPattern(length) {
  if (!(length in PATTERN_CACHE)) {
    PATTERN_CACHE[length] = _generatePattern(length);
  }

  return PATTERN_CACHE[length];
}

function CVVInput() {
  var length;

  BaseInput.apply(this, arguments);

  this.maxLength = DEFAULT_MAX_LENGTH;
  length = this.getConfiguration().maxlength;

  if (length && length < this.maxLength) {
    this.maxLength = length;
  } else {
    this.model.on(
      "change:possibleCardTypes",
      function (possibleCardTypes) {
        this.maxLength =
          possibleCardTypes.reduce(function (accum, cardType) {
            return Math.max(accum, cardType.code.size);
          }, 0) || DEFAULT_MAX_LENGTH;

        this.formatter.setPattern(_getPattern(this.maxLength));

        if (this.shouldMask) {
          this.maskValue(this.hiddenMaskedValue.substring(0, this.maxLength));
          this.updateModel("value", this.hiddenMaskedValue);
        } else {
          this.updateModel("value", this.formatter.getUnformattedValue());
        }

        this.render();
      }.bind(this)
    );
  }

  this.element.setAttribute("maxlength", this.maxLength);
  this.formatter.setPattern(_getPattern(this.maxLength));
}

CVVInput.prototype = Object.create(BaseInput.prototype);
CVVInput.prototype.constructor = CVVInput;

module.exports = {
  CVVInput: CVVInput,
};
