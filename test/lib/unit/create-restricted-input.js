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
      })).to.be.an.instanceof(RestrictedInput);
    });

    it('returns a RestrictedInput for type that supports selections', function () {
      this.element.type = 'tel';

      expect(createRestrictedInput({
        shouldFormat: true,
        element: this.element,
        pattern: ' '
      })).to.be.an.instanceof(RestrictedInput);

      this.element.type = 'url';

      expect(createRestrictedInput({
        shouldFormat: true,
        element: this.element,
        pattern: ' '
      })).to.be.an.instanceof(RestrictedInput);

      this.element.type = 'password';

      expect(createRestrictedInput({
        shouldFormat: true,
        element: this.element,
        pattern: ' '
      })).to.be.an.instanceof(RestrictedInput);
    });

    it('returns a FakeRestrictedInput for type that does not support selections', function () {
      expect(createRestrictedInput({
        shouldFormat: true,
        element: {type: 'date'},
        pattern: ' '
      })).to.be.an.instanceof(FakeRestrictedInput);

      expect(createRestrictedInput({
        shouldFormat: true,
        element: {type: 'month'},
        pattern: ' '
      })).to.be.an.instanceof(FakeRestrictedInput);
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
  });
});
