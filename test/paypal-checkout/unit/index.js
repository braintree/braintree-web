'use strict';

var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var create = require('../../../src/paypal-checkout').create;
var isSupported = require('../../../src/paypal-checkout').isSupported;
var PayPalCheckout = require('../../../src/paypal-checkout/paypal-checkout');

describe('paypalCheckout', function () {
  describe('create', function () {
    beforeEach(function () {
      this.sandbox.stub(basicComponentVerification, 'verify').resolves();
      this.sandbox.stub(PayPalCheckout.prototype, '_initialize').resolves();
    });

    it('verifies with basicComponentVerification', function (done) {
      var client = this.client;

      create({
        client: client
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWithMatch({
          name: 'PayPal Checkout',
          client: client
        });
        done();
      });
    });

    it('calls _initialize', function (done) {
      var client = this.client;
      var options = {
        client: client
      };

      create(options, function () {
        expect(PayPalCheckout.prototype._initialize).to.be.calledOnce;
        expect(PayPalCheckout.prototype._initialize).to.be.calledWithMatch(options);
        done();
      });
    });

    it('errors if _initialize errors', function (done) {
      var client = this.client;
      var options = {
        client: client
      };
      var error = new Error('foo');

      PayPalCheckout.prototype._initialize.rejects(error);

      create(options, function (err) {
        expect(err).to.equal(error);
        done();
      });
    });
  });

  describe('isSupported', function () {
    it('returns true', function () {
      expect(isSupported()).to.equal(true);
    });
  });
});
