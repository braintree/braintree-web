'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var isHTTPS = require('../../../src/lib/is-https');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var threeDSecure = require('../../../src/three-d-secure');
var ThreeDSecure = require('../../../src/three-d-secure/external/three-d-secure');
var BraintreeError = require('../../../src/lib/braintree-error');

describe('three-d-secure.create', function () {
  beforeEach(function () {
    var configuration = fake.configuration();

    configuration.gatewayConfiguration.threeDSecureEnabled = true;

    this.configuration = configuration;

    this.client = fake.client({
      configuration: this.configuration
    });

    this.sandbox.stub(analytics, 'sendEvent');
    this.sandbox.stub(isHTTPS, 'isHTTPS').returns(true);
    this.sandbox.stub(basicComponentVerification, 'verify').resolves();
  });

  it('returns a promise', function () {
    var promise = threeDSecure.create({client: this.client});

    expect(promise).to.be.an.instanceof(Promise);
  });

  it('verifies with basicComponentVerification', function (done) {
    var client = this.client;

    threeDSecure.create({
      client: client
    }, function () {
      expect(basicComponentVerification.verify).to.be.calledOnce;
      expect(basicComponentVerification.verify).to.be.calledWith({
        name: '3D Secure',
        client: client
      });
      done();
    });
  });

  it('errors out if three-d-secure is not enabled', function (done) {
    this.configuration.gatewayConfiguration.threeDSecureEnabled = false;

    threeDSecure.create({client: this.client}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.eql('THREEDS_NOT_ENABLED');
      expect(err.message).to.equal('3D Secure is not enabled for this merchant.');
      expect(thingy).not.to.exist;
      done();
    });
  });

  it('errors out if browser is not https and environment is production', function (done) {
    isHTTPS.isHTTPS.restore();
    this.configuration.gatewayConfiguration.environment = 'production';
    this.sandbox.stub(isHTTPS, 'isHTTPS').returns(false);

    threeDSecure.create({client: this.client}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.eql('THREEDS_HTTPS_REQUIRED');
      expect(err.message).to.equal('3D Secure requires HTTPS.');
      expect(thingy).not.to.exist;
      done();
    });
  });

  it('allows http connections when not in production', function (done) {
    isHTTPS.isHTTPS.restore();
    this.configuration.gatewayConfiguration.environment = 'sandbox';
    this.sandbox.stub(isHTTPS, 'isHTTPS').returns(false);

    threeDSecure.create({client: this.client}, function (err, foo) {
      expect(err).not.to.exist;
      expect(foo).to.be.an.instanceof(ThreeDSecure);

      done();
    });
  });

  it('sends an analytics event', function (done) {
    var client = this.client;

    threeDSecure.create({client: client}, function (err) {
      expect(err).not.to.exist;
      expect(analytics.sendEvent).to.be.calledWith(client, 'threedsecure.initialized');

      done();
    });
  });

  it('resolves with a three-d-secure instance', function (done) {
    threeDSecure.create({client: this.client}, function (err, foo) {
      expect(err).not.to.exist;
      expect(foo).to.be.an.instanceof(ThreeDSecure);

      done();
    });
  });
});
