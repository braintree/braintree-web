'use strict';

var visaCheckout = require('../../../src/visa-checkout');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(visaCheckout.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(visaCheckout.VERSION).to.equal(packageVersion);
  });
});
