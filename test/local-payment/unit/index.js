'use strict';

var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var create = require('../../../src/local-payment').create;
var analytics = require('../../../src/lib/analytics');
var fake = require('../../helpers/fake');
var LocalPayment = require('../../../src/local-payment/external/local-payment');
var BraintreeError = require('../../../src/lib/braintree-error');
var Promise = require('../../../src/lib/promise');

describe('local payment', function () {
  afterEach(function () {
    delete global.popupBridge;
  });

  describe('create', function () {
    beforeEach(function () {
      this.configuration = fake.configuration();
      this.configuration.gatewayConfiguration.paypalEnabled = true;

      this.sandbox.stub(analytics, 'sendEvent');
      this.client = fake.client({
        configuration: this.configuration
      });
      this.sandbox.stub(basicComponentVerification, 'verify').resolves();
      this.sandbox.stub(createDeferredClient, 'create').resolves(this.client);
      this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
    });

    it('returns a promise when no callback is provided', function () {
      var promise = create({client: this.client});

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('verifies with basicComponentVerification', function (done) {
      var client = this.client;

      this.sandbox.stub(LocalPayment.prototype, '_initialize').resolves();

      create({
        client: client
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWithMatch({
          name: 'Local Payment',
          client: client
        });
        done();
      });
    });

    it('can create with an authorization instead of a client', function (done) {
      this.sandbox.stub(LocalPayment.prototype, '_initialize').resolves();

      create({
        authorization: fake.clientToken,
        debug: true
      }, function (err) {
        expect(err).not.to.exist;

        expect(createDeferredClient.create).to.be.calledOnce;
        expect(createDeferredClient.create).to.be.calledWith({
          authorization: fake.clientToken,
          client: this.sandbox.match.typeOf('undefined'),
          debug: true,
          assetsUrl: 'https://example.com/assets',
          name: 'Local Payment'
        });

        expect(LocalPayment.prototype._initialize).to.be.calledOnce;

        done();
      }.bind(this));
    });

    it('errors out if LocalPayment is not enabled for the merchant', function (done) {
      this.configuration.gatewayConfiguration.paypalEnabled = false;

      create({client: this.client}, function (err, thingy) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('LOCAL_PAYMENT_NOT_ENABLED');
        expect(err.message).to.equal('LocalPayment is not enabled for this merchant.');
        expect(thingy).not.to.exist;
        done();
      });
    });

    it('sends an analytics event', function (done) {
      var client = this.client;

      this.sandbox.stub(LocalPayment.prototype, '_initialize').resolves();

      create({client: client}, function (err) {
        expect(err).not.to.exist;
        expect(analytics.sendEvent).to.be.calledWith(client, 'local-payment.initialized');

        done();
      });
    });
  });
});
