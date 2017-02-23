'use strict';

var useMin = require('../../../src/lib/use-min');

describe('useMin', function () {
  it('returns "" when isDebug is true', function () {
    expect(useMin(true)).to.equal('');
  });

  it('returns ".min" when isDebug is false', function () {
    expect(useMin(false)).to.equal('.min');
  });
});
