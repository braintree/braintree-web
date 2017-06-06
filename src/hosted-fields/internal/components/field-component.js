'use strict';

var InputComponents = require('./index');
var whitelistedFields = require('../../shared/constants').whitelistedFields;
var LabelComponent = require('./label').LabelComponent;

module.exports = {
  FieldComponent: function FieldComponent(options) {
    var type = options.type;
    var attribution = whitelistedFields[type];

    this.element = document.createDocumentFragment();

    this.label = new LabelComponent(attribution);
    this.element.appendChild(this.label.element);

    this.input = new InputComponents[type]({
      model: options.cardForm,
      type: type
    });
    this.element.appendChild(this.input.element);
  }
};
