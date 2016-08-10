'use strict';

var EventedModel = require('./evented-model');
var getCardTypes = require('credit-card-type');
var validator = require('card-validator');
var comparePossibleCardTypes = require('../compare-possible-card-types');
var constants = require('../../shared/constants');
var events = constants.events;
var externalEvents = constants.externalEvents;
var whitelistedFields = constants.whitelistedFields;

function CreditCardForm(configuration) {
  this._fieldKeys = Object.keys(configuration.fields).filter(function (key) {
    return whitelistedFields.hasOwnProperty(key);
  });

  EventedModel.apply(this, arguments);

  this.configuration = configuration;

  this._fieldKeys.forEach(function (field) {
    var onFieldChange = onFieldStateChange(this, field);

    this.on('change:' + field + '.value', onFieldValueChange(this, field));
    this.on('change:' + field + '.isFocused', onFieldFocusChange(this, field));
    this.on('change:' + field + '.isEmpty', onEmptyChange(this, field));

    this.on('change:' + field + '.isValid', onFieldChange);
    this.on('change:' + field + '.isPotentiallyValid', onFieldChange);
  }.bind(this));

  this.on('change:number.value', this._onNumberChange);
  this.on('change:possibleCardTypes', function () { this._validateField('cvv'); }.bind(this));
  this.on('change:possibleCardTypes', onCardTypeChange(this, 'number'));
}

CreditCardForm.prototype = Object.create(EventedModel.prototype);
CreditCardForm.prototype.constructor = CreditCardForm;

CreditCardForm.prototype.resetAttributes = function () {
  return this._fieldKeys.reduce(function (result, field) {
    result[field] = {
      value: '',
      isFocused: false,
      isValid: false,
      isPotentiallyValid: true,
      isEmpty: true
    };
    return result;
  }, {possibleCardTypes: getCardTypes('')});
};

CreditCardForm.prototype.emitEvent = function (fieldKey, eventType) {
  var cards;
  var possibleCardTypes = this.get('possibleCardTypes');
  var fields = this._fieldKeys.reduce(function (result, key) {
    var fieldData = this.get(key);

    result[key] = {
      isEmpty: fieldData.isEmpty,
      isValid: fieldData.isValid,
      isPotentiallyValid: fieldData.isPotentiallyValid,
      isFocused: fieldData.isFocused
    };
    return result;
  }.bind(this), {});

  cards = possibleCardTypes.map(function (cardType) {
    return {
      niceType: cardType.niceType,
      type: cardType.type,
      code: cardType.code
    };
  });

  global.bus.emit(events.INPUT_EVENT, {
    merchantPayload: {
      cards: cards,
      emittedBy: fieldKey,
      fields: fields
    },
    type: eventType
  });
};

CreditCardForm.prototype._onSplitDateChange = function () {
  var validationResult;

  var month = this.get('expirationMonth.value');
  var year = this.get('expirationYear.value');

  var monthValidation = validator.expirationMonth(month);
  var yearValidation = validator.expirationYear(year);

  if (monthValidation.isValid && yearValidation.isValid) {
    validationResult = validator.expirationDate(month + year);

    this.set('expirationMonth.isValid', validationResult.isValid);
    this.set('expirationMonth.isPotentiallyValid', validationResult.isPotentiallyValid);
    this.set('expirationYear.isValid', validationResult.isValid);
    this.set('expirationYear.isPotentiallyValid', validationResult.isPotentiallyValid);
  } else {
    this.set('expirationMonth.isValid', monthValidation.isValid);
    this.set('expirationMonth.isPotentiallyValid', monthValidation.isPotentiallyValid);
    this.set('expirationYear.isValid', yearValidation.isValid);
    this.set('expirationYear.isPotentiallyValid', yearValidation.isPotentiallyValid);
  }
};

CreditCardForm.prototype._onNumberChange = function (number) {
  var newPossibleCardTypes = getCardTypes(number.replace(/[-\s]/g, ''));
  var oldPossibleCardTypes = this.get('possibleCardTypes');

  if (!comparePossibleCardTypes(newPossibleCardTypes, oldPossibleCardTypes)) {
    this.set('possibleCardTypes', newPossibleCardTypes);
  }
};

CreditCardForm.prototype._validateField = function (fieldKey) {
  var validationResult;
  var value = this.get(fieldKey + '.value');
  var validate = validator[fieldKey];

  if (fieldKey === 'cvv') {
    validationResult = this._validateCvv(value);
  } else if (fieldKey === 'expirationDate') {
    validationResult = validate(splitDate(value));
  } else {
    validationResult = validate(value);
  }

  if (fieldKey === 'expirationMonth' || fieldKey === 'expirationYear') {
    this._onSplitDateChange();
  } else {
    this.set(fieldKey + '.isValid', validationResult.isValid);
    this.set(fieldKey + '.isPotentiallyValid', validationResult.isPotentiallyValid);
  }
};

CreditCardForm.prototype._validateCvv = function (value) {
  var cvvSize;

  if (this._fieldKeys.indexOf('number') === -1) { // CVV only
    return validator.cvv(value, [3, 4]);
  }

  cvvSize = this.get('possibleCardTypes').reduce(function (accum, type) {
    return Math.max(type.code.size, accum);
  }, 3);

  return validator.cvv(value, cvvSize);
};

CreditCardForm.prototype.getCardData = function () {
  var expirationData;
  var result = {};
  var keys = [];

  if (this._fieldKeys.indexOf('number') !== -1) {
    keys.push('number');
  }

  if (this._fieldKeys.indexOf('cvv') !== -1) {
    keys.push('cvv');
  }

  if (this._fieldKeys.indexOf('postalCode') !== -1) {
    keys.push('postalCode');
  }

  if (this._fieldKeys.indexOf('expirationMonth') !== -1) {
    keys.push('expirationMonth');
  }

  if (this._fieldKeys.indexOf('expirationYear') !== -1) {
    keys.push('expirationYear');
  }

  if (this._fieldKeys.indexOf('expirationDate') !== -1) {
    expirationData = splitDate(this.get('expirationDate.value'));

    result.expirationMonth = expirationData.month;
    result.expirationYear = expirationData.year;
  }

  keys.reduce(function (reducedResult, name) {
    reducedResult[name] = this.get(name + '.value');
    return reducedResult;
  }.bind(this), result);

  return result;
};

CreditCardForm.prototype.isEmpty = function () {
  return this._fieldKeys.every(function (key) {
    return this.get(key).value.length === 0;
  }.bind(this));
};

CreditCardForm.prototype.invalidFieldKeys = function () {
  return this._fieldKeys.filter(function (key) {
    return !this.get(key).isValid;
  }.bind(this));
};

function onFieldValueChange(form, fieldKey) {
  return function () {
    form.set(fieldKey + '.isEmpty', form.get(fieldKey + '.value') === '');
    form._validateField(fieldKey);
  };
}

function onFieldFocusChange(form, field) {
  return function (isFocused) {
    form._fieldKeys.forEach(function (key) {
      if (key === field) { return; }
      form.set(key + '.isFocused', false);
    });

    form.emitEvent(field, isFocused ? externalEvents.FOCUS : externalEvents.BLUR);
  };
}

function onCardTypeChange(form, field) {
  return function () {
    form.emitEvent(field, externalEvents.CARD_TYPE_CHANGE);
  };
}

function onEmptyChange(form, field) {
  return function () {
    var event = form.get(field + '.isEmpty') ? externalEvents.EMPTY : externalEvents.NOT_EMPTY;

    form.emitEvent(field, event);
  };
}

function onFieldStateChange(form, field) {
  return function () {
    form.emitEvent(field, externalEvents.VALIDITY_CHANGE);
  };
}

function splitDate(date) {
  var month, year;
  var leadingDigit = date.charAt(0);

  if (date.length === 0) {
    month = year = '';
  } else if (leadingDigit === '0' || leadingDigit === '1') {
    month = date.slice(0, 2);
    year = date.slice(2);
  } else {
    month = '0' + leadingDigit;
    year = date.slice(1);
  }

  return {month: month, year: year};
}

module.exports = {
  CreditCardForm: CreditCardForm
};
