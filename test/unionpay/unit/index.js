'use strict';

var Promise = require('../../../src/lib/promise');
var create = require('../../../src/unionpay').create;
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var BraintreeError = require('../../../src/lib/braintree-error');
var UnionPay = require('../../../src/unionpay/shared/unionpay');
var version = require('../../../package.json').version;

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
  });

  it('errors out if no client given', function (done) {
    create({}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
      expect(err.message).to.equal('options.client is required when instantiating UnionPay.');
      expect(thingy).not.to.exist;
      done();
    });
  });

  it('errors out if client version does not match', function (done) {
    this.client = fake.client({
      configuration: this.configuration,
      version: '1.2.3'
    });

    create({client: this.client}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
      expect(err.message).to.equal('Client (version 1.2.3) and UnionPay (version ' + version + ') components must be from the same SDK version.');
      expect(thingy).not.to.exist;
      done();
    });
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
