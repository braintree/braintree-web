'use strict';

var create = require('../../../src/paypal-checkout').create;
var isSupported = require('../../../src/paypal-checkout').isSupported;
var PayPalCheckout = require('../../../src/paypal-checkout/paypal-checkout');
var Promise = require('../../../src/lib/promise');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var browserDetection = require('../../../src/lib/browser-detection');
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
      this.client = {
        _request: this.sandbox.stub(),
        getConfiguration: function () {
          return configuration;
        }
      };
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
        this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

        return create({client: this.client}).then(rejectIfResolves).catch(function (err) {
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
          expect(err.message).to.equal('No linked PayPal Sandbox account. Sign into the Braintree gateway to configure your account.');
        });
      });

      it('errors out if browser does not support popups', function () {
        this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

        return create({client: this.client}).then(rejectIfResolves).catch(function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('PAYPAL_BROWSER_NOT_SUPPORTED');
          expect(err.message).to.equal('Browser is not supported.');
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
        this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

        create({client: this.client}, function (err, thingy) {
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

      it('errors out if browser does not support popups', function (done) {
        this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

        create({client: this.client}, function (err, thingy) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('PAYPAL_BROWSER_NOT_SUPPORTED');
          expect(err.message).to.equal('Browser is not supported.');
          expect(thingy).not.to.exist;
          done();
        });
      });
    });
  });

  describe('isSupported', function () {
    it('returns true if browser supports popups', function () {
      this.sandbox.stub(browserDetection, 'supportsPopups').returns(true);

      expect(isSupported()).to.be.true;
    });

    it('returns false if browser does not support popups', function () {
      this.sandbox.stub(browserDetection, 'supportsPopups').returns(false);

      expect(isSupported()).to.be.false;
    });
  });
});
