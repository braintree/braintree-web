'use strict';

var InputComponents = require('./index');
var constants = require('../../shared/constants');
var LabelComponent = require('./label').LabelComponent;
var classList = require('@braintree/class-list');
var focusIntercept = require('../../shared/focus-intercept');
var events = constants.events;
var allowedFields = constants.allowedFields;
var directions = constants.navigationDirections;

module.exports = {
  FieldComponent: function FieldComponent(options) {
    var type = options.type;
    var attribution = allowedFields[type];

    this.element = document.createDocumentFragment();

    this.element.appendChild(focusIntercept.generate(type, directions.BACK, function () {
      window.bus.emit(events.TRIGGER_FOCUS_CHANGE, {
        field: type,
        direction: directions.BACK
      });
    }));

    this.label = new LabelComponent(attribution);
    this.element.appendChild(this.label.element);

    this.input = new InputComponents[type]({
      model: options.cardForm,
      type: type
    });
    this.input.element.setAttribute('aria-describedby', 'field-description-' + type);
    this.element.appendChild(this.input.element);
    this.element.appendChild(focusIntercept.generate(type, directions.FORWARD, function () {
      window.bus.emit(events.TRIGGER_FOCUS_CHANGE, {
        field: type,
        direction: directions.FORWARD
      });
    }));

    this.description = document.createElement('div');
    this.description.id = 'field-description-' + type;
    classList.add(this.description, 'field-description');
    this.description.style.height = '1px';
    this.description.style.width = '1px';
    this.description.style.overflow = 'hidden';

    this.element.appendChild(this.description);

    window.bus.on(events.SET_MESSAGE, function (data) {
      if (data.field === type) {
        this.description.textContent = data.message;
      }
    }.bind(this));
  }
};
