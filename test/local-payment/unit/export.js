'use strict';

var localPayment = require('../../../src/local-payment');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(localPayment.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(localPayment.VERSION).to.equal(packageVersion);
  });
});
