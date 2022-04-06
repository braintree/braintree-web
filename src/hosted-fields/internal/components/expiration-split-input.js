"use strict";

var BaseInput = require("./base-input").BaseInput;
var constants = require("../../shared/constants");
var allowedFields = constants.allowedFields;
var sanitizeHtml = require("../../../lib/sanitize-html");

function ExpirationSplitInput() {
  BaseInput.apply(this, arguments);
}

ExpirationSplitInput.prototype = Object.create(BaseInput.prototype);
ExpirationSplitInput.prototype.constructor = ExpirationSplitInput;

ExpirationSplitInput.prototype.constructElement = function () {
  var firstOption, element, field, attributes;
  var type = this.type;
  var configuration = this.getConfiguration();

  if (!configuration.select) {
    return BaseInput.prototype.constructElement.apply(this, arguments);
  }

  element = document.createElement("select");
  field = allowedFields[type];

  attributes = {
    class: type,
    "data-braintree-name": type,
    name: field.name,
    id: field.name,
  };
  Object.keys(attributes).forEach(function (attr) {
    element.setAttribute(attr, attributes[attr]);
  });

  if (configuration.placeholder != null) {
    firstOption = this.createPlaceholderOption(configuration.placeholder);
    element.appendChild(firstOption);
  }

  this.constructSelectOptions(element);

  return element;
};

ExpirationSplitInput.prototype.createPlaceholderOption = function (
  placeholder
) {
  var firstOption = document.createElement("option");

  this._hasPlacecholder = true;

  firstOption.value = "";
  firstOption.innerHTML = sanitizeHtml(placeholder);
  firstOption.setAttribute("selected", "selected");
  firstOption.setAttribute("disabled", "disabled");

  return firstOption;
};

ExpirationSplitInput.prototype.setPlaceholder = function (type, placeholder) {
  var configuration, firstOption;

  if (type !== this.type) {
    return;
  }

  configuration = this.getConfiguration();

  if (!configuration.select) {
    BaseInput.prototype.setPlaceholder.apply(this, arguments);

    return;
  }

  if (this.element.firstChild.value === "") {
    this.element.firstChild.innerHTML = sanitizeHtml(placeholder);
  } else {
    firstOption = this.createPlaceholderOption(placeholder);
    this.element.insertBefore(firstOption, this.element.firstChild);
  }
};

ExpirationSplitInput.prototype._getDOMChangeEvent = function () {
  if (this.getConfiguration().select) {
    return "change";
  }

  return BaseInput.prototype._getDOMChangeEvent.call(this);
};

module.exports = {
  ExpirationSplitInput: ExpirationSplitInput,
};
