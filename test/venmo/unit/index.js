'use strict';

var analytics = require('../../../src/lib/analytics');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var create = require('../../../src/venmo').create;
var isBrowserSupported = require('../../../src/venmo').isBrowserSupported;
var fake = require('../../helpers/fake');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var BraintreeError = require('../../../src/lib/braintree-error');
var supportsVenmo = require('../../../src/venmo/shared/supports-venmo');
var Venmo = require('../../../src/venmo/venmo');
var Promise = require('../../../src/lib/promise');

describe('venmo.create', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.client = fake.client({
      configuration: this.configuration
    });
    this.sandbox.stub(analytics, 'sendEvent');
    this.sandbox.stub(basicComponentVerification, 'verify').resolves();
  });

  it('verifies with basicComponentVerification', function (done) {
    var client = this.client;

    create({
      client: client
    }, function () {
      expect(basicComponentVerification.verify).to.be.calledOnce;
      expect(basicComponentVerification.verify).to.be.calledWith({
        name: 'Venmo',
        client: client
      });
      done();
    });
  });

  context('with promises', function () {
    it('returns a promise', function () {
      var promise = create({client: this.client});

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('resolves with a Venmo instance', function () {
      return create({client: this.client}).then(function (instance) {
        expect(instance).to.be.an.instanceof(Venmo);
      });
    });

    it('calls _initialize on the Venmo instance', function () {
      this.sandbox.stub(Venmo.prototype, '_initialize').returns(Promise.resolve({}));

      return create({client: this.client}).then(function () {
        expect(Venmo.prototype._initialize).to.be.calledOnce;
      });
    });

    it('errors out if Venmo is not enabled for the merchant', function () {
      delete this.configuration.gatewayConfiguration.payWithVenmo;

      return create({client: this.client}).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('VENMO_NOT_ENABLED');
        expect(err.message).to.equal('Venmo is not enabled for this merchant.');
      });
    });

    it('sends an analytics event when successful', function () {
      return create({client: this.client}).then(function () {
        expect(analytics.sendEvent).to.be.calledOnce;
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'venmo.initialized');
      }.bind(this));
    });
  });

  context('with callbacks', function () {
    it('does not return a promise', function () {
      var result = create({client: this.client}, function () {});

      expect(result).to.not.be.an.instanceof(Promise);
    });

    it('calls callback with Venmo instance', function (done) {
      create({client: this.client}, function (err, instance) {
        expect(err).not.to.exist;
        expect(instance).to.be.an.instanceof(Venmo);
        done();
      });
    });

    it('calls _initialize on the Venmo instance', function (done) {
      this.sandbox.stub(Venmo.prototype, '_initialize').returns(Promise.resolve({}));

      create({client: this.client}, function () {
        expect(Venmo.prototype._initialize).to.be.calledOnce;
        done();
      });
    });

    it('errors out if Venmo is not enabled for the merchant', function (done) {
      delete this.configuration.gatewayConfiguration.payWithVenmo;

      create({client: this.client}, function (err, thingy) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('VENMO_NOT_ENABLED');
        expect(err.message).to.equal('Venmo is not enabled for this merchant.');
        expect(thingy).not.to.exist;
        done();
      });
    });

    it('sends an analytics event when successful', function (done) {
      create({client: this.client}, function () {
        expect(analytics.sendEvent).to.be.calledOnce;
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'venmo.initialized');
        done();
      }.bind(this));
    });
  });
});

describe('venmo.isBrowserSupported', function () {
  it('calls isBrowserSupported library', function () {
    this.sandbox.stub(supportsVenmo, 'isBrowserSupported');

    isBrowserSupported();

    expect(supportsVenmo.isBrowserSupported).to.be.calledOnce;
  });

  it('can call isBrowserSupported with allowNewTab', function () {
    this.sandbox.stub(supportsVenmo, 'isBrowserSupported');

    isBrowserSupported({allowNewBrowserTab: true});

    expect(supportsVenmo.isBrowserSupported).to.be.calledWith({
      allowNewBrowserTab: true
    });
  });
});
