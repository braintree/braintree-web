'use strict';

var paypalCheckout = require('../../../src/paypal-checkout');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(paypalCheckout.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(paypalCheckout.VERSION).to.equal(packageVersion);
  });
});
