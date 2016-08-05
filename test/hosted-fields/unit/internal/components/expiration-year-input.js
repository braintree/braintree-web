'use strict';

var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;

describe('Expiration Year Input', function () {
  beforeEach(function () {
    this.input = helpers.createInput('expirationYear');
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

    it('sets the maxLength to 4', function () {
      expect(this.input.element.getAttribute('maxlength')).to.equal('4');
    });
  });
});
