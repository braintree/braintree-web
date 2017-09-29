'use strict';

var create = require('../../../src/ideal').create;
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var browserDetection = require('../../../src/ideal/shared/browser-detection');
var Ideal = require('../../../src/ideal/external/ideal');
var BraintreeError = require('../../../src/lib/braintree-error');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;

describe('ideal', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.gatewayConfiguration.ideal = {};
    this.fakeClient = fake.client({
      configuration: this.configuration
    });
    this.idealInstance = new Ideal({
      client: this.fakeClient
    });
    this.sandbox.stub(Ideal.prototype, '_initialize').resolves(this.idealInstance);
    this.sandbox.stub(analytics, 'sendEvent');
    this.sandbox.stub(basicComponentVerification, 'verify').resolves();
  });

  describe('create', function () {
    it('sends an analytics event when initialization happens', function () {
      return create({client: this.fakeClient}).then(function () {
        expect(analytics.sendEvent).to.be.calledOnce;
        expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'ideal.initialization');
      }.bind(this));
    });

    it('verifies with basicComponentVerification', function (done) {
      var client = this.fakeClient;

      create({
        client: client
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWith({
          name: 'iDEAL',
          client: client
        });
        done();
      });
    });

    context('with promises', function () {
      it('rejects with an error when client does not contain braintreeApi', function () {
        delete this.configuration.gatewayConfiguration.braintreeApi;

        return create({client: this.fakeClient}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('BRAINTREE_API_ACCESS_RESTRICTED');
          expect(err.message).to.equal('Your access is restricted and cannot use this part of the Braintree API.');
        });
      });

      it('rejects with an error when merchant is not enabled for ideal', function () {
        delete this.configuration.gatewayConfiguration.ideal;

        return create({client: this.fakeClient}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('IDEAL_NOT_ENABLED');
          expect(err.message).to.equal('iDEAL is not enabled for this merchant.');
        });
      });

      it('rejects with an en error if browser does not support popups', function () {
        this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

        return create({client: this.fakeClient}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceOf(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('IDEAL_BROWSER_NOT_SUPPORTED');
          expect(err.message).to.equal('Browser is not supported.');
        });
      });

      it('resolves with an iDEAL instance when called with a client', function () {
        return create({client: this.fakeClient}).then(function (ideal) {
          expect(ideal).to.be.an.instanceof(Ideal);
        });
      });
    });

    context('with callbacks', function () {
      it('passes back an error when client does not contain braintreeApi', function (done) {
        delete this.configuration.gatewayConfiguration.braintreeApi;

        create({client: this.fakeClient}, function (err, ideal) {
          expect(ideal).not.to.exist;

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('BRAINTREE_API_ACCESS_RESTRICTED');
          expect(err.message).to.equal('Your access is restricted and cannot use this part of the Braintree API.');

          done();
        });
      });

      it('passes back an error when merchant is not enabled for ideal', function (done) {
        delete this.configuration.gatewayConfiguration.ideal;

        create({client: this.fakeClient}, function (err, ideal) {
          expect(ideal).not.to.exist;

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('IDEAL_NOT_ENABLED');
          expect(err.message).to.equal('iDEAL is not enabled for this merchant.');

          done();
        });
      });

      it('errors out if browser does not support popups', function (done) {
        this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

        create({client: this.fakeClient}, function (err, ideal) {
          expect(err).to.be.an.instanceOf(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('IDEAL_BROWSER_NOT_SUPPORTED');
          expect(err.message).to.equal('Browser is not supported.');
          expect(ideal).not.to.exist;

          done();
        });
      });

      it('creates an iDEAL instance when called with a client', function (done) {
        create({client: this.fakeClient}, function (err, ideal) {
          expect(err).not.to.exist;

          expect(ideal).to.be.an.instanceof(Ideal);

          done();
        });
      });
    });
  });
});
