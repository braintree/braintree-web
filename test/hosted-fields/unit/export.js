'use strict';

var hostedFields = require('../../../src/hosted-fields');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(hostedFields.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(hostedFields.VERSION).to.equal(packageVersion);
  });
});
