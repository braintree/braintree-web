'use strict';

var googlePayment = require('../../../src/google-payment');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(googlePayment.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(googlePayment.VERSION).to.equal(packageVersion);
  });
});
