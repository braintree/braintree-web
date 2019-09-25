'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var isHTTPS = require('../../../src/lib/is-https');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
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
    this.sandbox.stub(createDeferredClient, 'create').resolves(this.client);
    this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
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
      expect(basicComponentVerification.verify).to.be.calledWithMatch({
        name: '3D Secure',
        client: client
      });
      done();
    });
  });

  it('errors if merchant passes in unrecognized framework', function (done) {
    threeDSecure.create({
      client: this.client,
      framework: 'unknown'
    }, function (err) {
      expect(err.code).to.equal('THREEDS_UNRECOGNIZED_FRAMEWORK');
      expect(err.message).to.equal('Framework `unknown` is not a recognized framework. You may need to update the version of your Braintree SDK to support this framework.');

      done();
    });
  });

  [
    'bootstrap3-modal',
    'legacy',
    'cardinal-modal',
    'inline-iframe'
  ].forEach(function (frameworkName) {
    it('does not error if merchant passes in ' + frameworkName + ' framework', function (done) {
      this.configuration.gatewayConfiguration.threeDSecure = {
        cardinalAuthenticationJWT: 'jwt'
      };

      threeDSecure.create({
        client: this.client,
        framework: frameworkName
      }, function (err) {
        expect(err).to.not.exist;

        done();
      });
    });
  });

  [
    'bootstrap3-modal',
    'cardinal-modal',
    'inline-iframe'
  ].forEach(function (frameworkName) {
    it('errors if merchant does not have a 3ds object when ' + frameworkName + ' framework is specified', function (done) {
      var client = this.client;

      delete this.configuration.gatewayConfiguration.threeDSecure;

      threeDSecure.create({
        client: client,
        framework: frameworkName
      }, function (err) {
        expect(err.code).to.equal('THREEDS_NOT_ENABLED_FOR_V2');
        expect(analytics.sendEvent).to.be.calledWith(client, 'three-d-secure.initialization.failed.missing-cardinalAuthenticationJWT');
        done();
      });
    });

    it('errors if merchant does not have a jwt to setup songbird when ' + frameworkName + ' framework is specified', function (done) {
      var client = this.client;

      this.configuration.gatewayConfiguration.threeDSecure = {};

      threeDSecure.create({
        client: client,
        framework: frameworkName
      }, function (err) {
        expect(err.code).to.equal('THREEDS_NOT_ENABLED_FOR_V2');
        expect(analytics.sendEvent).to.be.calledWith(client, 'three-d-secure.initialization.failed.missing-cardinalAuthenticationJWT');
        done();
      });
    });
  });

  it('can create with an authorization instead of a client', function (done) {
    threeDSecure.create({
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
        name: '3D Secure'
      });

      expect(instance).to.be.an.instanceof(ThreeDSecure);

      done();
    }.bind(this));
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

  it('errors out if tokenization key is used', function (done) {
    this.configuration.authorizationType = 'TOKENIZATION_KEY';

    threeDSecure.create({client: this.client}, function (err, thingy) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.eql('THREEDS_CAN_NOT_USE_TOKENIZATION_KEY');
      expect(err.message).to.equal('3D Secure can not use a tokenization key for authorization.');
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
      expect(analytics.sendEvent).to.be.calledWith(client, 'three-d-secure.initialized');

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
