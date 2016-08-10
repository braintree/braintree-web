'use strict';

var client = require('../../../src/client');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(client.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(client.VERSION).to.equal(packageVersion);
  });
});
