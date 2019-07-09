'use strict';

var expect = require('chai').expect;
var deps = require('../../package.json').dependencies;

describe('exact npm versions', function () {
  Object.keys(deps).forEach(function (depName) {
    it('uses an exact version for ' + depName, function () {
      var version = deps[depName];
      var firstChar = version.charAt(0);

      try {
        expect(Number(firstChar)).to.not.be.NaN;
      } catch (e) {
        throw new Error('Expected ' + version + ' to be an exact version, not start with ' + firstChar);
      }
    });
  });
});
