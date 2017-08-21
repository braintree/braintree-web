'use strict';

var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;

describe('CVV Input', function () {
  beforeEach(function () {
    this.input = helpers.createInput('cvv', ['number']);
  });

  describe('setup', function () {
    describe('inheritance', function () {
      it('extends BaseInput', function () {
        expect(this.input).to.be.an.instanceof(BaseInput);
      });
    });

    describe('element', function () {
      it('has type="tel"', function () {
        expect(this.input.element.getAttribute('type')).to.equal('tel');
      });

      it('sets the maxLength to 4 when no custom maxlength is provided', function () {
        expect(this.input.element.getAttribute('maxlength')).to.equal('4');
      });

      it('sets the maxLength to 4 if a custom maxlength is provided but is greater than 4', function () {
        var input;

        this.sandbox.stub(BaseInput.prototype, 'getConfiguration').returns({maxlength: 5});

        input = helpers.createInput('cvv', ['number']);

        expect(input.element.getAttribute('maxlength')).to.equal('4');
      });

      it('sets the maxLength to custom maxlength if one is provided and is less than 4', function () {
        var input;

        this.sandbox.stub(BaseInput.prototype, 'getConfiguration').returns({maxlength: 3});

        input = helpers.createInput('cvv', ['number']);

        expect(input.element.getAttribute('maxlength')).to.equal('3');
      });
    });
  });

  describe('setInputState', function () {
    beforeEach(function () {
      this.sandbox.stub(this.input.formatter, 'setPattern');
    });

    it('sets the maxlength on possibleCardTypes change', function () {
      this.input.model.set('possibleCardTypes', [{code: {size: 6}}]);

      expect(this.input.element.getAttribute('maxlength')).to.equal('6');
      expect(this.input.formatter.setPattern).to.be.calledWith('{{999999}}');

      this.input.model.set('possibleCardTypes', []);

      expect(this.input.element.getAttribute('maxlength')).to.equal('4');
      expect(this.input.formatter.setPattern).to.be.calledWith('{{9999}}');
    });

    it('does not set the maxlength on possibleCardTypes change if a custom maxlength is set', function () {
      var input;

      this.sandbox.stub(BaseInput.prototype, 'getConfiguration').returns({maxlength: 2});

      input = helpers.createInput('cvv', ['number']);

      this.sandbox.stub(input.formatter, 'setPattern');

      input.model.set('possibleCardTypes', [{code: {size: 6}}]);

      expect(input.element.getAttribute('maxlength')).to.equal('2');
      expect(input.formatter.setPattern).not.to.be.called;

      input.model.set('possibleCardTypes', []);

      expect(input.element.getAttribute('maxlength')).to.equal('2');
      expect(input.formatter.setPattern).not.to.be.called;
    });

    it('accounts for masked value if masking is being used', function () {
      var input = helpers.createInput('cvv', ['number']);

      this.sandbox.stub(input.formatter, 'setPattern');

      input.shouldMask = true;
      input.hiddenMaskedValue = '1234';
      input.element.value = input.maskValue(input.hiddenMaskedValue);
      input.model.set('possibleCardTypes', [{code: {size: 3}}]);

      expect(input.hiddenMaskedValue).to.equal('123');
      expect(input.element.value).to.equal('•••');
    });
  });
});
