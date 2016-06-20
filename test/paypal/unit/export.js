'use strict';

var paypal = require('../../../src/paypal');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(paypal.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(paypal.VERSION).to.equal(packageVersion);
  });
});
