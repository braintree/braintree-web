'use strict';

var InputComponents = require('./index');
var whitelistedFields = require('../../shared/constants').whitelistedFields;
var LabelComponent = require('./label').LabelComponent;

module.exports = {
  FieldComponent: function FieldComponent(options) {
    var type = options.type;
    var attribution = whitelistedFields[type];

    this.element = document.createDocumentFragment();
    this.element.appendChild(new LabelComponent(attribution).element);

    this.element.appendChild(new InputComponents[type]({
      model: options.cardForm,
      type: type
    }).element);
  }
};
