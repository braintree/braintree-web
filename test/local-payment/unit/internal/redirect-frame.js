'use strict';

var redirectFrame = require('../../../../src/local-payment/internal/redirect-frame');
var querystring = require('../../../../src/lib/querystring');
var frameService = require('../../../../src/lib/frame-service/internal');

describe('redirect-frame', function () {
  describe('start', function () {
    beforeEach(function () {
      this.body = document.body.innerHTML;
      this.params = {
        token: 'token',
        paymentId: 'payment-id',
        PayerID: 'payer-id',
        channel: '123'
      };
      this.sandbox.stub(frameService, 'report').yields();
      this.sandbox.stub(querystring, 'parse').returns(this.params);
    });

    afterEach(function () {
      document.body.innerHTML = this.body;
    });

    it('reports to frame service the params from the querystring', function (done) {
      redirectFrame.start(function () {
        expect(frameService.report).to.be.calledWith(null, this.params);

        done();
      }.bind(this));
    });

    it('can put a redirect link onto the page if parent frame cannot be found and fallback is configured', function (done) {
      frameService.report.yieldsAsync(new Error('no frame'));
      this.params.r = global.encodeURIComponent('https://example.com/fallback-url');
      this.params.t = 'Return to Site';

      redirectFrame.start(function () {
        var link = document.querySelector('#container a');

        expect(link.href).to.equal('https://example.com/fallback-url?btLpToken=token&btLpPamentId=payment-id&btLpPayerId=payer-id');
        expect(link.innerText).to.equal('Return to Site');

        done();
      });
    });

    it('does not put a redirect link if redirect param is missing', function (done) {
      frameService.report.yieldsAsync(new Error('no frame'));
      this.params.t = 'Return to Site';

      redirectFrame.start(function () {
        var link = document.querySelector('#container a');

        expect(link).to.equal(null);

        done();
      });
    });

    it('does not put a redirect link if text param is missing', function (done) {
      frameService.report.yieldsAsync(new Error('no frame'));
      this.params.r = global.encodeURIComponent('https://example.com/fallback-url');

      redirectFrame.start(function () {
        var link = document.querySelector('#container a');

        expect(link).to.equal(null);

        done();
      });
    });

    it('sanitizes fallback url', function (done) {
      frameService.report.yieldsAsync(new Error('no frame'));
      this.params.r = global.encodeURIComponent('javascript:alert("hey")'); // eslint-disable-line no-script-url
      this.params.t = 'Return to Site';

      redirectFrame.start(function () {
        var link = document.querySelector('#container a');

        expect(link.href).to.equal('about:blank?btLpToken=token&btLpPamentId=payment-id&btLpPayerId=payer-id');
        expect(link.innerText).to.equal('Return to Site');

        done();
      });
    });
  });
});
