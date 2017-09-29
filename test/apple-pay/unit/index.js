'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var BraintreeError = require('../../../src/lib/braintree-error');
var create = require('../../../src/apple-pay').create;
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');

describe('applePay.create', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.configuration.gatewayConfiguration.applePayWeb = {};

    this.client = fake.client({
      configuration: this.configuration
    });

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
      expect(basicComponentVerification.verify).to.be.calledWith({
        name: 'Apple Pay',
        client: client
      });
      done();
    });
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
