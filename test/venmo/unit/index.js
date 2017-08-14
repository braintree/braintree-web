'use strict';

var analytics = require('../../../src/lib/analytics');
var create = require('../../../src/venmo').create;
var fake = require('../../helpers/fake');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var version = require('../../../package.json').version;
var BraintreeError = require('../../../src/lib/braintree-error');
var Venmo = require('../../../src/venmo/venmo');
var Promise = require('../../../src/lib/promise');

describe('venmo.create', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();
    this.client = fake.client({
      configuration: this.configuration
    });
    this.sandbox.stub(analytics, 'sendEvent');
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

    it('errors out if no client given', function () {
      return create({}).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
        expect(err.message).to.equal('options.client is required when instantiating Venmo.');
      });
    });

    it('errors out if client version does not match', function () {
      var client = fake.client({
        version: '1.2.3'
      });

      return create({client: client}).then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
        expect(err.message).to.equal('Client (version 1.2.3) and Venmo (version ' + version + ') components must be from the same SDK version.');
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

    it('errors out if no client given', function (done) {
      create({}, function (err, thingy) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
        expect(err.message).to.equal('options.client is required when instantiating Venmo.');
        expect(thingy).not.to.exist;
        done();
      });
    });

    it('errors out if client version does not match', function (done) {
      var client = fake.client({
        version: '1.2.3'
      });

      create({client: client}, function (err, thingy) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
        expect(err.message).to.equal('Client (version 1.2.3) and Venmo (version ' + version + ') components must be from the same SDK version.');
        expect(thingy).not.to.exist;
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
