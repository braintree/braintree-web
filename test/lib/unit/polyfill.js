'use strict';

var atob = require('../../../src/lib/polyfill')._atob;

describe('Polyfill', function () {
  describe('atob', function () {
    it('decodes a base64 encoded string', function () {
      var base64Encoded = btoa('hello world');
      var decoded = atob(base64Encoded);

      expect(decoded).to.equal('hello world');
    });

    it('raises an exception if the string is not base64 encoded', function () {
      var error = /Non base64 encoded input passed to window.atob polyfill/;

      expect(function () {
        atob('not-base64-encoded');
      }).to.throw(error);
    });
  });
});
