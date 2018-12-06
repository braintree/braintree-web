'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var create = require('../../../src/unionpay').create;
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var BraintreeError = require('../../../src/lib/braintree-error');
var UnionPay = require('../../../src/unionpay/shared/unionpay');

describe('unionPay.create', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.gatewayConfiguration.unionPay = {
      enabled: true
    };
    this.client = fake.client({
      configuration: this.configuration
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
        name: 'UnionPay',
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
        name: 'UnionPay'
      });

      expect(instance).to.be.an.instanceof(UnionPay);

      done();
    }.bind(this));
  });

  it('returns a promise', function () {
    var promise = create({client: this.client});

    expect(promise).to.be.an.instanceof(Promise);
  });

  it('errors out if unionpay is not enabled for the merchant', function (done) {
    this.configuration.gatewayConfiguration.unionPay.enabled = false;

    create({client: this.client}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('UNIONPAY_NOT_ENABLED');
      expect(err.message).to.equal('UnionPay is not enabled for this merchant.');
      expect(thingy).not.to.exist;
      done();
    });
  });

  it('errors out if no unionpay configuration exists', function (done) {
    delete this.configuration.gatewayConfiguration.unionPay;

    create({client: this.client}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('UNIONPAY_NOT_ENABLED');
      expect(err.message).to.equal('UnionPay is not enabled for this merchant.');
      expect(thingy).not.to.exist;
      done();
    });
  });

  it('sends an analytics event', function (done) {
    var client = this.client;

    create({client: client}, function (err) {
      expect(err).not.to.exist;
      expect(analytics.sendEvent).to.be.calledWith(client, 'unionpay.initialized');

      done();
    });
  });

  it('creates a UnionPay instance', function (done) {
    create({client: this.client}, function (err, unionpay) {
      expect(err).not.to.exist;
      expect(unionpay).to.be.an.instanceof(UnionPay);

      done();
    });
  });
});
