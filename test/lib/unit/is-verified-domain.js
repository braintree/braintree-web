'use strict';

var isVerifiedDomain = require('../../../src/lib/is-verified-domain');

describe('isVerifiedDomain', function () {
  it('returns false if a non-braintree non-paypal domain is used', function () {
    expect(isVerifiedDomain('https://google.com')).to.equal(false);
  });

  it('returns true if a localhost is used', function () {
    expect(isVerifiedDomain('https://localhost')).to.equal(true);
    expect(isVerifiedDomain('https://localhost:3099')).to.equal(true);
  });

  it('returns false if a relative path is used', function () {
    expect(isVerifiedDomain('foobar/paypal/v1/payments/payment')).to.equal(false);
    expect(isVerifiedDomain('foobar/braintreepayments.com')).to.equal(false);
  });

  it('returns false if a invalid localhost domain is used', function () {
    expect(isVerifiedDomain('https://myfake.localhost.com:3099')).to.equal(false);
    expect(isVerifiedDomain('https://braintreepayments.com.localhost.com:3099')).to.equal(false);
  });

  it('returns true if a braintree or paypal domain with capital letters is used', function () {
    expect(isVerifiedDomain('https://www.BraintreePayments.com')).to.equal(true);
    expect(isVerifiedDomain('https://www.BraintreeGateway.com')).to.equal(true);
    expect(isVerifiedDomain('https://www.Braintree-Api.com')).to.equal(true);
  });

  it('returns true if a braintree domain is used', function () {
    expect(isVerifiedDomain('https://braintreepayments.com')).to.equal(true);
    expect(isVerifiedDomain('https://www.braintreepayments.com')).to.equal(true);
    expect(isVerifiedDomain('https://braintreegateway.com')).to.equal(true);
    expect(isVerifiedDomain('https://www.braintreegateway.com')).to.equal(true);
    expect(isVerifiedDomain('https://braintree-api.com')).to.equal(true);
    expect(isVerifiedDomain('https://www.braintree-api.com')).to.equal(true);
  });

  it('returns true if a paypal is used', function () {
    expect(isVerifiedDomain('https://paypal.com')).to.equal(true);
    expect(isVerifiedDomain('https://www.paypal.com')).to.equal(true);
  });

  it('returns true if a braintree domain with a port is used', function () {
    expect(isVerifiedDomain('https://www.braintreepayments.com:3000')).to.equal(true);
    expect(isVerifiedDomain('https://www.braintreegateway.com:3000')).to.equal(true);
    expect(isVerifiedDomain('https://www.braintree-api.com:3000')).to.equal(true);
  });

  it('returns true if a braintree domain with multiple subdomains is used', function () {
    expect(isVerifiedDomain('https://foo.bar.baz.braintreepayments.com')).to.equal(true);
    expect(isVerifiedDomain('https://foo.bar.baz.braintreegateway.com')).to.equal(true);
    expect(isVerifiedDomain('https://foo.bar.baz.braintree-api.com')).to.equal(true);
  });

  it('returns false if a braintree domain over http is used', function () {
    expect(isVerifiedDomain('http://www.braintreepayments.com:3000')).to.equal(false);
    expect(isVerifiedDomain('http://www.braintreegateway.com:3000')).to.equal(false);
    expect(isVerifiedDomain('http://www.braintree-api.com:3000')).to.equal(false);
  });

  it('returns false if a non-braintree non-paypal domain is used with braintree in the path', function () {
    expect(isVerifiedDomain('https://braintreepayments.com.example.com')).to.equal(false);
    expect(isVerifiedDomain('https://google.com/www.braintreepayments.com')).to.equal(false);
  });
});
