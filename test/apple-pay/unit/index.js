'use strict';

var Promise = require('../../../src/lib/promise');
var BraintreeError = require('../../../src/lib/braintree-error');
var create = require('../../../src/apple-pay').create;
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var version = require('../../../package.json').version;

describe('applePay.create', function () {
  beforeEach(function () {
    var configuration = fake.configuration();

    configuration.gatewayConfiguration.applePayWeb = {};

    this.configuration = configuration;
    this.client = {
      request: this.sandbox.stub(),
      getConfiguration: function () {
        return configuration;
      }
    };
    this.sandbox.stub(analytics, 'sendEvent');
  });

  it('returns a promise', function () {
    var promise = create({client: this.client});

    expect(promise).to.be.an.instanceof(Promise);
  });

  it('calls callback with an error when missing client', function (done) {
    create({}, function (err, applePayInstance) {
      expect(applePayInstance).not.to.exist;

      expect(err).to.be.an.instanceOf(BraintreeError);
      expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
      expect(err.type).to.equal('MERCHANT');
      expect(err.message).to.equal('options.client is required when instantiating Apple Pay.');

      done();
    });
  });

  it('calls callback with an error when called with a mismatched version', function (done) {
    this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

    create({client: this.client}, function (err, applePayInstance) {
      expect(applePayInstance).not.to.exist;

      expect(err).to.be.an.instanceOf(BraintreeError);
      expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
      expect(err.type).to.equal('MERCHANT');
      expect(err.message).to.equal('Client (version 1.2.3) and Apple Pay (version ' + version + ') components must be from the same SDK version.');

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
