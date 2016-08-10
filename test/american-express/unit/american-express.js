'use strict';

var AmericanExpress = require('../../../src/american-express/american-express');
var BraintreeError = require('../../../src/lib/error');

var NONCE = 'ed1704dc-e98c-427f-9836-0f1933755b6a';

describe('AmericanExpress', function () {
  beforeEach(function () {
    this.client = {
      request: this.sandbox.spy()
    };
    this.amex = new AmericanExpress({client: this.client});
  });

  describe('getRewardsBalance', function () {
    it('throws an error when called without a callback', function (done) {
      try {
        this.amex.getRewardsBalance({});
      } catch (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal(BraintreeError.types.MERCHANT);
        expect(err.code).to.equal('CALLBACK_REQUIRED');
        expect(err.message).to.equal('getRewardsBalance must include a callback function.');

        expect(this.client.request).not.to.have.beenCalled;
        done();
      }
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

      this.client.request = function (options, callback) {
        expect(options.method).to.equal('get');
        expect(options.endpoint).to.equal('payment_methods/amex_rewards_balance');
        expect(options.data).to.deep.equal({
          _meta: {
            source: 'american-express'
          },
          paymentMethodNonce: NONCE
        });

        callback(new Error(requestError));
      };

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

      this.client.request = function (options, callback) {
        expect(options.method).to.equal('get');
        expect(options.endpoint).to.equal('payment_methods/amex_rewards_balance');
        expect(options.data).to.deep.equal({
          _meta: {
            source: 'american-express'
          },
          paymentMethodNonce: NONCE
        });

        callback(null, fakeResponseData);
      };

      this.amex.getRewardsBalance({nonce: NONCE}, function (err, response) {
        expect(err).to.equal(null);

        expect(response).to.equal(fakeResponseData);

        done();
      });
    });
  });

  describe('getExpressCheckoutProfile', function () {
    it('throws an error when called without a callback', function () {
      var err;

      try {
        this.amex.getExpressCheckoutProfile({nonce: NONCE});
      } catch (e) {
        err = e;
      }

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('CALLBACK_REQUIRED');
      expect(err.message).to.equal('getExpressCheckoutProfile must include a callback function.');

      expect(this.client.request).not.to.have.beenCalled;
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

      this.client.request = function (options, callback) {
        expect(options.method).to.equal('get');
        expect(options.endpoint).to.equal('payment_methods/amex_express_checkout_cards/' + NONCE);
        expect(options.data).to.deep.equal({
          _meta: {
            source: 'american-express'
          },
          paymentMethodNonce: NONCE
        });

        callback(new Error(requestError));
      };

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

      this.client.request = function (options, callback) {
        expect(options.method).to.equal('get');
        expect(options.endpoint).to.equal('payment_methods/amex_express_checkout_cards/' + NONCE);
        expect(options.data).to.deep.equal({
          _meta: {
            source: 'american-express'
          },
          paymentMethodNonce: NONCE
        });

        callback(null, fakeResponseData);
      };

      this.amex.getExpressCheckoutProfile({nonce: NONCE}, function (err, response) {
        expect(err).to.equal(null);

        expect(response).to.equal(fakeResponseData);

        done();
      });
    });
  });
});
