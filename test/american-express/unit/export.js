'use strict';

var americanExpress = require('../../../src/american-express');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(americanExpress.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(americanExpress.VERSION).to.equal(packageVersion);
  });
});
