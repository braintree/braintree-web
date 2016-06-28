'use strict';

var isWhitelistedDomain = require('../../../src/lib/is-whitelisted-domain');

describe('isWhitelistedDomain', function () {
  it('returns false if a non-braintree non-paypal domain is used', function () {
    expect(isWhitelistedDomain('https://google.com')).to.equal(false);
  });

  it('returns true if a localhost is used', function () {
    expect(isWhitelistedDomain('https://localhost:3099')).to.equal(true);
  });

  it('returns false if a relative path is used', function () {
    expect(isWhitelistedDomain('foobar/paypal/v1/payments/payment')).to.equal(false);
  });

  it('returns false if a invalid localhost domain is used', function () {
    expect(isWhitelistedDomain('https://myfake.localhost.com:3099')).to.equal(false);
  });

  it('returns true if a braintree or paypal domain with capital letters is used', function () {
    expect(isWhitelistedDomain('https://www.BraintreePayments.com')).to.equal(true);
  });

  it('returns true if a braintree is used', function () {
    expect(isWhitelistedDomain('https://www.braintreepayments.com')).to.equal(true);
  });

  it('returns true if a paypal is used', function () {
    expect(isWhitelistedDomain('https://www.paypal.com')).to.equal(true);
  });

  it('returns true if a braintree domain with a port is used', function () {
    expect(isWhitelistedDomain('https://www.braintreepayments.com:3000')).to.equal(true);
  });

  it('returns true if a braintree domain with multiple subdomains is used', function () {
    expect(isWhitelistedDomain('https://foo.bar.baz.braintreepayments.com')).to.equal(true);
  });

  it('returns false if a braintree domain over http is used', function () {
    expect(isWhitelistedDomain('http://www.braintreepayments.com:3000')).to.equal(false);
  });

  it('returns false if a non-braintree non-paypal domain is used with braintree in the path', function () {
    expect(isWhitelistedDomain('https://google.com/www.braintreepayments.com')).to.equal(false);
  });
});
