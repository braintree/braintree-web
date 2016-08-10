'use strict';

var browserDetection = require('../../../src/lib/browser-detection');
/* eslint-disable camelcase */
var AGENTS = {
  androidOperaMini: 'Opera/9.80 (Android; Opera Mini/7.6.35766/35.5706; U; en) Presto/2.8.119 Version/11.10',
  androidPhoneChrome: 'Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19',
  androidPhoneFirefox: 'Mozilla/5.0 (Android; Mobile; rv:40.0) Gecko/40.0 Firefox/40.0',
  androidTabletFirefox: 'Mozilla/5.0 (Android; Tablet; rv:40.0) Gecko/40.0 Firefox/40.0',
  androidWebviewOld: 'Mozilla/5.0 (Linux; U; Android 4.1.1; en-gb; Build/KLP) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30',
  androidWebviewKitKatLollipop: 'Mozilla/5.0 (Linux; Android 4.4; Nexus 5 Build/_BuildID_) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Mobile Safari/537.36',
  androidWebviewLollipopAndAbove: 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36',
  ie7: 'Mozilla/4.0(compatible; MSIE 7.0b; Windows NT 6.0)',
  ie8: 'Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; GTB7.4; InfoPath.2; SV1; .NET CLR 3.3.69573; WOW64; en-US)',
  ie9: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
  ie10: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
  ie11: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
  iPad3_2Safari: 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10',
  iPad5_1Safari: 'Mozilla/5.0 (iPad; U; CPU OS 5_1 like Mac OS X) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B367 Safari/531.21.10',
  iPad9_3Safari: 'Mozilla/5.0 (iPad; CPU OS 9_3 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13e230 Safari/601.1',
  iPadWebview: 'Mozilla/5.0 (iPad; CPU OS 5_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Mobile/98176',
  iPodSafari: 'Mozilla/5.0 (iPod; U; CPU like Mac OS X; en) AppleWebKit/420.1 (KHTML, like Gecko) Version/3.0 Mobile/3A101a Safari/419.3',
  iPodWebview: 'Mozilla/5.0 (iPod; CPU OS 5_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Mobile/3A101a',
  iPhone_3_2Safari: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B314 Safari/531.21.10',
  iPhone_9_3_1Safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13E230 Safari/601.1',
  iPhoneChrome: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 5_1_1 like Mac OS X; en) AppleWebKit/534.46.0 (KHTML, like Gecko) CriOS/19.0.1084.60 Mobile/9B206 Safari/7534.48.3',
  iPhoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
  iPhoneWebview: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_1 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Mobile/8B117',
  iPhoneGoogleSearchAppWebview: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_2 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) GSA/16.0.124986583 Mobile/13F69 Safari/600.1.4',
  linuxFirefox: 'Mozilla/5.0 (Maemo; Linux armv7l; rv:10.0) Gecko/20100101 Firefox/10.0 Fennec/10.0',
  linuxOpera: 'Opera/9.80 (X11; Linux i686; Ubuntu/14.10) Presto/2.12.388 Version/12.16',
  macSafari7_0_2: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.74.9 (KHTML, like Gecko) Version/7.0.2 Safari/537.74.9',
  macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
  pcChrome_27: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.93 Safari/537.36',
  pcChrome_41: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
  pcFirefox: 'Mozilla/5.0 (Windows NT x.y; Win64; x64; rv:10.0) Gecko/20100101 Firefox/10.0',
  pcSafari5_1: 'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-us) AppleWebKit/534.50 (KHTML, like Gecko) Version/5.1 Safari/534.50'
};
/* eslint-enable camelcase */

describe('browser-detection', function () {
  describe('isOperaMini', function () {
    it('returns true for an Opera Mini user agent', function () {
      var actual = browserDetection.isOperaMini(AGENTS.androidOperaMini);

      expect(actual).to.be.true;
    });

    it('returns false for an Opera user agent', function () {
      var actual = browserDetection.isOperaMini(AGENTS.linuxOpera);

      expect(actual).to.be.false;
    });
  });

  describe('isAndroidFirefox', function () {
    it('returns true for an Android Firefox user agent', function () {
      var phone = browserDetection.isAndroidFirefox(AGENTS.androidPhoneFirefox);
      var tablet = browserDetection.isAndroidFirefox(AGENTS.androidTabletFirefox);

      expect(phone).to.be.true;
      expect(tablet).to.be.true;
    });

    it('returns false for any other Firefox browser', function () {
      var ios = browserDetection.isAndroidFirefox(AGENTS.iPhoneFirefox);
      var mac = browserDetection.isAndroidFirefox(AGENTS.macFirefox);
      var pc = browserDetection.isAndroidFirefox(AGENTS.pcFirefox);
      var linux = browserDetection.isAndroidFirefox(AGENTS.linuxFirefox);

      expect(ios).to.be.false;
      expect(mac).to.be.false;
      expect(pc).to.be.false;
      expect(linux).to.be.false;
    });
  });

  describe('getIEVersion', function () {
    it('returns null if not IE', function () {
      var actual = browserDetection.getIEVersion(AGENTS.pcChrome);

      expect(actual).to.be.null;
    });

    it('returns 7 if IE7', function () {
      var actual = browserDetection.getIEVersion(AGENTS.ie7);

      expect(actual).to.equal(7);
    });

    it('returns 8 if IE8', function () {
      var actual = browserDetection.getIEVersion(AGENTS.ie8);

      expect(actual).to.equal(8);
    });

    it('returns 9 if IE9', function () {
      var actual = browserDetection.getIEVersion(AGENTS.ie9);

      expect(actual).to.equal(9);
    });

    it('returns 10 if IE10', function () {
      var actual = browserDetection.getIEVersion(AGENTS.ie10);

      expect(actual).to.equal(10);
    });

    it('returns 11 if IE11', function () {
      var actual = browserDetection.getIEVersion(AGENTS.ie11);

      expect(actual).to.equal(11);
    });
  });

  describe('isHTTPS', function () {
    it('returns true for HTTPS', function () {
      expect(browserDetection.isHTTPS('https:')).to.equal(true);
    });

    it('returns false for non-HTTP', function () {
      expect(browserDetection.isHTTPS('http:')).to.equal(false);
      expect(browserDetection.isHTTPS('ftp:')).to.equal(false);
    });
  });

  describe('isIos', function () {
    it('returns true for an iPad', function () {
      expect(browserDetection.isIos(AGENTS.iPad3_2Safari)).to.equal(true);
      expect(browserDetection.isIos(AGENTS.iPad5_1Safari)).to.equal(true);
      expect(browserDetection.isIos(AGENTS.iPad9_3Safari)).to.equal(true);
    });

    it('returns true for an iPod', function () {
      expect(browserDetection.isIos(AGENTS.iPodSafari)).to.equal(true);
    });

    it('returns true for an iPhone', function () {
      expect(browserDetection.isIos(AGENTS.iPhone_3_2Safari)).to.equal(true);
      expect(browserDetection.isIos(AGENTS.iPhone_9_3_1Safari)).to.equal(true);
    });

    it('returns true for iOS Chrome', function () {
      expect(browserDetection.isIos(AGENTS.iPhoneChrome)).to.equal(true);
    });

    it('returns false for non-iOS browsers', function () {
      var key, ua;

      for (key in AGENTS) {
        if (!AGENTS.hasOwnProperty(key)) {
          continue;
        }
        if (!/iPhone|iPad|iPod/.test(key)) {
          ua = AGENTS[key];
          expect(browserDetection.isIos(ua)).to.be.false;
        }
      }
    });
  });

  describe('isAndroid', function () {
    it('returns true for Android browsers', function () {
      expect(browserDetection.isAndroid(AGENTS.androidOperaMini)).to.equal(true);
      expect(browserDetection.isAndroid(AGENTS.androidPhoneFirefox)).to.equal(true);
      expect(browserDetection.isAndroid(AGENTS.androidTabletFirefox)).to.equal(true);
      expect(browserDetection.isAndroid(AGENTS.androidPhoneChrome)).to.equal(true);
    });

    it('returns true for Android webviews', function () {
      expect(browserDetection.isAndroid(AGENTS.androidWebviewOld)).to.equal(true);
      expect(browserDetection.isAndroid(AGENTS.androidWebviewKitKatLollipop)).to.equal(true);
      expect(browserDetection.isAndroid(AGENTS.androidWebviewLollipopAndAbove)).to.equal(true);
    });

    it('returns false for non-Android browsers', function () {
      var key, ua;

      for (key in AGENTS) {
        if (!AGENTS.hasOwnProperty(key)) {
          continue;
        }
        if (!/android/.test(key)) {
          ua = AGENTS[key];
          expect(browserDetection.isAndroid(ua)).to.be.false;
        }
      }
    });
  });

  describe('supportsPopups', function () {
    it('returns false for webviews', function () {
      var key, ua;

      for (key in AGENTS) {
        if (!AGENTS.hasOwnProperty(key)) {
          continue;
        }
        if (/webview/i.test(key)) {
          ua = AGENTS[key];
          expect(browserDetection.supportsPopups(ua)).to.be.false;
        }
      }
    });

    it('returns true for browsers', function () {
      var key, ua;

      for (key in AGENTS) {
        if (!AGENTS.hasOwnProperty(key)) {
          continue;
        }
        if (key === 'androidOperaMini') {
          continue;
        }
        if (!/webview/i.test(key)) {
          ua = AGENTS[key];
          expect(browserDetection.supportsPopups(ua)).to.be.true;
        }
      }
    });

    it('returns false for Google Search App', function () {
      expect(browserDetection.supportsPopups(AGENTS.iPhoneGoogleSearchAppWebview)).to.be.false;
    });

    it('returns false for Opera Mini', function () {
      expect(browserDetection.supportsPopups(AGENTS.androidOperaMini)).to.be.false;
    });
  });
});
