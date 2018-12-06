'use strict';

var Promise = require('../../../src/lib/promise');
var BraintreeError = require('../../../src/lib/braintree-error');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var create = require('../../../src/visa-checkout').create;
var VisaCheckout = require('../../../src/visa-checkout/visa-checkout');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');

describe('visaCheckout.create', function () {
  beforeEach(function () {
    var configuration = fake.configuration();

    configuration.gatewayConfiguration.visaCheckout = {};

    this.configuration = configuration;
    this.client = fake.client({
      configuration: configuration
    });
    this.sandbox.stub(analytics, 'sendEvent');
    this.sandbox.stub(basicComponentVerification, 'verify').resolves();
    this.sandbox.stub(createDeferredClient, 'create').resolves(this.client);
    this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
  });

  it('verifies with basicComponentVerification', function (done) {
    var client = this.client;

    create({
      client: client
    }, function () {
      expect(basicComponentVerification.verify).to.be.calledOnce;
      expect(basicComponentVerification.verify).to.be.calledWithMatch({
        name: 'Visa Checkout',
        client: client
      });
      done();
    });
  });

  it('calls callback with a VisaCheckout instance when successful', function (done) {
    var client = this.client;

    create({
      client: client
    }, function (err, visaCheckoutInstance) {
      expect(err).not.to.exist;
      expect(visaCheckoutInstance).to.be.an.instanceof(VisaCheckout);

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
        name: 'Visa Checkout'
      });

      expect(instance).to.be.an.instanceof(VisaCheckout);

      done();
    }.bind(this));
  });

  it('returns a promise', function () {
    var promise = create({client: this.client});

    expect(promise).to.be.an.instanceof(Promise);
  });

  it('calls callback with an error when visa checkout is not enabled in configuration', function (done) {
    delete this.configuration.gatewayConfiguration.visaCheckout;

    create({client: this.client}, function (err, visaCheckoutInstance) {
      expect(visaCheckoutInstance).not.to.exist;

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.code).to.equal('VISA_CHECKOUT_NOT_ENABLED');
      expect(err.type).to.equal('MERCHANT');
      expect(err.message).to.equal('Visa Checkout is not enabled for this merchant.');

      done();
    });
  });

  it('sends an analytics event', function (done) {
    var client = this.client;

    create({
      client: client
    }, function (err) {
      expect(err).not.to.exist;
      expect(analytics.sendEvent).to.be.calledWith(client, 'visacheckout.initialized');

      done();
    });
  });
});
