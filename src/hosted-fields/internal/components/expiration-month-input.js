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

    if (month < 10) {
      option.value = '0' + month; // we do this to allow autofill to work with selects
    } else {
      option.value = month;
    }

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

ExpirationMonthInput.prototype._applyPrefill = function () {
  if (this._prefill && this._prefill.length === 1) {
    this._prefill = '0' + this._prefill;
  }

  ExpirationSplitInput.prototype._applyPrefill.call(this);
};

module.exports = {
  ExpirationMonthInput: ExpirationMonthInput
};
