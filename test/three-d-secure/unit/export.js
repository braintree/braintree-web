'use strict';

var threeDSecure = require('../../../src/three-d-secure');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(threeDSecure.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(threeDSecure.VERSION).to.equal(packageVersion);
  });
});
