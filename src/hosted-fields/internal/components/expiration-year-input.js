"use strict";

var ExpirationSplitInput =
  require("./expiration-split-input").ExpirationSplitInput;
var constants = require("../../shared/constants");

var PATTERN = "{{9999}}";

function ExpirationYearInput() {
  this.maxLength = 4;

  ExpirationSplitInput.apply(this, arguments);
  this.formatter.setPattern(PATTERN);
}

ExpirationYearInput.prototype = Object.create(ExpirationSplitInput.prototype);
ExpirationYearInput.prototype.constructor = ExpirationYearInput;

ExpirationYearInput.prototype.constructSelectOptions = function (element) {
  var option, year;
  var thisYear = new Date().getFullYear();

  for (
    year = thisYear;
    year <= thisYear + constants.maxExpirationYearAge;
    year++
  ) {
    option = document.createElement("option");

    option.value = year;
    option.innerHTML = year;

    if (year.toString() === this.model.get("expirationYear.value")) {
      option.setAttribute("selected", "selected");
    }

    element.appendChild(option);
  }

  element.selectedIndex = 0;
};

module.exports = {
  ExpirationYearInput: ExpirationYearInput,
};
