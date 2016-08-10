'use strict';

var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;

describe('Credit Card Input', function () {
  beforeEach(function () {
    this.input = helpers.createInput('number');
  });

  describe('inheritance', function () {
    it('extends BaseInput', function () {
      expect(this.input).to.be.an.instanceof(BaseInput);
    });
  });

  describe('element', function () {
    it('has type="tel"', function () {
      expect(this.input.element.getAttribute('type')).to.equal('tel');
    });
  });

  describe('maxlength', function () {
    it('has a default maxlength of 19', function () {
      expect(this.input.element.getAttribute('maxlength')).to.equal('22');
    });

    it('should update maxlength based on number', function () {
      this.input.element.value = '4111';
      this.input.model.set('number.value', '4111');
      expect(this.input.element.getAttribute('maxlength')).to.equal('19');

      this.input.element.value = '';
      this.input.model.set('number.value', '');
      expect(this.input.element.getAttribute('maxlength')).to.equal('22');

      this.input.element.value = '3782';
      this.input.model.set('number.value', '3782');
      expect(this.input.element.getAttribute('maxlength')).to.equal('17');

      // Maestro - multiple lengths allowed, max is 19
      this.input.element.value = '5063';
      this.input.model.set('number.value', '5063');
      expect(this.input.element.getAttribute('maxlength')).to.equal('22');

      this.input.element.value = '6304000000000000';
      this.input.model.set('number.value', '6304000000000000');
      expect(this.input.element.getAttribute('maxlength')).to.equal('22');

      this.input.element.value = '63040 0000 0000 000';
      this.input.model.set('number.value', '63040 0000 0000 000');
      expect(this.input.element.getAttribute('maxlength')).to.equal('22');

      this.input.element.value = '411';
      this.input.model.set('number.value', '411');
      expect(this.input.element.getAttribute('maxlength')).to.equal('19');

      this.input.element.value = '6282001509099283';
      this.input.model.set('number.value', '6282001509099283');
      expect(this.input.element.getAttribute('maxlength')).to.equal('22');

      this.input.element.value = '6011 1111 1111 1117';
      this.input.model.set('number.value', '6011111111111117');
      expect(this.input.element.getAttribute('maxlength')).to.equal('22');

      this.input.model.set('number.value', '5555 5555 5555 4444');
      this.input.model.set('number.value', '5555555555554444');
      expect(this.input.element.getAttribute('maxlength')).to.equal('19');
    });
  });
});
