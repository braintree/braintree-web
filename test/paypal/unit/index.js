'use strict';

var create = require('../../../src/paypal').create;
var isSupported = require('../../../src/paypal').isSupported;
var browserDetection = require('../../../src/lib/browser-detection');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var PayPal = require('../../../src/paypal/external/paypal');
var BraintreeError = require('../../../src/lib/braintree-error');
var version = require('../../../package.json').version;

describe('paypal', function () {
  describe('create', function () {
    beforeEach(function () {
      var configuration = fake.configuration();

      configuration.gatewayConfiguration.paypalEnabled = true;
      configuration.gatewayConfiguration.paypal = {};

      this.configuration = configuration;
      this.client = {
        getConfiguration: function () {
          return configuration;
        }
      };
    });

    it('errors out if no callback is given', function (done) {
      try {
        create({client: this.client});
      } catch (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('CALLBACK_REQUIRED');
        expect(err.message).to.equal('create must include a callback function.');

        done();
      }
    });

    it('errors out if no client given', function (done) {
      create({}, function (err, thingy) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
        expect(err.message).to.equal('options.client is required when instantiating PayPal.');
        expect(thingy).not.to.exist;
        done();
      });
    });

    it('errors out if client version does not match', function (done) {
      this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

      create({client: this.client}, function (err, thingy) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
        expect(err.message).to.equal('Client (version 1.2.3) and PayPal (version ' + version + ') components must be from the same SDK version.');
        expect(thingy).not.to.exist;
        done();
      });
    });

    it('errors out if paypal is not enabled for the merchant', function (done) {
      this.configuration.gatewayConfiguration.paypalEnabled = false;

      create({client: this.client}, function (err, thingy) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('PAYPAL_NOT_ENABLED');
        expect(err.message).to.equal('PayPal is not enabled for this merchant.');
        expect(thingy).not.to.exist;
        done();
      });
    });

    it('sends an analytics event', function (done) {
      var client = this.client;

      this.sandbox.stub(analytics, 'sendEvent');
      this.sandbox.stub(PayPal.prototype, '_initialize', function (callback) {
        callback();
      });

      create({client: client}, function (err) {
        expect(err).not.to.exist;
        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal.initialized');

        done();
      });
    });

    describe('browser support', function () {
      it('errors out if browser does not support popups', function (done) {
        this.sandbox.stub(browserDetection, 'supportsPopups', function () { return false; });

        create({client: this.client}, function (err, thingy) {
          expect(err).to.be.an.instanceOf(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('PAYPAL_BROWSER_NOT_SUPPORTED');
          expect(err.message).to.equal('Browser is not supported.');
          expect(thingy).not.to.exist;

          done();
        });
      });

      it('allows unsupported browser when PopupBridge is defined', function (done) {
        global.popupBridge = {};
        this.sandbox.stub(browserDetection, 'supportsPopups', function () { return false; });
        this.sandbox.stub(analytics, 'sendEvent');
        this.sandbox.stub(PayPal.prototype, '_initialize', function (callback) {
          callback();
        });

        create({client: this.client}, function (err, thingy) {
          expect(err).not.to.exist;
          expect(thingy).to.be.an.instanceof(PayPal);

          delete global.popupBridge;
          done();
        });
      });
    });
  });

  describe('isSupported', function () {
    afterEach(function () {
      delete global.popupBridge;
    });

    it('returns true if popupBridge exists', function () {
      global.popupBridge = {};

      expect(isSupported()).to.be.true;
    });

    it('returns true if browser supports popups', function () {
      this.sandbox.stub(browserDetection, 'supportsPopups').returns(true);

      expect(isSupported()).to.be.true;
    });

    it('returns false if popupBridge is not defined and browser does not support popups', function () {
      this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

      expect(isSupported()).to.be.false;
    });

    it('returns true if popupBridge exists and browser does not support popups', function () {
      global.popupBridge = {};
      this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

      expect(isSupported()).to.be.true;
    });
  });
});
