'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var BraintreeError = require('../../../src/lib/braintree-error');
var create = require('../../../src/apple-pay').create;
var ApplePay = require('../../../src/apple-pay/apple-pay');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');

describe('applePay.create', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.gatewayConfiguration.applePayWeb = {};

    this.client = fake.client({
      configuration: this.configuration
    });

    this.sandbox.stub(createDeferredClient, 'create').resolves(this.client);
    this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
    this.sandbox.stub(analytics, 'sendEvent');
    this.sandbox.stub(basicComponentVerification, 'verify').resolves();
  });

  it('returns a promise', function () {
    var promise = create({client: this.client});

    expect(promise).to.be.an.instanceof(Promise);
  });

  it('verifies with basicComponentVerification', function (done) {
    var client = this.client;

    create({
      client: client
    }, function () {
      expect(basicComponentVerification.verify).to.be.calledOnce;
      expect(basicComponentVerification.verify).to.be.calledWithMatch({
        name: 'Apple Pay',
        client: client
      });
      done();
    });
  });

  it('can create with an authorization instead of a client', function (done) {
    create({
      authorization: fake.clientToken,
      debug: true
    }, function (err, applePayInstance) {
      expect(err).not.to.exist;

      expect(createDeferredClient.create).to.be.calledOnce;
      expect(createDeferredClient.create).to.be.calledWith({
        authorization: fake.clientToken,
        client: this.sandbox.match.typeOf('undefined'),
        debug: true,
        assetsUrl: 'https://example.com/assets',
        name: 'Apple Pay'
      });

      expect(applePayInstance).to.be.an.instanceof(ApplePay);

      done();
    }.bind(this));
  });

  it('calls callback with an error when apple pay is not enabled in configuration', function (done) {
    delete this.configuration.gatewayConfiguration.applePayWeb;

    create({client: this.client}, function (err, applePayInstance) {
      expect(applePayInstance).not.to.exist;

      expect(err).to.be.an.instanceOf(BraintreeError);
      expect(err.code).to.equal('APPLE_PAY_NOT_ENABLED');
      expect(err.type).to.equal('MERCHANT');
      expect(err.message).to.equal('Apple Pay is not enabled for this merchant.');

      done();
    });
  });

  it('sends an analytics event', function (done) {
    var client = this.client;

    create({
      client: client,
      displayName: 'Awesome Merchant'
    }, function (err) {
      expect(err).not.to.exist;
      expect(analytics.sendEvent).to.be.calledWith(client, 'applepay.initialized');

      done();
    });
  });
});
