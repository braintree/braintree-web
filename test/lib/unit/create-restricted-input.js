'use strict';

var createRestrictedInput = require('../../../src/lib/create-restricted-input');
var RestrictedInput = require('restricted-input');
var FakeRestrictedInput = require('../../../src/lib/fake-restricted-input');

describe('createRestrictedInput', function () {
  beforeEach(function () {
    this.element = document.createElement('input');
  });

  describe('with formatting', function () {
    it('returns a RestrictedInput', function () {
      expect(createRestrictedInput({
        shouldFormat: true,
        element: this.element,
        pattern: ' '
      })).to.be.an.instanceOf(RestrictedInput);
    });

    it('has the "inputElement" property on the result', function () {
      expect(createRestrictedInput({
        shouldFormat: true,
        element: this.element,
        pattern: ' '
      }).inputElement).to.equal(this.element);
    });
  });

  describe('without formatting', function () {
    it('returns a FakeRestrictedInput', function () {
      expect(createRestrictedInput({
        shouldFormat: false,
        element: this.element,
        pattern: ' '
      })).to.be.an.instanceOf(FakeRestrictedInput);
    });

    it('has the "inputElement" property on the result', function () {
      expect(createRestrictedInput({
        shouldFormat: false,
        element: this.element,
        pattern: ' '
      }).inputElement).to.equal(this.element);
    });
  });
});
