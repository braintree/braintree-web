'use strict';

var createRestrictedInput = require('../../../src/lib/create-restricted-input');
var RestrictedInput = require('restricted-input');
var FakeRestrictedInput = require('../../../src/lib/fake-restricted-input');
var browserDetection = require('../../../src/lib/browser-detection');

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
      })).to.be.an.instanceof(RestrictedInput);
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
      })).to.be.an.instanceof(FakeRestrictedInput);
    });

    it('has the "inputElement" property on the result', function () {
      expect(createRestrictedInput({
        shouldFormat: false,
        element: this.element,
        pattern: ' '
      }).inputElement).to.equal(this.element);
    });
  });

  describe('Android Firefox', function () {
    it('returns a FakeRestrictedInput even if shouldFormat is true', function () {
      this.sandbox.stub(browserDetection, 'isAndroidFirefox').returns(true);

      expect(createRestrictedInput({
        shouldFormat: true,
        element: this.element,
        pattern: ' '
      })).to.be.an.instanceOf(FakeRestrictedInput);
    });
  });
});
