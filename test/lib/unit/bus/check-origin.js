'use strict';

var checkOrigin = require('../../../../src/lib/bus/check-origin').checkOrigin;

describe('origin-restriction', function () {
  describe('#check-origin', function () {
    describe('for merchant domains', function () {
      it('accepts if it equals a passed merchant origin', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://example.com:3443', merchantOrigin);

        expect(actual).to.be.true;
      });
      it('rejects if it doesn\'t quite equal a passed merchant origin', function () {
        var merchantOrigin = 'https://example.com:3000';
        var actual = checkOrigin('https://example.com:3443', merchantOrigin);

        expect(actual).to.be.false;
      });
    });
  });
});
