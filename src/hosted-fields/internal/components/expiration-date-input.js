"use strict";

var BaseInput = require("./base-input").BaseInput;
var RestrictedInput = require("restricted-input");

var DEFAULT_PATTERN = "{{99}} / {{9999}}";
var ZERO_PADDED_PATTERN = "0{{9}} / {{9999}}";

function ExpirationDateInput() {
  this.maxLength = 9;

  BaseInput.apply(this, arguments);

  if (!RestrictedInput.supportsFormatting()) {
    // browsers that can't support formatting
    // should not bring up the number keyboard
    // for entering expiration date, because
    // it does not allow them to enter a `/`
    this.element.setAttribute("type", "text");
  }

  this.formatter.setPattern(DEFAULT_PATTERN);

  this.element.addEventListener(
    "keyup",
    function (event) {
      if (this.element.value === "1" && event.key === "/") {
        this.element.value = "01 / ";
        this.model.set("expirationDate.value", "01");
      }
    }.bind(this),
    false
  );

  this.model.on(
    "change:expirationDate.value",
    function (date) {
      if (date.length === 0 || date[0] === "0" || date[0] === "1") {
        this.formatter.setPattern(DEFAULT_PATTERN);
      } else {
        this.formatter.setPattern(ZERO_PADDED_PATTERN);
      }
    }.bind(this)
  );
}

ExpirationDateInput.prototype = Object.create(BaseInput.prototype);
ExpirationDateInput.prototype.constructor = ExpirationDateInput;

ExpirationDateInput.prototype.getUnformattedValue = function () {
  var date, month, year;
  var value = this.formatter.getUnformattedValue();

  if (this.element.type === "month") {
    date = value.split("-");
    month = date[1] || "";
    year = date[0] || "";
    value = month + year;
  }

  return value;
};

module.exports = {
  ExpirationDateInput: ExpirationDateInput,
};
