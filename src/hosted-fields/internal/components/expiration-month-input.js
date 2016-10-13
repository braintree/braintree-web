'use strict';

var ExpirationSplitInput = require('./expiration-split-input').ExpirationSplitInput;
var sanitizeHtml = require('../../../lib/sanitize-html');

var PATTERN = '{{99}}';

function ExpirationMonthInput() {
  this.maxLength = 2;

  ExpirationSplitInput.apply(this, arguments);
  this.formatter.setPattern(PATTERN);
}

ExpirationMonthInput.prototype = Object.create(ExpirationSplitInput.prototype);
ExpirationMonthInput.prototype.constructor = ExpirationMonthInput;

ExpirationMonthInput.prototype.constructSelectOptions = function (element) {
  var option, month;
  var optionTexts = this.getConfiguration().select.options || [];

  for (month = 1; month <= 12; month++) {
    option = document.createElement('option');

    option.value = month;
    option.innerHTML = sanitizeHtml(optionTexts[month - 1]) || month;

    element.appendChild(option);
  }
};

module.exports = {
  ExpirationMonthInput: ExpirationMonthInput
};
