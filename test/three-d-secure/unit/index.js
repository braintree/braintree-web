'use strict';

var browserDetection = require('../../../src/lib/browser-detection');
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var threeDSecure = require('../../../src/three-d-secure');
var ThreeDSecure = require('../../../src/three-d-secure/external/three-d-secure');
var BraintreeError = require('../../../src/lib/error');
var version = require('../../../package.json').version;

describe('three-d-secure.create', function () {
  beforeEach(function () {
    var configuration = fake.configuration();

    configuration.gatewayConfiguration.threeDSecureEnabled = true;

    this.configuration = configuration;

    this.client = {
      getConfiguration: function () {
        return configuration;
      }
    };
    this.sandbox.stub(browserDetection, 'isHTTPS', function () { return true; });
  });

  it('throws an error if a callback parameter is not provided', function (done) {
    try {
      threeDSecure.create({client: this.client});
    } catch (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.eql('MERCHANT');
      expect(err.code).to.eql('CALLBACK_REQUIRED');
      expect(err.message).to.eql('create must include a callback function.');

      done();
    }
  });

  it('errors out if no client given', function (done) {
    threeDSecure.create({}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.eql('INSTANTIATION_OPTION_REQUIRED');
      expect(err.message).to.equal('options.client is required when instantiating 3D Secure.');
      expect(thingy).not.to.exist;
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

  it('errors out if client version does not match', function (done) {
    this.configuration.analyticsMetadata.sdkVersion = '1.2.3';

    threeDSecure.create({client: this.client}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.eql('INCOMPATIBLE_VERSIONS');
      expect(err.message).to.equal('Client (version 1.2.3) and 3D Secure (version ' + version + ') components must be from the same SDK version.');
      expect(thingy).not.to.exist;
      done();
    });
  });

  it('errors out if browser is not https', function (done) {
    browserDetection.isHTTPS.restore();
    this.sandbox.stub(browserDetection, 'isHTTPS', function () { return false; });

    threeDSecure.create({client: this.client}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.eql('THREEDS_HTTPS_REQUIRED');
      expect(err.message).to.equal('3D Secure requires HTTPS.');
      expect(thingy).not.to.exist;
      done();
    });
  });

  it('sends an analytics event', function (done) {
    var client = this.client;

    this.sandbox.stub(analytics, 'sendEvent');

    threeDSecure.create({client: client}, function (err) {
      expect(err).not.to.exist;
      expect(analytics.sendEvent).to.be.calledWith(client, 'web.threedsecure.initialized');

      done();
    });
  });

  it('resolves with a three-d-secure instance', function (done) {
    this.sandbox.stub(analytics, 'sendEvent');

    threeDSecure.create({client: this.client}, function (err, foo) {
      expect(err).not.to.exist;
      expect(foo).to.be.an.instanceof(ThreeDSecure);

      done();
    });
  });
});
