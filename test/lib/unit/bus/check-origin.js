'use strict';

var checkOrigin = require('../../../../src/lib/bus/check-origin').checkOrigin;

describe('origin-restriction', function () {
  describe('#check-origin', function () {
    describe('for braintree domains', function () {
      it('accepts a braintreepayments.com domain', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://braintreepayments.com', merchantOrigin);

        expect(actual).to.be.true;
      });

      it('accepts a multi-subdomain with numbers', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://sub.domain.666.braintreepayments.com', merchantOrigin);

        expect(actual).to.be.true;
      });

      it('accepts a braintreegateway.com domain', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://braintreegateway.com', merchantOrigin);

        expect(actual).to.be.true;
      });

      it('accepts a js.braintreegateway.com domain', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://js.braintreegateway.com', merchantOrigin);

        expect(actual).to.be.true;
      });

      it('accepts a paypal.com domain', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://paypal.com', merchantOrigin);

        expect(actual).to.be.true;
      });

      it('rejects an http domain', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('http://braintreegateway.com', merchantOrigin);

        expect(actual).to.be.false;
      });

      it('rejects a localhost domain', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://localhost', merchantOrigin);

        expect(actual).to.be.false;
      });

      it('rejects a bogus character sub-domain', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://sübdomain.braintreepayments.com.example.com', merchantOrigin);

        expect(actual).to.be.false;
      });

      it('rejects a braintreepayments.com.example.com domain', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://braintreepayments.com.example.com', merchantOrigin);

        expect(actual).to.be.false;
      });

      it('rejects a phishing domain maliciousbraintreepayments.com domain', function () {
        var merchantOrigin = 'https://example.com:3443';
        var actual = checkOrigin('https://maliciousbraintreepayments.com', merchantOrigin);

        expect(actual).to.be.false;
      });
    });

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
