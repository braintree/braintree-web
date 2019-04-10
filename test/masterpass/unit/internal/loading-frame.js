'use strict';

var loadingFrame = require('../../../../src/masterpass/internal/loading-frame');
var querystring = require('../../../../src/lib/querystring');

describe('loading-frame', function () {
  describe('start', function () {
    beforeEach(function () {
      this.fakeScript = {
      };
      this.params = {
        environment: 'production',
        failureCallback: 'fallback',
        cancelCallback: 'cancel',
        successCallback: 'success',
        callbackUrl: 'https://example.com',
        foo: 'bar'
      };
      this.sandbox.stub(querystring, 'parse').returns(this.params);
      this.sandbox.stub(document, 'createElement').returns(this.fakeScript);
      this.sandbox.stub(document.body, 'appendChild');

      global.MasterPass = {
        client: {
          checkout: this.sandbox.stub()
        }
      };
    });

    afterEach(function () {
      delete global.MasterPass;
    });

    it('adds production script to page in production', function () {
      loadingFrame.start();

      expect(document.body.appendChild).to.be.calledOnce;
      expect(document.body.appendChild).to.be.calledWith(this.fakeScript);
      expect(this.fakeScript.src).to.equal('https://static.masterpass.com/dyn/js/switch/integration/MasterPass.client.js');
    });

    it('adds sandbox script to page in sandbox', function () {
      this.params.environment = 'sandbox';

      loadingFrame.start();

      expect(document.body.appendChild).to.be.calledOnce;
      expect(document.body.appendChild).to.be.calledWith(this.fakeScript);
      expect(this.fakeScript.src).to.equal('https://sandbox.static.masterpass.com/dyn/js/switch/integration/MasterPass.client.js');
    });

    it('calls Masterpass.client.checkout with config from query params when script loads', function () {
      loadingFrame.start();

      expect(global.MasterPass.client.checkout).to.not.be.called;

      this.fakeScript.onload();

      expect(global.MasterPass.client.checkout).to.be.calledOnce;
      expect(global.MasterPass.client.checkout).to.be.calledWithMatch({
        environment: 'production',
        foo: 'bar',
        callbackUrl: 'https://example.com'
      });
    });

    it('overwrites failure, cancel and success callbacks with a noop function', function () {
      loadingFrame.start();

      expect(global.MasterPass.client.checkout).to.not.be.called;

      // raw params for these in the test are strings
      expect(this.params.failureCallback).to.be.a('function');
      expect(this.params.cancelCallback).to.be.a('function');
      expect(this.params.successCallback).to.be.a('function');
    });

    it('sanitizes callbackUrl', function () {
      this.params.callbackUrl = 'Javascript:alert.call(null,document.domain)//'; // eslint-disable-line no-script-url

      loadingFrame.start();

      expect(global.MasterPass.client.checkout).to.not.be.called;

      this.fakeScript.onload();

      expect(global.MasterPass.client.checkout).to.be.calledOnce;
      expect(global.MasterPass.client.checkout).to.be.calledWithMatch({
        callbackUrl: 'about:blank'
      });
    });
  });
});
