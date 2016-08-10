'use strict';

var isIe9 = require('../../../src/lib/is-ie9');

describe('isIe9', function () {
  it('returns false for Phantom', function () {
    expect(isIe9()).to.be.false;
  });

  it('false when chrome', function () {
    var isChrome = isIe9('Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');

    expect(isChrome).to.be.false;
  });

  it('true when IE9', function () {
    var ua = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)';

    expect(isIe9(ua)).to.be.true;
  });

  it('false when IE8', function () {
    var ua = 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E)';

    expect(isIe9(ua)).to.be.false;
  });
});
