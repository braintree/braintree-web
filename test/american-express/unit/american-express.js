'use strict';

var AmericanExpress = require('../../../src/american-express/american-express');
var BraintreeError = require('../../../src/lib/braintree-error');
var Promise = require('../../../src/lib/promise');
var methods = require('../../../src/lib/methods');

var NONCE = 'ed1704dc-e98c-427f-9836-0f1933755b6a';

describe('AmericanExpress', function () {
  beforeEach(function () {
    this.client = {
      request: this.sandbox.stub().resolves()
    };
    this.amex = new AmericanExpress({client: this.client});
  });

  describe('getRewardsBalance', function () {
    it('returns a promise', function () {
      var promise = this.amex.getRewardsBalance({nonce: NONCE});

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('calls the callback with an error if called without a nonce', function (done) {
      this.amex.getRewardsBalance({}, function (err, response) {
        expect(response).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('AMEX_NONCE_REQUIRED');
        expect(err.message).to.equal('getRewardsBalance must be called with a nonce.');

        expect(this.client.request).not.to.have.beenCalled;

        done();
      }.bind(this));
    });

    it('makes a request to the gateway and calls the callback if it fails', function (done) {
      var requestError = new Error('something went wrong');

      this.client.request.rejects(requestError);

      this.amex.getRewardsBalance({nonce: NONCE}, function (err, response) {
        expect(response).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('AMEX_NETWORK_ERROR');
        expect(err.message).to.equal('A network error occurred when getting the American Express rewards balance.');
        expect(err.details).to.deep.equal({originalError: requestError});

        done();
      });
    });

    it('makes a request to the gateway and calls the callback if it succeeds', function (done) {
      var fakeResponseData = {foo: 'boo'};

      this.client.request.resolves(fakeResponseData);

      this.amex.getRewardsBalance({nonce: NONCE}, function (err, response) {
        expect(err).to.equal(null);

        expect(this.client.request).to.be.calledWith(this.sandbox.match({
          method: 'get',
          endpoint: 'payment_methods/amex_rewards_balance',
          data: {
            _meta: {
              source: 'american-express'
            },
            paymentMethodNonce: NONCE
          }
        }));

        expect(response).to.equal(fakeResponseData);

        done();
      }.bind(this));
    });

    it('passes along options to gateway', function (done) {
      this.client.request.resolves();

      this.amex.getRewardsBalance({nonce: NONCE, foo: 'bar'}, function () {
        expect(this.client.request).to.be.calledWithMatch({
          data: {
            _meta: {source: 'american-express'},
            paymentMethodNonce: NONCE,
            foo: 'bar'
          }
        });

        done();
      }.bind(this));
    });

    it("doesn't modify the options that are passed in", function (done) {
      var options = {
        nonce: NONCE,
        foo: 'boo'
      };

      this.client.request.resolves();

      this.amex.getRewardsBalance(options, function () {
        expect(options).to.deep.equal({
          nonce: NONCE,
          foo: 'boo'
        });

        done();
      });
    });
  });

  describe('getExpressCheckoutProfile', function () {
    it('returns a promise', function () {
      var promise = this.amex.getExpressCheckoutProfile({nonce: NONCE});

      expect(promise).to.respondTo('then');
      expect(promise).to.respondTo('catch');
    });

    it('calls the callback with an error if called without a nonce', function (done) {
      this.amex.getExpressCheckoutProfile({}, function (err, response) {
        expect(response).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('AMEX_NONCE_REQUIRED');
        expect(err.message).to.equal('getExpressCheckoutProfile must be called with a nonce.');

        expect(this.client.request).not.to.have.beenCalled;

        done();
      }.bind(this));
    });

    it('makes a request to the gateway and calls the callback if it fails', function (done) {
      var requestError = new Error('something went wrong');

      this.client.request.rejects(requestError);
      this.amex.getExpressCheckoutProfile({nonce: NONCE}, function (err, response) {
        expect(response).not.to.exist;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('AMEX_NETWORK_ERROR');
        expect(err.message).to.equal('A network error occurred when getting the American Express Checkout nonce profile.');
        expect(err.details).to.deep.equal({originalError: requestError});

        done();
      });
    });

    it('makes a request to the gateway and calls the callback if it succeeds', function (done) {
      var fakeResponseData = {foo: 'boo'};

      this.client.request.resolves(fakeResponseData);

      this.amex.getExpressCheckoutProfile({nonce: NONCE}, function (err, response) {
        expect(err).to.equal(null);

        expect(this.client.request).to.be.calledWith(this.sandbox.match({
          method: 'get',
          endpoint: 'payment_methods/amex_express_checkout_cards/' + NONCE,
          data: {
            _meta: {
              source: 'american-express'
            },
            paymentMethodNonce: NONCE
          }
        }));

        expect(response).to.equal(fakeResponseData);

        done();
      }.bind(this));
    });
  });

  describe('teardown', function () {
    it('returns a promise', function () {
      var promise = this.amex.teardown();

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var instance = this.amex;

      instance.teardown(function () {
        methods(AmericanExpress.prototype).forEach(function (method) {
          var err;

          try {
            instance[method]();
          } catch (e) {
            err = e;
          }

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal(BraintreeError.types.MERCHANT);
          expect(err.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
          expect(err.message).to.equal(method + ' cannot be called after teardown.');
        });

        done();
      });
    });
  });
});
