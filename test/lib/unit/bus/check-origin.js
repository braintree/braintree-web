'use strict';

const { checkOrigin } = require('../../../../src/lib/bus/check-origin');

describe('origin-restriction', () => {
  describe('#check-origin', () => {
    describe('for merchant domains', () => {
      it('accepts if it equals a passed merchant origin', () => {
        const merchantOrigin = 'https://example.com:3443';
        const actual = checkOrigin('https://example.com:3443', merchantOrigin);

        expect(actual).toBe(true);
      });

      it('rejects if it doesn\'t quite equal a passed merchant origin', () => {
        const merchantOrigin = 'https://example.com:3000';
        const actual = checkOrigin('https://example.com:3443', merchantOrigin);

        expect(actual).toBe(false);
      });
    });
  });
});
