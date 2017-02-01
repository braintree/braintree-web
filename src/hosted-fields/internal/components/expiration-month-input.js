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
  var currentMonth = parseInt(this.model.get('expirationMonth.value'), 10);
  var optionTexts = this.getConfiguration().select.options || [];

  for (month = 1; month <= 12; month++) {
    option = document.createElement('option');

    option.value = month;
    option.innerHTML = sanitizeHtml(optionTexts[month - 1]) || month;

    if (month === currentMonth) {
      option.setAttribute('selected', 'selected');
    }

    element.appendChild(option);
  }

  if (currentMonth) {
    element.selectedIndex = currentMonth - 1;
  }
};

module.exports = {
  ExpirationMonthInput: ExpirationMonthInput
};
