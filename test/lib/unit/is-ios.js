'use strict';

var isIos = require('../../../src/lib/is-ios');

describe('isIos', function () {
  it('returns false for Phantom', function () {
    expect(isIos()).to.be.false;
  });

  it('false when chrome', function () {
    var isChrome = isIos('Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');

    expect(isChrome).to.be.false;
  });

  it('true when iPad', function () {
    var isIpad = isIos('Mozilla/5.0 (iPad; CPU OS 9_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13C75 Safari/601.1');

    expect(isIpad).to.be.true;
  });

  it('true when iPhone', function () {
    var isIphone = isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 9_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13C75 Safari/601.1');

    expect(isIphone).to.be.true;
  });

  it('true when iPod', function () {
    var isIpod = isIos('Mozilla/5.0 (iPod; U; CPU like Mac OS X; en) AppleWebKit/420.1 (KHTML, like Gecko) Version/3.0 Mobile/3A101a Safari/419.3');

    expect(isIpod).to.be.true;
  });
});
