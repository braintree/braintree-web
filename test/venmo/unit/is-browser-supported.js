'use strict';

var browserDetection = require('../../../src/venmo/shared/browser-detection');
var isBrowserSupported = require('../../../src/venmo/shared/supports-venmo').isBrowserSupported;

describe('isBrowserSupported', function () {
  it('returns true for iOS Safari', function () {
    this.sandbox.stub(browserDetection, 'isIosSafari').returns(true);

    expect(isBrowserSupported()).to.equal(true);
  });

  it('returns true for iOS Chrome', function () {
    this.sandbox.stub(browserDetection, 'isIos').returns(true);
    this.sandbox.stub(browserDetection, 'isChrome').returns(true);

    expect(isBrowserSupported()).to.equal(true);
  });

  it('returns true for Android Chrome', function () {
    this.sandbox.stub(browserDetection, 'isAndroid').returns(true);
    this.sandbox.stub(browserDetection, 'isChrome').returns(true);

    expect(isBrowserSupported()).to.equal(true);
  });

  it('returns true for Samsung Browser', function () {
    this.sandbox.stub(browserDetection, 'isSamsungBrowser').returns(true);

    expect(isBrowserSupported()).to.equal(true);
  });

  it('returns true for Mobile Firefox', function () {
    this.sandbox.stub(browserDetection, 'isMobileFirefox').returns(true);

    expect(isBrowserSupported()).to.equal(true);
  });

  it('returns false for other browsers', function () {
    this.sandbox.stub(browserDetection, 'isIosSafari').returns(false);
    this.sandbox.stub(browserDetection, 'isChrome').returns(false);
    this.sandbox.stub(browserDetection, 'isSamsungBrowser').returns(false);
    this.sandbox.stub(browserDetection, 'isMobileFirefox').returns(false);

    expect(isBrowserSupported()).to.equal(false);
  });

  context('when allowNewBrowserTab is false', function () {
    it('returns false for iOS Chrome', function () {
      this.sandbox.stub(browserDetection, 'isIos').returns(true);
      this.sandbox.stub(browserDetection, 'isChrome').returns(true);

      expect(isBrowserSupported({
        allowNewBrowserTab: false
      })).to.equal(false);
    });

    it('returns false for Mobile Firefox', function () {
      this.sandbox.stub(browserDetection, 'isMobileFirefox').returns(true);

      expect(isBrowserSupported({
        allowNewBrowserTab: false
      })).to.equal(false);
    });
  });
});

