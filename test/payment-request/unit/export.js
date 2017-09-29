'use strict';

var paymentRequest = require('../../../src/payment-request');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(paymentRequest.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(paymentRequest.VERSION).to.equal(packageVersion);
  });
});
