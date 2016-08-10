/* globals __dirname, process */

'use strict';

var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');

describe('current environment', function () {
  it('is set up with the correct Node version', function () {
    var nvmrcPath = path.resolve(__dirname, '..', '..', '.nvmrc');
    var expectedVersion = fs.readFileSync(nvmrcPath).toString().trim().replace(/^v/, '^').replace(/\./, '\\.');
    var actualVersion = process.versions.node;

    expect(actualVersion).to.match(new RegExp(expectedVersion));
  });
});
