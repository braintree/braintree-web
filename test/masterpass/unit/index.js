'use strict';

var create = require('../../../src/masterpass').create;
var isSupported = require('../../../src/masterpass').isSupported;
var browserDetection = require('browser-detection');
var Masterpass = require('../../../src/masterpass/external/masterpass');
var BraintreeError = require('../../../src/lib/braintree-error');
var fake = require('../../helpers/fake');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var version = require('../../../package.json').version;

describe('masterpass', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.gatewayConfiguration.masterpass = {};
    this.fakeClient = {
      getConfiguration: function () {
        return this.configuration;
      }.bind(this)
    };
    this.masterpassInstance = new Masterpass({
      client: this.fakeClient
    });
    this.sandbox.stub(Masterpass.prototype, '_initialize').resolves(this.masterpassInstance);
  });

  describe('create', function () {
    context('with promises', function () {
      it('rejects with an error when called without a client', function () {
        return create({}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
          expect(err.message).to.equal('options.client is required when instantiating Masterpass.');
        });
      });

      it('rejects with an error when called with a mismatched version', function () {
        this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

        return create({client: this.fakeClient}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
          expect(err.message).to.equal('Client (version 1.2.3) and Masterpass (version ' + version + ') components must be from the same SDK version.');
        });
      });

      it('rejects with an error when merchant is not enabled for masterpass', function () {
        delete this.configuration.gatewayConfiguration.masterpass;

        return create({client: this.fakeClient}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('MASTERPASS_NOT_ENABLED');
          expect(err.message).to.equal('Masterpass is not enabled for this merchant.');
        });
      });

      it('rejects with an error if browser does not support popups', function () {
        this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

        return create({client: this.fakeClient}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceOf(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('MASTERPASS_BROWSER_NOT_SUPPORTED');
          expect(err.message).to.equal('Browser is not supported.');
        });
      });

      it('resolves with an Masterpass instance when called with a client', function () {
        return create({client: this.fakeClient}).then(function (masterpass) {
          expect(masterpass).to.be.an.instanceof(Masterpass);
        });
      });

      context('with popupbridge', function () {
        beforeEach(function () {
          global.popupBridge = {};
        });

        afterEach(function () {
          delete global.popupBridge;
        });

        it('allows unuspported browser when PopupBridge is defined', function () {
          this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

          return create({client: this.fakeClient}).then(function (data) {
            expect(data).to.be.an.instanceof(Masterpass);
          });
        });
      });
    });

    context('with callbacks', function () {
      it('calls callback with an error when called without a client', function (done) {
        create({}, function (err, masterpass) {
          expect(masterpass).not.to.exist;

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
          expect(err.message).to.equal('options.client is required when instantiating Masterpass.');

          done();
        });
      });

      it('throws an error when called with a mismatched version', function (done) {
        this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

        create({client: this.fakeClient}, function (err, masterpass) {
          expect(masterpass).not.to.exist;

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
          expect(err.message).to.equal('Client (version 1.2.3) and Masterpass (version ' + version + ') components must be from the same SDK version.');

          done();
        });
      });

      it('passes back an error when merchant is not enabled for masterpass', function (done) {
        delete this.configuration.gatewayConfiguration.masterpass;

        create({client: this.fakeClient}, function (err, masterpass) {
          expect(masterpass).not.to.exist;

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('MASTERPASS_NOT_ENABLED');
          expect(err.message).to.equal('Masterpass is not enabled for this merchant.');

          done();
        });
      });

      it('errors out if browser does not support popups', function (done) {
        this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

        create({client: this.fakeClient}, function (err, masterpass) {
          expect(err).to.be.an.instanceOf(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('MASTERPASS_BROWSER_NOT_SUPPORTED');
          expect(err.message).to.equal('Browser is not supported.');
          expect(masterpass).not.to.exist;

          done();
        });
      });

      it('creates an Masterpass instance when called with a client', function (done) {
        create({client: this.fakeClient}, function (err, masterpass) {
          expect(err).not.to.exist;

          expect(masterpass).to.be.an.instanceof(Masterpass);

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
