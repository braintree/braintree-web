'use strict';

var CreditCardForm = require('../../../../../src/hosted-fields/internal/models/credit-card-form').CreditCardForm;
var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;
var PostalCodeInput = require('../../../../../src/hosted-fields/internal/components/postal-code-input').PostalCodeInput;

describe('Postal Code Input', function () {
  beforeEach(function () {
    this.input = helpers.createInput('postalCode');
  });

  describe('inheritance', function () {
    it('extends BaseInput', function () {
      expect(this.input).to.be.an.instanceof(BaseInput);
    });
  });

  describe('element', function () {
    it('has type="text"', function () {
      expect(this.input.element.getAttribute('type')).to.equal('text');
    });

    it('handles a specific type being set', function () {
      var config = helpers.getModelConfig('postalCode');

      config.fields.postalCode = {type: 'tel'};

      this.input = new PostalCodeInput({
        model: new CreditCardForm(config),
        type: 'postalCode'
      });
      expect(this.input.element.getAttribute('type')).to.equal('tel');
    });

    it('sets the maxLength to 10', function () {
      expect(this.input.element.getAttribute('maxlength')).to.equal('10');
    });
  });

  describe('formatter', function () {
    it('sets the pattern to a 10-character pattern', function () {
      expect(this.input.formatter.pattern).to.equal('{{**********}}');
    });
  });
});
