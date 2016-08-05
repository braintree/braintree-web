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

      it('sets the maxLength to 4', function () {
        expect(this.input.element.getAttribute('maxlength')).to.equal('4');
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
      expect(this.input.formatter.setPattern).to.have.been.calledWith('{{999999}}');

      this.input.model.set('possibleCardTypes', []);

      expect(this.input.element.getAttribute('maxlength')).to.equal('4');
      expect(this.input.formatter.setPattern).to.have.been.calledWith('{{9999}}');
    });
  });
});
