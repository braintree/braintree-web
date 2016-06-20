'use strict';

var browserDetection = require('../../../src/lib/browser-detection');

describe('browser-detection', function () {
  describe('isOperaMini', function () {
    it('returns true for an Opera Mini user agent', function () {
      var actual = browserDetection.isOperaMini('Opera/9.80 (Android; Opera Mini/7.6.35766/35.5706; U; en) Presto/2.8.119 Version/11.10');

      expect(actual).to.be.true;
    });

    it('returns false for an Opera user agent', function () {
      var actual = browserDetection.isOperaMini('Opera/9.80 (X11; Linux i686; Ubuntu/14.10) Presto/2.12.388 Version/12.16');

      expect(actual).to.be.false;
    });
  });

  describe('getIEVersion', function () {
    it('returns null if not IE', function () {
      var actual = browserDetection.getIEVersion('Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');

      expect(actual).to.be.null;
    });

    it('returns 7 if IE7', function () {
      var actual = browserDetection.getIEVersion('Mozilla/4.0(compatible; MSIE 7.0b; Windows NT 6.0)');

      expect(actual).to.equal(7);
    });

    it('returns 8 if IE8', function () {
      var actual = browserDetection.getIEVersion('Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; GTB7.4; InfoPath.2; SV1; .NET CLR 3.3.69573; WOW64; en-US)');

      expect(actual).to.equal(8);
    });

    it('returns 9 if IE9', function () {
      var actual = browserDetection.getIEVersion('Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)');

      expect(actual).to.equal(9);
    });

    it('returns 10 if IE10', function () {
      var actual = browserDetection.getIEVersion('Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)');

      expect(actual).to.equal(10);
    });

    it('returns 11 if IE11', function () {
      var actual = browserDetection.getIEVersion('Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko');

      expect(actual).to.equal(11);
    });
  });
});
