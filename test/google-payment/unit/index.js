'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var browserDetection = require('@braintree/browser-detection');
var googlePayment = require('../../../src/google-payment');
var GooglePayment = require('../../../src/google-payment/google-payment');
var fake = require('../../helpers/fake');

describe('googlePayment', function () {
  describe('create', function () {
    beforeEach(function () {
      var configuration = fake.configuration();

      configuration.gatewayConfiguration.androidPay = {
        enabled: true,
        googleAuthorizationFingerprint: 'fingerprint',
        supportedNetworks: ['visa', 'amex']
      };

      this.fakeClient = fake.client({
        configuration: configuration
      });
      this.fakeClient._request = function () {};
      this.sandbox.stub(GooglePayment.prototype, 'initialize').resolves({});
      this.sandbox.stub(basicComponentVerification, 'verify').resolves();
    });

    it('returns a promise', function () {
      var promise = googlePayment.create({
        client: this.fakeClient
      });

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('verifies with basicComponentVerification', function (done) {
      var client = this.fakeClient;

      googlePayment.create({
        client: client
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWith({
          name: 'Pay with Google',
          client: client
        });
        done();
      });
    });

    it('instantiates a Pay with Google integration', function (done) {
      googlePayment.create({
        client: this.fakeClient
      }, function (err, thingy) {
        expect(err).not.to.exist;
        expect(thingy).to.exist;

        done();
      });
    });

    it('returns error if android pay is not enabled', function (done) {
      var client = fake.client();

      googlePayment.create({
        client: client
      }, function (err) {
        expect(err).to.exist;
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('PAY_WITH_GOOGLE_NOT_ENABLED');
        expect(err.message).to.equal('Pay with Google is not enabled for this merchant.');

        done();
      });
    });

    it('returns error if payment request integration throws an error', function (done) {
      var error = new Error('Failed');

      GooglePayment.prototype.initialize.rejects(error);

      googlePayment.create({
        client: this.fakeClient
      }, function (err) {
        expect(err).to.exist;
        expect(err).to.equal(error);

        done();
      });
    });
  });

  describe('isSupported', function () {
    it('returns true when in Chrome and Payment Request API is supported', function () {
      this.sandbox.stub(browserDetection, 'isChrome').returns(true);
      global.PaymentRequest = global.PaymentRequest || {};

      expect(googlePayment.isSupported()).to.eql(true);
    });

    it('returns false when not in Chrome and Payment Request API is supported', function () {
      this.sandbox.stub(browserDetection, 'isChrome').returns(false);
      global.PaymentRequest = global.PaymentRequest || {};

      expect(googlePayment.isSupported()).to.eql(false);
    });

    it('returns false when in Chrome and Payment Request API is not supported', function () {
      this.sandbox.stub(browserDetection, 'isChrome').returns(true);
      global.PaymentRequest = undefined; // eslint-disable-line no-undefined

      expect(googlePayment.isSupported()).to.eql(false);
    });

    it('returns false when not in Chrome and Payment Request API is not supported', function () {
      this.sandbox.stub(browserDetection, 'isChrome').returns(false);
      global.PaymentRequest = undefined; // eslint-disable-line no-undefined

      expect(googlePayment.isSupported()).to.eql(false);
    });
  });
});
