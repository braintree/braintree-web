'use strict';

var create = require('../../../src/paypal-checkout').create;
var isSupported = require('../../../src/paypal-checkout').isSupported;
var PayPalCheckout = require('../../../src/paypal-checkout/paypal-checkout');
var Promise = require('../../../src/lib/promise');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var BraintreeError = require('../../../src/lib/braintree-error');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var version = require('../../../package.json').version;

describe('paypalCheckout', function () {
  describe('create', function () {
    beforeEach(function () {
      var configuration = fake.configuration();

      configuration.gatewayConfiguration.paypalEnabled = true;
      configuration.gatewayConfiguration.paypal = {
        clientId: 'fake-id'
      };

      this.configuration = configuration;
      this.client = fake.client({
        configuration: this.configuration
      });
      this.client._request = this.sandbox.stub();
    });

    it('sends an analytics event on component creation', function (done) {
      var client = this.client;

      this.sandbox.stub(analytics, 'sendEvent');

      create({
        client: client,
        displayName: 'Awesome Merchant'
      }, function (err) {
        expect(err).not.to.exist;
        expect(analytics.sendEvent).to.be.calledWith(client, 'paypal-checkout.initialized');

        done();
      });
    });

    context('with promises', function () {
      it('returns a promise', function () {
        var promise = create({client: this.client});

        expect(promise).to.be.an.instanceof(Promise);
      });

      it('errors out if no client given', function () {
        return create({}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
          expect(err.message).to.equal('options.client is required when instantiating PayPal Checkout.');
        });
      });

      it('errors out if client version does not match', function () {
        var client = fake.client({
          version: '1.2.3'
        });

        return create({client: client}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
          expect(err.message).to.equal('Client (version 1.2.3) and PayPal Checkout (version ' + version + ') components must be from the same SDK version.');
        });
      });

      it('errors out if paypal is not enabled for the merchant', function () {
        this.configuration.gatewayConfiguration.paypalEnabled = false;

        return create({client: this.client}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('PAYPAL_NOT_ENABLED');
          expect(err.message).to.equal('PayPal is not enabled for this merchant.');
        });
      });

      it('errors out if paypal account is not linked in sandbox', function () {
        this.configuration.gatewayConfiguration.paypal.clientId = null;

        return create({client: this.client}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED');
          expect(err.message).to.equal('A linked PayPal Sandbox account is required to use PayPal Checkout in Sandbox. See https://developers.braintreepayments.com/guides/paypal/testing-go-live/#linked-paypal-testing for details on linking your PayPal sandbox with Braintree.');
        });
      });

      it('resolves with paypalCheckoutInstance', function () {
        return create({client: this.client}).then(function (instance) {
          expect(instance).to.be.an.instanceof(PayPalCheckout);
        });
      });
    });

    context('with callbacks', function () {
      it('does not return a promise', function () {
        var result = create({client: this.client}, function () {});

        expect(result).to.not.be.an.instanceof(Promise);
      });

      it('errors out if no client given', function (done) {
        create({}, function (err, thingy) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
          expect(err.message).to.equal('options.client is required when instantiating PayPal Checkout.');
          expect(thingy).not.to.exist;
          done();
        });
      });

      it('errors out if client version does not match', function (done) {
        var client = fake.client({
          version: '1.2.3'
        });

        create({client: client}, function (err, thingy) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
          expect(err.message).to.equal('Client (version 1.2.3) and PayPal Checkout (version ' + version + ') components must be from the same SDK version.');
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
    });
  });

  describe('isSupported', function () {
    it('returns true', function () {
      expect(isSupported()).to.equal(true);
    });
  });
});
