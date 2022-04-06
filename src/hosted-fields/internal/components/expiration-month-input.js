"use strict";

var ExpirationSplitInput =
  require("./expiration-split-input").ExpirationSplitInput;
var sanitizeHtml = require("../../../lib/sanitize-html");
var events = require("../../shared/constants").events;

var PATTERN = "{{99}}";
var NUMBER_OF_MONTHS = 12;

function ExpirationMonthInput() {
  this.maxLength = 2;

  ExpirationSplitInput.apply(this, arguments);
  this.formatter.setPattern(PATTERN);
}

ExpirationMonthInput.prototype = Object.create(ExpirationSplitInput.prototype);
ExpirationMonthInput.prototype.constructor = ExpirationMonthInput;

ExpirationMonthInput.prototype.constructSelectOptions = function (element) {
  var option, month;
  var currentMonth = parseInt(this.model.get("expirationMonth.value"), 10);
  var optionTexts = this.getConfiguration().select.options || [];

  for (month = 1; month <= NUMBER_OF_MONTHS; month++) {
    option = document.createElement("option");

    if (month < 10) {
      option.value = "0" + month; // we do this to allow autofill to work with selects
    } else {
      option.value = month;
    }

    option.innerHTML = sanitizeHtml(optionTexts[month - 1]) || month;

    if (month === currentMonth) {
      option.setAttribute("selected", "selected");
    }

    element.appendChild(option);
  }

  if (currentMonth) {
    element.selectedIndex = currentMonth - 1;
  }
};

ExpirationMonthInput.prototype.addBusEventListeners = function () {
  ExpirationSplitInput.prototype.addBusEventListeners.call(this);

  if (this.getConfiguration().select) {
    window.bus.on(
      events.SET_MONTH_OPTIONS,
      this._updateMonthOptions.bind(this)
    );
  }
};

ExpirationMonthInput.prototype._applyPrefill = function () {
  if (this._prefill && this._prefill.length === 1) {
    this._prefill = "0" + this._prefill;
  }

  ExpirationSplitInput.prototype._applyPrefill.call(this);
};

ExpirationMonthInput.prototype._updateMonthOptions = function (
  options,
  callback
) {
  var i, nodeIndex;
  var optionNodes = this.element.querySelectorAll("option");

  for (i = 0; i < NUMBER_OF_MONTHS; i++) {
    if (this._hasPlacecholder) {
      nodeIndex = i + 1;
    } else {
      nodeIndex = i;
    }

    optionNodes[nodeIndex].innerText =
      sanitizeHtml(options[i]) || optionNodes[nodeIndex].innerText;
  }

  callback();
};

module.exports = {
  ExpirationMonthInput: ExpirationMonthInput,
};
