'use strict';

var CreditCardForm = require('../../../../../src/hosted-fields/internal/models/credit-card-form').CreditCardForm;
var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;
var PostalCodeInput = require('../../../../../src/hosted-fields/internal/components/postal-code-input').PostalCodeInput;
var RestrictedInput = require('restricted-input');

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

    it('sets the maxLength to 10 when no custom maxlength is provided', function () {
      expect(this.input.element.getAttribute('maxlength')).to.equal('10');
    });

    it('sets the maxLength to 10 if a custom maxlength is provided but is greater than 10', function () {
      var input;

      this.sandbox.stub(BaseInput.prototype, 'getConfiguration').returns({maxlength: 11});

      input = helpers.createInput('postalCode');

      expect(input.element.getAttribute('maxlength')).to.equal('10');
    });

    it('sets the maxLength to custom maxlength if one is provided and is less than 10', function () {
      var input;

      this.sandbox.stub(BaseInput.prototype, 'getConfiguration').returns({maxlength: 5});

      input = helpers.createInput('postalCode');

      expect(input.element.getAttribute('maxlength')).to.equal('5');
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
  });

  describe('formatter', function () {
    it('sets the pattern to a 10-character pattern with default maxLength', function () {
      this.sandbox.spy(RestrictedInput.prototype, 'setPattern');

      helpers.createInput('postalCode');

      expect(RestrictedInput.prototype.setPattern).to.be.calledWith('{{**********}}');
    });

    it('sets the pattern to custom maxLength when provided', function () {
      this.sandbox.spy(RestrictedInput.prototype, 'setPattern');
      this.sandbox.stub(BaseInput.prototype, 'getConfiguration').returns({maxlength: 5});

      helpers.createInput('postalCode');

      expect(RestrictedInput.prototype.setPattern).to.be.calledWith('{{*****}}');
    });
  });
});
