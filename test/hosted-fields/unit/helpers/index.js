'use strict';

var InputComponents = require('../../../../src/hosted-fields/internal/components');
var CreditCardForm = require('../../../../src/hosted-fields/internal/models/credit-card-form').CreditCardForm;

module.exports = {
  getModelConfig: function (fieldKey, initial) {
    var config = {
      fields: {}
    };

    initial = initial || [];

    initial.concat(fieldKey || 'cvv').forEach(function (fieldKey2) {
      var container = document.createElement('div');

      container.id = fieldKey2;
      document.body.appendChild(container);
      config.fields[fieldKey2] = {selector: '#' + fieldKey2};
    });

    if (!fieldKey) { fieldKey = 'cvv'; }
    config.fields[fieldKey] = {selector: 'body'};

    return config;
  },

  createInput: function (fieldKey, initial) {
    return new InputComponents[fieldKey]({
      type: fieldKey,
      model: new CreditCardForm(this.getModelConfig(fieldKey, initial))
    });
  }
};
