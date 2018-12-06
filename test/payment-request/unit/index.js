'use strict';

var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var paymentRequest = require('../../../src/payment-request');
var createDeferredClient = require('../../../src/lib/create-deferred-client');
var createAssetsUrl = require('../../../src/lib/create-assets-url');
var PaymentRequestComponent = require('../../../src/payment-request/external/payment-request');
var fake = require('../../helpers/fake');

describe('paymentRequest', function () {
  describe('create', function () {
    beforeEach(function () {
      this.fakeClient = fake.client();
      this.fakeClient._request = function () {};
      this.sandbox.stub(PaymentRequestComponent.prototype, 'initialize').resolves({});
      this.sandbox.stub(basicComponentVerification, 'verify').resolves();
      this.sandbox.stub(createDeferredClient, 'create').resolves(this.fakeClient);
      this.sandbox.stub(createAssetsUrl, 'create').returns('https://example.com/assets');
    });

    it('returns a promise', function () {
      var promise = paymentRequest.create({
        client: this.fakeClient
      });

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('verifies with basicComponentVerification', function (done) {
      var client = this.fakeClient;

      paymentRequest.create({
        client: client
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWithMatch({
          name: 'Payment Request',
          client: client
        });
        done();
      });
    });

    it('can create with an authorization instead of a client', function (done) {
      paymentRequest.create({
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
          name: 'Payment Request'
        });

        expect(instance).to.exist;

        done();
      }.bind(this));
    });

    it('instantiates a Payment Request integration', function (done) {
      paymentRequest.create({
        client: this.fakeClient
      }, function (err, thingy) {
        expect(err).not.to.exist;
        expect(thingy).to.exist;

        done();
      });
    });

    it('returns error if payment request integration throws an error', function (done) {
      var error = new Error('Failed');

      PaymentRequestComponent.prototype.initialize.rejects(error);

      paymentRequest.create({
        client: this.fakeClient
      }, function (err) {
        expect(err).to.exist;
        expect(err).to.equal(error);

        done();
      });
    });
  });
});
