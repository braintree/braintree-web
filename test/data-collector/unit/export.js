'use strict';

var dataCollector = require('../../../src/data-collector');
var packageVersion = require('../../../package.json').version;

describe('export', function () {
  it('contains create', function () {
    expect(dataCollector.create).to.be.a('function');
  });

  it('sets the version', function () {
    expect(dataCollector.VERSION).to.equal(packageVersion);
  });
});
