'use strict';

var InputComponents = require('./index');
var allowedFields = require('../../shared/constants').allowedFields;
var LabelComponent = require('./label').LabelComponent;
var events = require('../../shared/constants').events;
var classList = require('@braintree/class-list');

module.exports = {
  FieldComponent: function FieldComponent(options) {
    var type = options.type;
    var attribution = allowedFields[type];

    this.element = document.createDocumentFragment();

    this.label = new LabelComponent(attribution);
    this.element.appendChild(this.label.element);

    this.input = new InputComponents[type]({
      model: options.cardForm,
      type: type
    });
    this.input.element.setAttribute('aria-describedby', 'field-description-' + type);
    this.element.appendChild(this.input.element);

    this.description = document.createElement('div');
    this.description.id = 'field-description-' + type;
    classList.add(this.description, 'field-description');
    this.description.style.height = '1px';
    this.description.style.width = '1px';
    this.description.style.overflow = 'hidden';

    this.element.appendChild(this.description);

    global.bus.on(events.SET_MESSAGE, function (field, message) {
      if (field === type) {
        this.description.textContent = message;
      }
    }.bind(this));
  }
};
