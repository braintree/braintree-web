'use strict';

var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var create = require('../../../src/masterpass').create;
var isSupported = require('../../../src/masterpass').isSupported;
var browserDetection = require('../../../src/masterpass/shared/browser-detection');
var Masterpass = require('../../../src/masterpass/external/masterpass');
var BraintreeError = require('../../../src/lib/braintree-error');
var fake = require('../../helpers/fake');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;

describe('masterpass', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.gatewayConfiguration.masterpass = {};
    this.fakeClient = fake.client({
      configuration: this.configuration
    });
    this.masterpassInstance = new Masterpass({
      client: this.fakeClient
    });
    this.sandbox.stub(Masterpass.prototype, '_initialize').resolves(this.masterpassInstance);
    this.sandbox.stub(basicComponentVerification, 'verify').resolves();
    this.sandbox.stub(createDeferredClient, 'create').resolves(this.fakeClient);
    this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
  });

  describe('create', function () {
    it('verifies with basicComponentVerification', function (done) {
      var client = this.fakeClient;

      create({
        client: client
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWithMatch({
          name: 'Masterpass',
          client: client
        });
        done();
      });
    });

    it('can create with an authorization instead of a client', function (done) {
      create({
        authorization: fake.clientToken,
        debug: true
      }, function (err, instance) {
        expect(err).not.to.exist;

        expect(createDeferredClient.create).to.be.calledOnce;
        expect(createDeferredClient.create).to.be.calledWith({
          authorization: fake.clientToken,
          client: this.sandbox.match.typeOf('undefined'),
          debug: true,
          assetsUrl: 'https://example.com/assets',
          name: 'Masterpass'
        });

        expect(instance).to.be.an.instanceof(Masterpass);

        done();
      }.bind(this));
    });

    context('with promises', function () {
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
