'use strict';

var constants = require('../../shared/constants');
var classlist = require('../../../lib/classlist');
var isIe9 = require('../../../lib/is-ie9');
var createRestrictedInput = require('../../../lib/create-restricted-input');
var events = constants.events;
var whitelistedFields = constants.whitelistedFields;
var ENTER_KEY_CODE = 13;

function BaseInput(options) {
  this.model = options.model;
  this.type = options.type;

  this.element = this.constructElement();

  this.formatter = createRestrictedInput({
    shouldFormat: this.getConfiguration().formatInput !== false,
    element: this.element,
    pattern: ' '
  });

  this.addDOMEventListeners();
  this.addModelEventListeners();
  this.addBusEventListeners();
  this.render();
}

BaseInput.prototype.getConfiguration = function () {
  return this.model.configuration.fields[this.type];
};

BaseInput.prototype.updateModel = function (key, value) {
  this.model.set(this.type + '.' + key, value);
};

BaseInput.prototype.modelOnChange = function (property, callback) {
  var eventPrefix = 'change:' + this.type;
  var self = this;

  this.model.on(eventPrefix + '.' + property, function () {
    callback.apply(self, arguments);
  });
};

BaseInput.prototype.constructElement = function () {
  var type = this.type;

  var element = document.createElement('input');

  var placeholder = this.getConfiguration().placeholder;
  var name = whitelistedFields[type] ? whitelistedFields[type].name : null;

  var attributes = {
    type: 'tel',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'none',
    spellcheck: 'false',
    'class': type,
    'data-braintree-name': type,
    name: name,
    id: name
  };

  if (this.maxLength) {
    attributes.maxlength = this.maxLength;
  }

  if (placeholder) {
    attributes.placeholder = placeholder;
  }

  Object.keys(attributes).forEach(function (attr) {
    element.setAttribute(attr, attributes[attr]);
  });

  return element;
};

BaseInput.prototype.addDOMEventListeners = function () {
  this._addDOMFocusListeners();
  this._addDOMInputListeners();
  this._addDOMKeypressListeners();
};

BaseInput.prototype._addDOMKeypressListeners = function () {
  this.element.addEventListener('keypress', function (event) {
    if (event.keyCode === ENTER_KEY_CODE) {
      this.model.emitEvent(this.type, 'inputSubmitRequest');
    }
  }.bind(this), false);
};

BaseInput.prototype._addDOMInputListeners = function () {
  var eventName = isIe9() ? 'keyup' : 'input';

  this.element.addEventListener(eventName, function () {
    this.updateModel('value', this.formatter.getUnformattedValue());
  }.bind(this), false);
};

BaseInput.prototype._addDOMFocusListeners = function () {
  var element = this.element;

  if ('onfocusin' in document) {
    document.documentElement.addEventListener('focusin', function (event) {
      if (event.fromElement === element) { return; }
      if (event.relatedTarget) { return; }

      element.focus();
    }, false);
  } else {
    document.addEventListener('focus', function () {
      element.focus();
    }, false);
  }

  element.addEventListener('focus', function () {
    this.updateModel('isFocused', true);
  }.bind(this), false);

  element.addEventListener('blur', function () {
    this.updateModel('isFocused', false);
  }.bind(this), false);

  element.addEventListener('touchstart', function () {
    element.select();
  });
};

BaseInput.prototype.addModelEventListeners = function () {
  this.modelOnChange('isValid', this.render);
  this.modelOnChange('isPotentiallyValid', this.render);
};

BaseInput.prototype.addBusEventListeners = function () {
  global.bus.on(events.TRIGGER_INPUT_FOCUS, function (type) {
    if (type === this.type) { this.element.focus(); }
  }.bind(this));

  global.bus.on(events.SET_PLACEHOLDER, function (type, placeholder) {
    if (type === this.type) { this.element.setAttribute('placeholder', placeholder); }
  }.bind(this));

  global.bus.on(events.ADD_CLASS, function (type, classname) {
    if (type === this.type) { classlist.add(this.element, classname); }
  }.bind(this));

  global.bus.on(events.REMOVE_CLASS, function (type, classname) {
    if (type === this.type) { classlist.remove(this.element, classname); }
  }.bind(this));

  global.bus.on(events.CLEAR_FIELD, function (type) {
    if (type === this.type) {
      this.element.value = '';
      this.updateModel('value', '');
    }
  }.bind(this));
};

BaseInput.prototype.render = function () {
  var modelData = this.model.get(this.type);
  var isValid = modelData.isValid;
  var isPotentiallyValid = modelData.isPotentiallyValid;

  classlist.toggle(this.element, 'valid', isValid);
  classlist.toggle(this.element, 'invalid', !isPotentiallyValid);

  if (this.maxLength) {
    this.element.setAttribute('maxlength', this.maxLength);
  }
};

module.exports = {
  BaseInput: BaseInput
};
