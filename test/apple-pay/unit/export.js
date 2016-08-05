'use strict';

var applePay = require('../../../src/apple-pay');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(applePay.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(applePay.VERSION).to.equal(packageVersion);
  });
});
