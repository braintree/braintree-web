'use strict';

var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;

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
