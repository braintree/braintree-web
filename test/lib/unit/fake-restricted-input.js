'use strict';

var FakeRestrictedInput = require('../../../src/lib/fake-restricted-input');

describe('FakeRestrictedInput', function () {
  beforeEach(function () {
    this.element = {value: ''};
    this.formatter = new FakeRestrictedInput({element: this.element});
  });

  it('has a method called "setPattern"', function () {
    expect(this.formatter.setPattern).to.be.a('function');
  });

  it('returns the element value when calling getUnformattedValue', function () {
    expect(this.formatter.getUnformattedValue()).to.equal('');

    this.element.value = 'memes';
    expect(this.formatter.getUnformattedValue()).to.equal('memes');
  });
});
