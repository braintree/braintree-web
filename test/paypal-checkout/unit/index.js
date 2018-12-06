'use strict';

var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var create = require('../../../src/paypal-checkout').create;
var isSupported = require('../../../src/paypal-checkout').isSupported;
var PayPalCheckout = require('../../../src/paypal-checkout/paypal-checkout');
var Promise = require('../../../src/lib/promise');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var BraintreeError = require('../../../src/lib/braintree-error');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;

describe('paypalCheckout', function () {
  describe('create', function () {
    beforeEach(function () {
      var configuration = fake.configuration();

      configuration.gatewayConfiguration.paypalEnabled = true;
      configuration.gatewayConfiguration.paypal = {
        environmentNoNetwork: false
      };

      this.configuration = configuration;
      this.client = fake.client({
        configuration: this.configuration
      });
      this.client._request = this.sandbox.stub();
      this.sandbox.stub(basicComponentVerification, 'verify').resolves();
      this.sandbox.stub(createDeferredClient, 'create').resolves(this.client);
      this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
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

    it('verifies with basicComponentVerification', function (done) {
      var client = this.client;

      create({
        client: client
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWithMatch({
          name: 'PayPal Checkout',
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
          name: 'PayPal Checkout'
        });

        expect(instance).to.be.an.instanceof(PayPalCheckout);

        done();
      }.bind(this));
    });

    context('with promises', function () {
      it('returns a promise', function () {
        var promise = create({client: this.client});

        expect(promise).to.be.an.instanceof(Promise);
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

      it('ignores PayPal enabled check if merchantAccountId is passed in', function () {
        this.configuration.gatewayConfiguration.paypalEnabled = false;

        return create({
          client: this.client,
          merchantAccountId: 'id'
        }).then(function (instance) {
          expect(instance).to.be.an.instanceof(PayPalCheckout);
        });
      });

      it('errors out if paypal account is not linked in sandbox', function () {
        this.configuration.gatewayConfiguration.paypal.environmentNoNetwork = true;

        return create({client: this.client}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED');
          expect(err.message).to.equal('A linked PayPal Sandbox account is required to use PayPal Checkout in Sandbox. See https://developers.braintreepayments.com/guides/paypal/testing-go-live/#linked-paypal-testing for details on linking your PayPal sandbox with Braintree.');
        });
      });

      it('ignores linked sandbox check if merchantAccountId is passed in', function () {
        this.configuration.gatewayConfiguration.paypal.environmentNoNetwork = true;

        return create({
          client: this.client,
          merchantAccountId: 'id'
        }).then(function (instance) {
          expect(instance).to.be.an.instanceof(PayPalCheckout);
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
