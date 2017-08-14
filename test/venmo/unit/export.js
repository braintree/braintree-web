'use strict';

var venmo = require('../../../src/venmo');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(venmo.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(venmo.VERSION).to.equal(packageVersion);
  });
});
