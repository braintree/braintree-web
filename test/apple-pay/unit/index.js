'use strict';

var BraintreeError = require('../../../src/lib/error');
var create = require('../../../src/apple-pay').create;
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var version = require('../../../package.json').version;

describe('applePay.create', function () {
  beforeEach(function () {
    var configuration = fake.configuration();

    configuration.gatewayConfiguration.applePay = {};

    this.configuration = configuration;
    this.client = {
      getConfiguration: function () {
        return configuration;
      }
    };
  });

  it('throws an error when called without a callback', function () {
    var err;

    try {
      create({});
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceOf(BraintreeError);
    expect(err.code).to.equal('CALLBACK_REQUIRED');
    expect(err.type).to.equal('MERCHANT');
    expect(err.message).to.equal('create must include a callback function.');
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
    delete this.configuration.gatewayConfiguration.applePay;

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

    this.sandbox.stub(analytics, 'sendEvent');

    create({
      client: client,
      displayName: 'Awesome Merchant'
    }, function (err) {
      expect(err).not.to.exist;
      expect(analytics.sendEvent).to.be.calledWith(client, 'web.applepay.initialized');

      done();
    });
  });
});
