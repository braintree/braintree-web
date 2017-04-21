'use strict';

var isHTTPS = require('../../../src/lib/is-https').isHTTPS;

describe('isHTTPS', function () {
  it('returns true for HTTPS', function () {
    expect(isHTTPS('https:')).to.equal(true);
  });

  it('returns false for non-HTTP', function () {
    expect(isHTTPS('http:')).to.equal(false);
    expect(isHTTPS('ftp:')).to.equal(false);
  });
});
